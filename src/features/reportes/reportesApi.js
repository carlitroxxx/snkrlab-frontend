import { API, apiFetch } from "../../api/httpClient";

export async function obtenerReportes(
    msalInstance,
    account,
    filtros,
    signal
) {
    if (!API.reportes) {
        throw new Error("Falta configurar VITE_API_REPORTES_URL.");
    }

    const parametros = new URLSearchParams();

    if (filtros.desde) parametros.set("desde", filtros.desde);
    if (filtros.hasta) parametros.set("hasta", filtros.hasta);

    const consulta = parametros.toString();
    const base = API.reportes.replace(/\/$/, "");
    const sufijo = consulta ? `?${consulta}` : "";
    const opciones = { msalInstance, account, signal };

    const resumen = await apiFetch(
        `${base}/resumen${sufijo}`,
        opciones
    );

    // obtenerToken puede iniciar una redirección de autenticación.
    if (!resumen || signal?.aborted) return null;

    const ventas = await apiFetch(
        `${base}/ventas${sufijo}`,
        opciones
    );

    if (!ventas || signal?.aborted) return null;

    return { resumen, ventas };
}