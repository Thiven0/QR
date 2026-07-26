# Evaluacion facial y embeddings

## Flujos disponibles

| Flujo | Comando | Uso |
|---|---|---|
| Evaluacion simple | `npm run evaluate:face` | Dataset pequeno, resultados en memoria/JSON. |
| Harness robusto | `npm run evaluate:face:robust` | Corridas grandes, MongoDB, reanudacion y HTML. |
| Regenerar reporte | `npm run report:face-evaluation -- --run-id=<id>` | Reporte desde datos existentes. |
| Limpiar corrida | `npm run cleanup:face-evaluation -- --run-id=<id>` | Elimina una corrida especifica. |
| Analizar embeddings | `npm run analyze:embeddings -- ...` | PCA, t-SNE, correlacion, outliers y scores. |

Documentacion operativa detallada:

- `backend/evaluation/face-harness/README.md`
- `backend/evaluation/face-dataset/README.md`
- `backend/evaluation/embedding-visualizer/README.md`

## Harness robusto

Usa endpoints existentes del backend y face-service, persiste por `runId` y genera:

- Perfiles y probes.
- Comparaciones y chunks de scores.
- Ranking Top-1/Top-2.
- Precision, recall, F1, FAR y metricas por threshold.
- Tiempos por etapa.
- Reporte HTML principal y paginas de detalle.
- Fingerprints de dataset/galeria para reanudacion segura.

Ejemplo:

```powershell
npm run evaluate:face:robust -- --run-id=prueba-100-perfiles
npm run report:face-evaluation -- --run-id=prueba-100-perfiles --candidate-page-size=2500
```

## Seleccion de threshold

La aplicacion productiva usa `FACE_MATCH_THRESHOLD` (predeterminado 0.5). El mejor F1 de una corrida no debe copiarse sin evaluar:

- Balance conocidos/impostores.
- Iluminacion, pose, camara y poblacion reales.
- FAR tolerable para seguridad.
- FRR tolerable para operacion.
- Separacion entre dataset de ajuste y validacion.

## Analisis de embeddings

Fuentes:

- `users`
- `profiles`
- `probes`
- `evaluation`
- `recognition-logs`

Ejemplo:

```powershell
npm run analyze:embeddings -- --source=evaluation --run-id=prueba-100-perfiles --max-samples=300 --color-by=result
```

PCA y t-SNE son exploratorios. La autenticacion real sigue usando los 512 valores y similitud coseno.

## Requisitos de datos

- Procedencia y licencia documentadas.
- Consentimiento para uso biometrico.
- Separacion de identidades cuando sea posible.
- Acceso minimo necesario.
- Almacenamiento cifrado y retencion definida.
- No confirmar datasets ni reportes sensibles en Git.

## Artefactos

`face-runs`, datasets y output del visualizador estan ignorados. Los HTML pueden contener nombres, IDs, scores y metadatos; trátelos como sensibles.

## Reproducibilidad

Registre:

- Commit de codigo.
- Version de InsightFace/ONNX Runtime.
- Modelo y configuracion de deteccion.
- Fingerprint del dataset.
- Thresholds barridos.
- Random state del analizador.
- Hardware y fecha.

## Limitaciones

- Una evaluacion sobre datos de entrenamiento sobreestima rendimiento.
- t-SNE no conserva distancias globales.
- Un score alto no es una probabilidad calibrada.
- La ausencia de demografia/condiciones diversas impide inferir equidad.
