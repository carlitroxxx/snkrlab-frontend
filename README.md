# snkrlab-frontend

Frontend del sistema **SNKRLAB**: catálogo de productos, carrito de compras y checkout, con autenticación que evolucionó desde **Azure AD (Microsoft Entra ID)** hacia la incorporación de **Amazon Cognito**.

> El frontend sigue construido en **React + Vite**. El proyecto conserva dependencias MSAL y añadió componentes para Cognito.

## Herramientas

- React + Vite
- React Router
- `@azure/msal-browser` / `@azure/msal-react` (integración original Azure AD)
- Componentes de Amazon Cognito (integración agregada en EV2)

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

## Autenticación (implementación original y ampliaciones EV2)

- Flujo Azure AD original: `msalInstance.loginRedirect` / scopes definidos en `loginRequest` (`AuthConfig.js`).
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

El entorno local puede levantarse con Docker Compose para los servicios backend; en AWS, el frontend y cada microservicio se despliegan por separado, con API Gateway como entrada.

- Se despliega el frontend en un dominio distinto a `http://localhost:5173`, hay que agregar ese origen a `allowedOrigins` en el `SecurityConfig` de los 3 microservicios (ms-auth, ms-productos, ms-carrito), y volver a construir sus imágenes Docker.

## Actualización EV2 — nuevas vistas y autenticación

El frontend ha evolucionado respecto de EV1. Se mantienen React + Vite y el código original de MSAL, pero se incorporaron módulos de sesión para **Amazon Cognito** (`CognitoConfig.js`, `SesionCognito.jsx`) y contexto de perfil.

### Rutas implementadas

| Ruta | Acceso | Pantalla |
|---|---|---|
| `/` | Público | Catálogo |
| `/producto/:id` | Público | Detalle de producto |
| `/carrito` | Cliente | Carrito y checkout |
| `/ordenes` | Cliente | Historial de órdenes |
| `/reportes` | Administrador | Panel de reportes |

### Archivos agregados o relevantes

- `src/features/auth/CognitoConfig.js`, `SesionCognito.jsx`, `PerfilContext.jsx`, `RutaProtegida.jsx` — sesión y rutas protegidas.
- `src/features/ordenes/ordenesApi.js` y `src/pages/MisOrdenes.jsx` — consultas de órdenes.
- `src/features/reportes/reportesApi.js`, `exportacionesApi.js`, `ExportarReportes.jsx` y `src/pages/Reportes.jsx` — métricas y exportación.

### Configuración y despliegue

La aplicación usa archivos `.env` y `.env.production`; configurar los valores `VITE_` según el entorno, sin publicar credenciales privadas. La ejecución local sigue siendo `npm install` y `npm run dev`. En AWS el frontend se despliega por separado y consume los endpoints de API Gateway.

**Pendiente:** autorización Lambda en API Gateway. **EV3 todavía no implementada:** ms-pago, Kafka y recomendaciones.
