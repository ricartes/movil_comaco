const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const javaDir = 'plugins-local/cordova-plugin-comaco-tracking/src/android/';
const inspector = read(javaDir + 'PowerPolicyInspector.java');
const plugin = read(javaDir + 'ComacoTrackingPlugin.java');
const boot = read(javaDir + 'TrackingBootReceiver.java');
const monitor = read(javaDir + 'TrackingHealthMonitor.java');
const store = read(javaDir + 'TrackingStore.java');
const service = read(javaDir + 'TrackingForegroundService.java');
const policyUi = read('www/js/Services/TrackingPolicyService.js');
const bootstrap = read('www/js/Services/SeguimientoBootstrap.js');
const facade = read('www/js/Helper/gpsTracking.js');
const bridge = read('plugins-local/cordova-plugin-comaco-tracking/www/ComacoTracking.js');
const pluginXml = read('plugins-local/cordova-plugin-comaco-tracking/plugin.xml');
const principal = read('www/js/Vistas/Principal.js');
const packageJson = read('package.json');

test('preflight no considera POST_NOTIFICATIONS un blocker técnico del FGS', () => {
    const blockerSection = inspector.slice(inspector.indexOf('JSONArray blockers'), inspector.indexOf('boolean normalTrackingAllowed'));
    assert.doesNotMatch(blockerSection, /blockers\.put\("POST_NOTIFICATIONS_DENIED"\)/);
    assert.match(blockerSection, /warnings\.put\("POST_NOTIFICATIONS_DENIED"\)/);
});

test('continuación WARN es explícita y queda registrada nativamente', () => {
    assert.match(policyUi, /Continuar bajo advertencia/);
    assert.match(policyUi, /continuarInicioConAdvertencia/);
    assert.match(plugin, /TRACKING_STARTED_WITH_POLICY_WARNING/);
    assert.doesNotMatch(policyUi + principal, /¿Ya desactivaste|ya lo configuré/i);
});

test('ENFORCE y boot persisten el bloqueo sin iniciar', () => {
    assert.match(plugin, /SERVICE_START_BLOCKED_POLICY/);
    assert.match(boot, /SERVICE_START_BLOCKED_POLICY/);
    assert.ok(boot.indexOf('SERVICE_START_BLOCKED_POLICY') < boot.lastIndexOf('TrackingForegroundService.start'));
});

test('el monitor no cambia el modo ni llama startForeground', () => {
    assert.doesNotMatch(monitor, /setPolicyMode|startForeground|startForegroundService/);
    assert.match(monitor, /inspector\.inspect/);
});

test('el plugin legacy de optimización ya no está declarado', () => {
    assert.doesNotMatch(packageJson, /cordova-plugin-power-optimization/);
    assert.doesNotMatch(principal, /PowerOptimization/);
});

test('registro recién creado sin callback queda WAITING_FOR_LOCATION', () => {
    assert.match(inspector, /firstFixGraceActive[\s\S]*registrationAgeMs < firstFixGraceMs/);
    assert.match(inspector, /else if \(firstFixGraceActive\) diagnosticMode = "WAITING_FOR_LOCATION"/);
});

test('callback antiguo no pertenece a una nueva generación de registro', () => {
    assert.match(store, /last_location_callback_registration_generation/);
    assert.match(inspector, /registrationGeneration\.equals\(lastCallbackGeneration\)/);
    assert.match(service, /recordLocationRegistration/);
});

test('callback actual reciente permite READY y gracia vencida produce LOCATION_STALE', () => {
    assert.match(inspector, /currentSessionCallback && callbackAgeMs > firstFixGraceMs/);
    assert.match(inspector, /if \(locationStale\) reasons\.put\("LOCATION_STALE"\)/);
    assert.match(inspector, /else diagnosticMode = "READY"/);
});

test('WARN y warnings de política no degradan por sí solos', () => {
    const health = inspector.slice(inspector.indexOf('String diagnosticMode'), inspector.indexOf('EnforcementMode enforcementMode'));
    assert.doesNotMatch(health, /warnings\.length/);
    assert.doesNotMatch(health, /EnforcementMode/);
});

test('health actual reemplaza reasons históricos y emite recuperación una vez', () => {
    assert.match(store, /current_health_reasons/);
    assert.match(store, /currentReasonsValue/);
    assert.match(store, /TRACKING_RECOVERED/);
    assert.match(store, /LOCATION_CALLBACK_RECOVERED/);
    assert.doesNotMatch(inspector, /current_health|FGS_OBSERVED_LOST|TRACKING_DEGRADED/);
});

test('foreground desconocido o carrera inicial quedan CHECKING y se reevalúan pronto', () => {
    assert.match(inspector, /FOREGROUND_OBSERVATION_UNKNOWN/);
    assert.match(inspector, /FOREGROUND_OBSERVATION_PENDING/);
    assert.match(inspector, /diagnosticMode = "CHECKING"/);
    assert.match(monitor, /"CHECKING"\.equals\(health\).*5000L/);
    assert.doesNotMatch(monitor, /startForeground|TrackingForegroundService\.start/);
});

