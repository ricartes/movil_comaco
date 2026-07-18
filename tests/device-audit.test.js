const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const java = 'plugins-local/cordova-plugin-comaco-tracking/src/android/';
const store = read(java + 'DeviceAuditStore.java');
const uploader = read(java + 'DeviceAuditUploader.java');
const coordinator = read(java + 'DeviceAuditCoordinator.java');
const canonical = read(java + 'DeviceAuditCanonicalizer.java');
const inspector = read(java + 'PowerPolicyInspector.java');
const plugin = read(java + 'ComacoTrackingPlugin.java');
const pluginXml = read('plugins-local/cordova-plugin-comaco-tracking/plugin.xml');
const webservices = read('www/js/WebServices.js');
const gpsTracking = read('www/js/Helper/gpsTracking.js');
const principal = read('www/js/Vistas/Principal.js');
const tables = read('www/js/Datos/Tablas.js');
const schemaVersions = read('www/js/Datos/migraciones/Versiones.js');

test('auditoría usa base y uploader separados del GPS', () => {
    assert.match(store, /comaco_device_audit\.db/);
    assert.match(store, /audit_outbox/);
    assert.doesNotMatch(uploader, /TrackingUploader|TrackingStore|position_outbox/);
    assert.match(uploader, /Executors\.newSingleThreadExecutor/);
    assert.match(uploader, /AtomicBoolean/);
});

