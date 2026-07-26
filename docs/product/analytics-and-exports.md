# Analitica y exportaciones

## Estadisticas de acceso

Fuente: `GET /api/exitEntry/stats`.

Filtros:

- Inicio y fin `YYYY-MM-DD`.
- Facultad opcional.
- Sin fechas: ultimos 30 dias en `America/Bogota`.

El servicio usa `$match`, `$lookup`, `$facet` y agrupaciones MongoDB. La respuesta no esta limitada por la paginacion del historial.

Metricas:

- Accesos de fecha final, ultimos 7 y ultimos 30 dias dentro del filtro.
- Comparacion contra periodo anterior de igual longitud.
- Promedio, mediana, desviacion estandar y P90 diario.
- Tasa de sesiones cerradas.
- Series diaria, semanal y mensual.
- Horas pico y heatmap dia/hora.
- Distribucion por rol y ranking por facultad.
- Top operadores.
- Duraciones de sesion.
- Ultimas sesiones abiertas.

## Estadisticas faciales

Fuente: `GET /api/face/stats`.

- Intentos matched/unmatched/error.
- Tasa de acierto.
- Score y detection score promedio.
- Perfiles comparados.
- Serie diaria y bandas de score.
- Usuarios mas reconocidos e intentos recientes.

Al filtrar por facultad, intentos sin usuario reconocido no pueden asociarse a una facultad y quedan fuera del subconjunto.

## PDF de estadisticas

`DashboardStats` captura el nodo del reporte con `html2canvas` y lo divide en paginas A4 con `jsPDF`. Antes de capturar reemplaza colores CSS no soportados. El PDF representa lo cargado en pantalla en ese momento.

## Excel de registros

`RegistroDirectory` solicita todas las paginas del filtro en lotes de hasta 100. Columnas:

- Usuario, cedula, correo, telefono y rol.
- Porteria y metodo de ingreso.
- Entrada, salida y duracion.
- Vehiculo.
- Estado, score, threshold, detection score, perfiles y fecha de log facial.
- Cierre forzado y observaciones.

La hoja incluye autofiltro y anchos calculados. Una exportacion grande hace varias solicitudes secuenciales y puede tardar.

## Excel de usuarios

El directorio de usuarios exporta la pagina visible, no toda la coleccion. La etiqueta del boton indica este alcance.

## Carnet PDF

La tarjeta usa `ProfileCard`, QR, foto y datos del usuario. Se captura en cliente. Verifique que imagenes remotas permitan CORS.

## Interpretacion responsable

- Un score facial no es probabilidad de identidad.
- P90 diario describe volumen, no riesgo.
- La tasa de cierre depende de que los operadores registren salidas.
- Los tickets historicos estan limitados por TTL.
- Compare periodos equivalentes y documente filtros al compartir un reporte.
