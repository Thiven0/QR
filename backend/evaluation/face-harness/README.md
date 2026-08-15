# Harness robusto de evaluacion facial

Este harness registra usuarios mediante los endpoints normales, conserva sus embeddings en MongoDB y evalua cada fotografia contra todos los perfiles creados en la ejecucion.

El harness anterior (`npm run evaluate:face`) se mantiene para evaluaciones pequenas con una galeria en memoria.

## Requisitos

- MongoDB, backend y face-service activos.
- Backend y harness ejecutandose en el mismo equipo; la API remota se rechaza para mantener MongoDB, uploads y limpieza en un solo entorno.
- Un administrador disponible mediante `EVALUATION_TOKEN` o `EVALUATION_EMAIL` y `EVALUATION_PASSWORD`.
- Dataset con estructura `identidad/imagenes`.
- Imagenes JPEG o PNG.

Dataset predeterminado:

```text
backend/evaluation/dataset-prueba/
├── Persona_A/
│   ├── Persona_A_0001.jpg
│   └── Persona_A_0002.jpg
└── Persona_B/
    └── Persona_B_0001.jpg
```

## Inventario seguro

`--dry-run` no crea carpetas, usuarios ni documentos MongoDB:

```powershell
npm run evaluate:face:robust -- --dry-run=true --max-profiles=100
```

Las identidades se ordenan por cantidad de fotografias, de mayor a menor. Los empates se ordenan por nombre.

## Ejecucion

```powershell
npm run evaluate:face:robust -- `
  --source="C:\Users\User\dev\QR\backend\evaluation\dataset-prueba" `
  --run-id="prueba-100-perfiles" `
  --max-profiles=100 `
  --threshold-start=0.30 `
  --threshold-end=0.90 `
  --threshold-step=0.05
```

Opciones principales:

| Opcion | Descripcion |
|---|---|
| `--max-profiles <n\|all>` | Limita perfiles, tomando primero las identidades con mas fotos. |
| `--max-impostor-images <n\|all>` | Limita las imagenes de identidades no enroladas. |
| `--chunk-size <n>` | Cantidad de candidatos por documento MongoDB. Default: 250. |
| `--progress-every <n>` | Frecuencia del mensaje de progreso. |
| `--resume` | Continua un `run-id` existente y omite pruebas completadas. |
| `--retry-failed` | Reintenta identidades cuyo enrolamiento termino en error. |
| `--dry-run` | Muestra inventario y estimaciones sin escribir datos. |

Si la primera imagen de una identidad no produce un embedding, se intenta la siguiente. La primera solicitud usa `POST /api/users`; los reintentos usan `POST /api/face/enroll`.

Las identidades no seleccionadas por `--max-profiles`, las carpetas con una sola foto y las identidades cuyo enrolamiento falla se consideran impostores.

## Comparacion

Las fotografias de prueba se procesan con `POST /api/face/extract`. El script lee desde MongoDB los descriptores realmente guardados para los usuarios asociados al run y calcula:

```text
dotProduct = sum(query[i] * profile[i])
queryNorm = sqrt(sum(query[i]^2))
profileNorm = sqrt(sum(profile[i]^2))
score = dotProduct / (queryNorm * profileNorm)
```

Todos los candidatos se ordenan por score y se guardan en `face_evaluation_score_chunks`. Cada prueba conserva Top-1, Top-2, margen, rango de la identidad esperada y tiempos.

## Colecciones

```text
users
face_evaluation_runs
face_evaluation_profiles
face_evaluation_probes
face_evaluation_score_chunks
```

Los usuarios son registros normales y aparecen en el directorio. La colección `face_evaluation_profiles` mantiene el mapeo exacto entre `runId`, identidad y `userId` para reanudar y limpiar sin depender del nombre o correo.

## Resultados

Los artefactos se escriben en `backend/evaluation/face-runs/<runId>/`:

```text
manifest.json
enrollment-records.json
threshold-metrics.json
timing-summary.json
extraction-errors.json
processing-errors.json
evaluation-summary.json
evaluation-report.html
report-assets/
profiles/
candidate-details/
prepared/enroll/
prepared/identify/
prepared/impostors/
```

Esta ruta, el dataset fuente, el cache y los uploads estan incluidos en `.gitignore` porque contienen imagenes y datos biometricos.

## Metricas

Por umbral se reportan identificaciones correctas e incorrectas, conocidos rechazados, impostores aceptados/rechazados, precision, recall end-to-end, recall sobre extracciones validas, F1, Top-1, Top-2, tasa de rechazo, tasa de aceptacion de impostores y errores de extraccion.

Los umbrales predeterminados son `0.30, 0.35, ..., 0.90` y la regla de aceptacion es `score >= threshold`.

Los tiempos incluyen lectura, endpoint de extraccion, comparacion, persistencia, total y perfiles evaluados. El face-service agrega decodificacion Base64, validacion OpenCV y analisis facial.

## Limpieza

Eliminar usuarios y uploads creados por un run, conservando resultados:

```powershell
npm run cleanup:face-evaluation -- --run-id="prueba-100-perfiles"
```

Eliminar tambien scores/pruebas y archivos generados:

```powershell
npm run cleanup:face-evaluation -- `
  --run-id="prueba-100-perfiles" `
  --purge-results=true `
  --delete-generated-files=true
```

La limpieza usa exclusivamente los `userId` guardados en `face_evaluation_profiles`.

## Reporte HTML

Cada evaluacion nueva genera automaticamente `evaluation-report.html`. El informe explica el dataset, la formula coseno, metricas, umbrales, tiempos, errores, Top-1/Top-2 y destaca el umbral con mayor F1.

Regenerar un run existente sin repetir la evaluacion:

```powershell
npm run report:face-evaluation -- --run-id=prueba-100-perfiles
```

El comando usa los JSON existentes para el resumen y consulta MongoDB solo para recuperar embeddings de probes y los candidatos ya calculados. No llama al face-service, no crea usuarios y no vuelve a comparar.

Los candidatos se agrupan en paginas estaticas para evitar cargar millones de filas en un solo documento. El tamano puede ajustarse:

```powershell
npm run report:face-evaluation -- `
  --run-id=prueba-100-perfiles `
  --candidate-page-size=2500
```

Si los resultados Mongo fueron eliminados con `--purge-results`, todavia puede generarse un informe sin candidatos ni embeddings de probes:

```powershell
npm run report:face-evaluation -- `
  --run-id=prueba-100-perfiles `
  --file-only=true
```
