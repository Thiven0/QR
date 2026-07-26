# Pruebas y calidad

## Backend

### Estadisticas de registros

```powershell
npm run test:entry-stats
```

Prueba rango predeterminado, rangos extensos, fechas invalidas, ceros diarios, heatmap, duraciones y comparacion de periodos.

### Harness facial

```powershell
npm run test:face-harness
```

Prueba vectores, similitud coseno, rankings, thresholds, metricas, escape HTML y reportes.

### Embeddings Python

```powershell
npm run test:embedding-analysis
```

Requiere Python 3.13 y dependencias del visualizador.

No hay un script generico `npm test`; use los comandos anteriores.

## Frontend

```powershell
npm run lint
npm run build
```

No existe suite de componentes/E2E. El build es el control minimo de integracion estatica.

## Face-service

No hay suite automatizada en el repositorio. Validacion minima:

1. Compilar sintaxis Python.
2. Iniciar Uvicorn.
3. Consultar `/health`.
4. Enviar una imagen valida e invalidas a `/extract-embedding`.
5. Confirmar 512 dimensiones, score y timings.

## Pruebas manuales criticas

- Login, logout y bloqueo inmediato.
- CRUD y paginacion de usuarios.
- Entrada/salida manual, QR y facial.
- Visitante: OCR, ticket, expiracion y reactivacion.
- Alertas y cierre forzado.
- Estadisticas con fechas/facultad y periodo vacio.
- Excel con mas de una pagina.
- PDF de carnet y estadisticas.
- Camara en movil y escritorio.

## Antes de integrar

```powershell
# backend
npm run test:entry-stats
npm run test:face-harness

# frontend
npm run lint
npm run build
```

Tambien ejecute `git diff --check` y confirme que no se agregaron `.env`, uploads, datasets ni reportes.

## Cobertura pendiente

- Integracion HTTP con autenticacion y MongoDB temporal.
- Tests de visitor tickets/TTL.
- Tests de frontend y Playwright/Cypress.
- Tests del face-service.
- CI automatizada.
- Pruebas de carga para matching y estadisticas.
