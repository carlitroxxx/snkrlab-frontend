import test from "node:test";
import assert from "node:assert/strict";
import { leerOperacion, validarFormularioWebpay, mensajePago, confirmarSiAprobado } from "../src/features/carrito/webpay.js";
const checkoutId = "12345678-1234-1234-1234-123456789012";
test("recupera simulaciones anteriores sin cambiar modalidad", () => {
    const r = leerOperacion(JSON.stringify({ checkoutId, referenciaPago:"SIM_RECHAZADA_01", tarjetaId:"SIM_TARJETA_01" }));
    assert.equal(r.modalidad,"SIMULADO");
});
test("recupera Webpay sin conservar tokens o datos ajenos", () => {
    const r = leerOperacion(JSON.stringify({checkoutId,modalidad:"WEBPAY",estado:"PAGO_INCIERTO",enviadoWebpay:true,token:"secreto"}));
    assert.equal(r.modalidad,"WEBPAY"); assert.equal(r.enviadoWebpay,true); assert.equal(r.token,undefined);
});
test("datos dañados bloquean recuperación", () => {
    assert.throws(() => leerOperacion("{"));
    assert.throws(() => leerOperacion(JSON.stringify({checkoutId:"otro",modalidad:"WEBPAY"})));
    assert.throws(() => leerOperacion(JSON.stringify({checkoutId,modalidad:"OTRO"})));
});
test("solo formulario HTTPS oficial de integración", () => {
    assert.equal(validarFormularioWebpay("https://webpay3gint.transbank.cl/webpayserver/initTransaction","token"),"https://webpay3gint.transbank.cl/webpayserver/initTransaction");
    for (const url of ["http://webpay3gint.transbank.cl","https://webpay3gint.transbank.cl.atacante.test","https://usuario@webpay3gint.transbank.cl","javascript:alert(1)"]) {
        assert.throws(() => validarFormularioWebpay(url,"token"));
    }
    assert.throws(() => validarFormularioWebpay("https://webpay3gint.transbank.cl",null));
});
test("solo aprobación del backend ejecuta confirmación", async () => {
    let llamadas=0;
    const confirmar=async()=>{llamadas++;return {estado:"CONFIRMADO"};};
    for (const estado of ["PAGO_INCIERTO","RECHAZADO","CONFIRMADO","ORDEN_PENDIENTE"]) {
        assert.equal((await confirmarSiAprobado({estado},confirmar)).estado,estado);
    }
    assert.equal(llamadas,0);
    assert.equal((await confirmarSiAprobado({estado:"PAGO_APROBADO"},confirmar)).estado,"CONFIRMADO");
    assert.equal(llamadas,1);
});
test("fallo de confirmación no se convierte en éxito", async () => {
    await assert.rejects(confirmarSiAprobado({estado:"PAGO_APROBADO"},async()=>{throw new Error("red");}));
});
test("mensajes distinguen anulación, antifraude y pendiente", () => {
    assert.match(mensajePago({estado:"RECHAZADO",resultadoPago:"ANULADO"}),/anulado/);
    assert.match(mensajePago({estado:"RECHAZADO",resultadoPago:"BLOQUEADO_FRAUDE"}),/antifraude/);
    assert.match(mensajePago({estado:"PAGO_INCIERTO",resultadoPago:"PENDIENTE"}),/pendiente/);
    assert.match(mensajePago({estado:"PAGO_INCIERTO"}),/no realices otro pago/);
});

