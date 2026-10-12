import { Routes, Route } from "react-router-dom";
import { Catalogo } from "./pages/Catalogo";
import { DetalleProducto } from "./pages/DetalleProducto";
import { Carrito } from "./pages/Carrito";
import { MisOrdenes } from "./pages/MisOrdenes.jsx";
import { Reportes } from "./pages/Reportes";
import { PerfilProvider } from "./features/auth/PerfilContext";
import { RutaProtegida } from "./features/auth/RutaProtegida";

function App() {
    return (
        <PerfilProvider>
            <Routes>
                <Route element={<RutaProtegida />}>
                    <Route path="/" element={<Catalogo />}/>
                    <Route path="/producto/:id" element={<DetalleProducto />}/>
                    <Route path="/carrito" element={<Carrito />}/>
                    <Route path="/ordenes" element={<MisOrdenes />}/>
                    <Route element={<RutaProtegida soloAdministrador />}>
                        <Route path="/reportes" element={<Reportes />}/>
                    </Route>
                </Route>
            </Routes>
        </PerfilProvider>
    );
}

export default App;