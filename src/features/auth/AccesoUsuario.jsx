import { useState } from "react";
import { useMsal } from "@azure/msal-react";
import { InteractionStatus } from "@azure/msal-browser";
import { useAuth } from "react-oidc-context";
import { SesionUsuario } from "./SesionUsuario";
import { SesionCognito } from "./SesionCognito";
import { iniciarSesionCognito } from "./CognitoConfig";
import { Boton } from "../../components/Boton";

export function AccesoUsuario() {
    const { accounts, inProgress } = useMsal();
    const auth = useAuth();
    const [error, setError] = useState(null);

    const iniciarCognito = async () => {
        setError(null);

        try {
            await iniciarSesionCognito();
        } catch {
            setError("No se pudo iniciar el acceso con Cognito.");
        }
    };

    if (
        auth.isLoading ||
        auth.activeNavigator ||
        inProgress !== InteractionStatus.None
    ) {
        return (
            <div className="navbarAcceso">
                <span role="status">Procesando sesión...</span>
            </div>
        );
    }

    return (
        <div className="navbarAcceso">
            {auth.isAuthenticated ? (
                <SesionCognito />
            ) : (
                <>
                    <SesionUsuario />

                    {accounts.length === 0 && (
                        <Boton onClick={iniciarCognito}>
                            Acceso clientes
                        </Boton>
                    )}
                </>
            )}

            {(error || auth.error) && (
                <p role="alert">
                    {error ||
                        "No se pudo completar el acceso con Cognito. Intenta nuevamente."}
                </p>
            )}
        </div>
    );
}