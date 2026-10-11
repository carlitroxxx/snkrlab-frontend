import { API, obtenerToken } from "../../api/httpClient";

async function peticion(instance, account, ruta, opciones = {}) {
    if (!API.reportes) {
        throw new Error("Falta configurar VITE_API_REPORTES_URL.");
    }

    if (!account) {
        throw new Error("Inicia sesión nuevamente.");
    }

    const token = await obtenerToken(instance, account);

    if (!token) {
        throw new Error("Completa el inicio de sesión para continuar.");
    }

    opciones.signal?.throwIfAborted();

    const base = API.reportes.replace(/\/$/, "");

    const respuesta = await fetch(
        `${base}/exportaciones${ruta}`,
        {
            ...opciones,
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
    );

    if (!respuesta.ok) {
        let mensaje = `Error ${respuesta.status}`;

        try {
            const cuerpo = await respuesta.json();
            mensaje =
                cuerpo.detail ||
                cuerpo.mensaje ||
                cuerpo.message ||
                mensaje;
        } catch {
            // Conserva el código HTTP si no hay respuesta JSON.
        }

        throw new Error(mensaje);
    }

    return respuesta;
}

export async function solicitarExportacion(
    instance,
    account,
    tipo,
    filtros,
    signal
) {
    const parametros = new URLSearchParams({ tipo });

    if (filtros.desde) parametros.set("desde", filtros.desde);
    if (filtros.hasta) parametros.set("hasta", filtros.hasta);

    const respuesta = await peticion(
        instance,
        account,
        `?${parametros}`,
        { method: "POST", signal }
    );

    return respuesta.json();
}

export async function consultarExportacion(
    instance,
    account,
    id,
    signal
) {
    const respuesta = await peticion(
        instance,
        account,
        `/${encodeURIComponent(id)}`,
        { signal }
    );

    return respuesta.json();
}

export async function descargarExportacion(
    instance,
    account,
    exportacion,
    signal
) {
    const respuesta = await peticion(
        instance,
        account,
        `/${encodeURIComponent(exportacion.id)}/archivo`,
        { signal }
    );

    const archivo = await respuesta.blob();
    signal?.throwIfAborted();

    const url = URL.createObjectURL(archivo);
    const enlace = document.createElement("a");

    enlace.href = url;
    enlace.download = exportacion.nombreArchivo || "reporte.csv";

    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
}