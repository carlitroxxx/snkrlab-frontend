import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useSesion } from "../features/auth/useSesion";
import { Link, useNavigate } from "react-router-dom";
import {
    obtenerMiCarrito,
    actualizarCantidad,
    eliminarItem,
    iniciarCheckout, pagarCheckout, confirmarCheckout, iniciarWebpay, sincronizarWebpay, consultarCheckout,
} from "../features/carrito/carritoApi";
import { Layout } from "../components/Layout";
import { Precio } from "../components/Precio";
import { Boton } from "../components/Boton";
import { loginRequest } from "../features/auth/AuthConfig";
import { leerOperacion, enviarFormularioWebpay, validarFormularioWebpay, mensajePago, confirmarSiAprobado, recuperarCompraConfirmada, liberarRechazado, seleccionSimulada } from "../features/carrito/webpay";
import { enviarComprobante } from "../features/ordenes/ordenesApi";
import { ImagenCatalogo, useImagenesCatalogo } from "../features/productos/ImagenCatalogo";

export function Carrito({ resultadoWebpay = false }) {
    const { cuenta, cargandoSesion } = useSesion();
    if (cargandoSesion) return <Layout><p>Cargando sesión...</p></Layout>;
    return <CarritoUsuario key={cuenta?.homeAccountId || "visitante"} resultadoWebpay={resultadoWebpay} />;
}

