import { API, apiFetch } from "../../api/httpClient.js";

// Compartir solo peticiones en curso; no almacenar resultados privados.
const pendientes = new Map();

export function obtenerRecomendaciones(msalInstance, account) {
    if (!account || !API.recomendaciones) return Promise.resolve([]);
    const clave = account.homeAccountId;
    if (!pendientes.has(clave)) {
        const solicitud = apiFetch(API.recomendaciones, {
            msalInstance,
            account,
            signal: AbortSignal.timeout(8000),
        })
            .then((datos) => Array.isArray(datos) ? datos : [])
            .finally(() => pendientes.delete(clave));
        pendientes.set(clave, solicitud);
    }
    return pendientes.get(clave);
}
