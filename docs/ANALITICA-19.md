# Analítica en vivo

Ruta /analitica dentro del basename existente de React Router, protegida por
RutaProtegida Administrador y sesión Microsoft. Reportes permanece independiente.
La autorización efectiva del socket la realiza Mensajero con el JWT firmado.

Configurar al compilar para AWS:

VITE_WEBSOCKET_URL=wss://0m295gosra.execute-api.us-east-1.amazonaws.com/production

Usar .env.production o las variables del proceso de build. En local dejar la
variable sin definir en .env/.env.local para mostrar «Conexión no configurada»,
o configurar explícitamente el endpoint deseado. No existe fallback automático
al entorno AWS. Vite incorpora esta variable al ejecutar npm run build.
No se cambiaron archivos de entorno ni se desplegó el resultado.

Se reutilizan apiRequest y acquireTokenSilent de MSAL para obtener el access token
de la API SNKRLAB (write-read), nunca User.Read/Graph ni ID token. El token viaja
en access_token durante el handshake WSS, según el README de Lambdas. No se
registra ni persiste la URL. Excluir query strings de logs externos.
Renovación un minuto antes de vencer o del límite de dos horas; reconexión con
espera creciente hasta 30 segundos y timeout del handshake de 15 segundos.
Si Azure exige interacción, volver a iniciar sesión. Logout y desmontaje cierran
el socket y cancelan los temporizadores, incluso con adquisición de token pendiente.

Interpretación confirmada en NavegacionConsumer de recomendaciones:
1 = visita; 3 = un evento de agregado (no tres unidades); -1 = eliminación,
sin restar visitas ni agregados. Array de eventos del contrato de la guía 14.
Deduplicación por eventoId en memoria durante toda la sesión del dashboard.
No se recupera historial; los eventos tardíos se cuentan cuando son recibidos,
independientemente de su fecha de origen. No representa visitantes únicos,
ventas ni todas las visitas del sitio: el consumidor descarta usuarios anónimos.
Ranking por visitas; nombres desde listarProductos, ID como alternativa si falta.

El período comienza al abrir el dashboard. Recargar, salir de la ruta o cambiar
cuenta inicia otro período; reconectar conserva contadores. Se muestran estado,
última recepción e incidencias: los huecos de conexión no se recuperan.
La deduplicación conserva IDs en memoria: esta vista está destinada a sesiones
de observación acotadas, no a almacenar históricos indefinidamente.

Validación local: npm test y npm run build. Las pruebas de socket usan dobles,
sin conectarse a AWS. Pendiente comprobar handshake, permisos, renovación y
recepción real con una cuenta Azure Administrador en el entorno desplegado.
