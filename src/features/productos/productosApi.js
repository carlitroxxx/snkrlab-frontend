import { API, apiFetch } from "../../api/httpClient.js";

export function listarProductos() {
    return apiFetch(API.productos);
}

export function obtenerProducto(id, msalInstance, account) {
    return apiFetch(`${API.productos}/${id}`, { msalInstance, account });
}
