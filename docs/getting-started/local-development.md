# Desarrollo local

## Requisitos

- Node.js 18.20 o superior y npm.
- Python 3.13 para el face-service y el analizador de embeddings.
- MongoDB local o remoto.
- Camara web para validar captura facial y QR.
- Windows PowerShell, macOS o Linux. Los ejemplos muestran comandos de PowerShell y equivalentes portables cuando aplica.

Puertos predeterminados:

| Servicio | Puerto | URL |
|---|---:|---|
| Backend Express | 3000 | `http://localhost:3000/api` |
| Face-service FastAPI | 8000 | `http://localhost:8000` |
| Frontend Vite | 5173 | `http://localhost:5173` |
| MongoDB | 27017 | `mongodb://localhost:27017/universidad` |

## 1. Backend

```powershell
Set-Location backend
npm install
Copy-Item .env.example .env
npm run dev
```

Variables minimas en `backend/.env`:

```dotenv
MONGODB_URI=mongodb://localhost:27017/universidad
JWT_SECRET=reemplazar-por-un-secreto-largo
TOKEN_ACCESS_KEY=reemplazar-access-key
TOKEN_SECRET_KEY=reemplazar-secret-key
```

El proceso conecta MongoDB antes de abrir el puerto. Si `MONGODB_URI` no existe o la conexion falla, el backend no inicia.

Crear el primer administrador:

```powershell
npm run seed:admin
```

Configure `ADMIN_SEED_EMAIL`, `ADMIN_SEED_PASSWORD` y `ADMIN_SEED_IMAGE` antes de ejecutar el seed en un entorno compartido.

## 2. Face-service

```powershell
Set-Location face-service
py -3.13 -m venv .venv
.\.venv\Scripts\Activate.ps1
py -3.13 -m pip install -r requirements.txt
Copy-Item .env.example .env
py -3.13 -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

En macOS o Linux, active el entorno con `source .venv/bin/activate` y use `python3`.

Durante el primer inicio, InsightFace puede descargar los archivos del modelo `buffalo_l`. El servicio no esta listo hasta completar la carga del modelo.

Verificacion:

```powershell
Invoke-RestMethod http://localhost:8000/health
```

La respuesta debe incluir `status: "ok"` y `model_loaded: true`.

## 3. Frontend

```powershell
Set-Location frontend
npm install
Copy-Item .env.example .env
npm run dev
```

Con `VITE_API_URL=http://localhost:3000/api`, el frontend usa esa URL. Si se omite, calcula `http(s)://<host>:3000/api`, lo cual permite probar desde otro equipo de la LAN si CORS y el firewall lo permiten.

## 4. Orden de inicio

1. MongoDB.
2. Face-service.
3. Backend.
4. Frontend.

El login y la administracion pueden funcionar sin face-service, pero enrolamiento, identificacion y extraccion facial devolveran error `503` o `504`.

## 5. Prueba funcional minima

1. Abra `http://localhost:5173`.
2. Inicie sesion con el administrador creado por el seed.
3. Registre un usuario con foto de perfil.
4. Enrole su rostro o genere su QR.
5. Abra `Dashboard > Escanear QR` y confirme una entrada.
6. Repita el escaneo para cerrar la salida.
7. Verifique el movimiento en `Historial de registros`.
8. Verifique `GET /api/exitEntry/stats` desde el modulo de estadisticas.

## 6. Datos y archivos locales

- Base predeterminada: `universidad`.
- Uploads: `backend/uploads/profiles`, `backend/uploads/qr` y `backend/uploads/documents`.
- Modelos faciales: `face-service/models`.
- Resultados de evaluacion: `backend/evaluation/face-runs`.
- Reportes de embeddings: `backend/evaluation/embedding-visualizer/output`.

Estos directorios contienen datos generados o sensibles y estan excluidos de Git.
