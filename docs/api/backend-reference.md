# Referencia de la API backend

Base local: `http://localhost:3000/api`.

Todas las rutas protegidas usan:

```http
Authorization: Bearer <jwt>
Content-Type: application/json
```

Consulte [Autenticacion y RBAC](authentication-and-rbac.md) para roles y errores.

## Autenticacion

| Metodo | Ruta | Acceso | Descripcion |
|---|---|---|---|
| POST | `/auth/login` | Publico | Autentica email/password y devuelve JWT. |
| POST | `/auth/logout` | Autenticado | Finaliza sesion; Admin/Celador pasan a inactivo. |
| POST | `/auth/token` | Publico con keys | Emite token con scope tecnico. |
| GET | `/auth/profile` | Autenticado | Restaura usuario y ticket vigente. |

Login:

```json
{
  "email": "admin@ejemplo.com",
  "password": "secreto"
}
```

Respuesta:

```json
{
  "status": "success",
  "token": "<jwt>",
  "user": {
    "_id": "...",
    "email": "admin@ejemplo.com",
    "permisoSistema": "Administrador"
  }
}
```

Un visitante sin ticket activo recibe `403` aunque sus credenciales sean correctas.

## Usuarios

| Metodo | Ruta | Acceso | Descripcion |
|---|---|---|---|
| POST | `/users` | Admin/Celador | Crea usuario; Celador solo puede crear permiso `Usuario`. |
| GET | `/users` | Admin/Celador | Lista paginada y filtrada. |
| GET | `/users/summary` | Admin/Celador | Resumen agregado de usuarios. |
| GET | `/users/:id/detail` | Admin/Celador | Documento de usuario sin password; no agrega vehiculos ni tickets. |
| PUT | `/users/:id` | Administrador | Actualiza usuario. |
| DELETE | `/users/:id` | Administrador | Elimina usuario. |
| POST | `/users/toggle-access` | Admin/Celador | Alterna bloqueo por cedula. |
| POST | `/users/parse-scan` | Admin/Celador | Extrae campos de texto escaneado. |
| POST | `/users/parse-qr` | Admin/Celador | Normaliza contenido QR. |
| POST | `/users/validate-scan` | Admin/Celador | Valida elegibilidad del usuario. |

### Crear usuario

Campos habituales:

```json
{
  "nombre": "Ana",
  "apellido": "Perez",
  "email": "ana@example.com",
  "password": "secreto-seguro",
  "cedula": "1234567890",
  "imagen": "/uploads/profiles/profile-archivo.jpg",
  "imagenQR": "/uploads/qr/qr-archivo.png",
  "facultad": "Ingenieria",
  "rolAcademico": "Estudiante",
  "permisoSistema": "Usuario",
  "estado": "inactivo"
}
```

La imagen de perfil es requerida por el flujo actual de creacion. El frontend sube primero el archivo y envia el path retornado.

`PUT /users/:id` no funciona como PATCH: envie los campos que deben conservarse, especialmente `email`, `permisoSistema`, identidad, clasificacion e imagen. Omitirlos puede vaciar valores o aplicar defaults; `password` si es opcional.

### Listar usuarios

Query params:

- `page`, `limit`.
- `search`: nombre, apellido, email o cedula.
- `permiso`: permiso del sistema.
- `estado`.
- `includeVisitorTicket=true`.

Respuesta:

```json
{
  "status": "success",
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 0,
    "totalPages": 1
  }
}
```

### Escaneo QR

```json
POST /users/parse-qr
{
  "qrData": "Nombre\n1234567890\nPrograma\nO+\n3001234567"
}
```

Despues del parseo, `/users/validate-scan` recibe al menos la cedula. Validar no crea el movimiento; la confirmacion se hace con `/exitEntry/from-scan`.

## Registros de entrada/salida

| Metodo | Ruta | Acceso | Descripcion |
|---|---|---|---|
| POST | `/exitEntry` | Admin/Celador | Crea registro manual. |
| GET | `/exitEntry` | Admin/Celador | Lista filtrada y paginada. |
| GET | `/exitEntry/stats` | Administrador | Estadisticas agregadas. |
| GET | `/exitEntry/alerts` | Admin/Celador | Sesiones abiertas que requieren atencion. |
| GET | `/exitEntry/:id` | Admin/Celador | Consulta un registro. |
| PUT | `/exitEntry/:id` | Admin/Celador | Edita fechas, cierre y observaciones. |
| DELETE | `/exitEntry/:id` | Admin/Celador | Elimina registro. |
| PATCH | `/exitEntry/:id/alert` | Admin/Celador | Actualiza estado/notas de alerta. |
| POST | `/exitEntry/from-scan` | Admin/Celador | Alterna entrada/salida desde QR o rostro. |
| POST | `/exitEntry/reset-scan` | Admin/Celador | Endpoint de compatibilidad: actualmente no cambia estado y solo confirma 200. |

### Listado

Query params:

- `page`, `limit`.
- `search`: usuario o administrador.
- `status`: `todos`, `abiertos` o `cerrados`.
- `activeOnly=true`: equivale a abiertos.
- `from`, `to`: instantes ISO sobre `fechaEntrada`.
- `rangeDays`: ultimos N dias, limitado por configuracion.

