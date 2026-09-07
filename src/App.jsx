import { Routes, Route } from "react-router-dom";
import { Catalogo } from "./pages/Catalogo";
import {DetalleProducto} from "./pages/DetalleProducto.jsx";

function App() {
    return (
        <Routes>
            <Route path="/" element={<Catalogo />} />
            <Route path="/producto/:id" element={<DetalleProducto />} />
        </Routes>
    );
}

export default App;