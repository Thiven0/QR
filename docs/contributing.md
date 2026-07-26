# Contribucion

## Principios

- Haga el cambio correcto mas pequeno.
- No duplique reglas entre frontend y backend; el servidor es autoridad.
- No agregue compatibilidad sin un consumidor real.
- Preserve cambios ajenos en un worktree compartido.

## Flujo

1. Revise documentacion y codigo fuente relacionado.
2. Defina impacto en API, datos, seguridad y UX.
3. Implemente con pruebas.
4. Ejecute controles de backend/frontend.
5. Actualice documentacion en el mismo cambio.
6. Revise diff y secretos antes de commit.

## Estilo

- JavaScript sigue el estilo existente de cada paquete.
- React usa componentes funcionales y hooks.
- Python sigue PEP 8 razonablemente.
- Comentarios explican decisiones no obvias, no repiten el codigo.
- Documentacion y mensajes de producto se escriben en español.

## Cambios que exigen documentacion

| Cambio | Documento |
|---|---|
| Ruta/payload/response | `docs/api` y Postman |
| Variable de entorno | `.env.example` propietario y configuracion |
| Modelo/indice | `architecture/data-model.md` |
| Flujo UI/rol | `product` y matriz RBAC |
| Despliegue | `operations` |
| Evaluacion/threshold | `evaluation` y runbook |

## Datos prohibidos en Git

- `.env` y secretos.
- Passwords/tokens reales.
- Uploads y documentos.
- Datasets biometricos.
- Embeddings o logs exportados con identidad.
- Reportes HTML/Excel/PDF sensibles.

## Definicion de terminado

- Comportamiento solicitado completo.
- Manejo de errores y estados vacios.
- Permisos backend correctos.
- Pruebas y build pasan.
- Documentacion actualizada.
- No hay secretos ni artefactos generados.
