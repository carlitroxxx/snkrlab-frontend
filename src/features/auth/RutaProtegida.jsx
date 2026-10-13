import { Link, Outlet } from "react-router-dom";
import { Layout } from "../../components/Layout";
import { usePerfil } from "./PerfilContext";

export function RutaProtegida({ rol }) {
    const {
        cargando,
        error,
        autenticado,
        esCliente,
        esAdministrador,
    } = usePerfil();

    if (cargando) {
        return (
            <Layout>
                <p role="status">Comprobando permisos...</p>
            </Layout>
        );
    }

    if (!autenticado) {
        return (
            <Layout>
                <h2>Inicia sesión</h2>
                <p>Necesitas iniciar sesión para acceder a esta sección.</p>
                <Link to="/">Volver al catálogo</Link>
            </Layout>
        );
    }

    if (error) {
        return (
            <Layout>
                <p role="alert">{error}</p>
                <Link to="/">Volver al catálogo</Link>
            </Layout>
        );
    }

    const permitido =
        (rol === "Cliente" && esCliente) ||
        (rol === "Administrador" && esAdministrador);

    if (!permitido) {
        return (
            <Layout>
                <h2>Acceso restringido</h2>
                <p>
                    {!esCliente && !esAdministrador
                        ? "Tu cuenta no tiene un rol asignado para acceder a esta sección."
                        : "Tu cuenta no tiene permisos para acceder a esta sección."}
                </p>
                <Link to="/">Volver al catálogo</Link>
            </Layout>
        );
    }

    return <Outlet />;
}