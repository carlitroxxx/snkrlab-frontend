export function crearMetricas() {
    return { vistos: new Set(), visitas: 0, agregados: 0, ranking: new Map(), ultima: null };
}

export function recibir(metricas, texto, ahora = Date.now()) {
    let eventos;
    try { eventos = JSON.parse(texto); } catch { return false; }
    if (!Array.isArray(eventos)) return false;
    let cambio = false;
    for (const e of eventos) {
        if (!e || typeof e.eventoId !== "string" || !/^[\w.-]+:\d+:\d+$/.test(e.eventoId)
            || !Number.isSafeInteger(e.productoId) || e.productoId <= 0
            || ![1, 3, -1].includes(e.incremento)
            || typeof e.fecha !== "string" || !Number.isFinite(Date.parse(e.fecha))
            || metricas.vistos.has(e.eventoId)) continue;
        metricas.vistos.add(e.eventoId);
        if (e.incremento === 1) {
            metricas.visitas++;
            metricas.ranking.set(e.productoId, (metricas.ranking.get(e.productoId) || 0) + 1);
        }
        if (e.incremento === 3) metricas.agregados++;
        metricas.ultima = ahora;
        cambio = true;
    }
    return cambio;
}

// Sin logs ni persistencia del token/URL. Dependencias inyectables para pruebas.
export function conectarTelemetria({ url, token, estado, mensaje, Socket = WebSocket,
    programar = setTimeout, cancelar = clearTimeout, ahora = Date.now }) {
    let detenido = false, socket, timer, renovacion, vigilancia, intento = 0;
    const cerrar = () => {
        cancelar(renovacion); cancelar(vigilancia);
        if (socket) {
            socket.onopen = socket.onclose = socket.onerror = socket.onmessage = null;
            socket.close(); socket = null;
        }
    };
    const reintentar = () => {
        cerrar();
        if (detenido) return;
        estado("Interrumpida: reintentando");
        timer = programar(abrir, Math.min(30000, 1000 * 2 ** Math.min(intento++, 5)));
    };
    async function abrir() {
        if (detenido) return;
        estado("Conectando");
        try {
            const credencial = await token();
            if (detenido) return;
            const vence = Math.min(new Date(credencial.expiresOn).getTime(), ahora() + 7200000);
            if (!credencial.accessToken || !Number.isFinite(vence) || vence - ahora() < 60000) {
                estado("Sesión Azure: vuelve a iniciar sesión"); return;
            }
            const destino = new URL(url);
            destino.searchParams.set("access_token", credencial.accessToken);
            socket = new Socket(destino.toString());
            vigilancia = programar(reintentar, 15000);
            socket.onopen = () => {
                cancelar(vigilancia); intento = 0; estado("Conectada");
                renovacion = programar(() => { cerrar(); estado("Renovando sesión: posible interrupción"); abrir(); },
                    Math.max(1000, vence - ahora() - 60000));
            };
            socket.onmessage = e => { if (ahora() < vence) mensaje(e.data); else reintentar(); };
            socket.onclose = reintentar;
            socket.onerror = reintentar;
        } catch (e) {
            if (detenido) return;
            if (["interaction_required", "login_required", "consent_required"].includes(e?.errorCode)) {
                estado("Sesión Azure: vuelve a iniciar sesión");
            } else reintentar();
        }
    }
    if (!url) estado("Conexión no configurada");
    else {
        try {
            const destino = new URL(url);
            if (destino.protocol !== "wss:" || destino.search || destino.hash || destino.username || destino.password) throw Error();
            abrir();
        } catch { estado("URL WebSocket inválida"); }
    }
    return () => { detenido = true; cancelar(timer); cerrar(); };
}
