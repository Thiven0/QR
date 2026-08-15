# TODO

## Modulo de Talanquera con Arduino

Estado: pendiente para implementacion futura.

### Objetivo

Activar una talanquera fisica emulada con `Arduino Uno` cuando un usuario registre correctamente un movimiento de `ingreso` o `salida` desde el flujo de escaneo.

### Alcance acordado

- Hardware: `Arduino Uno`
- Conexion con backend: `USB Serial`
- Mecanismo de apertura: `servo motor`
- Activacion: `ingreso` y `salida`
- Interfaz: modal simple en el apartado de escaneo para validar si el Arduino esta conectado o no
- Ubicacion: el Arduino estara conectado al mismo PC donde corre el backend

### Propuesta tecnica

1. Agregar un modulo backend para control serial del Arduino usando `serialport`.
2. Exponer endpoints como:
   - `GET /api/turnstile/status`
   - `POST /api/turnstile/open`
   - `POST /api/turnstile/close`
3. Integrar el disparo automatico de la talanquera en `backend/src/controllers/entry-exit.controller.js` despues de un registro exitoso de `entry` y `exit`.
4. Mantener el registro de acceso como la operacion principal: si el Arduino falla, no debe romper el flujo de ingreso/salida; solo debe registrarse el error.
5. Agregar un modal en `frontend/src/modules/dashboard/components/QRScanner.jsx` para mostrar:
   - estado de conexion
   - ultima respuesta del Arduino
   - acciones manuales de prueba si se requieren
6. Crear firmware Arduino con protocolo serial simple, por ejemplo:
   - `OPEN\n`
   - `CLOSE\n`
   - `STATUS\n`
7. Configurar variables de entorno del backend:
   - `TURNSTILE_ENABLED`
   - `TURNSTILE_SERIAL_PORT`
   - `TURNSTILE_BAUD_RATE`

### Archivos probables a tocar

- `backend/package.json`
- `backend/src/app.js`
- `backend/src/controllers/entry-exit.controller.js`
- `backend/src/modules/turnstile/arduino.service.js`
- `backend/src/modules/turnstile/turnstile.controller.js`
- `backend/src/modules/turnstile/turnstile.routes.js`
- `frontend/src/modules/dashboard/components/QRScanner.jsx`
- `frontend/src/modules/dashboard/components/TurnstileStatus.jsx`
- `frontend/src/services/turnstileApi.js`
- `arduino/turnstile/turnstile.ino`

### Criterios de aceptacion

- Un ingreso exitoso activa la talanquera.
- Una salida exitosa activa la talanquera.
- El dashboard puede mostrar si el Arduino esta conectado.
- Si no hay Arduino o no responde, el acceso sigue registrandose en la aplicacion.
- El sistema deja trazabilidad del intento de apertura y de la respuesta del dispositivo.

### Notas de implementacion

- Preferir comandos seriales de texto cortos terminados en salto de linea.
- Considerar auto-cierre del servo despues de algunos segundos.
- Agregar timeout y manejo de reconexion del puerto serial.
- Validar permisos para que solo `admin` o `celador` puedan disparar acciones manuales.