const TARJETAS = ["SIM_TARJETA_01", "SIM_TARJETA_02", "SIM_TARJETA_03"];
function CarritoUsuario({ resultadoWebpay }) {
    const imagenes = useImagenesCatalogo();
    const navigate = useNavigate();
    const {
        instance,
        accounts,
        isAuthenticated,
    } = useSesion();
    const claveCheckout = "snkrlab:checkout:" + accounts[0]?.homeAccountId;
    const ocupado = useRef(false);
    const vigente = useRef(true);
    useEffect(() => {
        vigente.current = true;
        return () => { vigente.current = false; };
    }, []);
    const [inicial] = useState(() => {
        try { return { datos: leerOperacion(localStorage.getItem(claveCheckout)), error: null }; }
        catch { return { datos: null, error: "No se pudo recuperar el checkout guardado. No se iniciará otra compra." }; }
    });
    const [operacion, setOperacion] = useState(inicial.datos);
    const [modalidad, setModalidad] = useState(inicial.datos?.modalidad || "WEBPAY");
    const retornoProcesado = useRef(false);
    const [referencia, setReferencia] = useState(inicial.datos?.referenciaPago || "SIM_APROBADA_01");
    const [tarjeta, setTarjeta] = useState(inicial.datos ? inicial.datos.tarjetaId ?? "" : "SIM_TARJETA_01");
    const [puedeElegirTarjeta, setPuedeElegirTarjeta] = useState(false);
    const [persistenciaLista, setPersistenciaLista] = useState(!inicial.error);

    const [items, setItems] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(inicial.error);
    const [confirmando, setConfirmando] = useState(false);
    const [resultadoCompra, setResultadoCompra] = useState(null);
    const [correo, setCorreo] = useState("");
    const [enviandoCorreo, setEnviandoCorreo] = useState(false);
    const [mensajeCorreo, setMensajeCorreo] = useState("");
    const [errorCorreo, setErrorCorreo] = useState("");

    const cargarCarrito = async () => {
        setCargando(true);
        setError(null);
        try {
            const data = await obtenerMiCarrito(instance, accounts[0]);
            setItems(data || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        let activo = true;
        if (isAuthenticated) {
            (async () => {
                if (!resultadoWebpay && inicial.datos) {
                    const checkout = await consultarCheckout(instance, accounts[0], inicial.datos.checkoutId);
                    if (checkout?.checkoutId !== inicial.datos.checkoutId) throw new Error("Checkout incompatible.");
                    const recuperada = await recuperarCompraConfirmada(checkout,
                        () => obtenerMiCarrito(instance, accounts[0]), localStorage, claveCheckout);
                    if (recuperada) {
                        if (activo && recuperada.liberado) setOperacion(null);
                        return recuperada.items;
                    }
                }
                return obtenerMiCarrito(instance, accounts[0]);
            })()
                .then(data => { if (activo) setItems(data || []); })
                .catch(err => { if (activo) setError(err.message); })
                .finally(() => { if (activo) setCargando(false); });
        }
        return () => { activo = false; };
    }, [isAuthenticated, instance, accounts, resultadoWebpay, inicial, claveCheckout]);
    const editarCarrito = async (editar) => {
        if (ocupado.current || !persistenciaLista) return;
        ocupado.current = true;
        setConfirmando(true);
        try {
            const actual = leerOperacion(localStorage.getItem(claveCheckout));
            if (actual) {
                await liberarRechazado(actual, () => consultarCheckout(instance, accounts[0], actual.checkoutId),
                    localStorage, claveCheckout);
                setOperacion(null);
            }
            await editar();
            await cargarCarrito();
        } catch (err) {
            setError(err.message);
        } finally {
            ocupado.current = false;
            setConfirmando(false);
        }
    };
    const manejarCambioCantidad = (itemId, cantidad) => {
        if (cantidad < 1) return;
        return editarCarrito(() => actualizarCantidad(instance, accounts[0], itemId, cantidad));
    };
    const manejarEliminar = (itemId) =>
        editarCarrito(() => eliminarItem(instance, accounts[0], itemId));
    useEffect(() => {
        const actualizar = (event) => {
            if (event.key !== claveCheckout) return;
            try {
                const datos = leerOperacion(event.newValue);
                setOperacion(datos);
                if (datos) {
                    setModalidad(datos.modalidad);
                    setTarjeta(datos.tarjetaId ?? "");
                    setReferencia(datos.referenciaPago);
                }
                setPersistenciaLista(true);
            } catch {
                setPersistenciaLista(false);
                setError("No se pudo recuperar la compra actualizada en otra pestaña.");
            }
        };
        window.addEventListener("storage", actualizar);
        return () => window.removeEventListener("storage", actualizar);
    }, [claveCheckout]);
    useEffect(() => {
        const restaurar = (event) => {
            if (event.persisted) { ocupado.current = false; setConfirmando(false); }
        };
        window.addEventListener("pageshow", restaurar);
        return () => window.removeEventListener("pageshow", restaurar);
    }, []);
    const guardarOperacion = (datos) => {
        localStorage.setItem(claveCheckout, JSON.stringify(datos));
        if (vigente.current) setOperacion(datos);
                setModalidad(datos.modalidad);
    };

    const manejarCheckout = async (reabrir = false) => {
        if (ocupado.current || !persistenciaLista || !accounts[0]) return;
        ocupado.current = true;
        setConfirmando(true);
        setError(null);
        let redirigiendo = false;
        let actual = operacion;
        try {
            actual = leerOperacion(localStorage.getItem(claveCheckout));
            if (actual?.estado === "RECHAZADO" && reabrir === true) {
                await liberarRechazado(actual, () => consultarCheckout(instance, accounts[0], actual.checkoutId),
                    localStorage, claveCheckout);
                actual = null;
                setOperacion(null);
            }
            // Persistir antes de enviar: un fallo de red nunca genera otro UUID.
            if (!actual && resultadoWebpay && reabrir !== true) throw new Error("No hay una compra guardada para esta cuenta. Revisa Mis órdenes o vuelve con la cuenta que inició el pago.");
            if (!actual) {
                actual = {
                    checkoutId: crypto.randomUUID(),
                    modalidad,
                    referenciaPago: modalidad === "WEBPAY" ? "WEBPAY" : seleccionSimulada(tarjeta, referencia).referencia,
                    tarjetaId: modalidad === "WEBPAY" ? null : seleccionSimulada(tarjeta, referencia).tarjeta,
                    estado: "INICIADO",
                };
                guardarOperacion(actual);
            }
            if (resultadoWebpay && reabrir !== true && actual.modalidad !== "WEBPAY") throw new Error("La compra guardada es simulada. Retómala desde el carrito.");
            const aceptar = (respuesta) => {
                if (!respuesta || respuesta.checkoutId !== actual.checkoutId
                    || !["INICIADO", "ORDEN_PENDIENTE", "PAGO_INCIERTO",
                        "PAGO_APROBADO", "RECHAZADO", "CONFIRMADO"].includes(respuesta.estado))
                    throw new Error("No se recibió un estado válido. Reintenta la misma operación.");
                if (respuesta.tarjetaId != null && (!TARJETAS.includes(respuesta.tarjetaId)
                    || (actual.tarjetaId != null && actual.tarjetaId !== respuesta.tarjetaId)))
                    throw new Error("La tarjeta del checkout no coincide. Revisa la operación.");
                if (respuesta.referenciaPago && respuesta.referenciaPago !== actual.referenciaPago) throw new Error("La modalidad del checkout no coincide.");
                actual = { ...actual, estado: respuesta.estado, resultadoPago: respuesta.resultadoPago,
                    tarjetaId: respuesta.tarjetaId ?? actual.tarjetaId };
                guardarOperacion(actual);
                return respuesta;
            };
            let checkout = aceptar(await iniciarCheckout(instance, accounts[0], actual.checkoutId));
            if (!vigente.current) return;
            if (actual.modalidad === "WEBPAY") {
                if (["ORDEN_PENDIENTE", "PAGO_INCIERTO"].includes(checkout.estado)) {
                    let respuesta;
                    if (reabrir !== true && (actual.enviadoWebpay || (resultadoWebpay && checkout.intentoId))) {
                        respuesta = await sincronizarWebpay(instance, accounts[0], actual.checkoutId);
                    } else {
                        respuesta = await iniciarWebpay(instance, accounts[0], actual.checkoutId);
                    }
                    if (!vigente.current) return;
                    checkout = aceptar(respuesta?.checkout);
                    if (respuesta.token && respuesta.url && checkout.estado === "PAGO_INCIERTO") {
                        validarFormularioWebpay(respuesta.url, respuesta.token);
                        guardarOperacion({ ...actual, enviadoWebpay: true });
                        enviarFormularioWebpay(respuesta.url, respuesta.token);
                        redirigiendo = true;
                        return;
                    }
                }
            } else if (["ORDEN_PENDIENTE", "PAGO_INCIERTO"].includes(checkout.estado)) {
                if (!actual.tarjetaId && !checkout.intentoId) {
                    setPuedeElegirTarjeta(true);
                    throw new Error("Selecciona una tarjeta simulada para continuar con esta compra.");
                }
                setPuedeElegirTarjeta(false);
                guardarOperacion({ ...actual, estado: "PAGO_INCIERTO" });
                checkout = aceptar(await pagarCheckout(instance, accounts[0],
                    actual.checkoutId, actual.referenciaPago, actual.tarjetaId));
            }
            if (!vigente.current) return;
            checkout = aceptar(await confirmarSiAprobado(checkout,
                () => confirmarCheckout(instance, accounts[0], actual.checkoutId)));
            if (!["PAGO_APROBADO", "CONFIRMADO"].includes(checkout.estado)) {
                setError(mensajePago(checkout));
                return;
            }
            if (!vigente.current) return;
            if (checkout?.estado !== "CONFIRMADO")
                throw new Error("Compra pendiente. Reintenta la misma operación.");
            const recuperada = await recuperarCompraConfirmada(checkout,
                () => obtenerMiCarrito(instance, accounts[0]), localStorage, claveCheckout);
            if (!vigente.current) return;
            setItems(recuperada.items);
            if (recuperada.liberado) setOperacion(null);
            setResultadoCompra({
                ordenId: checkout.ordenId,
                mensaje: actual.modalidad === "WEBPAY" ? "Compra confirmada con Webpay Plus." : "Compra confirmada con pago simulado aprobado.",
                items: checkout.articulos,
                cantidadItems: checkout.articulos.length,
                total: checkout.importePago,
            });
        } catch (err) {
            if (vigente.current) setError(err.message + " La operación se conserva para reintentar.");
        } finally {
            ocupado.current = redirigiendo;
            if (vigente.current && !redirigiendo) setConfirmando(false);
        }
    };

    const seleccionarTarjeta = (valor) => {
        if (ocupado.current || !TARJETAS.includes(valor)) return;
        if (operacion && operacion.estado !== "RECHAZADO" && !puedeElegirTarjeta) return;
        try {
            if (operacion && operacion.estado !== "RECHAZADO") guardarOperacion({ ...operacion, tarjetaId: valor });
            setTarjeta(valor);
            setPuedeElegirTarjeta(false);
            setError(null);
        } catch {
            setError("No se pudo guardar la tarjeta. No se enviará un pago nuevo.");
        }
    };

    const recuperarRetorno = useEffectEvent(() => manejarCheckout());
    useEffect(() => {
        if (resultadoWebpay && persistenciaLista && isAuthenticated && !retornoProcesado.current) {
            retornoProcesado.current = true;
            recuperarRetorno();
        }
    }, [resultadoWebpay, persistenciaLista, isAuthenticated]);

    const manejarEnviarComprobante = async (event) => {
        event.preventDefault();

        if (enviandoCorreo) return;

        setMensajeCorreo("");
        setErrorCorreo("");

        if (!resultadoCompra?.ordenId) {
            setErrorCorreo("No se encontró el número de la orden.");
            return;
        }

        if (!accounts[0]) {
            setErrorCorreo("Necesitas iniciar sesión nuevamente.");
            return;
        }

        setEnviandoCorreo(true);

        try {
            const respuesta = await enviarComprobante(
                instance,
                accounts[0],
                resultadoCompra.ordenId,
                correo.trim()
            );

            if (!respuesta) return;

            setMensajeCorreo(respuesta.mensaje);
        } catch (err) {
            setErrorCorreo("No se pudo solicitar el comprobante: " + err.message);
        } finally {
            setEnviandoCorreo(false);
        }
    };

    if (!isAuthenticated) {
        return (
            <Layout>
                <h2>Carrito</h2>
                <p>Necesitas iniciar sesión para ver tu carrito.</p>
                <Boton onClick={() => instance.loginRedirect(loginRequest)}>
                    Iniciar sesión
                </Boton>
            </Layout>
        );
    }

    if (cargando) return <Layout><p>Cargando carrito...</p></Layout>;

    if (resultadoCompra) {
        return (
            <Layout>
                <h2>Carrito</h2>
                <div className="checkoutConfirmacion">
                    <h3>Comprobante de compra</h3>
                    <p>Orden N.º {resultadoCompra.ordenId}</p>
                    <p>{resultadoCompra.mensaje}</p>

                    <div className="checkoutDetalleLista">
                        {resultadoCompra.items?.map((item, index) => (
                            <div key={index} className="checkoutDetalleItem">
                                <ImagenCatalogo imagen={imagenes.get(String(item.productoId))} nombre={item.nombreProducto} />
                                <div className="checkoutDetalleNombre">{item.nombreProducto}</div>
                                <div className="checkoutDetalleFila">
                                    <span>Cantidad: {item.cantidad}</span>
                                    <span>Precio unidad: <Precio valor={item.precioUnitario} /></span>
                                </div>
                                <div className="checkoutDetalleSubtotal">
                                    Subtotal: <Precio valor={item.subtotal} />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="checkoutDivisor" />

                    <p>Productos comprados: {resultadoCompra.cantidadItems}</p>
                    <p className="checkoutTotal">Total: <Precio valor={resultadoCompra.total} /></p>

                    <div className="checkoutDivisor" />

                    <form
                        className="comprobanteFormulario"
                        onSubmit={manejarEnviarComprobante}
                    >
                        <label htmlFor="correoComprobante">
                            Recibir comprobante por correo
                        </label>

                        <input
                            id="correoComprobante"
                            name="correo"
                            type="email"
                            autoComplete="email"
                            placeholder="tu-correo@ejemplo.com"
                            value={correo}
                            onChange={(event) => {
                                setCorreo(event.target.value);
                                setMensajeCorreo("");
                                setErrorCorreo("");
                            }}
                            required
                            maxLength={254}
                            disabled={enviandoCorreo}
                        />

                        <Boton
                            type="submit"
                            disabled={enviandoCorreo || !resultadoCompra.ordenId}
                        >
                            {enviandoCorreo ? "Solicitando envío..." : "Enviar comprobante"}
                        </Boton>

                        {mensajeCorreo && (
                            <p role="status">{mensajeCorreo}</p>
                        )}

                        {errorCorreo && (
                            <p className="carritoError" role="alert">
                                {errorCorreo}
                            </p>
                        )}
                    </form>
                    <Link to="/ordenes" className="boton botonLinea">
                        Ver mis órdenes
                    </Link>
                    <Boton onClick={() => { setResultadoCompra(null); navigate("/carrito"); }}>Volver al carrito</Boton>
                </div>
            </Layout>
        );
    }

    const total = items.reduce((acc, item) => acc + item.precioUnitario * item.cantidad, 0);

    return (
        <Layout>
            <h2>Carrito</h2>

            {error && !(operacion && operacion.estado !== "RECHAZADO" && error === mensajePago(operacion)) && <p className="carritoError" role="alert">{error}</p>}
            {operacion && operacion.estado !== "RECHAZADO" && (!error || error === mensajePago(operacion)) && (
                <p className="carritoAvisoPendiente" role="status">
                    Tienes un pago pendiente. Retoma la compra para consultar su estado.
                </p>
            )}

            {(items.length > 0 || operacion) && (
                <div className="carritoResumen carritoPago">
                    <label htmlFor="modalidadPago">Medio de pago</label>
                    <select id="modalidadPago" value={modalidad} disabled={confirmando || (Boolean(operacion) && operacion.estado !== "RECHAZADO") || !persistenciaLista}
                        onChange={(event) => {
                            setModalidad(event.target.value);
                            if (event.target.value === "SIMULADO") {
                                const nueva = seleccionSimulada(tarjeta, referencia);
                                setTarjeta(nueva.tarjeta); setReferencia(nueva.referencia);
                            }
                        }}>
                        <option value="WEBPAY">Webpay Plus</option>
                        <option value="SIMULADO">Simulación antifraude</option>
                    </select>
                    {modalidad === "WEBPAY" && <p>Pago seguro mediante Transbank.</p>}
                    {modalidad === "SIMULADO" && <>
                    <label htmlFor="tarjetaSimulada">Tarjeta simulada</label>
                    <select id="tarjetaSimulada" value={!operacion || operacion.estado === "RECHAZADO" ? seleccionSimulada(tarjeta, referencia).tarjeta : tarjeta}
                        disabled={confirmando || !persistenciaLista || (Boolean(operacion) && operacion.estado !== "RECHAZADO" && !puedeElegirTarjeta)}
                        onChange={(event) => seleccionarTarjeta(event.target.value)}>
                        <option value="" disabled>Sin tarjeta registrada</option>
                        {TARJETAS.map((id, index) => (
                            <option key={id} value={id}>{["0000 0000 0000 0001 - 12/29 - 123", "0000 0000 0000 0002 - 12/29 - 456", "0000 0000 0000 0003 - 12/29 - 789"][index]}</option>
                        ))}
                    </select>
                    <label htmlFor="pagoSimulado">Resultado simulado</label>
                    <select id="pagoSimulado" value={!operacion || operacion.estado === "RECHAZADO" ? seleccionSimulada(tarjeta, referencia).referencia : referencia}
                        disabled={confirmando || (Boolean(operacion) && operacion.estado !== "RECHAZADO") || !persistenciaLista}
                        onChange={(event) => setReferencia(event.target.value)}>
                        <option value="SIM_APROBADA_01">Simular pago aprobado</option>
                        <option value="SIM_RECHAZADA_01">Simular pago rechazado</option>
                    </select>
                    </>}
                    {!confirmando && operacion?.modalidad === "WEBPAY" && operacion.resultadoPago === "PENDIENTE" && (
                        <Boton disabled={confirmando} onClick={() => manejarCheckout(true)}>Volver al formulario de Webpay</Boton>
                    )}
                    {confirmando ? <Boton disabled>Procesando...</Boton> : operacion?.estado === "RECHAZADO" ? (
                        <div>
                            {error !== mensajePago(operacion) && <p role="status">{mensajePago(operacion)}</p>}
                            <Boton disabled={confirmando} onClick={() => manejarCheckout(true)}>
                                Confirmar compra
                            </Boton>
                        </div>
                    ) : (
                        <Boton onClick={manejarCheckout} disabled={confirmando || !persistenciaLista}>
                            {confirmando ? "Procesando..." :
                                operacion?.estado === "PAGO_APROBADO"
                                    ? "Reintentar confirmación"
                                    : operacion ? "Retomar compra" : "Confirmar compra"}
                        </Boton>
                    )}
                </div>
            )}
            {items.length === 0 ? (
                <p>Tu carrito está vacío. <Link to="/">Ver catálogo</Link></p>
            ) : (
                <>
                    <div className="carritoLista">
                        {items.map((item) => (
                            <div key={item.id} className="carritoItem">
                                <ImagenCatalogo imagen={imagenes.get(String(item.productoId))} nombre={item.nombreProducto} />
                                <div className="carritoItemInfo">
                                    <span className="carritoItemId">ID: {item.productoId}</span>
                                    <span className="carritoItemNombre">{item.nombreProducto}</span>
                                    <Precio valor={item.precioUnitario} />
                                </div>

                                <div className="carritoItemCantidad">
                                    <button disabled={confirmando || !persistenciaLista || (Boolean(operacion) && operacion.estado !== "RECHAZADO")} onClick={() => manejarCambioCantidad(item.id, item.cantidad - 1)}>-</button>
                                    <span>{item.cantidad}</span>
                                    <button disabled={confirmando || !persistenciaLista || (Boolean(operacion) && operacion.estado !== "RECHAZADO")} onClick={() => manejarCambioCantidad(item.id, item.cantidad + 1)}>+</button>
                                </div>

                                <Boton disabled={confirmando || !persistenciaLista || (Boolean(operacion) && operacion.estado !== "RECHAZADO")} variante="linea" onClick={() => manejarEliminar(item.id)}>
                                    Eliminar
                                </Boton>
                            </div>
                        ))}
                    </div>

                    <div className="carritoResumen">
                        <span>Total</span>
                        <Precio valor={total} />
                    </div>
                </>
            )}
        </Layout>
    );
}
