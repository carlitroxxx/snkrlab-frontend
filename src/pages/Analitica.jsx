import { useEffect, useState } from "react";
import { EventType } from "@azure/msal-browser";
import { Layout } from "../components/Layout";
import { useSesion } from "../features/auth/useSesion";
import { apiRequest } from "../features/auth/AuthConfig";
import { listarProductos } from "../features/productos/productosApi";
import { crearMetricas, recibir, conectarTelemetria } from "../features/analitica/telemetria";
import { Boton } from "../components/Boton";

const fecha = valor => valor ? new Date(valor).toLocaleString("es-CL") : "Sin eventos";

export function Analitica() {
    const { instance, cuenta, proveedor } = useSesion();
    if (proveedor !== "microsoft" || !cuenta) return <Layout><p>Esta sección requiere una sesión administrativa de Azure.</p></Layout>;
    return <Dashboard key={cuenta.homeAccountId} instance={instance} cuenta={cuenta} />;
}

function Dashboard({ instance, cuenta }) {
    const [metricas] = useState(crearMetricas);
    const [inicio] = useState(Date.now);
    const [, actualizar] = useState(0);
    const [estado, setEstado] = useState("Conectando");
    const [interrupciones, setInterrupciones] = useState([]);
    const [catalogo, setCatalogo] = useState([]);
    const [errorCatalogo, setErrorCatalogo] = useState(false);
    const [intentoCatalogo, setIntentoCatalogo] = useState(0);
    const cuentaId = cuenta.homeAccountId;
    useEffect(() => {
        let activo = true;
        listarProductos().then(datos => {
            if (activo) { setCatalogo(Array.isArray(datos) ? datos : []); setErrorCatalogo(!Array.isArray(datos)); }
        }).catch(() => { if (activo) setErrorCatalogo(true); });
        return () => { activo = false; };
    }, [intentoCatalogo]);
    useEffect(() => {
        const detener = conectarTelemetria({
            url: import.meta.env.VITE_WEBSOCKET_URL,
            token: () => instance.acquireTokenSilent({
                ...apiRequest, account: instance.getAllAccounts().find(a => a.homeAccountId === cuentaId), forceRefresh: true,
            }),
            estado: valor => {
                setEstado(valor);
                if (valor.includes("Interrumpida") || valor.includes("Renovando") || valor.includes("Sesión Azure"))
                    setInterrupciones(prev => [...prev, { fecha: Date.now(), estado: valor }]);
            },
            mensaje: texto => { if (recibir(metricas, texto)) actualizar(n => n + 1); },
        });
        const callback = instance.addEventCallback(evento => {
            if (evento.eventType === EventType.LOGOUT_START) { detener(); setEstado("Sesión cerrada"); }
        });
        return () => { detener(); if (callback) instance.removeEventCallback(callback); };
    }, [instance, cuentaId, metricas]);
    const ranking = [...metricas.ranking].sort((a, b) => b[1] - a[1] || a[0] - b[0]);
    return <Layout><section className="analitica">
        <header><p className="analiticaEtiqueta">ADMINISTRACIÓN · EN TIEMPO REAL</p><h1>Analítica de navegación</h1>
            <p role="status"><span className={estado === "Conectada" ? "analiticaActivo" : ""}>●</span> {estado}</p></header>
        <p>Sesión del dashboard desde {fecha(inicio)}. Último evento recibido: {fecha(metricas.ultima)}.</p>
        <p>Solo eventos recibidos durante esta sesión; sin historial ni recuperación de eventos perdidos.
            Salir de esta página o recargar inicia una nueva medición. Las visitas anónimas no llegan al stream.</p>
        <div className="analiticaMetricas">
            <article><h2>Visitas a productos</h2><strong>{metricas.visitas}</strong><p>Eventos de visualización recibidos</p></article>
            <article><h2>Agregados al carrito</h2><strong>{metricas.agregados}</strong><p>Eventos de agregado, no unidades ni ventas</p></article>
        </div>
        <h2>Productos más vistos</h2>
        {errorCatalogo && <p role="alert">No se pudo cargar el catálogo; se muestran los identificadores. <Boton onClick={() => setIntentoCatalogo(n => n + 1)}>Reintentar catálogo</Boton></p>}
        {ranking.length === 0 ? <p>Aún no se han recibido visitas a productos.</p> :
            <div className="reportesTablaContenedor"><table className="reportesTabla">
                <thead><tr><th scope="col">Posición</th><th scope="col">Producto</th><th scope="col">Visitas</th></tr></thead>
                <tbody>{ranking.map(([id, visitas], indice) => <tr key={id}><td>{indice + 1}</td>
                    <td>{catalogo.find(p => p.id === id)?.nombre || `Producto #${id}`}</td><td>{visitas}</td></tr>)}</tbody>
            </table></div>}
        <h2>Continuidad de la observación</h2>
        <p>Los intervalos desconectados pueden dejar métricas incompletas. Las reconexiones conservan los contadores y descartan eventos duplicados.</p>
        {interrupciones.length ? <ul>{interrupciones.map((e, i) => <li key={i}>{fecha(e.fecha)} — {e.estado}</li>)}</ul> :
            <p>Sin interrupciones registradas en esta sesión. Estado actual: {estado}.</p>}
    </section></Layout>;
}
