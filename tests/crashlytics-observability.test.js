'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const pluginRoot = path.join(root, 'plugins-local', 'cordova-plugin-comaco-crashlytics');

test('plugin Crashlytics mantiene contrato Android 13/Cordova 13', () => {
    const xml = fs.readFileSync(path.join(pluginRoot, 'plugin.xml'), 'utf8');
    const gradle = fs.readFileSync(path.join(pluginRoot, 'src', 'android', 'comaco-crashlytics.gradle'), 'utf8');

    assert.match(xml, /cordova-android" version=">=13\.0\.0"/);
    assert.match(xml, /firebase-crashlytics:20\.0\.6/);
    assert.match(gradle, /google-services\.json/);
    assert.match(gradle, /com\.google\.firebase\.crashlytics/);
});

test('bridge JS sólo expone claves diagnósticas permitidas', () => {
    const source = fs.readFileSync(path.join(pluginRoot, 'www', 'ComacoObservability.js'), 'utf8');
    const allowedKeys = source.match(/var ALLOWED_KEYS = \{([\s\S]*?)\};/);

    assert.ok(allowedKeys, 'Debe existir la whitelist ALLOWED_KEYS');
    assert.doesNotMatch(
        allowedKeys[1],
        /rut|password|token|uuid|user|latitude|longitude|cliente|guia/i
    );
    assert.match(source, /JS_UNHANDLED_REJECTION/);
    assert.match(source, /JS_WINDOW_ERROR/);
});

test('hook valida package y prepara Firebase sin exponer datos del archivo', () => {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'comaco-crashlytics-'));
    const firebaseDir = path.join(temp, 'firebase');
    const androidRoot = path.join(temp, 'platforms', 'android');
    const appRoot = path.join(androidRoot, 'app');

    fs.mkdirSync(firebaseDir, { recursive: true });
    fs.mkdirSync(appRoot, { recursive: true });
    fs.writeFileSync(
        path.join(firebaseDir, 'google-services.json'),
        JSON.stringify({
            client: [{
                client_info: {
                    android_client_info: {
                        package_name: 'io.gestionasi.gfe_comaco'
                    }
                }
            }]
        })
    );
    fs.writeFileSync(
        path.join(androidRoot, 'build.gradle'),
        "buildscript {\n  repositories { google() }\n  dependencies {\n    classpath 'com.android.tools.build:gradle:8.3.0'\n  }\n}\n"
    );

    const hook = require(path.join(pluginRoot, 'hooks', 'after-prepare-android.js'));
    hook({ opts: { projectRoot: temp, platforms: ['android'] } });

    const gradle = fs.readFileSync(path.join(androidRoot, 'build.gradle'), 'utf8');
    assert.match(gradle, /com\.google\.gms:google-services:4\.4\.4/);
    assert.match(gradle, /com\.google\.firebase:firebase-crashlytics-gradle:3\.0\.7/);
    assert.ok(fs.existsSync(path.join(appRoot, 'google-services.json')));

    fs.rmSync(temp, { recursive: true, force: true });
});
