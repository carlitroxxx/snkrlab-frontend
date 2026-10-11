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
    const [pausado, setPausado] = useState(false);
    const [error, setError] = useState("");

    const operacion = useRef(null);

    const id = exportacion?.id;
    const estado = exportacion?.estado;
    const pendiente = estado === "PENDIENTE";

    function obtenerCuenta() {
        return instance.getAllAccounts().find(
            (cuenta) => cuenta.homeAccountId === cuentaId
        );
    }

    // Cancela una solicitud o descarga si se desmonta el componente.
    useEffect(() => {
        return () => operacion.current?.abort();
    }, []);

    useEffect(() => {
        if (!id || estado !== "PENDIENTE" || pausado) return;

        const controller = new AbortController();
        let temporizador;
        let intentos = 0;

        const cuenta = instance.getAllAccounts().find(
            (actual) => actual.homeAccountId === cuentaId
        );

        async function revisar() {
            try {
                const resultado = await consultarExportacion(
                    instance,
                    cuenta,
                    id,
                    controller.signal
                );

                if (controller.signal.aborted) return;

                if (!["PENDIENTE", "LISTO", "ERROR"].includes(resultado.estado)) {
                    throw new Error("El servidor devolvió un estado desconocido.");
                }

                setExportacion(resultado);

                if (resultado.estado !== "PENDIENTE") {
                    return;
                }

                intentos += 1;

                if (intentos >= 40) {
                    setPausado(true);
                    return;
                }

                temporizador = setTimeout(revisar, 3000);
            } catch (err) {
                if (controller.signal.aborted) return;

                setError(`No se pudo consultar el estado: ${err.message}`);
                setPausado(true);
            }
        }

        temporizador = setTimeout(revisar, 3000);

        return () => {
            clearTimeout(temporizador);
            controller.abort();
        };
    }, [instance, cuentaId, id, estado, pausado]);

    async function solicitar(tipo) {
        if (operacion.current || pendiente || bloqueado) return;

        const controller = new AbortController();
        operacion.current = controller;

        setEnviando(true);
        setError("");
        setPausado(false);
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
                setError(`No se pudo solicitar el archivo: ${err.message}`);
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
                setError(`No se pudo descargar el archivo: ${err.message}`);
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
        bloqueado || enviando || pendiente || descargando;

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

            <div role="status" aria-live="polite">
                {enviando && <p>Enviando solicitud...</p>}

                {pendiente && !pausado && (
                    <p>Generando archivo… Te avisaremos aquí cuando esté listo.</p>
                )}

                {pendiente && pausado && (
                    <p>
                        La revisión automática está pausada.
                        Puedes volver a consultar el estado.
                    </p>
                )}

                {estado === "LISTO" && (
                    <p className="reportesArchivoListo">
                        Tu archivo está listo: {exportacion.nombreArchivo}
                    </p>
                )}
            </div>

            {pendiente && pausado && (
                <Boton
                    type="button"
                    variante="linea"
                    onClick={() => {
                        setError("");
                        setPausado(false);
                    }}
                >
                    Volver a consultar estado
                </Boton>
            )}

            {estado === "LISTO" && (
                <Boton
                    type="button"
                    onClick={descargar}
                    disabled={descargando}
                >
                    {descargando ? "Descargando..." : "Descargar CSV"}
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