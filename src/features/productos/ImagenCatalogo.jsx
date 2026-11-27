import { useEffect, useState } from "react";
import { listarProductos } from "./productosApi";
import { imagenUrl } from "../../utils/imagenUrl";

export function useImagenesCatalogo() {
    const [productos, setProductos] = useState([]);
    useEffect(() => {
        let activo = true;
        listarProductos().then(datos => {
            if (activo && Array.isArray(datos)) setProductos(datos);
        }).catch(() => {});
        return () => { activo = false; };
    }, []);
    return new Map(productos.map(p => [String(p.id), p.imagen]));
}

export function ImagenCatalogo({ imagen, nombre }) {
    const [fallida, setFallida] = useState(null);
    const url = imagenUrl(imagen);
    return url && fallida !== url
        ? <img className="compraImagen" src={url} alt={nombre || "Producto"} loading="lazy" onError={() => setFallida(url)} />
        : <span className="compraImagen compraImagenVacia">Sin imagen</span>;
}
