import { useEffect, useRef, useState } from "react";
import { useSesion } from "../features/auth/useSesion";
import { Link } from "react-router-dom";
import {
    obtenerMiCarrito,
    actualizarCantidad,
    eliminarItem,
    iniciarCheckout, pagarCheckout, confirmarCheckout,
} from "../features/carrito/carritoApi";
import { Layout } from "../components/Layout";
import { Precio } from "../components/Precio";
import { Boton } from "../components/Boton";
import { loginRequest } from "../features/auth/AuthConfig";
import { enviarComprobante } from "../features/ordenes/ordenesApi";

export function Carrito() {
    const { cuenta, cargandoSesion } = useSesion();
    if (cargandoSesion) return <Layout><p>Cargando sesión...</p></Layout>;
    return <CarritoUsuario key={cuenta?.homeAccountId || "visitante"} />;
}

function CarritoUsuario() {
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
    const [operacion, setOperacion] = useState(null);
    const [referencia, setReferencia] = useState("SIM_APROBADA_01");
    const [persistenciaLista, setPersistenciaLista] = useState(false);

    const [items, setItems] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);
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
        if (isAuthenticated) {
            cargarCarrito();
        } else {
            setCargando(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated]);

    const manejarCambioCantidad = async (itemId, cantidad) => {
        if (cantidad < 1 || ocupado.current || operacion) return;
        await actualizarCantidad(instance, accounts[0], itemId, cantidad);
        cargarCarrito();
    };

    const manejarEliminar = async (itemId) => {
        if (ocupado.current || operacion) return;
        await eliminarItem(instance, accounts[0], itemId);
        cargarCarrito();
    };

    useEffect(() => {
        if (!isAuthenticated) return;
        try {
            const guardada = localStorage.getItem(claveCheckout);
            if (guardada) {
                const datos = JSON.parse(guardada);
                if (!/^[0-9a-f-]{36}$/i.test(datos.checkoutId || "")
                    || !["SIM_APROBADA_01", "SIM_RECHAZADA_01"].includes(datos.referenciaPago))
                    throw new Error("La operación guardada no es válida.");
                setOperacion(datos);
                setReferencia(datos.referenciaPago);
            }
            setPersistenciaLista(true);
        } catch {
            setError("No se pudo recuperar el checkout guardado. No se iniciará otra compra.");
        }
    }, [claveCheckout, isAuthenticated]);

    const guardarOperacion = (datos) => {
        localStorage.setItem(claveCheckout, JSON.stringify(datos));
        if (vigente.current) setOperacion(datos);
    };

    const manejarCheckout = async () => {
        if (ocupado.current || !persistenciaLista || !accounts[0]) return;
        ocupado.current = true;
        setConfirmando(true);
        setError(null);
        let actual = operacion;
        try {
            // Persistir antes de enviar: un fallo de red nunca genera otro UUID.
            if (!actual) {
                actual = {
                    checkoutId: crypto.randomUUID(),
                    referenciaPago: referencia,
                    estado: "INICIADO",
                };
                guardarOperacion(actual);
            }
            const aceptar = (respuesta) => {
                if (!respuesta || respuesta.checkoutId !== actual.checkoutId
                    || !["INICIADO", "ORDEN_PENDIENTE", "PAGO_INCIERTO",
                        "PAGO_APROBADO", "RECHAZADO", "CONFIRMADO"].includes(respuesta.estado))
                    throw new Error("No se recibió un estado válido. Reintenta la misma operación.");
                actual = { ...actual, estado: respuesta.estado };
                guardarOperacion(actual);
                return respuesta;
            };
            let checkout;
            if (!["PAGO_APROBADO", "CONFIRMADO"].includes(actual.estado)) {
                checkout = aceptar(await iniciarCheckout(instance, accounts[0], actual.checkoutId));
                if (!vigente.current) return;
                if (["ORDEN_PENDIENTE", "PAGO_INCIERTO"].includes(checkout.estado)) {
                    actual = { ...actual, estado: "PAGO_INCIERTO" };
                    guardarOperacion(actual);
                    checkout = aceptar(await pagarCheckout(instance, accounts[0],
                        actual.checkoutId, actual.referenciaPago));
                }
                if (!vigente.current) return;
                if (checkout.estado === "RECHAZADO") {
                    setError(checkout.resultadoPago === "BLOQUEADO_FRAUDE"
                        ? "Pago bloqueado por el control antifraude. Tu carrito se conserva."
                        : "Pago rechazado. Tu carrito se conserva.");
                    return;
                }
            }
            if (["PAGO_APROBADO", "CONFIRMADO"].includes(actual.estado)) {
                // También recupera el comprobante tras recargar. Nunca repite el pago.
                checkout = aceptar(await confirmarCheckout(instance, accounts[0], actual.checkoutId));
            }
            if (!vigente.current) return;
            if (checkout?.estado !== "CONFIRMADO")
                throw new Error("Compra pendiente. Reintenta la misma operación.");
            const carrito = await obtenerMiCarrito(instance, accounts[0]);
            if (!Array.isArray(carrito))
                throw new Error("Compra confirmada; falta actualizar el carrito. Reintenta.");
            if (!vigente.current) return;
            setItems(carrito);
            localStorage.removeItem(claveCheckout);
            setOperacion(null);
            setResultadoCompra({
                ordenId: checkout.ordenId,
                mensaje: "Compra confirmada con pago simulado aprobado.",
                items: checkout.articulos,
                cantidadItems: checkout.articulos.length,
                total: checkout.importePago,
            });
        } catch (err) {
            if (vigente.current) setError(err.message + " La operación se conserva para reintentar.");
        } finally {
            ocupado.current = false;
            if (vigente.current) setConfirmando(false);
        }
    };

    const nuevaCompraTrasRechazo = () => {
        if (ocupado.current || operacion?.estado !== "RECHAZADO") return;
        try {
            localStorage.removeItem(claveCheckout);
            setOperacion(null);
            setError(null);
        } catch {
            setError("No se pudo liberar el intento rechazado.");
        }
    };
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
                    <Link to="/"><Boton>Seguir comprando</Boton></Link>
                </div>
            </Layout>
        );
    }

    const total = items.reduce((acc, item) => acc + item.precioUnitario * item.cantidad, 0);

    return (
        <Layout>
            <h2>Carrito</h2>

            {error && <p className="carritoError">{error}</p>}

            {(items.length > 0 || operacion) && (
                <div className="carritoResumen">
                    <label htmlFor="pagoSimulado">Pago simulado</label>
                    <select id="pagoSimulado" value={referencia}
                        disabled={confirmando || Boolean(operacion) || !persistenciaLista}
                        onChange={(event) => setReferencia(event.target.value)}>
                        <option value="SIM_APROBADA_01">Simular pago aprobado</option>
                        <option value="SIM_RECHAZADA_01">Simular pago rechazado</option>
                    </select>
                    {operacion?.estado === "RECHAZADO" ? (
                        <div>
                            <p role="status">Pago rechazado o bloqueado. El carrito se conserva.</p>
                            <Boton disabled={confirmando} onClick={nuevaCompraTrasRechazo}>
                                Preparar una nueva compra
                            </Boton>
                        </div>
                    ) : (
                        <Boton onClick={manejarCheckout} disabled={confirmando || !persistenciaLista}>
                            {confirmando ? "Procesando..." :
                                ["PAGO_APROBADO", "CONFIRMADO"].includes(operacion?.estado)
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
                                <div className="carritoItemInfo">
                                    <span className="carritoItemId">ID: {item.productoId}</span>
                                    <span className="carritoItemNombre">{item.nombreProducto}</span>
                                    <Precio valor={item.precioUnitario} />
                                </div>

                                <div className="carritoItemCantidad">
                                    <button disabled={confirmando || Boolean(operacion)} onClick={() => manejarCambioCantidad(item.id, item.cantidad - 1)}>-</button>
                                    <span>{item.cantidad}</span>
                                    <button disabled={confirmando || Boolean(operacion)} onClick={() => manejarCambioCantidad(item.id, item.cantidad + 1)}>+</button>
                                </div>

                                <Boton disabled={confirmando || Boolean(operacion)} variante="linea" onClick={() => manejarEliminar(item.id)}>
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