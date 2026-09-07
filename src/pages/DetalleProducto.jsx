import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { obtenerProducto } from "../features/productos/productosApi";
import { agregarAlCarrito } from "../features/carrito/carritoApi";
import { loginRequest } from "../features/auth/AuthConfig";
import { Layout } from "../components/Layout";
import { Precio } from "../components/Precio";
import { Etiqueta } from "../components/Etiqueta";
import { Boton } from "../components/Boton";

export function DetalleProducto() {
    const { id } = useParams();
    const { instance, accounts } = useMsal();
    const isAuthenticated = useIsAuthenticated();

    const [producto, setProducto] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);
    const [agregando, setAgregando] = useState(false);
    const [mensaje, setMensaje] = useState(null);

    useEffect(() => {
        setCargando(true);
        obtenerProducto(id)
            .then(setProducto)
            .catch((err) => setError(err.message))
            .finally(() => setCargando(false));
    }, [id]);

    const manejarAgregar = async () => {
        if (!isAuthenticated) {
            instance.loginRedirect(loginRequest);
            return;
        }

        setAgregando(true);
        setMensaje(null);
        try {
            await agregarAlCarrito(instance, accounts[0], {
                productoId: producto.id,
                cantidad: 1,
            });
            setMensaje("Agregado al carrito.");
        } catch (err) {
            setMensaje("Error al agregar: " + err.message);
        } finally {
            setAgregando(false);
        }
    };

    if (cargando) return <Layout><p>Cargando producto...</p></Layout>;
    if (error) return <Layout><p>Error al cargar el producto: {error}</p></Layout>;
    if (!producto) return <Layout><p>Producto no encontrado.</p></Layout>;

    const agotado = producto.stock === 0;

    return (
        <Layout>
            <Link to="/" className="volverCatalogo">&larr; Volver al catálogo</Link>

            <div className="detalleProducto">
                <div className="detalleProductoImagen">
                    <img src={producto.imagen} alt={producto.nombre} />
                    {agotado && <Etiqueta tono="alerta">Agotado</Etiqueta>}
                </div>

                <div className="detalleProductoInfo">
                    <span className="detalleProductoMarca">{producto.marca}</span>
                    <h2>{producto.nombre}</h2>
                    <p className="detalleProductoModelo">Modelo: {producto.modelo}</p>
                    <p className="detalleProductoDescripcion">{producto.descripcion}</p>

                    <div className="detalleProductoPrecioFila">
                        <Precio valor={producto.precio} />
                        <span className="detalleProductoStock">
                            {agotado ? "Sin stock" : `${producto.stock} disponibles`}
                        </span>
                    </div>

                    <Boton disabled={agotado || agregando} onClick={manejarAgregar}>
                        {agotado ? "Agotado" : agregando ? "Agregando..." : "Agregar al carrito"}
                    </Boton>

                    {mensaje && <p className="detalleProductoMensaje">{mensaje}</p>}
                </div>
            </div>
        </Layout>
    );
}