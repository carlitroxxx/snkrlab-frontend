import "react";
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "./AuthConfig";
import { Boton } from "../../components/Boton";

export function SesionUsuario() {
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
            <div className="sesionUsuario">
                <span className="sesionUsuarioNombre">{accounts[0].name}</span>
                <Boton variante="linea" onClick={cerrarSesion}>Cerrar sesión</Boton>
            </div>
        );
    }

    return (
        <Boton variante="microsoft" onClick={iniciarSesion}>
            Iniciar sesión con Microsoft
        </Boton>
    );
}