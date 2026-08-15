# Solucion de problemas

## El backend no inicia

### `MONGODB_URI no esta configurada`

Copie `backend/.env.example` a `backend/.env` y defina una URI valida. El backend no tiene fallback para esta variable.

### `no se pudo conectar a la base de datos`

1. Confirme que MongoDB esta en ejecucion.
2. Pruebe la URI con `mongosh`.
3. Revise usuario, contrasena, TLS y allowlist si usa un servicio remoto.
4. No incluya comillas adicionales alrededor de la URI.

## Error CORS o `Failed to fetch`

1. Confirme `VITE_API_URL` y que incluya `/api`.
2. Agregue el origen exacto del frontend en `CORS_ALLOWED_ORIGINS`, por ejemplo `http://localhost:5173`.
3. Si prueba desde LAN, use la IP del servidor y habilite los puertos en el firewall.
4. Reinicie Vite despues de cambiar variables `VITE_*`.

## El servicio facial no responde

- `503`: Node no pudo conectarse con FastAPI.
- `504`: se supero `FACE_SERVICE_TIMEOUT_MS`.
- Revise `GET http://localhost:8000/health`.
- El primer arranque puede tardar mientras descarga o inicializa `buffalo_l`.
- Confirme que `FACE_SERVICE_URL` no termine en una ruta adicional.

## No se detecta un rostro

- Use una imagen frontal, iluminada y sin oclusion importante.
- La imagen debe superar 200 x 200 px y el limite de tamano.
- Solo se acepta una cara principal; revise el detalle devuelto por FastAPI.
- Compruebe permisos de camara del navegador y que ninguna otra aplicacion la este usando.

## MediaPipe o la malla no cargan

La deteccion del navegador descarga recursos externos. Revise conectividad, CSP, bloqueadores y consola. Puede desactivar la visualizacion con `VITE_FACE_CAPTURE_MESH_VISIBLE=false`, pero la captura facial sigue dependiendo de la camara.

## Upload rechazado

- Campo multipart obligatorio: `file`.
- Formatos: JPEG, PNG o WebP.
- Limite predeterminado: 5 MB.
- Verifique permisos de escritura y espacio en `UPLOAD_DIR`.

## El visitante no puede iniciar sesion

Un visitante requiere un ticket no expirado. El TTL predeterminado es 10 minutos y MongoDB elimina el documento despues de `expiresAt`. Un Administrador o Celador puede reactivar el ticket desde el directorio.

## Estadisticas incompletas o vacias

- `GET /api/exitEntry/stats` usa `start`, `end` y `faculty` opcional.
- Fechas validas: `YYYY-MM-DD`; `start` no puede superar `end`.
- Sin fechas, el endpoint usa los ultimos 30 dias en `America/Bogota`.
- La facultad es comparada sin distinguir mayusculas, pero debe coincidir con el valor almacenado.
- Las estadisticas faciales proceden de `/api/face/stats`, no del endpoint de registros.

## El Excel solo contiene algunos registros

La exportacion de historial recorre todas las paginas del filtro. Si faltan filas:

1. Espere a que finalice `Generando Excel...`.
2. Revise los filtros de fecha, estado y busqueda.
3. Confirme que no hubo error de red durante alguna pagina.
4. Verifique que el backend no haya cambiado `REGISTROS_MAX_LIMIT` a un valor invalido.

## El PDF se ve diferente

Los reportes usan `html2canvas` y `jsPDF`. Fuentes remotas, recursos sin CORS o colores CSS no soportados pueden cambiar el resultado. El frontend reemplaza colores `oklab/oklch` durante la captura, pero los recursos deben estar cargados antes de exportar.
