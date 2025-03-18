cordova.define("verify-automatic-date-time-zone.verifyAutomaticDateTimeZone", function(require, exports, module) {

var exec = require('cordova/exec');

var PLUGIN_NAME = 'VerifyAutomaticDateTimeZone';

var VerifyAutomaticDateTimeZone = {
    isAutomaticChecked: function(callbackSuccess) {
        exec(callbackSuccess, null, PLUGIN_NAME, 'isAutomaticChecked', []);
    }
};

module.exports = VerifyAutomaticDateTimeZone;

});
