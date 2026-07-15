# Prueba E2E de reinicio del seguimiento GPS

Esta prueba es opt-in y crea dos posiciones reales en la base SQL Server de desarrollo. Debe utilizarse exclusivamente con un seguimiento activo dedicado a pruebas. No elimina automáticamente las filas de SQL Server.

Cada etapa se ejecuta en un `child_process` distinto y cierra su conexión SQLite antes de finalizar. La SQLite temporal, sus archivos WAL, SHM y el directorio auxiliar se eliminan al terminar, incluso si falla una aserción.

## Ejecución mediante ngrok

```powershell
$env:RUN_E2E_SEGUIMIENTO="1"
$env:E2E_CONFIRMAR_BD_DESARROLLO="SI"
$env:E2E_SEGUIMIENTO_URL="https://SUBDOMINIO.ngrok-free.app/WebServiceProveedor.asmx/Recibe_Posiciones_Seguimiento"
$env:E2E_ID_UNICO_SEGUIMIENTO="00000000-0000-4000-8000-000000000000"
$env:E2E_UUID_DISPOSITIVO="UUID-DEL-DISPOSITIVO-DE-DESARROLLO"
$env:E2E_VERSION_APP="5.0.3-E2E"
$env:E2E_LATITUD="-36.748134"
$env:E2E_LONGITUD="-72.998278"
$env:E2E_TIMEOUT_MS="30000"
npm run test:e2e-seguimiento
```

La URL debe ser HTTPS y pertenecer a ngrok. Para un backend estrictamente local se admite HTTP únicamente si el host es `localhost`, `127.0.0.1` o `::1` y se define además:

```powershell
$env:E2E_PERMITIR_HTTP_LOCAL="1"
```

Si `RUN_E2E_SEGUIMIENTO` no vale `1`, Node marca la prueba como omitida sin crear la SQLite ni realizar HTTP.

La salida muestra los dos `UUID_POSICION`, la ruta temporal, el dispositivo enmascarado, los estados de ambos envíos y una consulta SQL lista para copiar.
