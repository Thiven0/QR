# QR Access Control Platform

Plataforma web full-stack para controlar accesos mediante códigos QR. Incluye autenticación de usuarios, bloqueo/desbloqueo remoto, administración de vehículos, descarga de carnets en PDF y tableros de métricas para administradores y celadores.

## Demo
- Producción: https://proyectounitropicoqr.vercel.app/

## Arquitectura

| Carpeta   | Descripción                                                                           |
|-----------|---------------------------------------------------------------------------------------|
| `backend` | API REST en Node.js/Express con MongoDB/Mongoose y controladores modularizados         |
| `frontend`| Aplicación React + Vite con contextos de sesión, dashboard protegido y flujos públicos |

## Principales características

- **Gestión de usuarios**: registro, edición, bloqueo/desbloqueo, reactivación de tickets temporales y descarga de carnets en PDF (con conversión automática de colores para html2canvas).
- **Escaneo de QR**: flujo doble (usuarios y vehículos), avisos sonoros y control de cierres forzados.
- **Vehículos**: filtros por propietario desde el directorio, registro rápido y estado activo/inactivo visible.
- **Historial de registros**: filtros por fecha/estado, badges compactos y exportación a Excel (`xlsx`).
- **Dashboard rediseñado**: accesos rápidos con íconos de `react-icons`, sidebar ampliado y estados visuales consistentes.
- **Cliente API resiliente**: si `VITE_API_URL` no está definido, el frontend calcula la URL usando la ubicación del navegador para evitar errores CORS.

## Requisitos

- Node.js 18+ y npm
- MongoDB (local o remoto)

## Configuración rápida

1. **Clonar el repositorio**
   ```bash
   git clone <url>
   cd QR
   ```

2. **Backend**
   ```bash
   cd backend
   npm install
   cp .env.example .env   # ajusta MongoDB, JWT, etc.
   npm run dev
   ```
   - API base: `http://localhost:3000/api`
   - Rutas destacadas: `/auth`, `/users`, `/exitEntry`, `/visitors`, `/vehicles`

3. **Frontend**
   ```bash
   cd frontend
   npm install
   cp .env.example .env   # define VITE_API_URL si necesitas forzar la URL
   npm run dev
   ```
   - Dev server: `http://localhost:5173`
   - Variables soportadas:
     - `VITE_API_URL`: URL completa (incluye `/api`). Tiene prioridad.
     - `VITE_API_PORT`: Puerto para el cálculo automático cuando `VITE_API_URL` está vacío (3000 por defecto).
   - Sin `VITE_API_URL`, el cliente genera `http(s)://<host>:<VITE_API_PORT>/api`, útil para pruebas en LAN.

## Scripts útiles

| Ubicación | Script            | Acción                                |
|-----------|-------------------|----------------------------------------|
| backend   | `npm run dev`     | Levanta la API con nodemon             |
| backend   | `npm test`        | (si aplica) pruebas/linters            |
| frontend  | `npm run dev`     | Servidor de desarrollo Vite            |
| frontend  | `npm run build`   | Compila artefactos de producción       |
| frontend  | `npm run preview` | Previsualiza el build estático         |

## Tecnologías

- **Backend:** Node.js, Express, Mongoose, JWT, bcrypt.
- **Frontend:** React 18, Vite, React Router, Tailwind CSS, react-icons.
- **Reportes/visualizaciones:** Chart.js, react-chartjs-2, `html2canvas`, `jspdf`, `xlsx`.

## Datos principales

- `users`: incluye `rolAcademico`, `permisoSistema`, estado (`activo`, `inactivo`, `bloqueado`) y ticket temporal.
- `entry-exit`: historial con referencias a usuario, vehículo, motivo de cierre y badges compactos (`En progreso`, `Finalizado`).
- `visitor_tickets`: tickets temporales con expiración automática y reactivación desde el panel.
- `vehicles`: catálogo asociado a usuarios con filtros por propietario.

## Documentación

Consulta la carpeta [`docs/`](docs) para la arquitectura detallada, colecciones de Postman y ejemplos de `.env` actualizados.

## Licencia

Proyecto académico; ajusta la licencia según tus necesidades antes de desplegar en producción.
