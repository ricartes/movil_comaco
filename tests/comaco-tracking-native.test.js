const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const javaDir = 'plugins-local/cordova-plugin-comaco-tracking/src/android/';
const store = read(javaDir + 'TrackingStore.java');
const uploader = read(javaDir + 'TrackingUploader.java');
const service = read(javaDir + 'TrackingForegroundService.java');
const plugin = read(javaDir + 'ComacoTrackingPlugin.java');
const boot = read(javaDir + 'TrackingBootReceiver.java');
const inspector = read(javaDir + 'PowerPolicyInspector.java');
const healthMonitor = read(javaDir + 'TrackingHealthMonitor.java');
const pluginXml = read('plugins-local/cordova-plugin-comaco-tracking/plugin.xml');
const bridge = read('plugins-local/cordova-plugin-comaco-tracking/www/ComacoTracking.js');
const browser = read('plugins-local/cordova-plugin-comaco-tracking/src/browser/ComacoTracking.js');
const bootstrap = read('www/js/Services/SeguimientoBootstrap.js');
const facade = read('www/js/Helper/gpsTracking.js');
const principal = read('www/js/Vistas/Principal.js');
const request = JSON.parse(read('tests/fixtures/seguimiento-request.json'));
const success = JSON.parse(read('tests/fixtures/seguimiento-response-success.json'));
const functionalError = JSON.parse(read('tests/fixtures/seguimiento-response-functional-error.json'));
const nativeSources = [store, uploader, service, plugin, boot, inspector, healthMonitor].join('\n');

function unwrapAsmx(value) {
    let result = Object.prototype.hasOwnProperty.call(value, 'd') ? value.d : value;
    if (typeof result === 'string') result = JSON.parse(result);
    if (!result || typeof result !== 'object' || Array.isArray(result)) throw new Error('RESPUESTA_INVALIDA');
    return result;
}

test('1 serialización nativa conserva exactamente el contrato JavaScript', () => {
    const input = request.entrada;
    assert.deepEqual(Object.keys(input), ['ID_UNICO_SEGUIMIENTO', 'UUID_DISPOSITIVO', 'TOKEN_SEGUIMIENTO', 'VERSION_APP', 'ID_INSTALACION', 'TOKEN_INSTALACION', 'POSICIONES']);
    for (const key of Object.keys(input)) assert.match(uploader, new RegExp('"' + key + '"'));
    assert.match(uploader, /wrapper\.put\("entrada",input\)/);
});

test('2 interpretación ASMX acepta d objeto o JSON string y ACK válidos', () => {
    assert.equal(unwrapAsmx(success).POSICIONES[0].ESTADO, 'INSERTADA');
    assert.equal(unwrapAsmx({ d: JSON.stringify(success.d) }).EXITO, true);
    assert.match(uploader, /INSERTADA.*YA_EXISTIA/);
});

