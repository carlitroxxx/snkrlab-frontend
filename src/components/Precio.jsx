import "react";

const formatoCLP = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" });

export function Precio({ valor }) {
    return <span className="precio">{formatoCLP.format(valor)}</span>;
}