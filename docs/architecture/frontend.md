# Arquitectura del frontend

## Bootstrap

- `src/main.jsx` monta React en `StrictMode`.
- `src/App.jsx` renderiza el router y el `Toaster` global de Sonner.
- `src/router/Routing.jsx` declara rutas publicas y protegidas.

## Modulos

```text
src/
  modules/
    auth/       sesion, login, guardas y eventos
    dashboard/  layout, componentes y paginas protegidas
    public/     registro publico de visitantes
  services/     cliente API
  shared/       componentes y hooks reutilizables
  router/       mapa de rutas
```

## Rutas y permisos

| Ruta | Componente | Acceso |
|---|---|---|
| `/` | `GuardLogin` | Publico |
| `/register-visitor` | `RegisterVisitor` | Publico |
| `/dashboard` | `DashboardOverview` o perfil | Autenticado; overview Admin/Celador |
| `/dashboard/qr` | `QRScanner` | Admin/Celador |
| `/dashboard/statistics` | `DashboardStats` | Administrador |
| `/dashboard/users/register` | `RegisterUser` | Admin/Celador |
| `/dashboard/users/directory` | `UserDirectory` | Admin/Celador |
| `/dashboard/records/history` | `RegistroDirectory` | Admin/Celador |
| `/dashboard/alerts` | `AlertsCenter` | Admin/Celador |
| `/dashboard/profile` | `ProfileUser` | Autenticado |
| `/dashboard/staff/register` | `RegisterGuard` | Administrador |
| `/dashboard/sections` | `SectionsGuide` | Admin/Celador |

`ProtectedRoute` valida autenticacion y permisos del contexto. El backend vuelve a aplicar RBAC; ocultar una opcion del sidebar no reemplaza la autorizacion del servidor.

## Sesion

`AuthProvider` persiste:

- `qr_token`
- `qr_user`
- `qr_ticket`

Al iniciar la aplicacion consulta `/auth/profile`. `apiClient` emite un cierre forzado cuando una respuesta contiene `code: USER_BLOCKED`. El provider tambien programa la expiracion local de tickets de visitante y llama `/visitors/expire`.

## Cliente API

`src/services/apiClient.js` usa `fetch`:

- Normaliza `VITE_API_URL`.
- Agrega `Authorization: Bearer <token>`.
- Interpreta JSON o texto.
- Convierte errores HTTP en `Error` con `status` y `details`.
- Resuelve URLs relativas de assets.
- Convierte data URLs a Blob para uploads multipart.

## Layout

`DashboardLayout` combina navbar, sidebar y `Outlet`. Desde 1024 px el sidebar es persistente y colapsable; por debajo actua como drawer. El estado colapsado se conserva en `dashboard-sidebar-collapsed`.

## Captura facial

- `useCameraCapture` administra stream, video y snapshots.
- `useFaceMeshDetection` integra MediaPipe Face Landmarker, malla y parpadeo.
- `FaceCapture` reutiliza ambos hooks en enrolamiento e identificacion.
- La previsualizacion se refleja horizontalmente, pero la imagen enviada conserva una orientacion coherente con el canvas.

El escaner intenta reconocimiento facial y permite fallback QR. La confirmacion final siempre pasa por `/exitEntry/from-scan`.

## Estado y concurrencia

- No existe un store global externo; sesion usa Context y las paginas usan estado local.
- Listados paginados usan debounce y request IDs para descartar respuestas antiguas.
- Estadisticas de accesos se solicitan ya agregadas al backend.
- Sonner muestra resultados de operaciones; errores de campo y feedback contextual permanecen junto al control.

## Reportes

- `RegistroDirectory`: Excel de todos los registros que cumplen los filtros, recorriendo paginas de 100.
- `UserDirectory`: Excel de la pagina visible y PDF/carnet individual.
- `DashboardStats`: PDF multipagina capturando el DOM.

## Build

```powershell
npm run lint
npm run build
npm run preview
```

No hay suite automatizada de frontend. El build actual genera un chunk principal grande por las dependencias de vision, PDF y Excel; una mejora futura es dividir rutas con imports dinamicos.
