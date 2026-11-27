import test from "node:test";
import assert from "node:assert/strict";
import { validarProducto } from "../src/features/productos/productoFormulario.js";
const producto = { nombre: " Zapatilla ", marca: "Marca", modelo: "Modelo", precio: "1000", stock: "0", imagen: "productos/zapatilla.jpg" };
test("formulario convierte enteros, limpia textos y no envía ID ni atributos ajenos", () => {
    const datos = validarProducto({ ...producto, id: 10, talla: 42 });
    assert.equal(datos.nombre, "Zapatilla");
    assert.equal(datos.precio, 1000); assert.equal(datos.stock, 0);
    assert.equal(datos.id, undefined); assert.equal(datos.talla, undefined);
});
test("rechaza obligatorios vacíos y límites Integer del modelo", () => {
    for (const cambios of [{ nombre: " " }, { marca: "" }, { modelo: "" }, { precio: "0" },
        { stock: "-1" }, { stock: "1.5" }, { precio: "2147483648" }, { precio: "" }, { nombre: "a".repeat(256) }])
        assert.throws(() => validarProducto({ ...producto, ...cambios }));
});
test("acepta rutas y HTTP/HTTPS; rechaza protocolos no admitidos", () => {
    for (const imagen of ["", "/img/a.jpg", "https://example.com/a.jpg", "http://localhost/a.jpg"])
        assert.doesNotThrow(() => validarProducto({ ...producto, imagen }));
    for (const imagen of ["javascript:alert(1)", "data:image/png;base64,x", "//example.com/a.jpg", "file:/a"])
        assert.throws(() => validarProducto({ ...producto, imagen }));
});
