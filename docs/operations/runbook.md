# Runbook operativo

## Chequeo diario

- API y frontend accesibles.
- Face-service `/health` con `model_loaded=true`.
- MongoDB conectado y sin errores repetidos.
- Espacio disponible en uploads, logs y modelos.
- Alertas/sesiones abiertas revisadas.
- Latencia facial dentro del timeout.

## Logs

Backend usa logger por modulo y `LOG_LEVEL`. Face-service escribe salida de Uvicorn y puede crear directorio local de logs. Centralice stdout/stderr en produccion y configure retencion.

No registre:

- Passwords, JWT o keys.
- Imagenes base64.
- Embeddings completos.
- Texto OCR sin depurar.
- URIs MongoDB con credenciales.

## Incidentes

### API caida

1. Revise proceso y puerto.
2. Revise conexion MongoDB.
3. Valide variables obligatorias.
4. Reinicie solo despues de capturar logs relevantes.

### Face-service caido

1. Verifique proceso, memoria y modelos.
2. Consulte `/health`.
3. Revise permisos/cache de `FACE_MODEL_ROOT`.
4. El acceso QR/manual puede continuar; comunique degradacion facial.

### MongoDB caido

1. Detenga escrituras si hay respuestas inconsistentes.
2. Revise disponibilidad/almacenamiento/red.
3. Restaure servicio o backup validado.
4. Confirme indices y conteos despues de recuperar.

### Uploads no accesibles

1. Revise volumen y permisos.
2. Confirme que `UPLOAD_DIR` es el mismo al escribir y servir.
3. No elimine referencias de usuarios hasta recuperar respaldo.

## Backups

Respaldar:

- MongoDB.
- `UPLOAD_DIR`.
- Configuracion segura fuera del repositorio.
- Version exacta de modelos/configuracion facial.

No es necesario respaldar `node_modules`, `dist` o caches regenerables. Los datasets de evaluacion requieren una politica separada.

Pruebe restauracion periodicamente en un entorno aislado:

1. Restaure MongoDB.
2. Restaure uploads con el mismo path publico.
3. Inicie los tres servicios.
4. Verifique usuario, registro, foto, QR y rostro.

## Mantenimiento de indices

Revise indices de `users`, `registros`, `visitor_tickets` y `face_recognition_logs`. Cambios de esquema deben desplegarse antes de depender del indice en trafico. TTL de tickets requiere que MongoDB tenga activo el monitor TTL.

## Capacidad

Monitoree:

- Cantidad de usuarios enrolados y costo O(N) del matching.
- P95 de `face_analysis_ms` y round-trip.
- Cantidad de registros por rango estadistico.
- Tamano de logs faciales.
- Espacio de uploads.
- Tiempo y numero de paginas de exportaciones Excel.

## Cambio de threshold

1. Ejecute evaluacion representativa.
2. Compare FAR/FRR/F1 y condiciones de captura.
3. Documente decision.
4. Cambie `FACE_MATCH_THRESHOLD`.
5. Reinicie backend.
6. Monitoree unmatched y errores; prepare rollback.
