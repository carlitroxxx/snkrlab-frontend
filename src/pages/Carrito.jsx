import { useEffect, useState } from "react";
import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { Link, useNavigate } from "react-router-dom";
import {
    obtenerMiCarrito,
    actualizarCantidad,
    eliminarItem,
    confirmarCompra,
} from "../features/carrito/carritoApi";
import { Layout } from "../components/Layout";
import { Precio } from "../components/Precio";
import { Boton } from "../components/Boton";
import { loginRequest } from "../features/auth/AuthConfig";
import { enviarComprobante } from "../features/ordenes/ordenesApi";

export function Carrito() {
    const { instance, accounts } = useMsal();
    const isAuthenticated = useIsAuthenticated();
    const navigate = useNavigate();

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
        if (cantidad < 1) return;
        await actualizarCantidad(instance, accounts[0], itemId, cantidad);
        cargarCarrito();
    };

    const manejarEliminar = async (itemId) => {
        await eliminarItem(instance, accounts[0], itemId);
        cargarCarrito();
    };

    const manejarCheckout = async () => {
        setConfirmando(true);
        try {
            const resultado = await confirmarCompra(instance, accounts[0]);
            setResultadoCompra(resultado);
            setItems([]);
        } catch (err) {
            setError("Error al confirmar la compra: " + err.message);
        } finally {
            setConfirmando(false);
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
                                    <button onClick={() => manejarCambioCantidad(item.id, item.cantidad - 1)}>-</button>
                                    <span>{item.cantidad}</span>
                                    <button onClick={() => manejarCambioCantidad(item.id, item.cantidad + 1)}>+</button>
                                </div>

                                <Boton variante="linea" onClick={() => manejarEliminar(item.id)}>
                                    Eliminar
                                </Boton>
                            </div>
                        ))}
                    </div>

                    <div className="carritoResumen">
                        <span>Total</span>
                        <Precio valor={total} />
                    </div>

                    <Boton onClick={manejarCheckout} disabled={confirmando}>
                        {confirmando ? "Confirmando..." : "Confirmar compra"}
                    </Boton>
                </>
            )}
        </Layout>
    );
}