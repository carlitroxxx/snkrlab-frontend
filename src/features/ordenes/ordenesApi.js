import { API, apiFetch } from "../../api/httpClient";

export function enviarComprobante(msalInstance, account, ordenId, correo) {
    return apiFetch(`${API.ordenes}/${ordenId}/comprobante`, {
        msalInstance,
        account,
        method: "POST",
        body: JSON.stringify({ correo }),
    });
}
export function obtenerMisOrdenes(msalInstance, account) {
    return apiFetch(API.ordenes, {
        msalInstance,
        account,
    });
}