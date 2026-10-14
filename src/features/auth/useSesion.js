import { useMemo } from "react";
import { useMsal } from "@azure/msal-react";
import { InteractionStatus } from "@azure/msal-browser";
import { useAuth } from "react-oidc-context";

export function useSesion() {
    const {
        instance,
        accounts: cuentasMicrosoft,
        inProgress,
    } = useMsal();

    const cognito = useAuth();

    const esCognito = cognito.isAuthenticated;
    const sub = cognito.user?.profile.sub;
    const nombre = cognito.user?.profile.name;
    const email = cognito.user?.profile.email;

    const cuentaCognito = useMemo(() => {
        if (!esCognito || !sub) return null;

        return {
            proveedor: "cognito",
            homeAccountId: `cognito:${sub}`,
            sub,
            name: nombre || email || "Usuario",
            username: email || "",
        };
    }, [esCognito, sub, nombre, email]);

    const cuenta = esCognito
        ? cuentaCognito
        : cuentasMicrosoft[0] || null;

    const accounts = useMemo(
        () => cuenta ? [cuenta] : [],
        [cuenta]
    );

    const cargandoSesion =
        cognito.isLoading ||
        inProgress !== InteractionStatus.None;

    return {
        instance,
        accounts,
        cuenta,
        cargandoSesion,
        isAuthenticated: Boolean(cuenta),
        proveedor: cuenta
            ? esCognito ? "cognito" : "microsoft"
            : null,
    };
}