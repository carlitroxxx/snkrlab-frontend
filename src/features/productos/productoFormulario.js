export const productoVacio = { nombre: "", marca: "", modelo: "", precio: "", stock: "", descripcion: "", imagen: "" };

export function validarProducto(formulario) {
    const datos = {};
    for (const campo of ["nombre", "marca", "modelo", "descripcion", "imagen"]) {
        datos[campo] = String(formulario[campo] ?? "").trim();
        if (datos[campo].length > 255 || (["nombre", "marca", "modelo"].includes(campo) && !datos[campo]))
            throw new Error(campo + ": completa el campo con un máximo de 255 caracteres.");
    }
    for (const campo of ["precio", "stock"]) {
        const texto = String(formulario[campo] ?? "").trim();
        const numero = Number(texto);
        if (!/^[0-9]+$/.test(texto) || !Number.isInteger(numero) || numero > 2147483647 || numero < (campo === "precio" ? 1 : 0))
            throw new Error(campo + ": ingresa un entero válido; precio mayor a cero y stock no negativo.");
        datos[campo] = numero;
    }
    if (datos.imagen && (/^(javascript:|data:|blob:|file:|\/\/)/i.test(datos.imagen)
        || (/^[a-z]+:/i.test(datos.imagen) && !/^https?:\/\//i.test(datos.imagen))))
        throw new Error("Imagen: utiliza una ruta del catálogo o una URL HTTP/HTTPS.");
    return datos;
}
