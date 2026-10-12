import { Link, Outlet } from "react-router-dom";
import { Layout } from "../../components/Layout";
import { usePerfil } from "./PerfilContext";

export function RutaProtegida({ soloAdministrador = false }) {
    const {
        cargando,
        error,
        autenticado,
        tieneAcceso,
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
                <h2>Bienvenido a SNKRLAB</h2>
                <p>Inicia sesión con Microsoft para acceder.</p>
            </Layout>
        );
    }

    if (error) {
        return (
            <Layout>
                <p role="alert">{error}</p>
            </Layout>
        );
    }

    if (!tieneAcceso) {
        return (
            <Layout>
                <h2>Acceso pendiente</h2>
                <p>
                    No tienes un rol asignado para acceder a la aplicación.
                    Contacta al administrador.
                </p>
            </Layout>
        );
    }

    if (soloAdministrador && !esAdministrador) {
        return (
            <Layout>
                <h2>Acceso restringido</h2>
                <p>
                    Los reportes están disponibles solo para administradores.
                </p>
                <Link to="/">Volver al catálogo</Link>
            </Layout>
        );
    }

    return <Outlet />;
}