import test from "node:test";
import assert from "node:assert/strict";
import { crearMetricas, recibir, conectarTelemetria } from "../src/features/analitica/telemetria.js";

const evento = (id, incremento, productoId = 1) => ({ eventoId: "topic:0:" + id, incremento, productoId, fecha: "2026-11-27T12:00:00Z" });
test("ponderaciones cuentan eventos, deduplican y mantienen ranking", () => {
    const m = crearMetricas();
    recibir(m, JSON.stringify([evento(1, 1), evento(2, 3), evento(3, -1), evento(4, 1, 2), evento(5, 1)]));
    recibir(m, JSON.stringify([evento(1, 1), evento(2, 3)]));
    assert.equal(m.visitas, 3); assert.equal(m.agregados, 1);
    assert.deepEqual([...m.ranking], [[1, 2], [2, 1]]);
    assert.equal(crearMetricas().visitas, 0);
});
test("ignora mensajes inválidos sin contaminar las métricas", () => {
    const m = crearMetricas();
    for (const texto of ["{", "null", "{}", JSON.stringify([null, evento(1, 7), evento(2, 1, -2), { ...evento(3, 1), fecha: "incorrecta" }])])
        assert.equal(recibir(m, texto), false);
    assert.equal(m.vistos.size, 0);
});
const flush = () => new Promise(resolve => setImmediate(resolve));
function entorno() {
    const sockets = [], estados = [], tareas = new Map(); let seq = 0;
    class Socket {
        constructor(url) { this.url = url; sockets.push(this); }
        close() { this.cerrado = true; }
    }
    return { sockets, estados, tareas, Socket, estado: e => estados.push(e),
        programar: (fn, ms) => { tareas.set(++seq, { fn, ms }); return seq; },
        cancelar: id => tareas.delete(id), ahora: () => 100000,
        token: async () => ({ accessToken: "solo-prueba", expiresOn: new Date(400000) }),
        mensaje: () => {}, url: "wss://example.test/production" };
}
test("sin configuración o URL insegura no abre socket", () => {
    for (const url of ["", "http://example.test", "wss://example.test/?token=x"]) {
        const e = entorno(); conectarTelemetria({ ...e, url })();
        assert.equal(e.sockets.length, 0);
    }
});
test("autentica, reconecta y renueva token; detener cierra socket y timers", async () => {
    const e = entorno(); let tokens = 0;
    const detener = conectarTelemetria({ ...e, token: async () => { tokens++; return e.token(); } });
    await flush();
    assert.equal(new URL(e.sockets[0].url).searchParams.get("access_token"), "solo-prueba");
    e.sockets[0].onopen();
    assert.equal(e.estados.at(-1), "Conectada");
    [...e.tareas.values()].find(t => t.ms === 240000).fn();
    await flush(); assert.equal(tokens, 2); assert.ok(e.sockets[0].cerrado);
    e.sockets[1].onclose();
    assert.equal(e.estados.at(-1), "Interrumpida: reintentando");
    [...e.tareas.values()].find(t => t.ms === 1000).fn();
    await flush(); assert.equal(tokens, 3);
    detener(); assert.ok(e.sockets.at(-1).cerrado);
});
test("no conecta después de desmontar mientras espera el token", async () => {
    const e = entorno(); let resolver;
    const detener = conectarTelemetria({ ...e, token: () => new Promise(r => { resolver = r; }) });
    detener(); resolver(await e.token()); await flush();
    assert.equal(e.sockets.length, 0);
});
test("interacción Azure requerida no inicia reintentos infinitos", async () => {
    const e = entorno();
    conectarTelemetria({ ...e, token: async () => { throw { errorCode: "interaction_required" }; } });
    await flush(); assert.equal(e.sockets.length, 0); assert.equal(e.tareas.size, 0);
    assert.match(e.estados.at(-1), /iniciar sesión/);
});
