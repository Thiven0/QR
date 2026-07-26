# Documentacion de la plataforma QR

Este directorio describe la implementacion vigente de la plataforma de control de acceso por codigo QR y reconocimiento facial. El codigo de rutas, modelos, controladores y scripts es la fuente de verdad; la documentacion debe actualizarse en el mismo cambio que modifique un contrato publico.

## Lectura recomendada

| Audiencia | Punto de inicio |
|---|---|
| Nuevo desarrollador | [Desarrollo local](getting-started/local-development.md) |
| Arquitectura y mantenimiento | [Vision general](architecture/system-overview.md) |
| Integracion con la API | [Referencia del backend](api/backend-reference.md) |
| Administrador o celador | [Guia de operacion](product/operator-guide.md) |
| Despliegue y soporte | [Despliegue](operations/deployment.md) y [runbook](operations/runbook.md) |
| Evaluacion biometrica | [Evaluacion facial](evaluation/README.md) |

## Indice

### Inicio y configuracion

- [Desarrollo local](getting-started/local-development.md): instalacion de MongoDB, backend, face-service y frontend.
- [Configuracion](getting-started/configuration.md): variables de entorno y prioridades.
- [Solucion de problemas](getting-started/troubleshooting.md): puertos, CORS, camara, modelos y MongoDB.

### Arquitectura

- [Vision general](architecture/system-overview.md): limites del sistema y diagramas de componentes.
- [Backend](architecture/backend.md): Express, capas, autorizacion, persistencia y procesos.
- [Frontend](architecture/frontend.md): React, rutas, sesion, componentes y cliente API.
- [Servicio facial](architecture/face-service.md): FastAPI, InsightFace y contrato de extraccion.
- [Modelo de datos](architecture/data-model.md): colecciones, relaciones, indices y ciclo de vida.

### API

- [Referencia del backend](api/backend-reference.md): endpoints, permisos, filtros y ejemplos.
- [Autenticacion y RBAC](api/authentication-and-rbac.md): JWT, roles, estados y errores.
- [Uploads e integracion facial](api/uploads-and-face.md): archivos, imagen base64 y matching.
- [Coleccion Postman](backend.postman_collection.json): solicitudes actualizadas para desarrollo local.

### Producto

- [Guia del operador](product/operator-guide.md): tareas de Administrador y Celador.
- [Flujo de visitantes](product/visitor-flow.md): OCR, registro, ticket y expiracion.
- [Analitica y exportaciones](product/analytics-and-exports.md): estadisticas, Excel y PDF.

### Operacion y calidad

- [Despliegue](operations/deployment.md): topologia, almacenamiento, CORS y verificaciones.
- [Seguridad y privacidad](operations/security-and-privacy.md): secretos, biometria, consentimiento y retencion.
- [Runbook](operations/runbook.md): health checks, respaldos, incidentes y recuperacion.
- [Pruebas](testing/README.md): comandos disponibles y alcance.
- [Evaluacion facial](evaluation/README.md): harness, datasets, metricas y embeddings.
- [Contribucion](contributing.md): convenciones y lista de verificacion.
- [Pendientes](TODO.md): trabajo futuro; no representa funcionalidad disponible.
- [Cambios documentales](changelog.md): hitos de documentacion.

## Estado funcional resumido

Implementado:

- Autenticacion JWT y permisos `Administrador`, `Celador` y `Usuario`.
- Usuarios, visitantes, tickets temporales, registros de entrada/salida y alertas.
- Acceso manual, por QR y por reconocimiento facial.
- Extraccion facial con InsightFace y matching por similitud coseno en Node.js.
- Estadisticas agregadas, exportacion Excel y reportes PDF.
- Evaluacion facial robusta y analisis de embeddings.

No implementado como API independiente:

- CRUD publico de vehiculos. Existe el modelo `Vehicle` y puede asociarse a un registro, pero no hay router `/api/vehicles`.
- Talanquera Arduino. Su propuesta esta documentada en [TODO.md](TODO.md).
- Historial inmutable de tickets expirados. MongoDB elimina tickets por TTL.

## Politica de mantenimiento

1. Una ruta nueva exige actualizar `api/backend-reference.md` y Postman.
2. Una variable nueva exige actualizar el `.env.example` del servicio propietario y `getting-started/configuration.md`.
3. Un cambio de coleccion o indice exige actualizar `architecture/data-model.md`.
4. Un cambio de flujo visible exige actualizar la guia de producto correspondiente.
5. Los reportes generados, datasets, secretos y datos biometricos no deben incorporarse a `docs/`.
