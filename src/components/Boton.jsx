import "react";

export function Boton({ children, onClick, variante = "primario", ...props }) {
    return (
        <button
            className={`boton boton${variante.charAt(0).toUpperCase() + variante.slice(1)}`}
            onClick={onClick}
            {...props}
        >
            {children}
        </button>
    );
}