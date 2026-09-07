import { Routes, Route } from "react-router-dom";
import { Catalogo } from "./pages/Catalogo";

function App() {
    return (
        <Routes>
            <Route path="/" element={<Catalogo />} />
        </Routes>
    );
}

export default App;