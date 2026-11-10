import  { useEffect, useState } from "react";
import { listarProductos } from "../features/productos/productosApi";
import { Layout } from "../components/Layout";
import { CatalogoGrid } from "../features/productos/CatalogoGrid";

import { useSesion } from "../features/auth/useSesion";
import { usePerfil } from "../features/auth/PerfilContext";
import { obtenerRecomendaciones } from "../features/recomendaciones/recomendacionesApi";

export function Catalogo() {
    const { instance, cuenta, cargandoSesion } = useSesion();
    const { esCliente, autenticado } = usePerfil();
    const cuentaId = cuenta?.homeAccountId || "";
    const puedeRecomendar = autenticado && esCliente && !cargandoSesion;
    const [recomendaciones, setRecomendaciones] = useState({ cuentaId: "", datos: [] });

    useEffect(() => {
        if (!puedeRecomendar || !cuenta) return;
        let vigente = true;
        obtenerRecomendaciones(instance, cuenta)
            .then((datos) => {
                if (vigente) setRecomendaciones({ cuentaId, datos });
            })
            .catch(() => {
                if (vigente) setRecomendaciones({ cuentaId, datos: [] });
            });
        return () => { vigente = false; };
    }, [instance, cuenta, cuentaId, puedeRecomendar]);
    const [productos, setProductos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        listarProductos()
            .then(setProductos)
            .catch((err) => setError(err.message))
            .finally(() => setCargando(false));
    }, []);

    const porId = new Map(productos.map((producto) => [String(producto.id), producto]));
    const vistos = new Set();
    const recomendados = puedeRecomendar && recomendaciones.cuentaId === cuentaId
        ? recomendaciones.datos.flatMap((item) => {
            const id = String(item?.productoId);
            const producto = porId.get(id);
            if (!producto || vistos.has(id)) return [];
            vistos.add(id);
            return [producto];
        }).slice(0, 4)
        : [];

    if (cargando) return <p>Cargando catálogo...</p>;
    if (error) return <p>Error al cargar el catálogo: {error}</p>;

    return (
        <Layout>
            {recomendados.length > 0 && (
                <section aria-labelledby="recomendados-titulo">
                    <h2 id="recomendados-titulo">Recomendados para ti</h2>
                    <CatalogoGrid productos={recomendados} compacto />
                </section>
            )}
            <h2>Catálogo</h2>
            <CatalogoGrid productos={productos} />
        </Layout>
    );
}