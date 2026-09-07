import { API, apiFetch } from "../../api/httpClient";

export function obtenerPerfil(msalInstance, account) {
    return apiFetch(`${API.auth}/perfil`, { msalInstance, account });
}