# Plataforma de control de acceso QR y facial

Aplicacion full-stack para gestionar usuarios, visitantes y movimientos de entrada/salida mediante registro manual, codigo QR y reconocimiento facial.

## Componentes

| Carpeta | Tecnologia | Responsabilidad |
|---|---|---|
| `frontend` | React 18, Vite, Tailwind | Interfaz, camara, QR, dashboard y reportes. |
| `backend` | Node.js, Express, Mongoose | API, reglas de negocio, persistencia y matching facial. |
| `face-service` | FastAPI, InsightFace, OpenCV | Extraccion de embeddings faciales de 512 dimensiones. |
| `docs` | Markdown y Postman | Arquitectura, API, operacion y producto. |

## Funcionalidad

- JWT, roles `Administrador`, `Celador` y `Usuario`, y bloqueo inmediato.
- Registro, edicion, consulta y exportacion de usuarios.
- Entrada/salida manual, QR o facial.
- Visitantes con OCR, QR, rostro y ticket temporal TTL.
- Alertas de sesiones abiertas y cierres forzados.
- Estadisticas agregadas por rango y facultad.
- Excel de historial y PDF de estadisticas/carnets.
- Harness robusto de evaluacion facial y analisis PCA/t-SNE.

## Inicio rapido

Requisitos: Node.js 18.20+, Python 3.13 y MongoDB.

```powershell
# Terminal 1: face-service
Set-Location face-service
py -3.13 -m pip install -r requirements.txt
Copy-Item .env.example .env
py -3.13 -m uvicorn main:app --reload --port 8000

# Terminal 2: backend
Set-Location backend
npm install
Copy-Item .env.example .env
npm run dev

# Terminal 3: frontend
Set-Location frontend
npm install
Copy-Item .env.example .env
npm run dev
```

Configure secretos y `MONGODB_URI` antes de iniciar el backend. Consulte [Desarrollo local](docs/getting-started/local-development.md) para instrucciones completas.

## URLs locales

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000/api`
- Face-service: `http://localhost:8000`
- FastAPI Swagger: `http://localhost:8000/docs`

## Scripts principales

| Paquete | Comando | Funcion |
|---|---|---|
| backend | `npm run dev` | API con nodemon. |
| backend | `npm run seed:admin` | Crea el administrador si no existe. |
| backend | `npm run test:entry-stats` | Pruebas de analitica. |
| backend | `npm run test:face-harness` | Pruebas de metricas/reportes faciales. |
| backend | `npm run evaluate:face:robust` | Evaluacion facial robusta. |
| backend | `npm run analyze:embeddings` | PCA/t-SNE y diagnosticos. |
| frontend | `npm run lint` | ESLint. |
| frontend | `npm run build` | Build productivo. |

No existe un script generico `npm test`.

## Documentacion

El indice completo esta en [`docs/README.md`](docs/README.md):

- [Arquitectura](docs/architecture/system-overview.md)
- [API backend](docs/api/backend-reference.md)
- [Configuracion](docs/getting-started/configuration.md)
- [Guia del operador](docs/product/operator-guide.md)
- [Despliegue](docs/operations/deployment.md)
- [Seguridad y privacidad](docs/operations/security-and-privacy.md)
- [Evaluacion facial](docs/evaluation/README.md)

## Estado de vehiculos y Arduino

Existe un modelo de vehiculos que puede asociarse a registros, pero no hay un router CRUD `/api/vehicles`. La talanquera Arduino es trabajo futuro documentado en [`docs/TODO.md`](docs/TODO.md).

## Datos sensibles

El proyecto procesa documentos, fotos, embeddings y logs de acceso. No confirme `.env`, uploads, datasets ni reportes con identidad. Defina consentimiento, retencion y controles legales antes de usar datos reales.

## Licencia

Proyecto academico. Revise y formalice la licencia institucional antes de redistribuir o desplegar comercialmente.
