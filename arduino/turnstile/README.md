# Talanquera con Arduino

El sistema registra primero el ingreso o la salida. Despues solicita la apertura de la talanquera sin bloquear ni revertir el registro si no hay Arduino, cable o respuesta serial.

## Materiales

- Arduino Uno o Nano con cable USB de datos.
- Servo SG90 para una maqueta liviana, o MG996R si la barrera pesa mas.
- Fuente externa regulada de 5 V para el servo. Debe cubrir la corriente requerida por el modelo de servo.
- Barrera liviana y estructura mecanica.

## Conexion

| Elemento | Conexion |
| --- | --- |
| Cable de senal del servo | Arduino D9 |
| VCC del servo | +5 V de la fuente externa |
| GND del servo | GND de la fuente externa |
| GND del Arduino | GND de la fuente externa |
| Arduino | USB al computador que ejecuta el backend |

No alimentes el servo desde el pin de 5 V del Arduino: el consumo puede reiniciarlo. La tierra compartida es obligatoria para que la senal de D9 tenga referencia comun.

## Carga y configuracion

1. Abre `turnstile.ino` con Arduino IDE y cargalo en la placa.
2. Identifica el puerto COM de la placa en el Administrador de dispositivos de Windows.
3. Copia los valores a `backend/.env` y reinicia el backend:

```env
TURNSTILE_ENABLED=true
TURNSTILE_MODE=auto
TURNSTILE_SERIAL_PORT=COM3
TURNSTILE_BAUD_RATE=9600
```

`TURNSTILE_MODE=auto` usa la placa cuando responde y simula la apertura en caso contrario. Usa `serial` si deseas reportar una falla cuando la placa no esta disponible, o `simulated` para una demostracion sin hardware.

El firmware abre a 90 grados y cierra automaticamente segun `AUTO_CLOSE_MS` (actualmente 5000 ms). El Monitor Serie y los logs del backend distinguen `CLOSED:AUTO` del cierre temporizado y `CLOSED:COMMAND` de un cierre solicitado por serial. Ajusta `OPEN_ANGLE`, `CLOSED_ANGLE` y `AUTO_CLOSE_MS` en el sketch segun la mecanica de la maqueta.
