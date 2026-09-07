import "react";
import { Link } from "react-router-dom";
import { Precio } from "../../components/Precio";
import { Etiqueta } from "../../components/Etiqueta";

export function ProductoCard({ producto }) {
    const agotado = producto.stock === 0;

    return (
        <Link to={`/producto/${producto.id}`} className="productoCard">
            <div className="productoCardImagen">
                <img src={producto.imagen} alt={producto.nombre} loading="lazy" />
                {agotado && <Etiqueta tono="alerta">Agotado</Etiqueta>}
            </div>
            <div className="productoCardInfo">
                <span className="productoCardMarca">{producto.marca}</span>
                <h3 className="productoCardNombre">{producto.nombre}</h3>
                <div className="productoCardPie">
                    <span className="productoCardSku">REF {String(producto.id).padStart(4, "0")}</span>
                    <Precio valor={producto.precio} />
                </div>
            </div>
        </Link>
    );
}