test('primer callback publica READY y las recuperaciones al frontend', () => {
    const callback = service.slice(service.indexOf('onLocationChanged'), service.indexOf('onProviderDisabled'));
    assert.ok(callback.indexOf('recordLocationCallback') < callback.indexOf('publishCurrentHealth'));
    assert.match(plugin, /suscribirEstadoSalud/);
    assert.match(plugin, /publishHealth/);
    assert.match(policyUi, /trackingpolicychange/);
});

test('inicio y resume reemplazan estado previo por CHECKING y snapshot actual', () => {
    assert.match(policyUi, /TRACKING_POLICY_marcarChecking/);
    assert.match(policyUi, /TRACKING_POLICY_actualizarEstado\(diagnostico\)/);
    assert.match(policyUi, /if \(diagnostico\.decision\.mode === "READY"\) TRACKING_POLICY_ultimaAlerta = null/);
});

test('POWER_POLICY_DIAGNOSTIC registra todos los determinantes sin datos sensibles', () => {
    for (const field of ['backgroundRestricted','ignoringBatteryOptimizations','standbyBucket','logicalActive','serviceCreated','foregroundRequested','foregroundObserved','foregroundObservationSource','updatesRegistered','lastCallbackUtc','lastCallbackAgeMs','firstFixGraceActive','firstFixGraceRemainingMs','warnings','reasons','blockers','health']) {
        assert.match(plugin, new RegExp('"' + field + '"'));
    }
    assert.doesNotMatch(plugin.slice(plugin.indexOf('diagnosticDetail'), plugin.indexOf('static void publishHealth')), /TOKEN|LATITUD|LONGITUD|token/i);
});

