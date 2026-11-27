import { useState } from "react";
import { Carrito } from "./Carrito";
import { Layout } from "../components/Layout";
import { Boton } from "../components/Boton";
import { useSesion } from "../features/auth/useSesion";
import { usePerfil } from "../features/auth/PerfilContext";
import { iniciarSesionCognito } from "../features/auth/CognitoConfig";

export function ResultadoWebpay() {
    const { cargandoSesion, isAuthenticated } = useSesion();
    const { cargando, esCliente, error } = usePerfil();
    const [errorLogin, setErrorLogin] = useState("");
    const ingresar = async () => {
        try { await iniciarSesionCognito(true); }
        catch { setErrorLogin("No se pudo iniciar sesión. Tu compra se conserva; vuelve a intentarlo."); }
    };
    if (cargandoSesion || cargando) return <Layout><p role="status">Recuperando sesión y permisos...</p></Layout>;
    if (!isAuthenticated || error) return <Layout>
        <h2>Resultado de Webpay</h2>
        <p>Ingresa con la misma cuenta que inició la compra para recuperar el resultado.</p>
        <Boton onClick={ingresar}>Continuar con Cognito</Boton>
        {errorLogin && <p role="alert">{errorLogin}</p>}
    </Layout>;
    if (!esCliente) return <Layout><p>Esta cuenta no tiene permisos de cliente. Ingresa con la cuenta que realizó la compra.</p></Layout>;
    return <Carrito resultadoWebpay />;
}
