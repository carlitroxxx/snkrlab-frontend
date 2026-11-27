import { useEffect, useRef, useState } from "react";
import { Layout } from "../components/Layout";
import { Boton } from "../components/Boton";
import { Precio } from "../components/Precio";
import { useSesion } from "../features/auth/useSesion";
import { listarProductosAdmin, cambiarEstadoProducto, guardarProducto } from "../features/productos/productosApi";
import { ImagenCatalogo } from "../features/productos/ImagenCatalogo";
import { productoVacio, validarProducto } from "../features/productos/productoFormulario";

export function ProductosAdmin() {
    const { instance, cuenta, proveedor } = useSesion();
    if (proveedor !== "microsoft" || !cuenta) return <Layout><p>Se requiere una cuenta administrativa de Azure.</p></Layout>;
    return <Gestion key={cuenta.homeAccountId} instance={instance} cuenta={cuenta} />;
}

function Gestion({ instance, cuenta }) {
    const [productos, setProductos] = useState([]);
    const [formulario, setFormulario] = useState(null);
    const [id, setId] = useState(null);
    const [error, setError] = useState("");
    const [mensaje, setMensaje] = useState("");
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [revision, setRevision] = useState(0);
    const ocupado = useRef(false);
    useEffect(() => {
        let activo = true;
        listarProductosAdmin(instance, cuenta).then(datos => {
            if (!Array.isArray(datos)) throw new Error("Respuesta de catálogo inválida.");
            if (activo) setProductos(datos);
        }).catch(() => { if (activo) setError("No se pudo actualizar la lista. Reintenta la consulta antes de realizar otra operación."); })
            .finally(() => { if (activo) setCargando(false); });
        return () => { activo = false; };
    }, [revision, instance, cuenta]);
    const refrescar = () => { setCargando(true); setError(""); setRevision(n => n + 1); };
    async function cambiarEstado(producto) {
        if (ocupado.current || !window.confirm((producto.activo ? "¿Desactivar " : "¿Reactivar ") + producto.nombre + "? El historial se conservará.")) return;
        ocupado.current = true; setGuardando(true); setError(""); setMensaje("");
        try {
            await cambiarEstadoProducto(producto.id, !producto.activo, instance, cuenta);
            setFormulario(null); setMensaje(producto.activo ? "Producto desactivado." : "Producto reactivado."); refrescar();
        } catch { setError("No se pudo confirmar el cambio. Actualiza la lista antes de reintentarlo."); }
        finally { ocupado.current = false; setGuardando(false); }
    }
    async function guardar(event) {
        event.preventDefault();
        if (ocupado.current) return;
        setError(""); setMensaje("");
        let datos;
        try { datos = validarProducto(formulario); } catch (e) { setError(e.message); return; }
        ocupado.current = true; setGuardando(true);
        try {
            const respuesta = await guardarProducto(datos, id, instance, cuenta);
            if (!respuesta) return;
            setFormulario(null);
            setMensaje(id == null ? "Producto creado." : "Producto actualizado.");
            refrescar();
        } catch {
            setError("No se pudo confirmar la operación. Actualiza la lista antes de repetirla para evitar duplicados.");
            setFormulario(null);
            setCargando(true); setRevision(n => n + 1);
        } finally { ocupado.current = false; setGuardando(false); }
    }
    return <Layout><section className="productosAdmin">
        <h1>Productos</h1>
        <div className="productosAdminAcciones">
            <Boton disabled={guardando || cargando || Boolean(error)} onClick={() => { setId(null); setFormulario({ ...productoVacio }); setMensaje(""); }}>Crear producto</Boton>
            <Boton variante="linea" disabled={guardando || cargando} onClick={refrescar}>Actualizar lista</Boton>
        </div>
        {error && <p role="alert">{error}</p>}
        {mensaje && <p role="status">{mensaje}</p>}
        <p>Desactivar retira el producto del catálogo. Las compras con pago iniciado conservan su recuperación y el historial no se borra.</p>
        {formulario && <form className="productosAdminFormulario" onSubmit={guardar}>
            <h2>{id == null ? "Nuevo producto" : "Editar producto #" + id}</h2>
            {["marca", "modelo", "nombre", "precio", "stock", "descripcion", "imagen"].map(campo =>
                <label key={campo} htmlFor={"producto-" + campo}>{({ descripcion: "Descripción", imagen: "Imagen (ruta o URL)", precio: "Precio (CLP)" })[campo] || campo}
                    <input id={"producto-" + campo} name={campo} value={formulario[campo] ?? ""}
                        type={["precio", "stock"].includes(campo) ? "number" : "text"}
                        min={campo === "precio" ? 1 : campo === "stock" ? 0 : undefined}
                        max={["precio", "stock"].includes(campo) ? 2147483647 : undefined}
                        step={["precio", "stock"].includes(campo) ? 1 : undefined}
                        maxLength={255} required={!["descripcion", "imagen"].includes(campo)} disabled={guardando}
                        onChange={e => setFormulario(prev => ({ ...prev, [campo]: e.target.value }))} />
                </label>)}
            <div className="productosAdminAcciones"><Boton type="submit" disabled={guardando}>{guardando ? "Guardando..." : "Guardar"}</Boton>
                <Boton type="button" variante="linea" disabled={guardando} onClick={() => setFormulario(null)}>Cancelar</Boton></div>
        </form>}
        {cargando ? <p role="status">Cargando productos...</p> :
            <div className="reportesTablaContenedor"><table className="reportesTabla">
                <thead><tr>{["Imagen", "ID", "Marca", "Modelo", "Nombre", "Precio", "Stock", "Estado", "Acciones"].map(c => <th key={c} scope="col">{c}</th>)}</tr></thead>
                <tbody>{productos.map(p => <tr key={p.id}>
                    <td><ImagenCatalogo imagen={p.imagen} nombre={p.nombre} /></td><td>{p.id}</td><td>{p.marca}</td><td>{p.modelo}</td>
                    <td>{p.nombre}</td><td><Precio valor={p.precio} /></td><td>{p.stock}</td><td>{p.activo ? "Activo" : "Inactivo"}</td><td>
                        <Boton disabled={guardando || Boolean(error)} onClick={() => { setId(p.id); setFormulario({ ...p }); setMensaje(""); }}>Editar</Boton>
                        <Boton variante="linea" disabled={guardando || Boolean(error)} onClick={() => cambiarEstado(p)}>{p.activo ? "Desactivar" : "Reactivar"}</Boton>
                    </td></tr>)}</tbody>
            </table>{productos.length === 0 && <p>No hay productos registrados.</p>}</div>}
    </section></Layout>;
}
