# Seguimiento GPS offline-first

## Flujo

Al confirmar localmente una guía en estado `I`, la misma transacción de `bd.db`
genera una sola vez `ID_UNICO_SEGUIMIENTO` con un UUID criptográficamente
seguro y `FECHA_INICIO_DISPOSITIVO_UTC` con `new Date().toISOString()`. Después
del commit se registra en Android una fila `ACTIVA_LOCAL`, todavía sin token, y
se solicita inmediatamente el servicio foreground. Reiniciar la app, cerrar
sesión o reiniciar el teléfono no elimina esa fila ni su `position_outbox`.

`Recibe_Guia_V3` recibe el UUID y la fecha originales en cada reintento, sin
`TOKEN_SEGUIMIENTO`. Cuando el servidor devuelve el mismo UUID, Android cifra
el token más reciente y cambia esa misma fila a `ACTIVA`, conservando secuencia
y posiciones. Un UUID de respuesta diferente genera
`SEGUIMIENTO_UUID_RESPUESTA_DIFERENTE`, mantiene el provisional y no reasigna
posiciones.

Los lotes del uploader seleccionan únicamente seguimientos con `token_cipher`
y `token_iv`. Por ello, un provisional no incrementa intentos ni bloquea el
drenaje de seguimientos autorizados.

El diagnóstico nativo expone:

- `seguimientosLocalesPendientes`
- `posicionesLocalesAcumuladas`
- `seguimientosEsperandoCredencial`
- `seguimientosAutorizadosDrenando`

## Cambio de esquema

- `bd.db / GDE`: se garantizan las columnas `ID_UNICO_SEGUIMIENTO TEXT` y
  `FECHA_INICIO_DISPOSITIVO_UTC TEXT`; la inicialización es idempotente.
- `comaco_tracking.db`: versión 4 → 5, agregando
  `active_tracking.device_started_utc TEXT`.
- `active_tracking.status` incorpora `ACTIVA_LOCAL` y `CANCELADA_LOCAL`.
  `position_outbox` no cambia y las filas históricas no se reconstruyen.

## Prueba manual exacta

Esta validación requiere un dispositivo Android real; un navegador o emulador
sin GPS físico no valida boot, Doze ni captura con pantalla bloqueada.

1. Instalar el APK debug, iniciar sesión una vez y conceder ubicación precisa,
   ubicación en segundo plano y notificaciones.
2. Activar modo avión, volver a habilitar solamente la ubicación/GPS y confirmar
   que no existe Wi-Fi ni datos móviles.
3. Emitir una guía hasta que quede localmente en estado `I`.
4. Comprobar de inmediato la notificación “Seguimiento GPS activo”. En
   `adb logcat -s ComacoTracking` deben aparecer `TRACK_LOCAL_REGISTERED`,
   `GPS_REQUEST_UPDATES`, `GPS_DB_COMMIT` y un `GPS_PENDING_COUNT` creciente;
   no debe aparecer `GPS_HTTP_BEGIN` para ese seguimiento.
5. Caminar o conducir al menos cinco minutos. Bloquear la pantalla durante dos
   minutos y retirar la app de recientes, sin usar **Forzar detención**.
6. Abrir de nuevo la app, incluso sin iniciar sesión, y verificar que el
   contador pendiente no disminuyó y sigue creciendo.
7. Reiniciar el teléfono, desbloquearlo y esperar hasta dos minutos. Confirmar
   los eventos `BOOT`, el reinicio del servicio y nuevas capturas con el mismo
   prefijo de UUID de seguimiento.
8. Desactivar modo avión y recuperar Internet. La guía debe enviarse primero.
   Confirmar en orden `TRACK_AUTHORIZED`, `GPS_DRAIN_BEGIN`, `GPS_HTTP_BEGIN` y
   `GPS_ACK`; las secuencias deben ser crecientes y comenzar por las posiciones
   acumuladas offline.
9. Repetir con una segunda guía offline y anularla antes de recuperar Internet.
   Debe aparecer `TRACK_LOCAL_CANCELLED`, cesar sus posiciones nuevas y nunca
   enviarse esa guía ni sus posiciones.
10. Para una respuesta perdida, cortar la red después de enviar la guía y antes
    de procesar la respuesta, luego restaurarla. El reintento debe llevar el
    mismo UUID y aceptar el token rotado sin crear otro `active_tracking`.
