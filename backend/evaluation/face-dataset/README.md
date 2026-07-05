# Dataset de evaluacion facial

Este directorio alimenta el script `npm run evaluate:face`.

## Estructura esperada

```text
face-dataset/
├── enroll/
│   ├── usuario1.jpg
│   ├── usuario2.jpg
│   └── ...
├── identify/
│   ├── usuario1/
│   │   ├── selfie1.jpg
│   │   └── selfie2.jpg
│   ├── usuario2/
│   │   └── selfie1.jpg
│   └── ...
└── impostors/
    ├── persona_externa_1.jpg
    └── persona_externa_2.jpg
```

- `enroll/`: una imagen por identidad para construir la galeria base.
- `identify/`: dos o mas imagenes adicionales por identidad para medir reconocimiento.
- `impostors/`: personas no enroladas para medir falsos positivos.

## Recomendaciones

- Usa JPEG o PNG.
- Mantén una sola cara visible por imagen.
- Si quieres medir robustez, mezcla luz natural, angulo leve y distancia media.
- Para una primera corrida controlada, usa de 5 a 10 identidades con 2 o 3 probes por identidad.

## Variables utiles

- `EVALUATION_API_URL`: URL base de la API backend. Por defecto `http://127.0.0.1:3000/api`.
- `EVALUATION_EMAIL` y `EVALUATION_PASSWORD`: credenciales del operador que puede usar `/api/face/extract`.
- `EVALUATION_TOKEN`: token Bearer ya emitido. Si existe, evita el login.
- `FACE_EVAL_DATASET_DIR`: ruta alternativa del dataset.
- `FACE_EVAL_THRESHOLD_START`, `FACE_EVAL_THRESHOLD_END`, `FACE_EVAL_THRESHOLD_STEP`: rango de thresholds a evaluar.

## Ejemplo de uso

Desde `backend/`:

```bash
$env:EVALUATION_EMAIL="admin@demo.com"
$env:EVALUATION_PASSWORD="tu-clave"
npm run evaluate:face
```

El script genera un archivo `evaluation-report.json` en este mismo directorio con las metricas por threshold.
