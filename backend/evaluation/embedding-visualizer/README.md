# Embedding Visualizer

Utilidad aislada para ver de forma visual como se veria la grafica de un embedding facial, sin tocar rutas, controladores ni frontend principal.

## Entrada

Por defecto usa `sample-embedding.json`, con la forma:

```json
{
  "label": "sample-visitor-embedding",
  "source": "sample-embedding.json",
  "embedding": [0.124812, -0.083554, 0.227318]
}
```

## Salida

Genera un HTML estatico en:

`output/embedding-plot.html`

Incluye:

- grafico de linea
- histograma
- heatmap lineal
- resumen estadistico

## Uso

Desde `backend/`:

```bash
npm run visualize:embedding
```

Para leer un embedding real desde MongoDB por `userId`:

```bash
npm run visualize:embedding -- --userId 665f0d7d1a2b3c4d5e6f7890
```

Tambien soporta el formato con `=`:

```bash
npm run visualize:embedding -- --userId=665f0d7d1a2b3c4d5e6f7890
```

Si en tu terminal `npm run` no propaga bien el argumento, usa el comando directo:

```bash
node evaluation/embedding-visualizer/generate-embedding-plot.js --userId=665f0d7d1a2b3c4d5e6f7890
```

O con rutas personalizadas:

```bash
node evaluation/embedding-visualizer/generate-embedding-plot.js --input evaluation/embedding-visualizer/sample-embedding.json --output evaluation/embedding-visualizer/output/embedding-plot.html
```

Tambien puedes combinar `--userId` con `--output`:

```bash
node evaluation/embedding-visualizer/generate-embedding-plot.js --userId 665f0d7d1a2b3c4d5e6f7890 --output evaluation/embedding-visualizer/output/real-user-embedding.html
```

Luego abre el HTML generado en el navegador.

## Como confirmar que si tomo el usuario real

Cuando uses `--userId`, el script ahora imprime en consola:

- la fuente exacta
- el tipo de fuente (`mongodb-user`)
- metadatos del usuario (id, email, cedula, rol, facultad, estado, etc.)

Y dentro del HTML generado veras una tarjeta llamada **Fuente y metadatos** con la misma informacion.

Si el HTML muestra `sourceType: json-file`, entonces no esta usando MongoDB y cayo al sample por defecto.

## Mapa 2D comparativo

Tambien puedes generar un mapa comparativo con PCA 2D:

```bash
npm run visualize:embedding-map
```

Con embeddings reales desde MongoDB:

```bash
npm run visualize:embedding-map -- --all-users --limit 60
```

Tambien soporta el formato con `=`:

```bash
npm run visualize:embedding-map -- --all-users --limit=60
```

O con usuarios especificos:

```bash
npm run visualize:embedding-map -- --userIds=665f0d7d1a2b3c4d5e6f7890,665f0d7d1a2b3c4d5e6f7891
```

Si tu terminal no propaga bien los argumentos con `npm run`, usa el comando directo:

```bash
node evaluation/embedding-visualizer/generate-embedding-map.js --all-users --limit=60
```

Genera un HTML estatico en:

`output/embedding-map.html`

Incluye:

- scatter plot PCA 2D
- leyenda por categoria
- tabla con coordenadas proyectadas

## Como confirmar que si tomo datos reales

Cuando uses `--all-users` o `--userIds`, el script ahora imprime en consola:

- la fuente exacta
- el tipo de fuente (`mongodb-all-users` o `mongodb-user-list`)
- cuántos embeddings cargó
- cuántos proyectó
- cuántos ignoró

Y dentro del HTML generado verás una tabla **Fuente y leyenda** con:

- `source`
- `sourceType`
- `loadedItems`
- `projectedItems`
- `rejectedItems`
- `dominantDimension`

Si el HTML muestra `sourceType: json-file`, entonces el mapa cayó al sample por defecto.

## Modos soportados

- `--input <archivo>`: usa un embedding desde JSON
- `--userId <id>`: consulta `faceDescriptor` real desde MongoDB
- `--output <archivo>`: cambia la ruta del HTML de salida

Para el mapa 2D:

- `--all-users`: toma usuarios con `faceRegistered=true` desde MongoDB
- `--userIds <id1,id2,...>`: toma un subconjunto explicito desde MongoDB
- `--limit <n>`: limita la cantidad de usuarios proyectados en modo Mongo

Si no envias `--input` ni `--userId`, el script usa `sample-embedding.json` por defecto.