test('cada LOGIN se inserta sin latest-wins', () => {
    const login = store.slice(store.indexOf('enqueueLogin'), store.indexOf('enqueueConfiguration'));
    assert.match(login, /insertEvent/);
    assert.doesNotMatch(login, /delete\("audit_outbox"/);
    assert.match(store, /UUID\.randomUUID\(\)/);
});

test('latest-wins solo elimina CONFIGURACION pendiente', () => {
    assert.match(store, /event_type='CONFIGURACION' AND state='PENDIENTE'/);
    assert.doesNotMatch(store, /event_type='LOGIN'.*delete/s);
});

test('instalación vive en no-backup y una restauración vieja se invalida', () => {
    assert.match(store, /getNoBackupFilesDir\(\)/);
    assert.match(store, /comaco_installation_id/);
    assert.match(store, /if \(!expected\.equals\(current\)\)/);
    assert.match(store, /putNull\("token_cipher"\)/);
});

test('token de instalación se cifra con alias independiente', () => {
    assert.match(store, /comaco_device_audit_token_v1/);
    assert.match(store, /cipher\.encrypt/);
    assert.doesNotMatch(store, /token TEXT|token_clear/);
    const sources = [store, uploader, coordinator].join('\n');
    const logCalls = sources.match(/(?:Log\.[a-z]+|logEvent)\([\s\S]*?\);/g) || [];
    for (const call of logCalls) {
        assert.doesNotMatch(call, /batch\.token|token_cipher|token_iv|TOKEN_INSTALACION/);
    }
});

test('lotes mantienen orden cronológico y máximo 50', () => {
    assert.match(store, /ORDER BY created_ms,id_event LIMIT 50/);
    assert.match(uploader, /ID_EVENTOS_ACEPTADOS/);
    assert.match(uploader, /ID_EVENTOS_DUPLICADOS/);
    assert.match(store, /if \(!accepted\.contains\(event\.id\)\)/);
});

test('identidad de instalacion se reutiliza sin acoplar los uploaders', () => {
    const trackingUploader = read(java + 'TrackingUploader.java');
    assert.match(store, /InstallationCredential/);
    assert.match(store, /cipher\.decrypt/);
    assert.match(trackingUploader, /ID_INSTALACION/);
    assert.match(trackingUploader, /TOKEN_INSTALACION/);
    assert.match(trackingUploader, /credential\.clear\(\)/);
    assert.doesNotMatch(trackingUploader, /DeviceAuditUploader|audit_outbox/);
    assert.match(webservices, /Recibe_Guia_V3/);
    assert.match(webservices, /obtenerCredencialInstalacion/);
    assert.match(webservices, /idUsuario: idUsuario/);
    assert.match(webservices, /credencial\.TOKEN_INSTALACION = null/);
});

test('JobScheduler recupera el outbox con red sin usar el servicio GPS', () => {
    const job = read(java + 'DeviceAuditJobService.java');
    assert.match(job, /NETWORK_TYPE_ANY/);
    assert.match(job, /setPersisted\(true\)/);
    assert.match(job, /setPeriodic\(DAILY_INTERVAL_MS\)/);
    assert.match(job, /reporte_24h/);
    assert.doesNotMatch(job, /TrackingForegroundService/);
    assert.match(pluginXml, /DeviceAuditJobService/);
});

test('snapshot contiene campos Android, energía, red y canal FGS', () => {
    for (const field of [
        'securityPatch', 'packageName', 'versionCode', 'targetSdkVersion',
        'foregroundServiceLocation', 'gpsProviderEnabled', 'networkProviderEnabled',
        'precisionMode', 'powerSaveMode', 'lowPowerStandby', 'dataSaver',
        'applicationEnabled', 'foregroundServiceChannel'
    ]) assert.match(inspector, new RegExp('"' + field + '"'));
    assert.match(inspector, /API_NO_DISPONIBLE/);
});

test('hash canónico excluye campos volátiles', () => {
    assert.match(canonical, /TreeSet/);
    assert.match(canonical, /capturedAtUtc/);
    assert.match(canonical, /SHA-256/);
});

test('login V2 no pone token en logs y conserva fallback', () => {
    assert.match(webservices, /Login_Proveedor_V2/);
    assert.match(webservices, /AUDITORIA_confirmarLoginOnline/);
    assert.match(webservices, /login_web_legacy/);
    assert.doesNotMatch(webservices, /console\.[a-z]+\([^\n]*TOKEN_INSTALACION/i);
});

test('login local genera auditoría sin bloquear el cierre de sesión', () => {
    assert.match(principal, /AUDITORIA_registrarLoginLocal/);
    assert.match(principal, /tipo_login_auditoria = "OFFLINE"/);
    assert.match(principal, /\.catch\(function \(\) \{\}\)/);
});

test('SQLite funcional migra ID de usuario servidor sin borrar datos', () => {
    assert.doesNotMatch(tables, /ALTER TABLE USUARIO ADD COLUMN USU_ID_SERVIDOR/);
    assert.match(schemaVersions, /var version9Esquema/);
    assert.match(schemaVersions, /ALTER TABLE USUARIO ADD COLUMN USU_ID_SERVIDOR INTEGER/);
    assert.doesNotMatch(tables, /DROP TABLE USUARIO/);
});

test('fallas de auditoría no escriben el health de tracking', () => {
    assert.match(plugin, /if \(!isAuditAction\(action\)\)/);
    const run = plugin.indexOf('private void run');
    const configure = plugin.slice(plugin.indexOf('case "configurar"', run), plugin.indexOf('case "sincronizarSeguimientos"', run));
    assert.match(configure, /try \{/);
    assert.match(configure, /catch \(Exception exception\)/);
    assert.match(configure, /AUDIT_BACKOFF/);
    assert.doesNotMatch(uploader, /DEGRADED|TrackingHealthMonitor|position_outbox/);
});

test('URL compilada vigente reemplaza SQLite obsoleto y puede reconfigurarse', () => {
    const compiled = gpsTracking.indexOf('typeof url_server_nuevo');
    const persisted = gpsTracking.indexOf('result && result.PAG_VALOR');
    assert.ok(compiled >= 0 && compiled < persisted);
    assert.match(gpsTracking, /SEGUIMIENTO_configuracionNativaUrl === urlNormalizada/);
    assert.match(gpsTracking, /SEGUIMIENTO_configuracionNativaUrl = urlNormalizada/);
    assert.match(gpsTracking, /AUDITORIA_solicitarDrenaje[\s\S]*configurarSeguimientoNativo\(\)/);
});

test('instrumentacion conserva codigo HTTP sin registrar credenciales', () => {
    assert.match(uploader, /AUDIT_HTTP_RESULT/);
    assert.match(uploader, /AUDIT_DRAIN_END/);
    assert.match(uploader, /errorCode\(exception\)/);
    assert.doesNotMatch(uploader, /logEvent\([^;]*(?:batch\.token|Authorization)/);
});

test('cambio de URL y recuperacion de red adelantan sin borrar auditorias', () => {
    assert.match(store, /!previousBase\.equals\(baseUrl\)[\s\S]*expeditePending\("url_changed"\)/);
    assert.match(coordinator, /"conexion_recuperada"\.equals\(reason\)[\s\S]*expeditePending\("network_available"\)/);
    const expedite = store.slice(store.indexOf('void expeditePending'), store.indexOf('synchronized void saveSnapshot'));
    assert.match(expedite, /state='PENDIENTE'/);
    assert.doesNotMatch(expedite, /delete\(/);
    const job = read(java + 'DeviceAuditJobService.java');
    assert.match(job, /JOB_ID_RECOVERY[\s\S]*expeditePending\("job_network"\)/);
    const finished = job.slice(job.indexOf('uploader = new DeviceAuditUploader'), job.indexOf('public boolean onStopJob'));
    assert.doesNotMatch(finished, /schedule\(getApplicationContext\(\)\)/);
    assert.match(finished, /jobFinished\(params,[\s\S]*retryable\)/);
});
