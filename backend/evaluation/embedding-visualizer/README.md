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

## Analisis cientifico con scikit-learn

`generate-embedding-analysis.py` consulta MongoDB y genera un reporte HTML con analisis reproducible. No modifica documentos ni llama al face-service.

### Instalar dependencias

Desde `backend/`:

```bash
py -3.13 -m pip install -r evaluation/embedding-visualizer/requirements.txt
```

### Usuarios de produccion

```bash
npm run analyze:embeddings -- --source=users --max-samples=500
```

Lee `users.faceDescriptor` y genera `output/embedding-analysis-users.html`.

### Perfiles y probes de un run

```bash
npm run analyze:embeddings -- --source=evaluation --run-id=prueba-100-perfiles --max-samples=1000
```

Tambien se pueden analizar por separado:

```bash
npm run analyze:embeddings -- --source=profiles --run-id=prueba-100-perfiles
npm run analyze:embeddings -- --source=probes --run-id=prueba-100-perfiles --max-samples=1000
```

### Logs de reconocimiento

```bash
npm run analyze:embeddings -- --source=recognition-logs --start-date=2026-01-01 --end-date=2026-12-31
```

Los logs no contienen el vector de 512 dimensiones. En este modo se grafican scores, estados, actividad temporal y relacion entre deteccion y similitud. No se reportan FAR/FRR porque los logs operativos no tienen una etiqueta de identidad esperada independiente.

### Graficas del reporte de embeddings

- PCA 2D con porcentaje de varianza explicada
- t-SNE 2D con semilla y perplexity registradas
- varianza por dimension
- correlacion entre las dimensiones de mayor varianza
- posibles outliers por distancia coseno al vecino global mas cercano
- distribucion de scores Top-1 cuando la fuente contiene probes

PCA y t-SNE son herramientas exploratorias con perdida de informacion. Las decisiones biometricas deben seguir usando el embedding completo y similitud coseno.

El muestreo es determinista por `ObjectId` y `random-state`. En `source=evaluation` se reserva hasta la mitad para profiles y los probes completan los cupos disponibles. El reporte registra conteos por tipo, versiones de librerias y una huella SHA-256 del conjunto utilizado. Los vectores nulos, no finitos o con dimensiones inconsistentes se descartan.

En `source=recognition-logs`, el histograma y el scatter usan la muestra limitada, mientras los totales por estado y la actividad diaria se calculan sobre todos los documentos del rango mediante agregaciones MongoDB.

### Opciones principales

- `--source`: `users`, `profiles`, `probes`, `evaluation` o `recognition-logs`
- `--run-id`: obligatorio para las fuentes de evaluacion
- `--max-samples`: limita documentos para controlar memoria y tiempo; predeterminado `1000`
- `--random-state`: semilla reproducible; predeterminado `42`
- `--tsne-perplexity`: perplexity solicitada; se ajusta automaticamente al tamano de la muestra
- `--skip-tsne`: omite t-SNE para una ejecucion mas rapida
- `--top-dimensions`: cantidad de dimensiones mostradas por varianza
- `--color-by`: colorea por `category`, `kind` o `result`
- `--mongo-uri`: sobrescribe `MONGODB_URI`
- `--database`: selecciona la base cuando la URI no contiene una
- `--output`: cambia la ruta del HTML

Ejemplo rapido sin t-SNE:

```bash
npm run analyze:embeddings -- --source=evaluation --run-id=prueba-100-perfiles --max-samples=300 --skip-tsne=true --output=evaluation/embedding-visualizer/output/prueba-100-rapido.html
```

Con esta version de npm en Windows, usa `--clave=valor` en los comandos `npm run`. El comando Python directo tambien acepta `--clave valor`.

### Pruebas del analizador

```bash
py -3.13 -m unittest evaluation/embedding-visualizer/test_embedding_analysis.py
```
