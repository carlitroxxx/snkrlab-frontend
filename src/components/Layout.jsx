import { Navbar } from "./Navbar";

export function Layout({ children }) {
    return (
        <div className="layout">
            <Navbar />
            <main className="layoutContenido">{children}</main>
        </div>
    );
}