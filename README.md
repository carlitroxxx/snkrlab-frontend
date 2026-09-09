# snkrlab-frontend

Frontend del sistema **SNKRLAB**: catálogo de productos, carrito de compras y checkout, con inicio de sesión mediante **Azure AD (Microsoft Entra ID)**.

> Este proyecto está construido en **React + Vite** (`@azure/msal-react`), no en Angular. La pauta de la evaluación pide explícitamente un componente Angular — dejarlo anotado acá para no perderlo de vista antes de la entrega.

## Herramientas

- React + Vite
- React Router
- `@azure/msal-browser` / `@azure/msal-react` (autenticación con Azure AD, flujo MSAL)

## Estructura

```
src/
├─ api/            httpClient.js — fetch autenticado + definición de BASE_URL
├─ features/
│  ├─ auth/         AuthConfig.js (config MSAL), authApi.js, SesionUsuario.jsx
│  ├─ productos/     productosApi.js, CatalogoGrid.jsx, ProductoCard.jsx
│  └─ carrito/       carritoApi.js
├─ pages/           Catalogo.jsx, DetalleProducto.jsx, Carrito.jsx
├─ components/       Navbar.jsx, Layout.jsx, Boton.jsx, Etiqueta.jsx, Precio.jsx
└─ main.jsx / App.jsx
```

## Variables de entorno

Crear un archivo `.env` en la raíz (Vite solo expone las que empiezan con `VITE_`):

```
VITE_AZURE_CLIENT_ID=<client id de la app registrada en Azure AD>
VITE_AZURE_TENANT_ID=<tenant id de Azure AD>
VITE_AZURE_API_SCOPE=write-read
```

## Backend consumido

`src/api/httpClient.js` define la URL base de la API (AWS API Gateway, stage `desarrollo`):

```js
const BASE_URL = "https://<api-id>.execute-api.us-east-1.amazonaws.com/desarrollo";
```

**Actualizar `<api-id>` por el invoke URL real del API Gateway del equipo** antes de probar contra el backend desplegado.

Endpoints consumidos:
- `${BASE_URL}/api/v1/auth` — perfil del usuario autenticado
- `${BASE_URL}/api/v1/productos` — catálogo (público, sin token)
- `${BASE_URL}/api/v1/carrito` — carrito y checkout (requiere token)

## Autenticación

- Login: `msalInstance.loginRedirect` / scopes definidos en `loginRequest` (`AuthConfig.js`).
- Para llamar al backend, `httpClient.js` obtiene el token con `acquireTokenSilent` (con fallback a `acquireTokenRedirect`) y lo agrega como header `Authorization: Bearer <token>`.
- Los endpoints de catálogo (`GET /productos`) se llaman sin token porque son públicos en `ms-productos`.

## Ejecutar en local

```bash
npm install
npm run dev
```

Corre por defecto en `http://localhost:5173` (los backends tienen ese origen habilitado en su configuración CORS).

## Otros scripts

| Comando | Descripción |
|---|---|
| `npm run build` | build de producción |
| `npm run preview` | sirve el build de producción localmente |
| `npm run lint` | linter (ESLint) |

## Despliegue

- Se despliega el frontend en un dominio distinto a `http://localhost:5173`, hay que agregar ese origen a `allowedOrigins` en el `SecurityConfig` de los 3 microservicios (ms-auth, ms-productos, ms-carrito), y volver a construir sus imágenes Docker.
