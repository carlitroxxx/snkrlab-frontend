import { useEffect, useState } from "react";
import { useMsal } from "@azure/msal-react";
import { Layout } from "../components/Layout";
import { Boton } from "../components/Boton";
import { obtenerReportes } from "../features/reportes/reportesApi";

const moneda = new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
});

function fechaTexto(valor) {
    if (!valor) return "—";

    // Conserva la fecha del backend sin convertirla a otra zona horaria.
    const [fecha, hora] = valor.split("T");
    const [anio, mes, dia] = fecha.split("-");

    return `${dia}/${mes}/${anio}${hora ? ` ${hora.slice(0, 5)}` : ""}`;
}

function Tabla({ columnas, filas }) {
    return (
        <div className="reportesTablaContenedor">
            <table className="reportesTabla">
                <thead>
                <tr>
                    {columnas.map((columna) => (
                        <th key={columna} scope="col">
                            {columna}
                        </th>
                    ))}
                </tr>
                </thead>
                <tbody>
                {filas.map((fila) => (
                    <tr key={fila.id}>
                        {fila.celdas.map((celda, indice) => (
                            <td key={indice}>{celda}</td>
                        ))}
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
}

export function Reportes() {
    const { instance, accounts } = useMsal();
    const account = instance.getActiveAccount() || accounts[0];
    const cuentaId = account?.homeAccountId;

    const [desde, setDesde] = useState("");
    const [hasta, setHasta] = useState("");
    const [consulta, setConsulta] = useState({ desde: "", hasta: "" });
    const [resultado, setResultado] = useState(null);
    const [error, setError] = useState("");
    const [validacion, setValidacion] = useState("");

    useEffect(() => {
        if (!cuentaId) return;

        const cuenta = instance
            .getAllAccounts()
            .find((actual) => actual.homeAccountId === cuentaId);

        if (!cuenta) return;

        const controller = new AbortController();

        obtenerReportes(instance, cuenta, consulta, controller.signal)
            .then((datos) => {
                if (datos && !controller.signal.aborted) {
                    setResultado({
                        ...datos,
                        consulta,
                        cuentaId,
                    });
                    setError("");
                }
            })
            .catch((err) => {
                if (!controller.signal.aborted) {
                    setError(
                        err.message || "No se pudieron cargar los reportes."
                    );
                }
            });

        return () => controller.abort();
    }, [instance, cuentaId, consulta]);

    const datosActuales =
        resultado?.consulta === consulta &&
        resultado?.cuentaId === account?.homeAccountId;

    const cargando = Boolean(account) && !error && !datosActuales;

    function aplicarFiltros(event) {
        event.preventDefault();

        if (desde && hasta && desde > hasta) {
            setValidacion("La fecha desde no puede ser posterior a hasta.");
            return;
        }

        setValidacion("");
        setError("");
        setConsulta({ desde, hasta });
    }

    function limpiarFiltros() {
        setDesde("");
        setHasta("");
        setValidacion("");
        setError("");
        setConsulta({ desde: "", hasta: "" });
    }

    const resumen = resultado?.resumen;
    const ventas = resultado?.ventas || [];

    return (
        <Layout>
            <div className="reportes">
                <h2>Reportes de ventas</h2>

                {!account ? (
                    <p>Inicia sesión para consultar los reportes.</p>
                ) : (
                    <>
                        <form className="reportesFiltros" onSubmit={aplicarFiltros}>
                            <div className="reporteCampoFecha">
                                <label htmlFor="reporteDesde">Desde</label>
                                <input
                                    id="reporteDesde"
                                    type="date"
                                    value={desde}
                                    onChange={(e) => setDesde(e.target.value)}
                                />
                            </div>

                            <div className="reporteCampoFecha">
                                <label htmlFor="reporteHasta">Hasta</label>
                                <input
                                    id="reporteHasta"
                                    type="date"
                                    value={hasta}
                                    onChange={(e) => setHasta(e.target.value)}
                                />
                            </div>

                            <Boton type="submit" disabled={cargando}>
                                {cargando ? "Cargando..." : "Consultar"}
                            </Boton>

                            <Boton
                                type="button"
                                variante="linea"
                                onClick={limpiarFiltros}
                                disabled={cargando}
                            >
                                Limpiar
                            </Boton>
                        </form>

                        {validacion && (
                            <p className="reportesError" role="alert">
                                {validacion}
                            </p>
                        )}

                        {error && (
                            <p className="reportesError" role="alert">
                                No se pudieron cargar los reportes: {error}.
                                Puedes volver a presionar Consultar.
                            </p>
                        )}

                        {cargando && (
                            <p role="status">Consultando ventas...</p>
                        )}

                        {!error && datosActuales && resumen && (
                            <>
                                <p className="reportesPeriodo">
                                    Período:{" "}
                                    {consulta.desde
                                        ? fechaTexto(consulta.desde)
                                        : "desde el inicio"}
                                    {" — "}
                                    {consulta.hasta
                                        ? fechaTexto(consulta.hasta)
                                        : "hasta la última venta registrada"}
                                </p>

                                <div className="reportesIndicadores">
                                    <article>
                                        <span>Total vendido</span>
                                        <strong>
                                            {moneda.format(resumen.totalVentas)}
                                        </strong>
                                    </article>
                                    <article>
                                        <span>Órdenes registradas</span>
                                        <strong>{resumen.cantidadOrdenes}</strong>
                                    </article>
                                    <article>
                                        <span>Unidades vendidas</span>
                                        <strong>{resumen.unidadesVendidas}</strong>
                                    </article>
                                </div>

                                {ventas.length === 0 ? (
                                    <p>No hay ventas registradas en este período.</p>
                                ) : (
                                    <>
                                        <section className="reportesSeccion">
                                            <h3>Ventas por día</h3>
                                            <Tabla
                                                columnas={["Fecha", "Órdenes", "Total"]}
                                                filas={resumen.ventasPorDia.map((dia) => ({
                                                    id: dia.fecha,
                                                    celdas: [
                                                        fechaTexto(dia.fecha),
                                                        dia.cantidadOrdenes,
                                                        moneda.format(dia.total),
                                                    ],
                                                }))}
                                            />
                                        </section>

                                        <section className="reportesSeccion">
                                            <h3>Productos más vendidos</h3>
                                            <Tabla
                                                columnas={["Producto", "Unidades", "Total"]}
                                                filas={resumen.productosMasVendidos.map(
                                                    (producto) => ({
                                                        id: producto.productoId,
                                                        celdas: [
                                                            producto.nombreProducto,
                                                            producto.unidadesVendidas,
                                                            moneda.format(producto.totalVentas),
                                                        ],
                                                    })
                                                )}
                                            />
                                        </section>

                                        <section className="reportesSeccion">
                                            <h3>Listado de ventas</h3>
                                            {ventas.map((venta) => (
                                                <details
                                                    className="reportesVenta"
                                                    key={venta.ordenId}
                                                >
                                                    <summary>
                                                        <span>Orden #{venta.ordenId}</span>
                                                        <span>{fechaTexto(venta.fecha)}</span>
                                                        <strong>
                                                            {moneda.format(venta.total)}
                                                        </strong>
                                                    </summary>

                                                    <Tabla
                                                        columnas={[
                                                            "Producto",
                                                            "Cantidad",
                                                            "Precio unitario",
                                                            "Subtotal",
                                                        ]}
                                                        filas={venta.items.map((item, indice) => ({
                                                            id: `${item.productoId}-${indice}`,
                                                            celdas: [
                                                                item.nombreProducto,
                                                                item.cantidad,
                                                                moneda.format(item.precioUnitario),
                                                                moneda.format(item.subtotal),
                                                            ],
                                                        }))}
                                                    />
                                                </details>
                                            ))}
                                        </section>
                                    </>
                                )}
                            </>
                        )}
                    </>
                )}
            </div>
        </Layout>
    );
}