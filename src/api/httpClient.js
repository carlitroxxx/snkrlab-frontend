import { InteractionRequiredAuthError } from "@azure/msal-browser";
import { apiRequest } from "../features/auth/AuthConfig";
import {
    cognitoManager,
    obtenerTokenCognito,
} from "../features/auth/CognitoConfig";

export async function obtenerToken(msalInstance, account) {
    if (!account) {
        throw new Error("Necesitas iniciar sesión.");
    }

    if (account.proveedor === "cognito") {
        const usuario = await cognitoManager.getUser();

        if (!usuario || usuario.profile.sub !== account.sub) {
            throw new Error(
                "La sesión cambió. Recarga la página e inicia sesión nuevamente."
            );
        }

        return obtenerTokenCognito();
    }

    const request = {
        ...apiRequest,
        account,
    };

    try {
        const response =
            await msalInstance.acquireTokenSilent(request);

        return response.accessToken;
    } catch (error) {
        if (error instanceof InteractionRequiredAuthError) {
            await msalInstance.acquireTokenRedirect(request);
            return null;
        }

        throw error;
    }
}

export async function apiFetch(
    url,
    { msalInstance, account, ...options } = {}
) {
    if (!url) {
        throw new Error("Falta configurar la URL del servicio.");
    }

    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {}),
    };

    if (account) {
        const token = await obtenerToken(msalInstance, account);

        if (!token) return null;

        headers.Authorization = `Bearer ${token}`;
    }

    const respuesta = await fetch(url, {
        ...options,
        headers,
    });

    if (!respuesta.ok) {
        let mensaje =
            `${respuesta.status} ${respuesta.statusText}`;

        try {
            const cuerpo = await respuesta.json();

            mensaje =
                cuerpo.detail ||
                cuerpo.mensaje ||
                cuerpo.message ||
                mensaje;
        } catch {
            //
        }

        const error = new Error(mensaje);
        error.status = respuesta.status;
        throw error;
    }

    if (respuesta.status === 204) {
        return null;
    }

    return respuesta.json();
}

export const API = {
    auth: import.meta.env.VITE_API_AUTH_URL,
    productos: import.meta.env.VITE_API_PRODUCTOS_URL,
    carrito: import.meta.env.VITE_API_CARRITO_URL,
    ordenes: import.meta.env.VITE_API_ORDENES_URL,
    reportes: import.meta.env.VITE_API_REPORTES_URL,
};