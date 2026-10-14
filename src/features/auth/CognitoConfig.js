import { UserManager, WebStorageStateStore } from "oidc-client-ts";

export const cognitoManager = new UserManager({
    authority: import.meta.env.VITE_COGNITO_AUTHORITY,
    client_id: import.meta.env.VITE_COGNITO_CLIENT_ID,
    redirect_uri: import.meta.env.VITE_COGNITO_REDIRECT_URI,
    response_type: "code",
    scope: "openid email profile",
    automaticSilentRenew: true,
    loadUserInfo: false,
    userStore: new WebStorageStateStore({
        store: window.sessionStorage,
    }),
});

export function completarInicioCognito() {
    sessionStorage.removeItem("snkrlab-cognito-login");

    const retorno = new URL(
        import.meta.env.VITE_COGNITO_REDIRECT_URI
    );

    window.history.replaceState(
        {},
        document.title,
        retorno.pathname
    );
}

export async function iniciarSesionCognito() {
    sessionStorage.setItem("snkrlab-cognito-login", "true");

    try {
        await cognitoManager.signinRedirect();
    } catch (error) {
        sessionStorage.removeItem("snkrlab-cognito-login");
        throw error;
    }
}

export async function cerrarSesionCognito() {
    await cognitoManager.removeUser();

    sessionStorage.removeItem("snkrlab-cognito-login");

    const dominio = import.meta.env.VITE_COGNITO_DOMAIN;
    const salida = new URL("/logout", dominio);

    salida.searchParams.set(
        "client_id",
        import.meta.env.VITE_COGNITO_CLIENT_ID
    );

    salida.searchParams.set(
        "logout_uri",
        import.meta.env.VITE_COGNITO_LOGOUT_URI
    );

    window.location.assign(salida.toString());
}

export async function obtenerTokenCognito() {
    let usuario = await cognitoManager.getUser();

    if (!usuario) {
        throw new Error("Inicia sesión con Cognito nuevamente.");
    }

    if (usuario.expired) {
        usuario = await cognitoManager.signinSilent();
    }

    if (!usuario || usuario.expired || !usuario.access_token) {
        throw new Error("La sesión venció. Cierra sesión e ingresa nuevamente.");
    }

    return usuario.access_token;
}