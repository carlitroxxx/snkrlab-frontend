export function leerOperacion(texto) {
    if (!texto) return null;
    const datos = JSON.parse(texto);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(datos.checkoutId || ""))
        throw new Error("Checkout guardado inválido.");
    const modalidad = datos.modalidad || "SIMULADO";
    if (!["WEBPAY", "SIMULADO"].includes(modalidad) ||
        (modalidad === "SIMULADO" && !["SIM_APROBADA_01", "SIM_RECHAZADA_01"].includes(datos.referenciaPago)))
        throw new Error("Modalidad guardada inválida.");
    if (datos.tarjetaId != null && !["SIM_TARJETA_01", "SIM_TARJETA_02", "SIM_TARJETA_03"].includes(datos.tarjetaId))
        throw new Error("Tarjeta simulada inválida.");
    return { checkoutId: datos.checkoutId, modalidad, estado: datos.estado,
        referenciaPago: modalidad === "WEBPAY" ? "WEBPAY" : datos.referenciaPago,
        tarjetaId: modalidad === "SIMULADO" ? datos.tarjetaId : null,
        resultadoPago: datos.resultadoPago, enviadoWebpay: Boolean(datos.enviadoWebpay) };
}

export function validarFormularioWebpay(url, token) {
    const destino = new URL(url);
    if (destino.protocol !== "https:" || destino.hostname !== "webpay3gint.transbank.cl" ||
        destino.username || destino.password || destino.port ||
        typeof token !== "string" || !token || token.length > 128)
        throw new Error("No se recibió un formulario válido de Transbank integración.");
    return destino.href;
}

export function enviarFormularioWebpay(url, token) {
    const destino = validarFormularioWebpay(url, token);
    const form = document.createElement("form");
    form.method = "POST"; form.action = destino;
    const input = document.createElement("input");
    input.type = "hidden"; input.name = "token_ws"; input.value = token;
    form.appendChild(input); document.body.appendChild(form);
    try { form.submit(); } finally { form.remove(); }
}

export function mensajePago(checkout) {
    if (checkout.resultadoPago === "PRODUCTO_INACTIVO") return "Hay productos que ya no están disponibles. Retíralos del carrito para continuar.";
    if (checkout.estado === "CONFIRMADO") return "Compra confirmada.";
    if (checkout.estado === "PAGO_APROBADO") return "Pago aprobado. Falta confirmar la compra; retoma esta operación.";
    if (checkout.resultadoPago === "ANULADO") return "Pago anulado. Tu carrito se conserva.";
    if (checkout.resultadoPago === "BLOQUEADO_FRAUDE") return "Pago bloqueado por el control antifraude. Tu carrito se conserva.";
    if (checkout.estado === "RECHAZADO") return "Pago rechazado. Tu carrito se conserva.";
    if (checkout.resultadoPago === "PENDIENTE") return "Pago pendiente en Webpay. Consulta nuevamente el resultado antes de iniciar otra compra.";
    return "El resultado del pago aún no está confirmado. Conservamos la compra para recuperarla; no realices otro pago.";
}

export async function confirmarSiAprobado(checkout, confirmar) {
    return checkout.estado === "PAGO_APROBADO" ? await confirmar() : checkout;
}
export async function recuperarCompraConfirmada(checkout, cargarCarrito, storage, clave) {
    if (checkout?.estado !== "CONFIRMADO") return null;
    const items = await cargarCarrito();
    if (!Array.isArray(items)) throw new Error("Compra confirmada; falta actualizar el carrito. Reintenta.");
    const activa = leerOperacion(storage.getItem(clave));
    const liberado = activa?.checkoutId === checkout.checkoutId;
    if (liberado) storage.removeItem(clave);
    return { items, liberado };
}
export async function liberarRechazado(actual, consultar, storage, clave) {
    const confirmado = await consultar();
    if (confirmado?.checkoutId !== actual.checkoutId || confirmado.estado !== "RECHAZADO" ||
        !["RECHAZADO", "ANULADO", "BLOQUEADO_FRAUDE", "PRODUCTO_INACTIVO"].includes(confirmado.resultadoPago))
        throw new Error("La compra anterior no tiene un rechazo o anulación definitivo.");
    if (leerOperacion(storage.getItem(clave))?.checkoutId !== actual.checkoutId)
        throw new Error("La compra activa cambió. Recupera el carrito.");
    storage.removeItem(clave);
}
export function seleccionSimulada(tarjeta, referencia) {
    return {
        tarjeta: ["SIM_TARJETA_01", "SIM_TARJETA_02", "SIM_TARJETA_03"].includes(tarjeta) ? tarjeta : "SIM_TARJETA_01",
        referencia: ["SIM_APROBADA_01", "SIM_RECHAZADA_01"].includes(referencia) ? referencia : "SIM_APROBADA_01",
    };
}
export function advertirTarjetaPendiente(operacion) {
    return operacion?.modalidad === "SIMULADO" && !operacion.tarjetaId &&
        !["RECHAZADO", "CONFIRMADO"].includes(operacion.estado);
}
