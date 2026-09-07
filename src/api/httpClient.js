import { apiRequest } from "../auth/AuthConfig";


export async function obtenerToken(msalInstance, account) {
    const request = { ...apiRequest, account };
    try {
        const response = await msalInstance.acquireTokenSilent(request);
        return response.accessToken;
    } catch {
        await msalInstance.acquireTokenRedirect(request);
        return null;
    }
}

export async function apiFetch(url, { msalInstance, account, ...options } = {}) {
    const headers = { "Content-Type": "application/json", ...(options.headers || {}) };

    if (account) {
        const token = await obtenerToken(msalInstance, account);
        if (!token) return null;
        headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(url, { ...options, headers });

    if (!res.ok) {
        const texto = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${res.statusText}${texto ? ` - ${texto}` : ""}`);
    }

    if (res.status === 204) return null;
    return res.json();
}

export const API = {
    auth: import.meta.env.VITE_AUTH_API_URL || "http://localhost:8081/api/v1/auth",
    productos: import.meta.env.VITE_PRODUCTOS_API_URL || "http://localhost:8082/api/v1/productos",
    carrito: import.meta.env.VITE_CARRITO_API_URL || "http://localhost:8083/api/v1/carrito",
};