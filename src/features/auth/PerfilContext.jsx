import { createContext, useContext, useEffect, useState } from "react";
import { useMsal } from "@azure/msal-react";
import { InteractionStatus } from "@azure/msal-browser";
import { obtenerPerfil } from "./authApi";

const PerfilContext = createContext(null);

export function PerfilProvider({ children }) {
    const { instance, accounts, inProgress } = useMsal();
    const cuentaId = accounts[0]?.homeAccountId || "";

    const [resultado, setResultado] = useState({
        cuentaId: "",
        perfil: null,
        error: null,
    });

    useEffect(() => {
        if (!cuentaId || inProgress !== InteractionStatus.None) {
            return;
        }

        let vigente = true;

        const cuenta = instance.getAllAccounts().find(
            (item) => item.homeAccountId === cuentaId
        );

        if (!cuenta) return;

        obtenerPerfil(instance, cuenta)
            .then((perfil) => {
                if (!perfil) {
                    throw new Error("No se recibió el perfil del usuario.");
                }

                if (vigente) {
                    setResultado({
                        cuentaId,
                        perfil,
                        error: null,
                    });
                }
            })
            .catch(() => {
                if (vigente) {
                    setResultado({
                        cuentaId,
                        perfil: null,
                        error:
                            "No se pudieron comprobar tus permisos. " +
                            "Recarga la página para intentar nuevamente.",
                    });
                }
            });

        return () => {
            vigente = false;
        };
    }, [instance, cuentaId, inProgress]);

    const corresponde = resultado.cuentaId === cuentaId;

    const perfil =
        cuentaId && corresponde ? resultado.perfil : null;

    const error =
        cuentaId && corresponde ? resultado.error : null;

    const cargando =
        inProgress !== InteractionStatus.None ||
        Boolean(cuentaId && !corresponde);

    const roles = perfil?.roles || [];
    const esAdministrador = roles.includes("Administrador");
    const tieneAcceso =
        esAdministrador || roles.includes("Cliente");

    return (
        <PerfilContext.Provider
            value={{
                cargando,
                error,
                autenticado: Boolean(cuentaId),
                esAdministrador,
                tieneAcceso,
            }}
        >
            {children}
        </PerfilContext.Provider>
    );
}

export function usePerfil() {
    const contexto = useContext(PerfilContext);

    if (!contexto) {
        throw new Error(
            "usePerfil debe utilizarse dentro de PerfilProvider."
        );
    }

    return contexto;
}