# Arquitectura del backend

## Arranque

```text
backend/index.js
  -> carga dotenv
  -> src/server.js
       -> connectDatabase()
       -> createApp()
       -> app.listen(PORT)
```

`src/config/database.js` exige `MONGODB_URI`, registra eventos de Mongoose y oculta credenciales en logs. Express solo inicia despues de conectar la base.

## Composicion HTTP

`src/app.js` configura:

- CORS dinamico mediante `CORS_ALLOWED_ORIGINS`.
- JSON y formularios URL-encoded de hasta 10 MB.
- Publicacion estatica de `/uploads`.
- Routers `/api/auth`, `/api/face`, `/api/upload`, `/api/users`, `/api/exitEntry` y `/api/visitors`.
- Ruta tecnica `GET /ruta-prueba` fuera de `/api`.

No existe middleware global de 404 ni manejador central de errores; cada controlador construye su respuesta.

## Capas

| Capa | Responsabilidad | Ubicacion |
|---|---|---|
| Routes | Metodo, path y roles admitidos | `src/routes` |
| Middlewares | JWT, RBAC y uploads | `src/middlewares` |
| Controllers | Validacion HTTP y reglas de flujo | `src/controllers` |
| Services | Integraciones y calculos reutilizables | `src/services` |
| Models | Esquemas, relaciones e indices | `src/models` |
| Utils | Logger, uploads, tickets y helpers | `src/utils` |
| Scripts | Seeds, evaluacion y reportes | `scripts` |

## Dominios

### Autenticacion

`auth.controller.js` autentica con bcrypt, emite JWT y sincroniza `estado` para Administrador/Celador. Los visitantes requieren ticket activo. `auth.js` vuelve a consultar el usuario en cada solicitud protegida, por lo que un bloqueo surte efecto aun con un JWT vigente.

### Usuarios

`user.controller.js` implementa CRUD, resumen agregado, paginacion, detalle, bloqueo/desbloqueo y parseo/validacion QR. La creacion puede recibir un descriptor facial preextraido o enrolar posteriormente.

### Registros de acceso

`entry-exit.controller.js` mantiene registros manuales y transiciones por escaneo. Usa `direction` cuando el cliente la envia; si falta, infiere entrada/salida desde `user.estado`. Calcula duracion, actualiza estados relacionados, gestiona cierres forzados y alertas.

`entry-exit-stats.service.js` ejecuta agregaciones MongoDB por rango y facultad. Devuelve resumen, periodo anterior, series, heatmap, roles, ranking, operadores y duraciones. Sin fechas usa 30 dias en `America/Bogota`.

### Visitantes

`visitor.controller.js` crea un `User` con rol academico `Visitante`, genera ticket, procesa OCR y permite expiracion/reactivacion. Solo `POST /visitors/expire` marca inactivo y fuerza el cierre de un registro abierto; la eliminacion natural por TTL solo invalida/elimina el ticket.

### Reconocimiento facial

`face.controller.js` delega extraccion a FastAPI. En enrolamiento persiste `faceDescriptor`; en identificacion compara contra todos los perfiles enrolados, aplica `FACE_MATCH_THRESHOLD` y crea un log aun cuando no hay match o sucede un error procesable.

### Uploads y OCR

`upload.js` usa Multer con almacenamiento en disco y nombres aleatorios. `ocr.service.js` usa Tesseract en `spa+eng`, normaliza campos de documento y limita el tamano decodificado.

## Formato de respuestas

Respuesta exitosa habitual:

```json
{
  "status": "success",
  "message": "Operacion completada",
  "data": {}
}
```

Algunos endpoints historicos retornan `user`, `registro`, `ticket` o `pagination` en la raiz. El cliente debe usar el contrato especifico de cada endpoint.

Respuesta de error habitual:

```json
{
  "status": "error",
  "message": "Descripcion legible",
  "code": "CODIGO_OPCIONAL"
}
```

## Paginacion

- Usuarios: `page`, `limit`; predeterminado 10 y maximo 50.
- Registros: `page`, `limit`; predeterminado 10 y maximo 100.
- Tickets: `page`, `limit`; predeterminado 10 y maximo 100.
- Alertas: `page`, `limit`; predeterminado 10 y maximo 100.
- `/exitEntry/stats` no pagina porque devuelve agregados.

## Logging y errores

El logger incluye modulo y nivel, configurable con `LOG_LEVEL`. No registre tokens, contrasenas, imagenes base64, embeddings completos ni documentos OCR sin depurar.

## Escalabilidad

- Los indices reducen busquedas por fecha, usuario, estado y referencia.
- El matching facial actual compara en Node contra todos los perfiles enrolados; para galerias grandes se requeriria un indice vectorial o servicio especializado.
- `face/stats` carga intentos coincidentes en memoria; `exitEntry/stats` usa agregacion MongoDB.
- Uploads locales requieren afinidad o almacenamiento compartido si hay varias replicas.
