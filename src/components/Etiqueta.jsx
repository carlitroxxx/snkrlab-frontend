import "react";

export function Etiqueta({ children, tono = "neutro" }) {
    return <span className={`etiqueta etiqueta${tono.charAt(0).toUpperCase() + tono.slice(1)}`}>{children}</span>;
}