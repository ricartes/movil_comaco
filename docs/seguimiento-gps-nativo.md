# Seguimiento GPS nativo COMACO

El plugin local `cordova-plugin-comaco-tracking` mantiene un único servicio Android foreground de tipo `location`. `LocationManager.GPS_PROVIDER` solicita actualizaciones cada 5 segundos y 5 metros. Cada captura física y todas las posiciones funcionales derivadas se guardan en una transacción SQLite antes de iniciar cualquier transmisión.

```text
GPS_PROVIDER → validación → location_capture
                         └→ N seguimientos activos → position_outbox (PENDIENTE)
                                                    ↓
red disponible / reintento → HTTPS ASMX → ACK por UUID → CONFIRMADA
```

La credencial de cada seguimiento se cifra con AES-256-GCM y una clave no exportable de Android Keystore. El logout no altera seguimientos ni tokens. La confirmación de ingreso o anulación cambia la guía a `FINALIZANDO`: cesan las posiciones nuevas para esa guía, se drena su outbox y solo después se elimina el token cifrado.

Al iniciar, el bootstrap lee `bd.db`, importa credenciales activas y posiciones pendientes en lotes idempotentes, conserva `UUID_POSICION` y verifica los conteos antes de marcar la migración completa. Solo después de esa confirmación nativa elimina las filas migradas del outbox y las credenciales plaintext legacy; un fallo previo conserva íntegra la fuente para reintentar.

## Prueba física pendiente

1. Tramo A: 5 minutos, pantalla encendida, app en background, sin internet y en movimiento.
2. Tramo B: 10 minutos, pantalla bloqueada, sin internet y en movimiento.
3. Tramo C: 5 minutos, retirar de recientes, sin internet y en movimiento.
4. Tramo D: abrir sin login, recuperar internet y comprobar el drenaje.

Antes y después de cada tramo registrar, sin instalar otra APK ni modificar datos: `dumpsys activity services`, `dumpsys location`, `dumpsys notification`, `dumpsys deviceidle`, `dumpsys power` y `pidof`. Debe observarse el servicio foreground con tipo `location`, solicitud 5000 ms/5 m, persistencia creciente y ACK sin huecos al recuperar red. Un `force-stop` queda fuera de esta prueba porque Android impide legítimamente el reinicio tras esa acción.
