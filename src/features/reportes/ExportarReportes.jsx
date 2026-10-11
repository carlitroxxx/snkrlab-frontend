import { useEffect, useRef, useState } from "react";
import { Boton } from "../../components/Boton";
import {
    solicitarExportacion,
    consultarExportacion,
    descargarExportacion,
} from "./exportacionesApi";

export function ExportarReportes({
                                     instance,
                                     cuentaId,
                                     filtros,
                                     bloqueado = false,
                                 }) {
    const [exportacion, setExportacion] = useState(null);
    const [enviando, setEnviando] = useState(false);
    const [descargando, setDescargando] = useState(false);
    const [reconectando, setReconectando] = useState(false);
    const [seguimientoFallido, setSeguimientoFallido] = useState(false);
    const [error, setError] = useState("");

    const operacion = useRef(null);

    const id = exportacion?.id;
    const estado = exportacion?.estado;

    const esperando =
        estado === "PENDIENTE" && !seguimientoFallido;

    function obtenerCuenta() {
        return instance.getAllAccounts().find(
            (cuenta) => cuenta.homeAccountId === cuentaId
        );
    }

    useEffect(() => {
        return () => operacion.current?.abort();
    }, []);

    useEffect(() => {
        if (!id || estado !== "PENDIENTE" || seguimientoFallido) {
            return;
        }

        const controller = new AbortController();
        let temporizador;

        async function revisar() {
            try {
                const cuenta = instance.getAllAccounts().find(
                    (actual) => actual.homeAccountId === cuentaId
                );

                const resultado = await consultarExportacion(
                    instance,
                    cuenta,
                    id,
                    controller.signal
                );

                if (controller.signal.aborted) return;

                if (!["PENDIENTE", "LISTO", "ERROR"].includes(resultado.estado)) {
                    throw new Error(
                        "El servidor devolvió un estado desconocido."
                    );
                }

                setReconectando(false);
                setExportacion(resultado);

                // Solo programa otra consulta si sigue pendiente.
                if (resultado.estado === "PENDIENTE") {
                    temporizador = setTimeout(revisar, 3000);
                }
            } catch (err) {
                if (controller.signal.aborted) return;

                const temporal =
                    err instanceof TypeError ||
                    err.status === 408 ||
                    err.status === 429 ||
                    err.status >= 500;

                if (temporal) {
                    // Mantiene la animación y reintenta automáticamente.
                    setReconectando(true);
                    temporizador = setTimeout(revisar, 5000);
                    return;
                }

                // Los errores definitivos detienen el seguimiento.
                setReconectando(false);
                setSeguimientoFallido(true);

                if (err.status === 401 || err.status === 403) {
                    setError(
                        "No se pudo verificar la solicitud. Revisa tu sesión y tus permisos."
                    );
                } else if (err.status === 404) {
                    setError(
                        "La solicitud ya no está disponible. Solicita una nueva exportación."
                    );
                } else {
                    setError(
                        err.message || "No se pudo consultar la exportación."
                    );
                }
            }
        }

        temporizador = setTimeout(revisar, 3000);

        return () => {
            clearTimeout(temporizador);
            controller.abort();
        };
    }, [instance, cuentaId, id, estado, seguimientoFallido]);

    async function solicitar(tipo) {
        if (operacion.current || esperando || bloqueado) return;

        const controller = new AbortController();
        operacion.current = controller;

        setEnviando(true);
        setError("");
        setReconectando(false);
        setSeguimientoFallido(false);
        setExportacion(null);

        try {
            const resultado = await solicitarExportacion(
                instance,
                obtenerCuenta(),
                tipo,
                filtros,
                controller.signal
            );

            if (!controller.signal.aborted) {
                setExportacion(resultado);
            }
        } catch (err) {
            if (!controller.signal.aborted) {
                setError(
                    `No se pudo confirmar la solicitud del archivo: ${err.message}`
                );
            }
        } finally {
            if (operacion.current === controller) {
                operacion.current = null;
            }

            if (!controller.signal.aborted) {
                setEnviando(false);
            }
        }
    }

    async function descargar() {
        if (operacion.current || estado !== "LISTO") return;

        const controller = new AbortController();
        operacion.current = controller;

        setDescargando(true);
        setError("");

        try {
            await descargarExportacion(
                instance,
                obtenerCuenta(),
                exportacion,
                controller.signal
            );
        } catch (err) {
            if (!controller.signal.aborted) {
                setError(
                    `No se pudo descargar el archivo: ${err.message}`
                );
            }
        } finally {
            if (operacion.current === controller) {
                operacion.current = null;
            }

            if (!controller.signal.aborted) {
                setDescargando(false);
            }
        }
    }

    const botonesDeshabilitados =
        bloqueado || enviando || esperando || descargando;

    return (
        <section className="reportesExportacion">
            <h3>Descargar reportes</h3>

            <p className="reportesPeriodo">
                Los archivos usan el período aplicado con Consultar.
                Para cambiarlo, consulta primero las nuevas fechas.
            </p>

            <div className="reportesExportacionAcciones">
                <Boton
                    type="button"
                    onClick={() => solicitar("VENTAS")}
                    disabled={botonesDeshabilitados}
                >
                    Exportar ventas
                </Boton>

                <Boton
                    type="button"
                    variante="linea"
                    onClick={() => solicitar("RESUMEN")}
                    disabled={botonesDeshabilitados}
                >
                    Exportar resumen
                </Boton>
            </div>

            <div role="status" aria-live="polite" aria-atomic="true">
                {(enviando || esperando) && (
                    <div className="exportacionEstado">
                        <span
                            className="exportacionSpinner"
                            aria-hidden="true"
                        />

                        <div>
                            <p className="exportacionEstadoTitulo">
                                {enviando
                                    ? "Enviando solicitud…"
                                    : "Preparando tu archivo…"}
                            </p>

                            <p className="reportesPeriodo">
                                {reconectando
                                    ? "Restableciendo conexión con el servidor. Seguimos esperando tu archivo."
                                    : "La descarga estará disponible aquí cuando termine."}
                            </p>
                        </div>
                    </div>
                )}

                {estado === "LISTO" && (
                    <div className="exportacionEstado">
                        <span
                            className="exportacionCheck"
                            aria-hidden="true"
                        >
                            ✓
                        </span>

                        <div>
                            <p className="reportesArchivoListo">
                                Tu archivo está listo
                            </p>
                            <p className="reportesPeriodo">
                                {exportacion.nombreArchivo}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {estado === "LISTO" && (
                <Boton
                    type="button"
                    onClick={descargar}
                    disabled={descargando}
                >
                    {descargando ? "Descargando…" : "Descargar CSV"}
                </Boton>
            )}

            {estado === "ERROR" && (
                <p className="reportesError" role="alert">
                    {exportacion.error || "No se pudo generar el archivo."}
                </p>
            )}

            {error && (
                <p className="reportesError" role="alert">
                    {error}
                </p>
            )}
        </section>
    );
}