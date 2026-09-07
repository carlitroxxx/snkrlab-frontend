import { apiRequest } from "../features/auth/AuthConfig";


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
        let mensaje = `${res.status} ${res.statusText}`;
        try {
            const cuerpo = await res.json();
            if (cuerpo?.mensaje) mensaje = cuerpo.mensaje;
        } catch {
            // mensaje generico
        }
        throw new Error(mensaje);
    }

    if (res.status === 204) return null;
    return res.json();
}
const BASE_URL = "https://lezwrow0m9.execute-api.us-east-1.amazonaws.com/desarrollo";
export const API = {
    auth: `${BASE_URL}/api/v1/auth`,
    productos: `${BASE_URL}/api/v1/productos`,
    carrito: `${BASE_URL}/api/v1/carrito`,
};