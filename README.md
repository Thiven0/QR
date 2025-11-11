# QR Access Control Platform

Plataforma web full‑stack para la gestión de accesos mediante códigos QR, diseñada para instituciones universitarias. Permite a administradores y celadores registrar ingresos y salidas de usuarios y vehículos, monitorear estadísticas en tiempo real y mantener un historial detallado de movimientos.

## Arquitectura

| Carpeta   | Descripción                                                                           |
|-----------|---------------------------------------------------------------------------------------|
| `backend` | API REST construida con Node.js/Express, MongoDB/Mongoose y controladores modularizados |
| `frontend`| Aplicación React + Vite que consume la API y ofrece paneles para distintos perfiles    |

## Características

- Registro y autenticación de usuarios (Administrador, Celador, Usuario/Visitante).
- Escaneo de QR con doble flujo: usuarios y vehículos.
- Historial de registros con filtros avanzados y exportación a Excel.
- Tableros con métricas (asistencia, tickets vigentes/expirados, actividad diaria).
- Gestión de tickets temporales (creación, expiración automática, reactivación).
- Estadísticas descargables en PDF desde el módulo de analítica.
- Integración con Chart.js para visualizaciones y `xlsx`/`jspdf` para reportes.

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
   cp .env.example .env   # ajusta credenciales de MongoDB, JWT, etc.
   npm run dev
   ```
   - La API expone rutas bajo `http://localhost:3000/api`.
   - Rutas principales: `/auth`, `/users`, `/exitEntry`, `/visitors`, `/vehicles`.

3. **Frontend**
   ```bash
   cd frontend
   npm install
   cp .env.example .env   # define VITE_API_URL, etc.
   npm run dev
   ```
   - Acceso por defecto en `http://localhost:5173`.
    - Variables soportadas:
      - `VITE_API_URL`: URL completa (incluye `/api`) hacia la API. Sobrescribe cualquier otro cálculo.
      - `VITE_API_PORT`: Puerto que usará el frontend para construir la URL por defecto cuando no se define `VITE_API_URL` (3000 por defecto).
   - Sin `VITE_API_URL`, el cliente detecta el protocolo y hostname del navegador y arma `http(s)://<host>:<VITE_API_PORT>/api`, evitando errores CORS al acceder desde otro dispositivo de la red.

## Scripts útiles

| Ubicación | Script        | Acción                                |
|-----------|---------------|----------------------------------------|
| backend   | `npm run dev` | Ejecuta API con nodemon               |
| backend   | `npm test`    | (si aplica) pruebas/linters           |
| frontend  | `npm run dev` | Dev server Vite                       |
| frontend  | `npm run build` | Compila artefactos de producción    |
| frontend  | `npm run preview` | Previsualiza build estático       |

## Tecnologías clave

- **Backend:** Node.js, Express, Mongoose, JWT, bcrypt.
- **Frontend:** React 18, Vite, React Router, Tailwind CSS.
- **Visualización:** Chart.js / react-chartjs-2.
- **Reportes:** `html2canvas`, `jspdf`, `xlsx`.

## Estructura de datos destacada

- `users`: información del personal/visitantes; soporta `rolAcademico`, `permisoSistema` y estado activo/inactivo.
- `registros` (entry-exit): entradas/salidas con vínculos a usuario, administrador y vehículo.
- `visitor_tickets`: tickets temporales con expiración automática (TTL).
- `vehicles`: catálogo por usuario, con seguimiento de estado activo/inactivo.

## Licencia

Proyecto académico; ajusta la licencia según tus necesidades antes de desplegar en producción.
