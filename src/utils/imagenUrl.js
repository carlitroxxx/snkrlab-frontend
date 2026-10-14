export function imagenUrl(ruta) {
    if (!ruta) return undefined;

    if (/^(https?:\/\/|\/\/|data:|blob:)/i.test(ruta)) {
        return ruta;
    }

    return `${import.meta.env.BASE_URL}${ruta.replace(/^\/+/, "")}`;
}