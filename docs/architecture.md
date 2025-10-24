# Arquitectura actualizada

## Backend (backend/)

- src/config/database.js: conexión centralizada a MongoDB.
- src/models/user.model.js: modelo único Users con soporte para RBAC (permisoSistema).
- src/controllers/auth.controller.js: flujo de autenticación (login/perfil).
- src/controllers/user.controller.js: registro unificado, listado y alternancia de estado.
- src/routes/auth.routes.js y src/routes/user.routes.js: routing organizado por dominio /api/auth y /api/users.
- src/middlewares/auth.js: middleware RBAC parametrizable.
- src/services/jwt.service.js: utilidades de tokenización JWT.
- src/app.js y src/server.js: bootstrap de Express.
- legacy/: código anterior (multi-modelo) preservado como referencia.

## Frontend (frontend/src/)

- modules/auth: provider de sesión, hooks y páginas de acceso.
- modules/dashboard: layout único y vistas protegidas (overview, QR, registro, directorio, guía).
- modules/public: layout público para el login.
- shared/: componentes y hooks reutilizables (Input, ProfileCard, useForm, apiClient).
- services/apiClient.js: cliente fetch con inyección automática del token.
- legacy/: UI previa basada en layouts por rol; ignorada en linting.

## Endpoints expuestos

- POST /api/auth/login
- GET /api/auth/profile
- POST /api/users
- GET /api/users
- POST /api/users/toggle-access

## Notas

- RBAC: Administrador y Celador comparten dashboard; permisos validados en ProtectedRoute (frontend) y authMiddleware (backend).
- El código legado puede eliminarse una vez validada la nueva arquitectura.
