import { API, apiFetch } from "../../api/httpClient.js";

export function listarProductos() {
    return apiFetch(API.productos);
}

export function obtenerProducto(id) {
    return apiFetch(`${API.productos}/${id}`);
}