'use strict';

const fs = require('fs');
const path = require('path');

const PACKAGE_ID = 'io.gestionasi.gfe_comaco';
const GOOGLE_SERVICES_VERSION = '4.4.4';
const CRASHLYTICS_GRADLE_VERSION = '3.0.7';

function includesAndroid(context) {
    const platforms = (context.opts && context.opts.platforms) || [];
    return platforms.length === 0 || platforms.includes('android');
}

function hasPackage(config) {
    const clients = Array.isArray(config.client) ? config.client : [];
    return clients.some((client) => {
        const android = client && client.client_info && client.client_info.android_client_info;
        return android && android.package_name === PACKAGE_ID;
    });
}

function injectClasspath(gradleContent, dependency) {
    if (gradleContent.includes(dependency)) {
        return gradleContent;
    }

    const dependenciesBlock = /(buildscript\s*\{[\s\S]*?dependencies\s*\{)/m;
    if (!dependenciesBlock.test(gradleContent)) {
        throw new Error('[COMACO][CRASHLYTICS] No se encontró buildscript.dependencies en platforms/android/build.gradle.');
    }

    return gradleContent.replace(dependenciesBlock, `$1\n        classpath '${dependency}'`);
}

module.exports = function afterPrepare(context) {
    if (!includesAndroid(context)) {
        return;
    }

    const projectRoot = context.opts.projectRoot;
    const firebaseSource = path.join(projectRoot, 'firebase', 'google-services.json');
    const platformRoot = path.join(projectRoot, 'platforms', 'android');
    const appRoot = path.join(platformRoot, 'app');
    const firebaseTarget = path.join(appRoot, 'google-services.json');
    const rootGradle = path.join(platformRoot, 'build.gradle');

    if (!fs.existsSync(firebaseSource)) {
        console.log('[COMACO][CRASHLYTICS] Sin firebase/google-services.json; se conserva Crashlytics desactivado.');
        return;
    }

    let config;
    try {
        config = JSON.parse(fs.readFileSync(firebaseSource, 'utf8'));
    } catch (error) {
        throw new Error('[COMACO][CRASHLYTICS] firebase/google-services.json no contiene JSON válido.');
    }

    if (!hasPackage(config)) {
        throw new Error(`[COMACO][CRASHLYTICS] google-services.json no contiene el package ${PACKAGE_ID}.`);
    }

    if (!fs.existsSync(appRoot) || !fs.existsSync(rootGradle)) {
        console.log('[COMACO][CRASHLYTICS] Plataforma Android aún no preparada; la configuración se aplicará en el próximo prepare.');
        return;
    }

    fs.copyFileSync(firebaseSource, firebaseTarget);

    let gradleContent = fs.readFileSync(rootGradle, 'utf8');
    gradleContent = injectClasspath(
        gradleContent,
        `com.google.gms:google-services:${GOOGLE_SERVICES_VERSION}`
    );
    gradleContent = injectClasspath(
        gradleContent,
        `com.google.firebase:firebase-crashlytics-gradle:${CRASHLYTICS_GRADLE_VERSION}`
    );
    fs.writeFileSync(rootGradle, gradleContent, 'utf8');

    console.log(`[COMACO][CRASHLYTICS] Configuración Firebase válida aplicada para ${PACKAGE_ID}.`);
};