test('API de remediacion expone las cuatro acciones requeridas y usa el inspector', () => {
    for (const action of ['getPowerPolicyStatus','openPowerRestrictionSettings','requestBatteryOptimizationExemption','recheckPowerPolicy']) {
        assert.match(plugin, new RegExp('case "' + action + '"'));
        assert.match(bridge, new RegExp(action + ':'));
    }
    assert.match(plugin, /inspector\.requestBatteryOptimizationExemption\(\)/);
    assert.match(plugin, /inspector\.openPowerRestrictionSettings\(\)/);
    assert.match(plugin, /result = inspect\("power_policy_recheck"/);
});

test('Settings solo se abre desde el toque explicito Configurar ahora', () => {
    const assistant = policyUi.slice(
        policyUi.indexOf('function TRACKING_POLICY_mostrarRemediacion'),
        policyUi.indexOf('async function TRACKING_POLICY_procesarResultado'));
    assert.match(assistant, /text: "Configurar ahora"[\s\S]*onClick:[\s\S]*requestBatteryOptimizationExemption/);
    assert.match(assistant, /onClick:[\s\S]*openPowerRestrictionSettings/);
    assert.doesNotMatch(bootstrap, /openPowerRestrictionSettings|requestBatteryOptimizationExemption/);
    assert.doesNotMatch(plugin.slice(0, plugin.indexOf('private void run')), /openPowerRestrictionSettings\(\)|requestBatteryOptimizationExemption\(\)/);
});

test('solicitud de exclusion usa API publica, package URI y permiso manifiesto', () => {
    assert.match(pluginXml, /android\.permission\.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS/);
    assert.match(inspector, /Settings\.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS/);
    assert.match(inspector, /Uri\.parse\("package:" \+ context\.getPackageName\(\)\)/);
    assert.ok(inspector.indexOf('isIgnoringBatteryOptimizations') < inspector.indexOf('Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS'));
    assert.match(inspector, /request\.resolveActivity\(context\.getPackageManager\(\)\)/);
});

test('exclusion ya concedida no vuelve a abrir el dialogo', () => {
    const request = inspector.slice(
        inspector.indexOf('JSONObject requestBatteryOptimizationExemption'),
        inspector.indexOf('private JSONObject openFirstResolvable'));
    assert.match(request, /isIgnoringBatteryOptimizations[\s\S]*alreadyGranted", true[\s\S]*return result/);
    assert.ok(request.indexOf('alreadyGranted", true') < request.indexOf('context.startActivity(request)'));
});

test('configuracion publica aplica orden de fallbacks y captura fallos seguros', () => {
    const settings = inspector.slice(
        inspector.indexOf('JSONObject openPowerRestrictionSettings'),
        inspector.indexOf('@SuppressWarnings'));
    const ordered = [
        'ACTION_APPLICATION_DETAILS_SETTINGS',
        'ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS',
        'ACTION_BATTERY_SAVER_SETTINGS',
        'ACTION_SETTINGS'
    ];
    for (let i = 1; i < ordered.length; i++) {
        assert.ok(settings.indexOf(ordered[i - 1]) < settings.indexOf(ordered[i]));
    }
    assert.match(settings, /resolveActivity\(packageManager\)/);
    assert.match(settings, /ActivityNotFoundException \| SecurityException/);
    assert.doesNotMatch(settings, /ComponentName|Class\.forName|reflection|motorola|xiaomi|samsung|huawei/i);
});

test('restriccion activa prioriza detalles de aplicacion', () => {
    const actions = inspector.slice(
        inspector.indexOf('JSONArray remediationActions'),
        inspector.indexOf('String remediationStep'));
    assert.match(actions, /if \(backgroundRestricted\)[\s\S]*OPEN_APPLICATION_SETTINGS/);
    assert.match(policyUi, /diagnostico\.backgroundRestricted !== true[\s\S]*requestBatteryOptimizationExemption/);
});

test('retorno desde Settings publica CHECKING y ejecuta un unico recheck', () => {
    const recheck = policyUi.slice(
        policyUi.indexOf('async function TRACKING_POLICY_revalidarRetornoSettings'),
        policyUi.indexOf('function TRACKING_POLICY_suscribir'));
    assert.match(recheck, /TRACKING_POLICY_marcarChecking\("retorno_settings"\)/);
    assert.equal((recheck.match(/recheckPowerPolicy\(/g) || []).length, 1);
    assert.match(recheck, /TRACKING_POLICY_actualizarEstado\(diagnostico\)/);
    assert.doesNotMatch(recheck, /reconciliarEstadoGpsNativo|sincronizarSeguimientos|solicitarDrenaje/);
    assert.match(bootstrap, /if \(!retornoSettings\)[\s\S]*reconciliarEstadoGpsNativo/);
});

test('presentacion reutiliza el snapshot actual sin una segunda inspeccion', () => {
    const runStart = plugin.indexOf('private void run');
    const presented = plugin.slice(
        plugin.indexOf('case "presentPowerRemediation"', runStart),
        plugin.indexOf('default:', plugin.indexOf('case "presentPowerRemediation"', runStart)));
    assert.match(presented, /args\.optJSONObject\(0\)/);
    assert.doesNotMatch(presented, /inspect\(/);
    assert.match(policyUi, /presentPowerRemediation\(diagnostico\)/);
    assert.match(bridge, /presentPowerRemediation: function \(diagnostic\) \{ return invoke\("presentPowerRemediation", diagnostic \|\| \{\}\); \}/);
});

test('recheck reemplaza estado actual y recuperacion se emite solo en transicion true a false', () => {
    assert.match(plugin, /result = inspect\("power_policy_recheck"/);
    assert.match(store, /return previous==1&&!backgroundRestricted/);
    assert.match(plugin, /POWER_RESTRICTION_RECOVERED/);
    assert.equal((plugin.match(/"POWER_RESTRICTION_RECOVERED"/g) || []).length, 1);
    assert.doesNotMatch(inspector, /current_background_restricted|last_policy_decision/);
});

test('remediacion no repromueve FGS ni altera GPS u outbox', () => {
    const remediation = plugin.slice(
        plugin.indexOf('private JSONObject performRemediationAction'),
        plugin.indexOf('private String powerEventDetail'));
    assert.doesNotMatch(inspector + remediation, /startForeground|TrackingForegroundService\.start|requestLocationUpdates|position_outbox|capture\(/);
    assert.doesNotMatch(monitor, /startForeground|TrackingForegroundService\.start/);
});

test('eventos de remediacion usan solo campos tecnicos permitidos', () => {
    for (const event of ['POWER_REMEDIATION_PRESENTED','POWER_REMEDIATION_ACTION','POWER_SETTINGS_OPENED','POWER_SETTINGS_OPEN_FAILED','POWER_POLICY_RECHECKED','POWER_RESTRICTION_RECOVERED']) {
        assert.match(plugin, new RegExp(event));
    }
    const detail = plugin.slice(plugin.indexOf('private String powerEventDetail'), plugin.indexOf('private boolean currentOverrideUsed'));
    for (const field of ['action','manufacturer','backgroundRestricted','ignoringBatteryOptimizations','health','blockers','warnings','success','errorClass']) {
        assert.match(detail, new RegExp('"' + field + '"'));
    }
    assert.doesNotMatch(detail, /latitude|longitude|token|exception\.getMessage/i);
});

test('GPS usa la politica de maximo detalle de un segundo y cero metros sin callbacks artificiales', () => {
    assert.match(facade, /INTERVALO_MS: 1000/);
    assert.match(facade, /DISTANCIA_METROS: 0/);
    assert.match(store, /optLong\("INTERVALO_MS", 1000\), 1000, 60000/);
    assert.match(store, /optDouble\("DISTANCIA_METROS", 0d\)/);
    assert.match(store, /scalarLong\("SELECT interval_ms FROM tracking_config WHERE id=1",null,1000\)/);
    assert.match(store, /return c\.moveToFirst\(\)\?c\.getFloat\(0\):0f/);
    assert.match(service, /requestLocationUpdates\([\s\S]*store\.intervalMs\(\),[\s\S]*store\.distanceM\(\)/);
    assert.match(service, /REQUEST_UPDATES[\s\S]*distanceM=" \+[\s\S]*store\.distanceM\(\)/);
    assert.doesNotMatch(service, /lastKnownLocation|new Location\(|simulate|artificial/i);
});
