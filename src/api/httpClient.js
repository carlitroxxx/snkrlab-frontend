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

export const API = {
    auth: import.meta.env.VITE_API_AUTH_URL,
    productos: import.meta.env.VITE_API_PRODUCTOS_URL,
    carrito: import.meta.env.VITE_API_CARRITO_URL,
};