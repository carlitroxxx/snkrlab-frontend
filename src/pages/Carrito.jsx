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

export function Carrito() {
    const { instance, accounts } = useMsal();
    const isAuthenticated = useIsAuthenticated();
    const navigate = useNavigate();

    const [items, setItems] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);
    const [confirmando, setConfirmando] = useState(false);
    const [resultadoCompra, setResultadoCompra] = useState(null);

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
                    <p>{resultadoCompra.mensaje}</p>
                    <p>Items comprados: {resultadoCompra.cantidadItems}</p>
                    <p><Precio valor={resultadoCompra.total} /></p>
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
                                    <span>Producto #{item.productoId}</span>
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