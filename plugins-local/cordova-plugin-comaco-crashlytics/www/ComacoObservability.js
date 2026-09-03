'use strict';

var exec = require('cordova/exec');
var pending = [];
var ready = false;
var MAX_PENDING = 32;
var ALLOWED_KEYS = {
    startup_phase: true,
    lifecycle: true,
    tracking_sqlite_ready: true,
    tracking_location_permission: true,
    tracking_background_permission: true,
    tracking_notifications_permission: true,
    gps_enabled: true,
    tracking_service_running: true,
    tracking_work_pending: true
};

function nativeCall(action, args) {
    return new Promise(function (resolve, reject) {
        exec(resolve, reject, 'ComacoCrashlytics', action, args || []);
    });
}

function safeToken(value, maxLength) {
    var normalized = String(value == null ? '' : value)
        .replace(/[\r\n\t]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    return normalized.substring(0, maxLength || 128);
}

function safeStack(error) {
    if (!error || !error.stack) return '';
    var lines = String(error.stack).split('\n');
    if (lines.length > 1) lines.shift();
    return lines.slice(0, 10).join(' | ').substring(0, 1800);
}

function queue(item) {
    pending.push(item);
    if (pending.length > MAX_PENDING) pending.shift();
}

function dispatch(item) {
    if (!ready) {
        queue(item);
        return Promise.resolve(false);
    }
    return nativeCall(item.action, item.args).then(function () {
        return true;
    }).catch(function () {
        return false;
    });
}

function flush() {
    var items = pending.slice();
    pending = [];
    items.forEach(dispatch);
}

function log(eventName) {
    return dispatch({ action: 'log', args: ['COMACO_' + safeToken(eventName, 180)] });
}

function markStartupPhase(phase) {
    var value = safeToken(phase, 64);
    setDiagnosticKey('startup_phase', value);
    return log('STARTUP_' + value);
}

function setDiagnosticKey(key, value) {
    var safeKey = safeToken(key, 64);
    if (!ALLOWED_KEYS[safeKey]) {
        return Promise.resolve(false);
    }
    return dispatch({ action: 'setKey', args: [safeKey, safeToken(value, 96)] });
}

function recordError(code, error) {
    return dispatch({
        action: 'recordError',
        args: [safeToken(code || 'JS_NON_FATAL', 96), safeStack(error)]
    });
}

function testCrash() {
    return nativeCall('testCrash', []);
}

function initialize() {
    ready = true;
    flush();
    markStartupPhase('device_ready');
    setDiagnosticKey('lifecycle', 'foreground');
}

window.addEventListener('error', function (event) {
    recordError('JS_WINDOW_ERROR', event && event.error);
});

window.addEventListener('unhandledrejection', function (event) {
    recordError('JS_UNHANDLED_REJECTION', event && event.reason);
});

document.addEventListener('deviceready', initialize, false);
document.addEventListener('pause', function () {
    setDiagnosticKey('lifecycle', 'background');
    log('LIFECYCLE_PAUSE');
}, false);
document.addEventListener('resume', function () {
    setDiagnosticKey('lifecycle', 'foreground');
    log('LIFECYCLE_RESUME');
}, false);

var api = {
    isReady: function () { return nativeCall('isReady', []); },
    log: log,
    markStartupPhase: markStartupPhase,
    setDiagnosticKey: setDiagnosticKey,
    recordError: recordError,
    testCrash: testCrash
};

window.COMACO_OBS = api;
module.exports = api;