test('3 fecha del contrato es UTC exacta', () => {
    assert.match(request.entrada.POSICIONES[0].FECHA_DISPOSITIVO_UTC, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    assert.match(store, /yyyy-MM-dd'T'HH:mm:ss\.SSS'Z'/);
});

test('4 booleanos y nulos preservan tipos JSON', () => {
    const p = request.entrada.POSICIONES[0];
    assert.equal(typeof p.ES_UBICACION_SIMULADA, 'boolean');
    assert.equal(p.VELOCIDAD_MPS, null);
    assert.match(uploader, /JSONObject\.NULL/);
});

test('5 decimales no se convierten a texto ni enteros', () => {
    const p = request.entrada.POSICIONES[0];
    assert.equal(p.LATITUD, -33.4512345);
    assert.equal(p.PRECISION_METROS, 4.25);
    assert.match(uploader, /o\.put\("LATITUD",p\.latitude\)/);
});

test('6 almacén permite múltiples seguimientos activos', () => {
    assert.match(store, /active_tracking \(tracking_id TEXT PRIMARY KEY/);
    assert.match(store, /WHERE status='ACTIVA' ORDER BY tracking_id/);
});

test('7 una captura física itera una posición por seguimiento', () => {
    assert.match(store, /insertOrThrow\("location_capture"/);
    assert.match(store, /while \(c\.moveToNext\(\)\)/);
    assert.match(store, /generated\+\+/);
});

test('8 cada seguimiento recibe UUID_POSICION distinto', () => {
    assert.match(store, /outboxValues\(UUID\.randomUUID\(\)\.toString\(\), captureId/);
});

test('9 reintentos actualizan por UUID sin regenerarlo', () => {
    assert.match(store, /WHERE uuid_position=\?/);
    assert.doesNotMatch(store.slice(store.indexOf('synchronized void fail'), store.indexOf('synchronized void releaseUnacknowledged')), /randomUUID/);
});

test('10 secuencia es monotónica por seguimiento', () => {
    assert.match(store, /long sequence = c\.getLong\(2\) \+ 1/);
    assert.match(store, /SET sequence=\?,updated_ms=\? WHERE tracking_id=\?/);
});

test('11 captura y outbox comparten una transacción durable', () => {
    const capture = store.slice(store.indexOf('synchronized int capture'), store.indexOf('synchronized UploadBatch'));
    assert.ok(capture.indexOf('beginTransaction') < capture.indexOf('location_capture'));
    assert.ok(capture.indexOf('location_capture') < capture.indexOf('position_outbox'));
    assert.ok(capture.indexOf('position_outbox') < capture.indexOf('setTransactionSuccessful'));
});

test('12 caída durante ENVIANDO conserva marca recuperable', () => {
    assert.match(store, /state='ENVIANDO'/);
    assert.match(store, /sending_since_ms/);
});

test('13 ENVIANDO antiguo vuelve a PENDIENTE', () => {
    assert.match(store, /SET state='PENDIENTE',sending_since_ms=NULL.*state='ENVIANDO'/);
});

test('14 timeout conserva posiciones y aplica backoff', () => {
    const fail = store.slice(store.indexOf('synchronized void fail'), store.indexOf('synchronized void releaseUnacknowledged'));
    assert.match(fail, /credentialError\?CREDENTIAL_ERROR:PENDING/);
    assert.doesNotMatch(fail, /DELETE/);
    assert.match(fail, /Math\.min\(60L\*60L\*1000L/);
});

test('15 HTTP 200 con fallo funcional no confirma', () => {
    assert.equal(unwrapAsmx(functionalError).EXITO, false);
    assert.match(uploader, /if\(!response\.optBoolean\("EXITO",false\)\)/);
});

test('16 respuesta inválida no confirma', () => {
    assert.throws(() => unwrapAsmx({ d: [] }), /RESPUESTA_INVALIDA/);
    assert.match(uploader, /ACK_INVALIDO|RESPUESTA_INVALIDA/);
});

test('17 credencial inválida retiene la posición en ERROR_CREDENCIAL', () => {
    assert.match(uploader, /CREDENCIAL_REVOCADA/);
    assert.match(store, /ERROR_CREDENCIAL/);
    assert.doesNotMatch(store.slice(store.indexOf('synchronized void fail'), store.indexOf('synchronized void releaseUnacknowledged')), /DELETE/);
});

test('18 captura offline no consulta conectividad antes del commit', () => {
    const capture = store.slice(store.indexOf('synchronized int capture'), store.indexOf('synchronized UploadBatch'));
    assert.doesNotMatch(capture, /Connectivity|Network/);
});

test('19 recuperación de red solicita drenaje', () => {
    assert.match(service, /onAvailable.*uploader\.drain\("red_disponible"\)/s);
});

test('19b captura y uploader están desacoplados con lotes cada cinco segundos', () => {
    const callback = service.slice(service.indexOf('public void onLocationChanged'), service.indexOf('public void onProviderDisabled'));
    assert.match(service, /UPLOAD_INTERVAL_MS = 5000L/);
    assert.match(service, /handler\.postDelayed\(periodicDrain, UPLOAD_INTERVAL_MS\)/);
    assert.match(service, /handler\.postDelayed\(this, UPLOAD_INTERVAL_MS\)/);
    assert.doesNotMatch(callback, /uploader\.drain/);
    assert.match(callback, /store\.capture\(location\)/);
});

test('19c cada drenaje usa un corte estable y se detiene tras un lote fallido', () => {
    assert.match(uploader, /long drainCutoffMs=System\.currentTimeMillis\(\)/);
    assert.match(uploader, /store\.claimBatch\(drainCutoffMs\)/);
    assert.match(uploader, /if\(!upload\(batch\)\) break/);
    assert.match(store, /claimBatch\(long createdBeforeOrAtMs\)/);
    assert.match(store, /o\.created_ms<=\?/);
    assert.match(store, /created_ms<=\?/);
});

test('20 logout no finaliza ni detiene el seguimiento', () => {
    const logout = principal.slice(principal.indexOf('function logout()'), principal.indexOf('async function ok_login'));
    assert.doesNotMatch(logout, /finalizarSeguimientoNativo|TrackingForegroundService|detenerProgramadorEnvioSeguimiento/);
});

test('21 finalizar una guía usa su ID y no cambia otras', () => {
    assert.match(store, /tracking_id=\? AND status<>'FINAL'/);
    assert.doesNotMatch(store.slice(store.indexOf('synchronized void finalizeTracking'), store.indexOf('synchronized int importLegacy')), /UPDATE active_tracking SET status='FINALIZANDO'(?!.*tracking_id)/s);
});

test('22 sin guías ni pendientes el servicio se detiene', () => {
    assert.match(service, /active=false work=false/);
    assert.match(service, /stopSelf\(\)/);
});

test('23 boot con seguimiento activo inicia el servicio', () => {
    assert.match(boot, /store\.hasActive\(\) \|\| store\.hasWork\(\)/);
    assert.match(boot, /SERVICE_START_AWAITING_POLICY_OVERRIDE/);
    assert.match(pluginXml, /android\.intent\.action\.BOOT_COMPLETED/);
});

test('24 boot con pendientes usa la misma recuperación durable', () => {
    assert.match(store, /hasWork\(\).*active_tracking.*position_outbox/s);
    assert.match(boot, /TrackingForegroundService\.start/);
});

test('25 migración legacy es idempotente', () => {
    assert.match(store, /CONFLICT_IGNORE/);
    assert.match(bootstrap, /importarPosicionesLegacy/);
});

test('26 migración conserva UUID_POSICION', () => {
    assert.match(store, /String positionId = uuid\(p, "UUID_POSICION"\)/);
    assert.match(store, /outboxValues\(positionId, captureId/);
    assert.match(store, /uuidsFaltantes/);
});

test('27 migración conserva y cifra credenciales activas antes de posiciones', () => {
    assert.ok(bootstrap.indexOf('sincronizarSeguimientos(credenciales)') < bootstrap.indexOf('importarPosicionesLegacy'));
    assert.match(store, /cipher\.encrypt\(token\)/);
});

test('28 token no aparece en eventos o llamadas Log', () => {
    const logLines = nativeSources.split(/\r?\n/).filter((line) => /Log\./.test(line));
    assert.equal(logLines.some((line) => /token/i.test(line)), false);
    assert.doesNotMatch(store, /event\([^\n]*token/i);
});

test('29 implementación browser expone toda la API sin romper build', () => {
    for (const action of ['configurar','sincronizarSeguimientos','registrarSeguimiento','finalizarSeguimiento','obtenerEstado','obtenerEstadisticas','solicitarDrenaje','importarPosicionesLegacy','verificarMigracion','detenerSiCorresponde','obtenerDiagnosticoPolitica','configurarModoPolitica','continuarInicioConAdvertencia','abrirConfiguracionPolitica','getPowerPolicyStatus','openPowerRestrictionSettings','requestBatteryOptimizationExemption','recheckPowerPolicy','presentPowerRemediation','prepararAuditoriaLogin','confirmarAuditoriaLoginOnline','registrarAuditoriaLogin','auditarConfiguracion','solicitarDrenajeAuditoria','descartarAuditoria','obtenerEstadoAuditoria','obtenerCredencialInstalacion','suscribirEstadoSalud']) {
        assert.match(browser, new RegExp(action + ':'));
        assert.match(bridge, new RegExp(action + ':'));
    }
});

test('30 seguimiento no invoca el identificador de acción prohibido', () => {
    const forbidden = 'acción' + ' ' + String(30 + 3);
    assert.equal([nativeSources, facade, bootstrap].join('\n').includes(forbidden), false);
});

test('31 runtime no llama plugins anteriores', () => {
    const oldGlobal = 'Background' + 'Geolocation';
    const oldPackage = 'cordova-' + 'background-geolocation-plugin';
    const oldMode = 'advanced-' + 'background-mode';
    assert.equal([facade, bootstrap, principal, nativeSources, pluginXml].join('\n').includes(oldGlobal), false);
    assert.equal(read('package.json').includes(oldPackage), false);
    assert.equal(read('package.json').includes(oldMode), false);
});

test('32 manifiesto declara un único servicio foreground de location', () => {
    assert.equal((pluginXml.match(/android:foregroundServiceType="location"/g) || []).length, 1);
    assert.match(pluginXml, /android:foregroundServiceType="location"/);
    assert.equal((nativeSources.match(/class TrackingForegroundService/g) || []).length, 1);
});

test('33 no existe watchdog destructivo de treinta segundos', () => {
    assert.doesNotMatch(nativeSources, /killProcess|System\.exit|Runtime\.getRuntime\(\)\.exit/);
    assert.doesNotMatch(service, /sin_ubicacion|watchdog/i);
});

test('34 el inspector separa restricción, allowlist, bucket, permisos y foreground', () => {
    for (const field of ['backgroundRestricted','ignoringBatteryOptimizations','standbyBucket','fineLocation','backgroundLocation','postNotifications','foregroundObserved','lastCallbackUtc']) {
        assert.match(inspector, new RegExp('"' + field + '"'));
    }
});

test('35 DTO de política contiene decisión y enforcement simultáneamente', () => {
    for (const field of ['normalTrackingAllowed','wouldBlockInEnforceMode','blockers','warnings','userOverrideUsed']) {
        assert.match(inspector, new RegExp('"' + field + '"'));
    }
    assert.match(inspector, /result\.put\("decision", decision\)/);
    assert.match(inspector, /result\.put\("enforcement", enforcement\)/);
});

test('36 WARN es el modo persistente inicial y exige continuación explícita', () => {
    assert.match(store, /policy_mode TEXT NOT NULL DEFAULT 'WARN'/);
    assert.match(inspector, /return WARN/);
    assert.match(plugin, /SERVICE_START_AWAITING_POLICY_OVERRIDE/);
    assert.match(plugin, /TRACKING_STARTED_WITH_POLICY_WARNING/);
});

test('37 ENFORCE bloquea y OBSERVE permite sin alterar el diagnóstico', () => {
    assert.match(plugin, /"ENFORCE"\.equals\(mode\).*blockers/s);
    assert.match(plugin, /SERVICE_START_BLOCKED_POLICY/);
    assert.match(inspector, /enforcementMode == EnforcementMode\.OBSERVE/);
    assert.match(inspector, /if \(wouldBlockInEnforceMode\) diagnosticMode = "BLOCKED"/);
});

test('38 monitor de salud solo observa y nunca re-promueve el servicio', () => {
    assert.match(healthMonitor, /FGS_OBSERVED_LOST/);
    assert.match(healthMonitor, /LOCATION_CALLBACK_STALE/);
    assert.doesNotMatch(healthMonitor, /startForeground|TrackingForegroundService\.start|setPolicyMode/);
});

test('39 servicio registra el callback real antes de persistir la captura', () => {
    const changed = service.slice(service.indexOf('onLocationChanged'), service.indexOf('onProviderDisabled'));
    assert.ok(changed.indexOf('recordLocationCallback') < changed.indexOf('store.capture'));
});

test('40 instrumentacion GPS cubre captura, ciclo, HTTP, ACK y backoff', () => {
    for (const event of [
        'GPS_REQUEST_UPDATES', 'GPS_CAPTURE', 'GPS_DB_COMMIT', 'GPS_OUTBOX_CREATED',
        'GPS_PENDING_COUNT',
        'GPS_DRAIN_TICK', 'GPS_DRAIN_BEGIN', 'GPS_DRAIN_SKIPPED',
        'GPS_BATCH_SELECTED', 'GPS_HTTP_BEGIN', 'GPS_HTTP_RESULT', 'GPS_ACK',
        'GPS_REJECTED', 'GPS_BACKOFF', 'GPS_DRAIN_END'
    ]) assert.match(nativeSources, new RegExp(event));
    assert.match(uploader, /errorCode\(e\)/);
    assert.match(uploader, /HTTP_"\+status/);
});

test('41 cambio de URL y NetworkCallback adelantan pendientes sin eliminarlos', () => {
    assert.match(store, /!previousBase\.equals\(base\)[\s\S]*expeditePending\("url_changed"\)/);
    assert.match(service, /onAvailable[\s\S]*expeditePending\("network_available"\)[\s\S]*drain\("red_disponible"\)/);
    const expedite = store.slice(store.indexOf('void expeditePending'), store.indexOf('private int currentMigrationFlag'));
    assert.match(expedite, /state='PENDIENTE'/);
    assert.doesNotMatch(expedite, /delete\(/);
});
