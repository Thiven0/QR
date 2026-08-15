# Guia de operacion

## Roles

### Administrador

Puede gestionar usuarios y staff, eliminar perfiles, consultar estadisticas, operar accesos, resolver alertas, reactivar visitantes y exportar reportes.

### Celador

Puede operar escaneos, crear y consultar usuarios, gestionar registros y alertas, y reactivar visitantes. No puede eliminar/editar permisos de usuario ni abrir estadisticas administrativas.

## Inicio de sesion

1. Ingrese email y contrasena.
2. Si el usuario esta bloqueado, el sistema deniega la sesion.
3. El navbar muestra perfil y cierre de sesion.
4. En escritorio, el perfil y las opciones tambien estan en el sidebar.

## Registrar un usuario

1. Abra `Usuarios > Registrar`.
2. Complete identidad, contacto, facultad y rol academico.
3. Adjunte/capture foto de perfil.
4. Genere y cargue el QR si corresponde.
5. Capture el rostro si se requiere enrolamiento.
6. Confirme y revise el toast de resultado.

Un Administrador puede registrar staff desde `Registrar personal`. Este flujo admite OCR de documento y extraccion facial antes de crear el usuario.

## Directorio

Permite:

- Buscar y paginar.
- Ver detalle y carnet.
- Editar o eliminar segun rol.
- Bloquear/desbloquear acceso.
- Enrolar o reemplazar rostro.
- Reactivar ticket de visitante.
- Exportar la pagina visible a Excel.

Bloquear produce efecto inmediato en nuevas solicitudes protegidas porque el backend consulta el estado en cada request.

## Registrar acceso

### Facial

1. Abra `Escanear QR`.
2. Seleccione/permita captura facial.
3. Mire de frente y realice el parpadeo si la captura automatica esta activa.
4. Revise usuario, score y resultado.
5. Confirme el movimiento.

El sistema intenta hasta dos identificaciones y permite fallback QR. No confirme si la identidad visible no corresponde a la persona.

### QR

1. Cambie a QR o use el fallback.
2. Muestre el codigo dentro del encuadre.
3. El sistema parsea y valida usuario/ticket/estado.
4. Confirme entrada o salida.

### Manual

En `Historial de registros`, use `Nuevo registro`, busque usuario por cedula y defina fecha/hora. El metodo queda como `Registro manual`.

## Entrada y salida

- La interfaz envia explicitamente `direction=entry` o `exit` segun la operacion confirmada.
- Una entrada rechaza al usuario si ya tiene un registro abierto.
- Una salida requiere un registro abierto y calcula su duracion.
- Si un consumidor omite `direction`, el backend usa `user.estado` como fallback.
- Una salida puede incluir observaciones.
- Un cierre administrativo puede marcar `cierreForzado` y motivo.

## Alertas

Las sesiones abiertas que superan `ALERT_THRESHOLD_MINUTES` aparecen en el centro de alertas. Mientras siguen abiertas pueden marcarse `acknowledged` y recibir notas. `resolved` es rechazado hasta registrar la salida; resolver una alerta no sustituye el cierre del acceso.

## Historial y Excel

Filtros disponibles:

- Busqueda de usuario/porteria.
- Estado abierto/cerrado.
- Fecha inicial/final.

El Excel descarga todos los registros del filtro, no solo la pagina actual. Incluye identidad, porteria, metodo, fechas, vehiculo y metadatos faciales. Campos faciales quedan vacios para QR/manual o registros historicos sin log vinculado.

## Estadisticas

Solo Administrador. El rango inicial son los ultimos 30 dias y la facultad es opcional. Los accesos se calculan en backend sobre todos los registros coincidentes, sin paginacion. El reporte visible puede descargarse como PDF.

## Cierre de turno

1. Revise sesiones abiertas y alertas.
2. Corrija cierres solo con evidencia.
3. Exporte reportes requeridos.
4. Cierre sesion; no comparta credenciales.
