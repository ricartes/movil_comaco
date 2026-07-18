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
