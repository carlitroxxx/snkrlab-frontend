import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { PublicClientApplication, EventType } from "@azure/msal-browser";
import { MsalProvider } from "@azure/msal-react";
import { msalConfig } from "./auth/AuthConfig";
import App from "./App.jsx";
import "./index.css";

const msalInstance = new PublicClientApplication(msalConfig);

await msalInstance.initialize();
const accounts = msalInstance.getAllAccounts();
if (accounts.length > 0) {
    msalInstance.setActiveAccount(accounts[0]);
}

msalInstance.addEventCallback((event) => {
    if (event.eventType === EventType.LOGIN_SUCCESS && event.payload.account) {
        msalInstance.setActiveAccount(event.payload.account);
    }
});

await msalInstance.handleRedirectPromise().catch((error) => {
    console.error("Error procesando el redirect de MSAL:", error);
});

ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
        <MsalProvider instance={msalInstance}>
            <BrowserRouter>
                <App />
            </BrowserRouter>
        </MsalProvider>
    </React.StrictMode>
);