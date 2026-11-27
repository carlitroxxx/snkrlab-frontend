import test from "node:test";
import assert from "node:assert/strict";
import { liberarRechazado, mensajePago } from "../src/features/carrito/webpay.js";
test("producto inactivo libera checkout verificado y conserva pagos pendientes", async () => {
    const operacion = { checkoutId: "70934d4d-4c29-43b1-9b15-e5c370f587e4", modalidad: "WEBPAY" };
    let valor = JSON.stringify(operacion);
    const storage = { getItem: () => valor, removeItem: () => { valor = null; } };
    for (const estado of ["PAGO_INCIERTO", "PAGO_APROBADO"]) {
        await assert.rejects(liberarRechazado(operacion, async () => ({ ...operacion, estado, resultadoPago: "PRODUCTO_INACTIVO" }), storage, "checkout"));
        assert.notEqual(valor, null);
    }
    const rechazo = { ...operacion, estado: "RECHAZADO", resultadoPago: "PRODUCTO_INACTIVO" };
    await liberarRechazado(operacion, async () => rechazo, storage, "checkout");
    assert.equal(valor, null);
    assert.equal(mensajePago(rechazo), "Hay productos que ya no están disponibles. Retíralos del carrito para continuar.");
});
