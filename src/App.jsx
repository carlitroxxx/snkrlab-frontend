import { Routes, Route } from "react-router-dom";
import { Catalogo } from "./pages/Catalogo";
import { DetalleProducto } from "./pages/DetalleProducto";
import { Carrito } from "./pages/Carrito";
import {MisOrdenes} from "./pages/MisOrdenes.jsx";

function App() {
    return (
        <Routes>
            <Route path="/" element={<Catalogo />} />
            <Route path="/producto/:id" element={<DetalleProducto />} />
            <Route path="/carrito" element={<Carrito />} />
            <Route path="/ordenes" element={<MisOrdenes />} />
        </Routes>
    );
}

export default App;