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

export function iniciarCheckout(msalInstance, account, checkoutId) {
    return apiFetch(API.carrito + "/checkout/pendiente", {
        msalInstance, account, method: "POST",
        body: JSON.stringify({ checkoutId }),
    });
}

export function pagarCheckout(msalInstance, account, checkoutId, referenciaPago, tarjetaId) {
    return apiFetch(API.carrito + "/checkouts/" + checkoutId + "/pago", {
        msalInstance, account, method: "POST",
        body: JSON.stringify({ referenciaPago, tarjetaId }),
    });
}

export function confirmarCheckout(msalInstance, account, checkoutId) {
    return apiFetch(API.carrito + "/checkouts/" + checkoutId + "/confirmacion", {
        msalInstance, account, method: "POST",
    });
}
export function iniciarWebpay(msalInstance, account, id) {
    return apiFetch(API.carrito + "/checkouts/" + id + "/webpay", { msalInstance, account, method: "POST" });
}
export function sincronizarWebpay(msalInstance, account, id) {
    return apiFetch(API.carrito + "/checkouts/" + id + "/webpay/sincronizacion", { msalInstance, account, method: "POST" });
}
export function consultarCheckout(msalInstance, account, id) {
    return apiFetch(API.carrito + "/checkouts/" + id, { msalInstance, account });
}