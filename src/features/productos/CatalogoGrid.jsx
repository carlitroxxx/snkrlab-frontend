import "react";
import { ProductoCard } from "./ProductoCard";

export function CatalogoGrid({ productos }) {
    return (
        <div className="catalogoGrid">
            {productos.map((producto) => (
                <ProductoCard key={producto.id} producto={producto} />
            ))}
        </div>
    );
}