Los objetos incluyen usuario, administrador, vehiculo y log facial poblados.

### Registro manual

```json
{
  "cedula": "1234567890",
  "fechaEntrada": "2026-07-25T13:00:00.000Z",
  "horaEntrada": "08:00:00",
  "observaciones": "Ingreso autorizado"
}
```

### Movimiento desde escaneo

```json
{
  "userId": "66a...",
  "direction": "entry",
  "scanMethod": "face",
  "faceRecognitionLogId": "66a..."
}
```

`userId` es obligatorio. Envie `direction=entry` o `exit`; si falta, el backend infiere desde `user.estado`. Para una salida puede enviar `exitObservation`; `observaciones` no es procesado por esta ruta y una entrada no admite observacion aqui. `scanMethod` admite `qr` o `face`; cualquier otro valor se normaliza a `manual`. En facial, `faceRecognitionLogId` es opcional y actualmente solo se comprueba que exista. La referencia se adjunta cuando la accion crea una entrada; una salida no agrega un nuevo log al registro.

### Estadisticas

```http
GET /exitEntry/stats?start=2026-07-01&end=2026-07-31&faculty=Ingenieria
```

- `start`, `end`: opcionales, formato `YYYY-MM-DD`.
- `faculty`: opcional; si falta incluye todas.
- Tambien acepta aliases `from` y `to`.
- Sin fechas usa los ultimos 30 dias en `America/Bogota`.
- No pagina registros: ejecuta agregacion MongoDB.

La respuesta contiene:

- `filters`, `facultyOptions`, `totalFiltered`.
- `summaryMetrics` y comparacion con periodo anterior.
- Series diaria, semanal y mensual.
- Horas pico y mapa de calor.
- Distribuciones por rol/facultad y top operadores.
- Sesiones abiertas y resumen de duraciones.

## Visitantes

| Metodo | Ruta | Acceso | Descripcion |
|---|---|---|---|
| POST | `/visitors/register` | Publico | Registra visitante y genera ticket. |
| POST | `/visitors/ocr` | Publico | Extrae datos de documento. |
| POST | `/visitors/expire` | Autenticado | Expira sesion del visitante actual. |
| POST | `/visitors/reactivate` | Admin/Celador | Genera o renueva ticket. |
| GET | `/visitors/tickets` | Admin/Celador | Lista tickets paginados. |

Registro simplificado:

```json
{
  "nombre": "Visitante",
  "apellido": "Ejemplo",
  "email": "visitante@example.com",
  "password": "temporal-segura",
  "cedula": "987654321",
  "telefono": "3000000000",
  "imagen": "/uploads/profiles/profile.jpg",
  "imagenQR": "/uploads/qr/qr.png",
  "documentImage": "/uploads/documents/document.jpg",
  "documentMetadata": {
    "cedula": "987654321"
  },
  "faceDescriptor": [0.01, -0.02]
}
```

`documentImage` es obligatorio. La respuesta entrega `user`, `ticket` y `faceRegistration`; la credencial temporal es `ticket.token` y su vencimiento es `ticket.expiresAt`. Aunque los embeddings generados por el face-service tienen 512 dimensiones, este endpoint no valida actualmente longitud ni finitud de un `faceDescriptor` enviado directamente; prefiera `faceImage` para que el backend lo genere.

OCR acepta `image` como data URL/base64 y devuelve texto, confianza y campos detectados.

Reactivacion:

```json
{
  "userId": "66a..."
}
```

## Reconocimiento facial

| Metodo | Ruta | Acceso | Descripcion |
|---|---|---|---|
| POST | `/face/enroll` | Admin/Celador | Extrae y guarda descriptor. |
| POST | `/face/identify` | Admin/Celador | Busca mejor coincidencia. |
| POST | `/face/extract` | Admin/Celador | Extrae sin guardar. |
| GET | `/face/stats` | Administrador | Estadisticas de intentos. |

Todos los POST reciben una imagen base64/data URL. Consulte [Uploads e integracion facial](uploads-and-face.md).

`GET /face/stats` acepta `start`, `end` y `faculty`; devuelve resumen, serie diaria, bandas de score, usuarios mas reconocidos e intentos recientes.

## Uploads

| Metodo | Ruta | Acceso actual | Carpeta |
|---|---|---|---|
| POST | `/upload/profile` | Publico | `profiles` |
| POST | `/upload/qr` | Publico | `qr` |
| POST | `/upload/document` | Publico | `documents` |

Use `multipart/form-data`, campo `file`. Consulte [Uploads e integracion facial](uploads-and-face.md).

## Codigos HTTP frecuentes

| Codigo | Significado |
|---:|---|
| 200 | Consulta o actualizacion exitosa. |
| 201 | Recurso o archivo creado. |
| 400 | Payload o filtros invalidos. |
| 401 | Token invalido/expirado o credenciales tecnicas invalidas. |
| 403 | Falta autenticacion, rol insuficiente, usuario bloqueado o ticket vencido. |
| 404 | Usuario/registro no encontrado. |
| 409 | Duplicado o rostro ya enrolado sin `force`. |
| 500 | Error interno. |
| 503 | Face-service no disponible. |
| 504 | Timeout del face-service. |
