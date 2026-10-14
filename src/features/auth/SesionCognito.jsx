import { useEffect, useRef, useState } from "react";
import { useAuth } from "react-oidc-context";
import { API } from "../../api/httpClient";
import { Boton } from "../../components/Boton";
import {
    cerrarSesionCognito,
    obtenerTokenCognito,
} from "./CognitoConfig";

export function SesionCognito() {
    const auth = useAuth();

    const [popupAbierto, setPopupAbierto] = useState(false);
    const [perfil, setPerfil] = useState(null);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState(null);

    const contenedorRef = useRef(null);
    const solicitudRef = useRef(0);

    const usuarioId = auth.user?.profile.sub;

    useEffect(() => {
        setPopupAbierto(false);
        setPerfil(null);
        setError(null);

        return () => {
            solicitudRef.current += 1;
        };
    }, [usuarioId]);

    useEffect(() => {
        function manejarClickFuera(evento) {
            if (
                contenedorRef.current &&
                !contenedorRef.current.contains(evento.target)
            ) {
                setPopupAbierto(false);
            }
        }

        document.addEventListener("mousedown", manejarClickFuera);

        return () => {
            document.removeEventListener(
                "mousedown",
                manejarClickFuera
            );
        };
    }, []);

    const alternarPopup = async () => {
        if (popupAbierto) {
            setPopupAbierto(false);
            return;
        }

        setPopupAbierto(true);
        setCargando(true);
        setError(null);
        setPerfil(null);

        const solicitud = ++solicitudRef.current;

        try {
            const token = await obtenerTokenCognito();
            const base = API.auth.replace(/\/$/, "");

            const respuesta = await fetch(`${base}/perfil`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!respuesta.ok) {
                throw new Error(
                    `No se pudo cargar el perfil (${respuesta.status}).`
                );
            }

            const datos = await respuesta.json();

            if (solicitud === solicitudRef.current) {
                setPerfil(datos);
            }
        } catch (err) {
            if (solicitud === solicitudRef.current) {
                setError(err.message);
            }
        } finally {
            if (solicitud === solicitudRef.current) {
                setCargando(false);
            }
        }
    };

    const manejarCerrarSesion = async () => {
        try {
            await cerrarSesionCognito();
        } catch {
            setError("No se pudo cerrar la sesión. Intenta nuevamente.");
            setPopupAbierto(true);
        }
    };

    const nombre =
        auth.user?.profile.name ||
        auth.user?.profile.nickname ||
        auth.user?.profile.email ||
        "Usuario";

    const inicial = nombre.charAt(0).toUpperCase();

    return (
        <div className="sesionUsuario" ref={contenedorRef}>
            <button
                className="avatarBoton"
                onClick={alternarPopup}
                aria-label="Ver perfil"
                aria-expanded={popupAbierto}
            >
                {inicial}
            </button>

            <span className="sesionUsuarioNombre">
                {nombre}
            </span>

            <Boton variante="linea" onClick={manejarCerrarSesion}>
                Cerrar sesión
            </Boton>

            {popupAbierto && (
                <div className="perfilPopup">
                    {cargando && <p>Cargando perfil...</p>}

                    {error && (
                        <p className="perfilPopupError" role="alert">
                            {error}
                        </p>
                    )}

                    {perfil && (
                        <>
                            <label>
                                ID
                                <input
                                    type="text"
                                    readOnly
                                    value={perfil.id || ""}
                                />
                            </label>

                            <label>
                                Nombre
                                <input
                                    type="text"
                                    readOnly
                                    value={perfil.nombre || ""}
                                />
                            </label>

                            <label>
                                Email
                                <input
                                    type="text"
                                    readOnly
                                    value={perfil.email || ""}
                                />
                            </label>

                            <label>
                                Roles
                                <input
                                    type="text"
                                    readOnly
                                    value={
                                        (perfil.roles || []).join(", ") ||
                                        "Sin roles asignados"
                                    }
                                />
                            </label>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}