import { useEffect, useRef, useState } from "react";
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "./AuthConfig";
import { obtenerPerfil } from "./authApi";
import { Boton } from "../../components/Boton";

export function SesionUsuario() {
    const { instance, accounts } = useMsal();
    const [popupAbierto, setPopupAbierto] = useState(false);
    const [perfil, setPerfil] = useState(null);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState(null);
    const contenedorRef = useRef(null);

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

    const alternarPopup = async () => {
        const abriendo = !popupAbierto;
        setPopupAbierto(abriendo);

        if (abriendo) {
            setCargando(true);
            setError(null);
            setPerfil(null);
            try {
                const data = await obtenerPerfil(instance, accounts[0]);
                setPerfil(data);
            } catch (err) {
                setError("No se pudo cargar el perfil: " + err.message);
            } finally {
                setCargando(false);
            }
        }
    };

    useEffect(() => {
        function manejarClickFuera(evento) {
            if (contenedorRef.current && !contenedorRef.current.contains(evento.target)) {
                setPopupAbierto(false);
            }
        }
        document.addEventListener("mousedown", manejarClickFuera);
        return () => document.removeEventListener("mousedown", manejarClickFuera);
    }, []);

    if (accounts.length === 0) {
        return (
            <Boton variante="microsoft" onClick={iniciarSesion}>
                Iniciar sesión con Microsoft
            </Boton>
        );
    }

    const nombre = accounts[0].name || "";
    const inicial = nombre.charAt(0).toUpperCase();

    return (
        <div className="sesionUsuario" ref={contenedorRef}>
            <button className="avatarBoton" onClick={alternarPopup} aria-label="Ver perfil">
                {inicial}
            </button>
            <span className="sesionUsuarioNombre">{nombre}</span>
            <Boton variante="linea" onClick={cerrarSesion}>Cerrar sesión</Boton>

            {popupAbierto && (
                <div className="perfilPopup">
                    {cargando && <p>Cargando perfil...</p>}
                    {error && <p className="perfilPopupError">{error}</p>}

                    {perfil && (
                        <>
                            <label>
                                ID
                                <input type="text" readOnly value={perfil.id || ""} />
                            </label>
                            <label>
                                Nombre
                                <input type="text" readOnly value={perfil.nombre || ""} />
                            </label>
                            <label>
                                Email
                                <input type="text" readOnly value={perfil.email || ""} />
                            </label>
                            <label>
                                Roles
                                <input type="text" readOnly value={(perfil.roles || []).join(", ") || "Sin roles asignados"} />
                            </label>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}