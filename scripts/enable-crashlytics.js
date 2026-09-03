'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const FIREBASE_CONFIG = path.join(PROJECT_ROOT, 'firebase', 'google-services.json');
const PACKAGE_ID = 'io.gestionasi.gfe_comaco';
const PLUGIN_ID = 'cordova-plugin-comaco-crashlytics';
const PLUGIN_PATH = './plugins-local/cordova-plugin-comaco-crashlytics';

function fail(message) {
    console.error('[COMACO][CRASHLYTICS] ' + message);
    process.exit(1);
}

if (!fs.existsSync(FIREBASE_CONFIG)) {
    fail('Falta firebase/google-services.json. Registre primero la app Android en Firebase.');
}

let config;
try {
    config = JSON.parse(fs.readFileSync(FIREBASE_CONFIG, 'utf8'));
} catch (error) {
    fail('firebase/google-services.json no contiene JSON válido.');
}

const clients = Array.isArray(config.client) ? config.client : [];
const packageOk = clients.some((client) => {
    const android = client && client.client_info && client.client_info.android_client_info;
    return android && android.package_name === PACKAGE_ID;
});

if (!packageOk) {
    fail('El archivo Firebase no corresponde a ' + PACKAGE_ID + '.');
}

const packageJsonPath = path.join(PROJECT_ROOT, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const plugins = packageJson.cordova && packageJson.cordova.plugins
    ? packageJson.cordova.plugins
    : {};

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';

function run(args) {
    const result = spawnSync(npx, args, {
        cwd: PROJECT_ROOT,
        stdio: 'inherit'
    });
    if (result.status !== 0) {
        process.exit(result.status || 1);
    }
}

if (!Object.prototype.hasOwnProperty.call(plugins, PLUGIN_ID)) {
    console.log('[COMACO][CRASHLYTICS] Instalando plugin local...');
    run(['cordova', 'plugin', 'add', PLUGIN_PATH, '--save']);
} else {
    console.log('[COMACO][CRASHLYTICS] Plugin ya registrado.');
}

console.log('[COMACO][CRASHLYTICS] Preparando Android...');
run(['cordova', 'prepare', 'android']);

console.log('[COMACO][CRASHLYTICS] Listo. Compile la APK y ejecute COMACO_OBS.testCrash() sólo en un equipo de prueba para validar el reporte.');
