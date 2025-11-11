# Arquitectura

## Backend (`backend/`)

- `src/app.js` / `src/server.js`: bootstrap de Express, CORS dinámico y carga de rutas.
- `src/config/database.js`: conexión centralizada a MongoDB con logs y máscara de credenciales.
- `src/models/user.model.js`: único modelo `User` con estados (`activo`, `inactivo`, `bloqueado`), permisos y TTL para tickets.
- `src/controllers/auth.controller.js`: login, perfil e invalidación de sesión cuando el usuario está bloqueado.
- `src/controllers/user.controller.js`: CRUD, reactivación de tickets y endpoint `/users/toggle-access` que alterna el estado.
- `src/controllers/entry-exit.controller.js`: lectura/registro de accesos, cierres forzados y alertas.
- `src/routes/*.routes.js`: rutas agrupadas por dominio (`/auth`, `/users`, `/exitEntry`, `/visitors`, `/vehicles`).
- `src/middlewares/auth.js`: middleware JWT + RBAC parametrizable.
- `src/services/jwt.service.js`: utilidades para firmar y validar tokens.

## Frontend (`frontend/src/`)

- `modules/auth`: provider de sesión, hooks, eventos de cierre forzado y login público.
- `modules/dashboard`: layout protegido, sidebar rediseñado (react-icons, ancho dinámico) y vistas:
  - `DashboardOverview`: métricas, alertas y accesos rápidos.
  - `QRScanner`: flujo doble (usuario/vehículo) con bloqueo cuando el usuario está en estado "bloqueado".
  - `UserDirectory`: edición, bloqueo/desbloqueo, lectura de vehículos asociados y descarga de carnet en PDF.
  - `RegistroDirectory`: historial con badges compactos y exportación a Excel.
  - `UserVehicles`: filtros por propietario cuando se navega desde el directorio.
- `shared/components/ProfileCard`: tarjeta reutilizada en el carnet (html2canvas + jsPDF).
- `services/apiClient.js`: cliente `fetch` con detección automática de URL cuando `VITE_API_URL` no está definido.

## Endpoints expuestos

- `POST /api/auth/login`
- `GET /api/auth/profile`
- `POST /api/users`
- `GET /api/users`
- `POST /api/users/toggle-access`
- `GET /api/exitEntry`
- `POST /api/exitEntry`
- `GET /api/visitors`
- `POST /api/visitors/reactivate`

## Flujo destacado

1. El dashboard consulta `/api/users/summary` para poblar tarjetas y gráficos.
2. El directorio permite bloquear/desbloquear usuarios mediante `/api/users/toggle-access`; el middleware y el frontend cortan el acceso si el usuario está bloqueado.
3. El escáner QR usa `/api/exitEntry` y `/api/users/parse-scan` para validar códigos y registrar movimientos.
4. Los carnets se generan en el cliente con `html2canvas` + `jsPDF`, normalizando colores `oklch/oklab` a sRGB para asegurar compatibilidad.

## Notas

- Todo el código legado está aislado en `legacy/` y puede eliminarse cuando deje de necesitarse.
- La carpeta [`docs/`](.) incluye esta arquitectura, la colección de Postman (`backend.postman_collection.json`) y un `.env` de ejemplo actualizado.