test("libera solo checkout confirmado coincidente después de actualizar carrito", async () => {
    const { recuperarCompraConfirmada } = await import("../src/features/carrito/webpay.js");
    for (const modalidad of ["WEBPAY", "SIMULADO"]) {
        let valor=JSON.stringify({checkoutId,modalidad,referenciaPago:"SIM_APROBADA_01"});
        const storage={getItem:()=>valor,removeItem:()=>{valor=null;}};
        for (const estado of ["PAGO_INCIERTO","PAGO_APROBADO","ORDEN_PENDIENTE"]) {
            assert.equal(await recuperarCompraConfirmada({checkoutId,estado},()=>{throw Error();},storage,"cuenta"),null);
            assert.ok(valor);
        }
        await assert.rejects(recuperarCompraConfirmada({checkoutId,estado:"CONFIRMADO"},async()=>{throw Error("red");},storage,"cuenta"));
        assert.ok(valor);
        const r=await recuperarCompraConfirmada({checkoutId,estado:"CONFIRMADO"},async()=>[],storage,"cuenta");
        assert.equal(r.liberado,true);assert.equal(valor,null);assert.deepEqual(r.items,[]);
    }
});
test("no elimina otra compra y permite repetir recuperación sin cobros", async () => {
    const { recuperarCompraConfirmada } = await import("../src/features/carrito/webpay.js");
    const storage={getItem:()=>JSON.stringify({checkoutId,modalidad:"WEBPAY"}),removeItem:()=>{throw Error("no borrar");}};
    const r=await recuperarCompraConfirmada({checkoutId:"otro",estado:"CONFIRMADO"},async()=>[],storage,"cuenta");
    assert.equal(r.liberado,false);
    assert.equal((await recuperarCompraConfirmada({checkoutId,estado:"CONFIRMADO"},async()=>[],
        {getItem:()=>null,removeItem:()=>{throw Error();}},"cuenta")).liberado,false);
});

test("recompra verifica rechazo antes de liberar, incluyendo simulación antifraude", async () => {
    const { liberarRechazado } = await import("../src/features/carrito/webpay.js");
    for (const resultadoPago of ["RECHAZADO","ANULADO","BLOQUEADO_FRAUDE"]) {
        let borrado=false;
        const storage={getItem:()=>JSON.stringify({checkoutId,modalidad:"WEBPAY"}),removeItem:()=>{borrado=true;}};
        await liberarRechazado({checkoutId},async()=>({checkoutId,estado:"RECHAZADO",resultadoPago}),storage,"cuenta");
        assert.equal(borrado,true);
    }
});
test("recompra no libera inciertos, aprobados, otra cuenta o fallo de red", async () => {
    const { liberarRechazado } = await import("../src/features/carrito/webpay.js");
    const storage={getItem:()=>JSON.stringify({checkoutId,modalidad:"WEBPAY"}),removeItem:()=>{throw Error("no borrar");}};
    for (const estado of ["PAGO_INCIERTO","PAGO_APROBADO","CONFIRMADO"]) {
        await assert.rejects(liberarRechazado({checkoutId},async()=>({checkoutId,estado}),storage,"cuenta"));
    }
    await assert.rejects(liberarRechazado({checkoutId},async()=>{throw Error("red");},storage,"cuenta"));
});

test("nueva simulación usa tarjeta y resultado válidos tras Webpay", async () => {
    const { seleccionSimulada, advertirTarjetaPendiente } = await import("../src/features/carrito/webpay.js");
    assert.deepEqual(seleccionSimulada(null,"WEBPAY"),{tarjeta:"SIM_TARJETA_01",referencia:"SIM_APROBADA_01"});
    assert.equal(seleccionSimulada("SIM_TARJETA_03","SIM_RECHAZADA_01").tarjeta,"SIM_TARJETA_03");
    assert.equal(advertirTarjetaPendiente({modalidad:"WEBPAY",estado:"RECHAZADO"}),false);
    assert.equal(advertirTarjetaPendiente({modalidad:"SIMULADO",estado:"RECHAZADO",resultadoPago:"ANULADO"}),false);
    assert.equal(advertirTarjetaPendiente({modalidad:"SIMULADO",estado:"PAGO_INCIERTO"}),true);
    assert.equal(advertirTarjetaPendiente({modalidad:"SIMULADO",estado:"PAGO_INCIERTO",tarjetaId:"SIM_TARJETA_01"}),false);
});
