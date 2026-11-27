# Webpay frontend 17.4
Ruta React: /pago/resultado, relativa al basename.
Local: http://localhost:5173/pago/resultado.
Build production actual: /desarrollo/pago/resultado. VITE_BASENAME puede
sobrescribir el basename y debe coincidir con el prefijo publicado de assets.
El hosting debe resolver rutas SPA hacia index.html (nginx actual ya tiene fallback).

Variables existentes: VITE_API_CARRITO_URL, VITE_API_ORDENES_URL,
VITE_API_AUTH_URL y configuración VITE_COGNITO_* actual.
No se requieren claves Transbank ni conexión directa a Pago en el frontend.
Fuera del alcance de esta etapa: establecer WEBPAY_FRONTEND_URL en Carrito/Pago
a la URL completa anterior y WEBPAY_RETURN_URL al retorno público de Carrito;
habilitar las rutas exactas GET/POST del retorno sin authorizer en API Gateway.
No se modificaron esas configuraciones.

Webpay es el modo predeterminado; la simulación conserva sus selectores y flujo.
Checkout se conserva en localStorage bajo snkrlab:checkout:<homeAccountId>.
Solo se guardan identificadores/estado/modalidad y referencias simuladas.
No se persiste token_ws ni se capturan PAN/CVV. El formulario se envía solo al
host HTTPS de integración webpay3gint.transbank.cl.
La página de resultado recupera sesión y permisos; si falta sesión permite Cognito
y vuelve a esta ruta después del login. No decide el éxito mediante query params.
Sincroniza Pago a través de Carrito y solo confirma PAGO_APROBADO.
CONFIRMADO recupera el comprobante sin volver a pagar ni confirmar.
Preparar otra compra verifica nuevamente un estado terminal con el backend.
Errores conservan checkout y modalidad; nunca cambian automáticamente a simulación.
Una compra pendiente puede retomar el MISMO formulario mediante acción explícita.

Persisten límites del backend: conciliación manual de ciertos resultados inciertos,
migraciones y rutas AWS pendientes; no se verificó un pago real de integración.
Si se elimina localStorage o se usa otro dispositivo no se puede descubrir
automáticamente el checkout: revisar Mis órdenes y recuperar el ID con soporte.
El backend sigue bloqueando nuevos cobros activos aunque falte almacenamiento local.
Pruebas: npm.cmd test, npm.cmd run build y npm.cmd run lint.
