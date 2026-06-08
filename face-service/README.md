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

## Estructura

```text
face-service/
├── app/
│   ├── __init__.py
│   ├── config.py
│   ├── profile_store.py
│   ├── schemas.py
│   └── validators.py
├── logs/
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
  "model_loaded": false
}
```

## Endpoints de perfiles

### Enroll

```json
POST /enroll
{
  "user_id": "test-001",
  "image": "<base64_jpeg_o_png>"
}
```

Respuesta esperada:

```json
{
  "success": true,
  "user_id": "test-001",
  "message": "Perfil almacenado correctamente."
}
```

### Identify

```json
POST /identify
{
  "image": "<base64_jpeg_o_png>"
}
```

Respuesta actual:

```json
{
  "match": false,
  "user_id": null,
  "score": null,
  "threshold": 0.5,
  "message": "Identificacion no disponible todavia. Se habilitara en la iteracion 5."
}
```

## Errores esperados

- `409`: el `user_id` ya existe
- `413`: la imagen supera el tamano maximo permitido
- `415`: el archivo no es `JPEG` o `PNG`
- `422`: base64 invalido o imagen vacia
