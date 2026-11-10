import "react";
import { ProductoCard } from "./ProductoCard";

export function CatalogoGrid({ productos, compacto = false }) {
    return (
        <div className={compacto ? "catalogoGrid catalogoGrid--compacto" : "catalogoGrid"}>
            {productos.map((producto) => (
                <ProductoCard key={producto.id} producto={producto} />
            ))}
        </div>
    );
}