import  { useEffect, useState } from "react";
import { listarProductos } from "../features/productos/productosApi";
import { Layout } from "../components/Layout";
import { CatalogoGrid } from "../features/productos/CatalogoGrid";

export function Catalogo() {
    const [productos, setProductos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        listarProductos()
            .then(setProductos)
            .catch((err) => setError(err.message))
            .finally(() => setCargando(false));
    }, []);

    if (cargando) return <p>Cargando catálogo...</p>;
    if (error) return <p>Error al cargar el catálogo: {error}</p>;

    return (
        <Layout>
            <h2>Catálogo</h2>
            <CatalogoGrid productos={productos} />
        </Layout>
    );
}