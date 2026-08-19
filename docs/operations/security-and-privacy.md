# Seguridad y privacidad

## Clasificacion de datos

| Dato | Sensibilidad |
|---|---|
| Password hash, JWT y secretos | Credencial |
| Cedula, telefono, email y documento OCR | Personal identificable |
| Foto y embedding facial | Biometrico sensible |
| Registros de acceso y logs faciales | Comportamiento/seguridad |
| Reportes de evaluacion | Puede contener identidad y biometria derivada |

## Controles implementados

- Password con bcrypt.
- JWT firmado y expiracion.
- RBAC en rutas.
- Recarga de estado de usuario por request.
- Descriptor excluido de queries normales.
- MIME y tamano limitados en uploads.
- CORS configurable.
- Paths de uploads aleatorios.
- Indices y referencias para auditoria facial.
- Capturas faciales fuera del directorio publico, con lectura autenticada para Administrador y Celador y cabeceras `no-store`.

## Riesgos conocidos

- Existen secretos fallback en codigo; deben reemplazarse.
- Uploads y OCR/registro visitante son publicos y no tienen rate limiting.
- JWT se almacena en `localStorage`, expuesto ante XSS.
- Uploads locales no cifran ni autentican lectura.
- Las capturas de auditoria facial se conservan indefinidamente por decision operativa; esto exige capacidad, respaldos y una revision legal periodica de la retencion.
- `face/stats` puede cargar muchos logs en memoria.
- No hay auditoria inmutable de acciones administrativas.
- No hay historial de tickets expirados por TTL.

## Requisitos antes de produccion

1. HTTPS de extremo a extremo.
2. Secretos aleatorios en gestor de secretos.
3. CORS restringido.
4. Rate limiting y proteccion contra abuso.
5. Validacion antivirus/contenido para archivos si el riesgo lo requiere.
6. Backups cifrados y pruebas de restauracion.
7. Acceso privado a MongoDB y FastAPI.
8. Politica de consentimiento, finalidad, retencion y eliminacion.
9. Monitoreo de autenticacion, errores y latencia sin registrar datos sensibles.
10. Revision legal aplicable a biometria y documentos de identidad.

## Biometria

- Guarde solo lo necesario para la finalidad declarada.
- No considere el embedding anonimo; puede ser identificador persistente.
- Registre version de modelo y threshold usados en evaluaciones.
- Permita reenrolamiento y eliminacion controlada.
- Mantenga datasets fuera de Git y documente consentimiento/licencia.
- No exponga reportes HTML publicamente.

## Respuesta a incidentes

Ante filtracion de credenciales:

1. Rote JWT y keys de servicio.
2. Invalide/renueve sesiones segun estrategia disponible.
3. Revise logs de acceso.
4. Evalúe alcance de MongoDB y uploads.
5. Notifique segun obligaciones institucionales.

Ante exposicion biometrica, trate embeddings, fotos y logs como comprometidos; cambiar password no revoca una caracteristica biometrica.

## Eliminacion

La eliminacion de un usuario no garantiza actualmente cascada sobre registros, logs, archivos o evaluaciones. Un procedimiento de derechos del titular debe localizar y tratar cada coleccion y archivo relacionado, preservando solo lo exigido legalmente.
