import {
    createContext,
    useContext,
    useEffect,
    useState,
} from "react";

import { useSesion } from "./useSesion";
import { obtenerPerfil } from "./authApi";

const PerfilContext = createContext(null);

export function PerfilProvider({ children }) {
    const {
        instance,
        cuenta,
        cargandoSesion,
        isAuthenticated,
    } = useSesion();

    const cuentaId = cuenta?.homeAccountId || "";

    const [resultado, setResultado] = useState({
        cuentaId: "",
        perfil: null,
        error: null,
    });

    useEffect(() => {
        if (!cuenta || cargandoSesion) {
            return;
        }

        let vigente = true;

        async function cargarPermisos() {
            try {
                const perfil = await obtenerPerfil(instance, cuenta);

                if (!perfil) {
                    throw new Error("No se recibió el perfil.");
                }

                if (vigente) {
                    setResultado({
                        cuentaId,
                        perfil,
                        error: null,
                    });
                }
            } catch (error) {
                if (vigente) {
                    setResultado({
                        cuentaId,
                        perfil: null,
                        error:
                            "No se pudieron comprobar tus permisos. " +
                            "Recarga la página para intentar nuevamente.",
                    });
                }
            }
        }

        cargarPermisos();

        return () => {
            vigente = false;
        };
    }, [instance, cuenta, cuentaId, cargandoSesion]);

    const corresponde = resultado.cuentaId === cuentaId;

    const perfil =
        isAuthenticated && corresponde
            ? resultado.perfil
            : null;

    const error =
        isAuthenticated && corresponde
            ? resultado.error
            : null;

    const cargando =
        cargandoSesion ||
        Boolean(isAuthenticated && !corresponde);

    const roles = perfil?.roles || [];

    const esCliente = roles.includes("Cliente");
    const esAdministrador = roles.includes("Administrador");

    return (
        <PerfilContext.Provider
            value={{
                cargando,
                error,
                autenticado: isAuthenticated,
                esCliente,
                esAdministrador,
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