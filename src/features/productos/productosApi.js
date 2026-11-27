import { API, apiFetch, obtenerToken } from "../../api/httpClient.js";

export function listarProductos() {
    return apiFetch(API.productos);
}
export function listarProductosAdmin(msalInstance, account) {
    return apiFetch(`${API.productos}/administracion`, { msalInstance, account });
}
export async function cambiarEstadoProducto(id, activo, msalInstance, account) {
    // Obtener el token antes permite distinguir redirect de autenticación y DELETE 204.
    const token = await obtenerToken(msalInstance, account);
    if (!token) throw new Error("Inicia sesión para continuar.");
    return apiFetch(`${API.productos}/${id}${activo ? "/reactivacion" : ""}`, {
        method: activo ? "PUT" : "DELETE", headers: { Authorization: `Bearer ${token}` },
    });
}

export function guardarProducto(datos, id, msalInstance, account) {
    if (!account || account.proveedor === "cognito") throw new Error("Necesitas una sesión administrativa de Azure.");
    return apiFetch(id == null ? API.productos : `${API.productos}/${id}`, {
        msalInstance, account, method: id == null ? "POST" : "PUT", body: JSON.stringify(datos),
    });
}

export function obtenerProducto(id, msalInstance, account) {
    return apiFetch(`${API.productos}/${id}`, { msalInstance, account });
}
