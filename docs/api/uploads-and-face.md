# Uploads e integracion facial

## Uploads

Endpoints:

- `POST /api/upload/profile`
- `POST /api/upload/qr`
- `POST /api/upload/document`

Solicitud `multipart/form-data` con campo `file`. MIME permitidos:

- `image/jpeg`
- `image/png`
- `image/webp`

Limite predeterminado: 5 MB.

Ejemplo cURL:

```bash
curl -X POST http://localhost:3000/api/upload/profile \
  -F "file=@perfil.jpg"
```

Respuesta:

```json
{
  "status": "success",
  "path": "/uploads/profiles/profile-1720000000000-a1b2c3.jpg",
  "file": {
    "originalName": "perfil.jpg",
    "mimeType": "image/jpeg",
    "size": 123456,
    "filename": "profile-1720000000000-a1b2c3.jpg"
  }
}
```

El path es relativo al origen del backend. El frontend usa `resolveAssetUrl` para construir una URL absoluta.

## Imagen facial

Los endpoints faciales esperan `image` como cadena base64, con o sin prefijo data URL segun el validador:

```json
{
  "image": "data:image/jpeg;base64,/9j/4AAQ..."
}
```

No envie una URL remota en este campo.

## Extraer sin persistir

```http
POST /api/face/extract
```

Respuesta:

```json
{
  "status": "success",
  "data": {
    "embedding": [0.01, -0.02],
    "embeddingDimensions": 512,
    "detectionScore": 0.98,
    "timings": {}
  }
}
```

Se usa durante registros que necesitan incluir el descriptor en otra transaccion. Evite mostrar o exportar el vector.

## Enrolar

```http
POST /api/face/enroll
```

```json
{
  "userId": "66a...",
  "image": "data:image/jpeg;base64,...",
  "force": false
}
```

- Sin `force`, un usuario ya enrolado produce `409`.
- Con `force=true`, reemplaza descriptor y fecha de actualizacion.
- El backend guarda 512 numeros en `users.faceDescriptor`.

## Identificar

```http
POST /api/face/identify
```

```json
{
  "image": "data:image/jpeg;base64,..."
}
```

Proceso:

1. Extrae embedding en FastAPI.
2. Consulta usuarios con rostro registrado.
3. Calcula similitud coseno con cada descriptor.
4. Selecciona el score mayor.
5. Acepta si `score >= FACE_MATCH_THRESHOLD`.
6. Persiste `FaceRecognitionLog`.

Respuesta de coincidencia:

```json
{
  "status": "success",
  "data": {
    "match": true,
    "userId": "66a...",
    "user": {},
    "faceRecognitionLogId": "66b...",
    "score": 0.63,
    "threshold": 0.5,
    "detectionScore": 0.98,
    "comparedProfiles": 101
  }
}
```

Un `match: false` sigue siendo HTTP 200: la operacion tecnica funciono, pero no hubo identidad aceptada.

## Vinculacion con acceso

El frontend puede enviar `faceRecognitionLogId` a `/exitEntry/from-scan`. El backend comprueba que el ID exista, pero actualmente no vuelve a validar `match`, `status` ni `matchedUser`. Si la accion crea una entrada, guarda `scanMethod=face` y la referencia; al cerrar una salida no adjunta un nuevo log. El Excel muestra metadatos solo cuando la entrada tiene un log vinculado.

## Umbral

El valor predeterminado `0.5` es operativo, no una garantia universal. Debe calibrarse con datos representativos y documentar FAR, FRR, precision, recall y condiciones de captura. Consulte [Evaluacion facial](../evaluation/README.md).

## Privacidad

- Imagen, documento, embedding y log son datos sensibles.
- No use datasets sin consentimiento/procedencia.
- Restrinja acceso a MongoDB, uploads y reportes HTML.
- Defina retencion y eliminacion.
- No incorpore embeddings ni imagenes reales en tickets, logs o repositorio.
