# Configuracion

Cada servicio es propietario de su `.env.example`. No use un `.env` global ni confirme secretos en Git.

## Backend

Archivo canonico: `backend/.env.example`.

### Runtime y seguridad

| Variable | Predeterminado | Descripcion |
|---|---|---|
| `NODE_ENV` | `development` | Entorno de ejecucion. |
| `PORT` | `3000` | Puerto HTTP de Express. |
| `MONGODB_URI` | Sin fallback | URI obligatoria de MongoDB. |
| `CORS_ALLOWED_ORIGINS` | `*` | Origenes separados por coma; en produccion no usar `*`. |
| `LOG_LEVEL` | `info` | Nivel del logger: `debug`, `info`, `warn` o `error`. |
| `JWT_SECRET` | Fallback inseguro | Secreto para firmar JWT; obligatorio reemplazarlo. |
| `JWT_EXPIRES_IN_DAYS` | `30` | Fallback del firmador. El controlador de login actual normaliza las sesiones sin valor explicito a 1 dia. |
| `TOKEN_ACCESS_KEY` | Fallback inseguro | Credencial del endpoint `/auth/token`. |
| `TOKEN_SECRET_KEY` | Fallback inseguro | Secreto del endpoint `/auth/token`. |

### Face-service

| Variable | Predeterminado | Descripcion |
|---|---|---|
| `FACE_SERVICE_URL` | `http://127.0.0.1:8000` | URL base de FastAPI. |
| `FACE_SERVICE_TIMEOUT_MS` | `30000` | Timeout de Node hacia FastAPI. |
| `FACE_MATCH_THRESHOLD` | `0.5` | Umbral de similitud coseno: acepta si `score >= threshold`. |

El umbral de matching pertenece al backend. `FACE_THRESHOLD` del face-service no interviene en `/extract-embedding`.

### Archivos, OCR y visitantes

| Variable | Predeterminado | Descripcion |
|---|---|---|
| `UPLOAD_DIR` | `uploads` | Carpeta persistente de imagenes. |
| `UPLOAD_MAX_SIZE_BYTES` | `5242880` | Maximo por upload. |
| `VISITOR_DOC_MAX_BYTES` | `5242880` | Maximo aceptado por OCR. |
| `VISITOR_TICKET_TTL_MINUTES` | `10` | Expiracion y eliminacion TTL del ticket. |
| `VISITOR_TICKETS_PAGE_SIZE` | `10` | Tamano inicial del listado de tickets. |
| `VISITOR_TICKETS_MAX_SIZE` | `100` | Maximo por pagina. |

### Registros, alertas y usuarios

| Variable | Predeterminado | Descripcion |
|---|---|---|
| `USERS_PAGE_SIZE` | `10` | Usuarios por pagina. |
| `USERS_PAGE_MAX_SIZE` | `50` | Maximo de usuarios por pagina. |
| `USERS_SUMMARY_RECENT_LIMIT` | `6` | Usuarios recientes en el resumen. |
| `REGISTROS_PAGE_SIZE` | `10` | Registros por pagina. |
| `REGISTROS_MAX_LIMIT` | `100` | Maximo de registros por pagina. |
| `REGISTROS_MAX_RANGE_DAYS` | `90` | Maximo de `rangeDays` en el listado; no limita `/stats`. |
| `ALERT_THRESHOLD_MINUTES` | `5` | Minutos para elevar una alerta de sesion abierta. |
| `ALERTS_PAGE_SIZE` | `10` | Alertas por pagina. |
| `ALERTS_MAX_LIMIT` | `100` | Maximo de alertas por pagina. |

### Seeds y evaluacion

Las variables `ADMIN_SEED_*`, `EVALUATION_*` y `FACE_EVAL_*` solo se usan por scripts. Consulte [Evaluacion facial](../evaluation/README.md).

## Frontend

Archivo canonico: `frontend/.env.example`.

| Variable | Predeterminado | Descripcion |
|---|---|---|
| `VITE_API_URL` | Calculada | URL completa con `/api`; tiene prioridad. |
| `VITE_API_PORT` | `3000` | Puerto usado al construir la URL desde `window.location`. |
| `VITE_FACE_CAPTURE_AUTO_BLINK` | `true` | Captura automatica al detectar parpadeo. |
| `VITE_FACE_CAPTURE_MESH_VISIBLE` | `true` | Muestra la malla facial. |
| `VITE_FACE_CAPTURE_BLINK_THRESHOLD` | `0.2` | Umbral EAR aproximado para parpadeo. |
| `VITE_FACE_CAPTURE_DETECTION_FPS` | `10` | Frecuencia de inferencia de MediaPipe. |

Las variables `VITE_*` se incorporan al bundle y no deben contener secretos.

## Face-service

Archivo canonico: `face-service/.env.example`.

| Variable | Predeterminado | Descripcion |
|---|---|---|
| `APP_NAME` | `QR Face Service` | Nombre expuesto en health/OpenAPI. |
| `APP_VERSION` | `0.1.0` | Version informativa. |
| `ENVIRONMENT` | `development` | Entorno informativo. |
| `HOST` | `0.0.0.0` | Valor disponible para launchers; Uvicorn CLI requiere `--host`. |
| `PORT` | `8000` | Valor disponible para launchers; Uvicorn CLI requiere `--port`. |
| `MAX_IMAGE_SIZE_MB` | `5` | Maximo de la imagen base64 decodificada. |
| `MIN_IMAGE_WIDTH` / `MIN_IMAGE_HEIGHT` | `200` | Resolucion minima. |
| `FACE_MODEL_NAME` | `buffalo_l` | Paquete InsightFace. |
| `FACE_MODEL_ROOT` | `face-service/models` | Cache local del modelo. |
| `FACE_DET_WIDTH` / `FACE_DET_HEIGHT` | `640` | Tamano de deteccion. |
| `PROFILES_DIR` / `LOGS_DIR` | Directorios locales | Directorios creados al cargar settings; no son el almacenamiento canonico de perfiles. |

## Produccion

- Genere secretos aleatorios y diferentes por entorno.
- Restrinja CORS al dominio del frontend.
- Monte `UPLOAD_DIR` en almacenamiento persistente.
- No exponga directamente MongoDB ni el face-service a Internet si solo los consume el backend.
- Defina limites y timeouts en el proxy inverso compatibles con imagenes de hasta 5 MB.
