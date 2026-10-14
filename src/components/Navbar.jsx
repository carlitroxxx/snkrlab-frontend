import { Link } from "react-router-dom";
import { AccesoUsuario } from "../features/auth/AccesoUsuario";
import { usePerfil } from "../features/auth/PerfilContext";

export function Navbar() {
    const {
        esCliente,
        esAdministrador,
        cargando,
        error,
    } = usePerfil();

    const permisosListos = !cargando && !error;

    return (
        <header className="navbar">
            <Link to="/" className="navbarMarca">
                <img
                    src="/snkrlab-logo.jpg"
                    alt="SNKRLAB"
                    className="navbarLogo"
                />
            </Link>

            {permisosListos && esCliente && (
                <Link to="/ordenes" className="navbarOrdenes">
                    Mis órdenes
                </Link>
            )}

            {permisosListos && esAdministrador && (
                <Link to="/reportes" className="navbarOrdenes">
                    Reportes
                </Link>
            )}

            {permisosListos && esCliente && (
                <Link
                    to="/carrito"
                    className="navbarCarrito"
                    aria-label="Ver carrito"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <circle cx="9" cy="21" r="1" />
                        <circle cx="20" cy="21" r="1" />
                        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                    </svg>
                </Link>
            )}

            <AccesoUsuario />
        </header>
    );
}