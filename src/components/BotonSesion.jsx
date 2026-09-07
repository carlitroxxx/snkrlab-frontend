import "react";
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "../auth/AuthConfig";

export function BotonSesion() {
    const { instance, accounts } = useMsal();

    const iniciarSesion = () => {
        instance.loginRedirect(loginRequest).catch((e) => {
            console.error("Error en el inicio de sesión:", e);
        });
    };

    const cerrarSesion = () => {
        instance.logoutRedirect().catch((e) => {
            console.error("Error al cerrar sesión:", e);
        });
    };

    if (accounts.length > 0) {
        return (
            <div>
                <span>{accounts[0].name}</span>
                <button onClick={cerrarSesion}>Cerrar sesión</button>
            </div>
        );
    }

    return (
        <button onClick={iniciarSesion}>
            Iniciar sesión con Microsoft
        </button>
    );
}