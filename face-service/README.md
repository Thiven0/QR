# Face-service

Microservicio FastAPI que valida una imagen y extrae un embedding facial con InsightFace `buffalo_l`.

## Responsabilidad

- Si hace: decodificacion, validacion, deteccion y embedding de 512 dimensiones.
- No hace: autenticacion, enrolamiento persistente, identificacion, matching o decisiones de acceso.

El backend Express implementa `/api/face/enroll`, `/identify`, `/extract` y `/stats` usando este servicio.

## Instalacion

```powershell
py -3.13 -m venv .venv
.\.venv\Scripts\Activate.ps1
py -3.13 -m pip install -r requirements.txt
Copy-Item .env.example .env
py -3.13 -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

## Endpoints

- `GET /health`
- `POST /extract-embedding`
- `GET /docs`
- `GET /redoc`

Solicitud:

```json
{
  "image": "data:image/jpeg;base64,/9j/4AAQ..."
}
```

Respuesta resumida:

```json
{
  "success": true,
  "embedding": [0.01, -0.02],
  "detection_score": 0.98,
  "embedding_dimensions": 512,
  "timings": {
    "base64_decode_ms": 1.2,
    "image_decode_validation_ms": 4.5,
    "face_analysis_ms": 86.3,
    "total_ms": 92.7
  }
}
```

El vector real contiene 512 valores.

## Configuracion

Consulte `.env.example` y [documentacion detallada](../docs/architecture/face-service.md). `HOST` y `PORT` no sustituyen argumentos de Uvicorn cuando se inicia por CLI.

## Seguridad

Mantenga este servicio en red privada. Imagenes y embeddings son datos biometricos sensibles y no deben registrarse ni publicarse.
