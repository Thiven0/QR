# Face Service

Microservicio base para reconocimiento facial del proyecto QR.

## Iteracion 1

Incluye:

- FastAPI configurado en `main.py`
- Endpoint `GET /health`
- Configuracion por variables de entorno
- Estructura base para `profiles/` y `logs/`

## Iteracion 2

Incluye:

- Endpoint `POST /enroll`
- Endpoint `POST /identify` en modo stub
- Validacion de imagen en base64
- Restriccion de tamano maximo por `MAX_IMAGE_SIZE_MB`
- Validacion de formato `JPEG` o `PNG`
- Persistencia de perfiles en `profiles/{user_id}.json`
- Rechazo de perfiles duplicados con estado `409`

## Iteracion 3

Incluye:

- Lectura real de imagen con OpenCV
- Rechazo de imagen corrupta o no decodificable
- Validacion de dimensiones minimas configurables
- Preprocesamiento basico antes del flujo facial

## Iteracion 4

Incluye:

- Carga del modelo de InsightFace al iniciar el servicio
- Deteccion de rostro con `buffalo_l`
- Alineacion del rostro detectado
- Extraccion del embedding facial
- Validacion estricta de exactamente un rostro por imagen

## Iteracion 5

Incluye:

- Endpoint `POST /extract-embedding`
- El microservicio ya no persiste perfiles locales
- La persistencia y comparacion pasan al backend Node.js con MongoDB

## Estructura

```text
face-service/
├── app/
│   ├── __init__.py
│   ├── config.py
│   ├── face_utils.py
│   ├── image_processing.py
│   ├── profile_store.py
│   ├── schemas.py
│   └── validators.py
├── logs/
├── models/
├── profiles/
├── .env.example
├── .gitignore
├── main.py
├── README.md
└── requirements.txt
```

## Arranque local

1. Crear entorno virtual.
2. Instalar dependencias:

```bash
pip install -r requirements.txt
```

3. Copiar variables de entorno:

```bash
cp .env.example .env
```

4. Ejecutar el servicio:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Si instalas nuevas dependencias para OpenCV:

```bash
python -m pip install -r requirements.txt
```

Las primeras ejecuciones descargaran el modelo de InsightFace dentro de `models/`.

## Health check

```bash
GET /health
```

Respuesta esperada:

```json
{
  "status": "ok",
  "service": "QR Face Service",
  "version": "0.1.0",
  "environment": "development",
  "model_loaded": true,
  "model_name": "buffalo_l"
}
```

## Endpoint facial

### Extract embedding

```json
POST /extract-embedding
{
  "image": "<base64_jpeg_o_png>"
}
```

Respuesta esperada:

```json
{
  "success": true,
  "embedding": [0.123, -0.456],
  "detection_score": 0.98,
  "embedding_dimensions": 512,
  "message": "Embedding facial extraido correctamente."
}
```

## Errores esperados

- `409`: el `user_id` ya existe
- `413`: la imagen supera el tamano maximo permitido
- `415`: el archivo no es `JPEG` o `PNG`
- `422`: base64 invalido o imagen vacia
- `422`: imagen corrupta o demasiado pequena
- `422`: no se detecta ningun rostro
- `422`: se detecta mas de un rostro
- `503`: el modelo facial no pudo cargarse

## Validaciones de Iteracion 3

- La imagen debe poder decodificarse con OpenCV.
- La imagen debe tener al menos `MIN_IMAGE_WIDTH x MIN_IMAGE_HEIGHT`.
- La imagen se preprocesa a escala de grises ecualizada para dejar la siguiente iteracion lista.

## Validaciones de Iteracion 4

- El servicio intenta cargar `FACE_MODEL_NAME` al iniciar.
- Cada imagen debe contener exactamente un rostro.
- Si el modelo no carga, `GET /health` indicara `model_loaded=false` y los endpoints faciales devolveran `503`.
