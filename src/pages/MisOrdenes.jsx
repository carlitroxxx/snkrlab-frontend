import { useEffect, useState } from "react";
import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { Link } from "react-router-dom";
import { Layout } from "../components/Layout";
import { Boton } from "../components/Boton";
import { Precio } from "../components/Precio";
import { loginRequest } from "../features/auth/AuthConfig";
import {
    obtenerMisOrdenes,
    enviarComprobante,
} from "../features/ordenes/ordenesApi";

function formatearFecha(fecha) {
    if (!fecha) return "Fecha no disponible";

    const valor = new Date(fecha);

    if (Number.isNaN(valor.getTime())) return "Fecha no disponible";

    return valor.toLocaleString("es-CL", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function TarjetaOrden({ orden, instance, account }) {
    const [correo, setCorreo] = useState("");
    const [enviando, setEnviando] = useState(false);
    const [mensaje, setMensaje] = useState("");
    const [error, setError] = useState("");

    const items = orden.items || [];
    const unidades = items.reduce(
        (total, item) => total + item.cantidad,
        0
    );

    const manejarEnvio = async (event) => {
        event.preventDefault();

        if (enviando) return;

        setError("");
        setMensaje("");

        if (!account) {
            setError("Necesitas iniciar sesión nuevamente.");
            return;
        }

        setEnviando(true);

        try {
            const respuesta = await enviarComprobante(
                instance,
                account,
                orden.id,
                correo.trim()
            );

            if (!respuesta) return;

            setMensaje(respuesta.mensaje);
        } catch (err) {
            setError(
                "No se pudo solicitar el comprobante: " + err.message
            );
        } finally {
            setEnviando(false);
        }
    };

    return (
        <details className="ordenTarjeta">
            <summary className="ordenResumen">
                <div className="ordenIdentificacion">
                    <span className="ordenNumero">
                        Orden #{orden.id}
                    </span>

                    <time
                        className="ordenFecha"
                        dateTime={orden.fecha}
                    >
                        {formatearFecha(orden.fecha)}
                    </time>
                </div>

                <span className="ordenEstado">
                    {orden.estado}
                </span>

                <div className="ordenImporte">
                    <span className="ordenTextoTenue">
                        {unidades} {unidades === 1 ? "unidad" : "unidades"}
                    </span>

                    <Precio valor={orden.total} />
                </div>

                <span className="ordenDesplegar">
                    <span className="ordenVer">Ver detalle</span>
                    <span className="ordenOcultar">Ocultar detalle</span>
                    <span className="ordenFlecha" aria-hidden="true">⌄</span>
                </span>
            </summary>

            <div className="ordenContenido">
                <h3>Detalle de la compra</h3>

                <div
                    className="ordenTablaContenedor"
                    role="region"
                    aria-label={`Productos de la orden ${orden.id}`}
                    tabIndex={0}
                >
                    <table className="ordenTabla">
                        <caption className="ordenSoloLectores">
                            Productos de la orden {orden.id}
                        </caption>

                        <thead>
                        <tr>
                            <th scope="col">Producto</th>
                            <th scope="col">Cantidad</th>
                            <th scope="col">Precio unitario</th>
                            <th scope="col">Subtotal</th>
                        </tr>
                        </thead>

                        <tbody>
                        {items.map((item, index) => (
                            <tr key={`${item.productoId}-${index}`}>
                                <td>
                                        <span className="ordenProductoNombre">
                                            {item.nombreProducto}
                                        </span>
                                    <span className="ordenTextoTenue">
                                            Producto #{item.productoId}
                                        </span>
                                </td>

                                <td>{item.cantidad}</td>

                                <td>
                                    <Precio valor={item.precioUnitario} />
                                </td>

                                <td>
                                    <Precio valor={item.subtotal} />
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>

                <div className="ordenTotal">
                    <span>Total de la compra</span>
                    <Precio valor={orden.total} />
                </div>

                <div className="ordenCorreo">
                    <div>
                        <h3>Tu comprobante por correo</h3>
                        <p className="ordenTextoTenue">
                            Ingresa el correo donde quieres recibir
                            los detalles de esta compra.
                        </p>
                    </div>

                    <form onSubmit={manejarEnvio}>
                        <label htmlFor={`correo-orden-${orden.id}`}>
                            Correo electrónico
                        </label>

                        <div className="ordenCorreoCampos">
                            <input
                                id={`correo-orden-${orden.id}`}
                                name="correo"
                                type="email"
                                autoComplete="email"
                                placeholder="tu-correo@ejemplo.com"
                                value={correo}
                                onChange={(event) => {
                                    setCorreo(event.target.value);
                                    setMensaje("");
                                    setError("");
                                }}
                                maxLength={254}
                                required
                                disabled={enviando}
                            />

                            <Boton type="submit" disabled={enviando}>
                                {enviando
                                    ? "Solicitando envío..."
                                    : "Enviar comprobante"}
                            </Boton>
                        </div>

                        {mensaje && (
                            <p className="ordenMensaje" role="status">
                                {mensaje}
                            </p>
                        )}

                        {error && (
                            <p className="carritoError" role="alert">
                                {error}
                            </p>
                        )}
                    </form>
                </div>
            </div>
        </details>
    );
}

export function MisOrdenes() {
    const { instance, accounts } = useMsal();
    const isAuthenticated = useIsAuthenticated();
    const account = accounts[0];

    const [ordenes, setOrdenes] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");
    const [recarga, setRecarga] = useState(0);

    useEffect(() => {
        let activo = true;

        async function cargarOrdenes() {
            setOrdenes([]);
            setError("");

            if (!isAuthenticated || !account) {
                setCargando(false);
                return;
            }

            setCargando(true);

            try {
                const respuesta = await obtenerMisOrdenes(
                    instance,
                    account
                );

                if (!activo || respuesta === null) return;

                setOrdenes(respuesta);
            } catch (err) {
                if (activo) {
                    setError("No se pudieron cargar tus órdenes: " + err.message);
                }
            } finally {
                if (activo) setCargando(false);
            }
        }

        cargarOrdenes();

        return () => {
            activo = false;
        };
    }, [instance, account, isAuthenticated, recarga]);

    if (!isAuthenticated) {
        return (
            <Layout>
                <h2>Mis órdenes</h2>

                <div className="ordenVacio">
                    <h3>Consulta tus compras</h3>
                    <p className="ordenTextoTenue">
                        Inicia sesión para consultar tus órdenes
                        y solicitar sus comprobantes.
                    </p>

                    <Boton
                        onClick={() => instance.loginRedirect(loginRequest)}
                    >
                        Iniciar sesión
                    </Boton>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="ordenCabecera">
                <div>
                    <h2>Mis órdenes</h2>
                    <p className="ordenTextoTenue">
                        Revisa tus compras y solicita sus comprobantes.
                    </p>
                </div>

                <Boton
                    variante="linea"
                    disabled={cargando}
                    onClick={() => setRecarga((valor) => valor + 1)}
                >
                    {cargando ? "Cargando..." : "Actualizar"}
                </Boton>
            </div>

            {cargando ? (
                <div className="ordenVacio" role="status">
                    <p>Cargando tus órdenes...</p>
                </div>
            ) : error ? (
                <div className="ordenVacio">
                    <p className="carritoError" role="alert">{error}</p>
                    <Boton onClick={() => setRecarga((valor) => valor + 1)}>
                        Reintentar
                    </Boton>
                </div>
            ) : ordenes.length === 0 ? (
                <div className="ordenVacio">
                    <h3>Aún no tienes órdenes</h3>
                    <p className="ordenTextoTenue">
                        Cuando confirmes una compra, podrás consultarla aquí.
                    </p>
                    <Link to="/" className="boton botonPrimario">
                        Explorar catálogo
                    </Link>
                </div>
            ) : (
                <>
                    <p className="ordenTextoTenue">
                        {ordenes.length}{" "}
                        {ordenes.length === 1
                            ? "orden registrada"
                            : "órdenes registradas"}
                    </p>

                    <div className="ordenLista">
                        {ordenes.map((orden) => (
                            <TarjetaOrden
                                key={`${account?.homeAccountId}-${orden.id}`}
                                orden={orden}
                                instance={instance}
                                account={account}
                            />
                        ))}
                    </div>
                </>
            )}
        </Layout>
    );
}