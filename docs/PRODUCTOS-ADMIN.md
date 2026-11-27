# Gestión de productos

Ruta /admin/productos, dentro de RutaProtegida Administrador y sesión Azure.
Reutiliza listarProductos, apiFetch y el scope Azure existente. POST no envía ID;
PUT utiliza el ID seleccionado en la URL. Después de guardar se consulta la lista.
Un resultado de red ambiguo cierra el formulario y exige revisar la lista; no hay
reintento automático de creación.

Campos del modelo revisado: id Long generado, nombre/marca/modelo String,
precio/stock Integer, descripcion/imagen String opcionales.
Validación frontend de obligatorios, longitud 255, precio positivo, stock entero
no negativo y protocolos de imagen. No sube archivos ni incorpora tallas.

Revisión estática del backend: GET público; los otros métodos requieren
ROLE_Administrador. Azure valida firma, emisores v1/v2, audiencia y write-read;
Cognito no recibe autoridades administrativas. No se realizaron operaciones reales
ni pruebas HTTP autenticadas con cuentas de producción.

Problemas detectados antes de modificar backend:
- DELETE ejecuta deleteById sin comprobar referencias de otros servicios.
- Carrito y artículos de checkout conservan productoId; las compras pendientes
  necesitan el producto para validar/descontar stock.
- Órdenes conserva referencias y snapshots de compra; el borrado puede impedir
  operaciones pendientes de inventario.
- Recomendaciones conserva interacciones con productoId y filtra los productos
  ausentes del catálogo; no hay comprobación coordinada de referencias al borrar.
- POST/PUT carecen de validación Bean Validation de valores y longitudes; el
  frontend valida pero no sustituye una protección del servidor.
- PUT reemplaza stock absoluto: no existe control de versión frente a una edición
  administrativa basada en datos antiguos.

Por ello la eliminación está bloqueada en la interfaz, con explicación accesible.
No se presenta una confirmación engañosa ni se llama DELETE. La confirmación y
ejecución quedan pendientes hasta acordar protección en backend; comprobar solo
el carrito de la cuenta actual no protege los carritos de otros usuarios.
No se modificó ningún microservicio. El endpoint DELETE existente sigue teniendo
el riesgo indicado para otros clientes que lo invoquen directamente.


Actualización: la eliminación bloqueada descrita arriba fue sustituida por desactivación lógica. DELETE conserva el producto; PUT /{id}/reactivacion lo reactiva y GET /administracion permite ver inactivos con rol Administrador. Consultar snkrlab-ms-productos/docs/ELIMINACION-LOGICA.md para la migración y las limitaciones de concurrencia. No se ha aplicado SQL ni desplegado.
