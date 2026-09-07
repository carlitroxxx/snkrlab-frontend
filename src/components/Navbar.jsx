import { Link } from "react-router-dom";
import { SesionUsuario } from "../features/auth/SesionUsuario";

export function Navbar() {
    return (
        <header className="navbar">
            <Link to="/" className="navbarMarca">
                <img src="/snkrlab-logo.jpg" alt="SNKRLAB" className="navbarLogo" />
            </Link>
            <SesionUsuario />
        </header>
    );
}