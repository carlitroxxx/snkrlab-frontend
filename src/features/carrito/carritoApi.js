import { API, apiFetch } from "../../api/httpClient";

export function obtenerMiCarrito(msalInstance, account) {
    return apiFetch(API.carrito, { msalInstance, account });
}

export function agregarAlCarrito(msalInstance, account, { productoId, cantidad }) {
    return apiFetch(API.carrito, {
        msalInstance,
        account,
        method: "POST",
        body: JSON.stringify({ productoId, cantidad }),
    });
}

export function actualizarCantidad(msalInstance, account, itemId, cantidad) {
    return apiFetch(`${API.carrito}/item/${itemId}`, {
        msalInstance,
        account,
        method: "PUT",
        body: JSON.stringify({ cantidad }),
    });
}

export function eliminarItem(msalInstance, account, itemId) {
    return apiFetch(`${API.carrito}/item/${itemId}`, {
        msalInstance,
        account,
        method: "DELETE",
    });
}

export function vaciarCarrito(msalInstance, account) {
    return apiFetch(API.carrito, { msalInstance, account, method: "DELETE" });
}

export function confirmarCompra(msalInstance, account) {
    return apiFetch(`${API.carrito}/checkout`, {
        msalInstance,
        account,
        method: "POST",
    });
}