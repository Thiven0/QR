# Frontend

SPA React/Vite de la plataforma de control de acceso. Incluye login, dashboard protegido, captura facial/QR, registro publico de visitantes, directorios, alertas, estadisticas y exportaciones.

## Desarrollo

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

Scripts:

- `npm run dev`: Vite.
- `npm run lint`: ESLint.
- `npm run build`: build productivo.
- `npm run preview`: sirve el build.

## Configuracion

`VITE_API_URL` debe incluir `/api`, por ejemplo `http://localhost:3000/api`. Si se omite, el cliente combina protocolo/host actual con `VITE_API_PORT`.

Variables de captura facial estan en `.env.example`. Ninguna variable `VITE_*` debe contener secretos porque se incorpora al bundle.

## Estructura

- `src/modules/auth`: sesion, login y guardas.
- `src/modules/dashboard`: layout, escaner y paginas administrativas.
- `src/modules/public`: registro de visitantes.
- `src/shared`: hooks de camara/MediaPipe y componentes.
- `src/services/apiClient.js`: fetch, auth, uploads y assets.

## Documentacion

- [Arquitectura frontend](../docs/architecture/frontend.md)
- [Desarrollo local](../docs/getting-started/local-development.md)
- [Guia del operador](../docs/product/operator-guide.md)
- [Analitica y exportaciones](../docs/product/analytics-and-exports.md)

No hay suite automatizada de frontend; ejecute lint y build antes de integrar.
