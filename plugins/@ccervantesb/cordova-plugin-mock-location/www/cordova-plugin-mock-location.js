var exec = require('cordova/exec');

const PLUGIN_NAME = "PluginMockLocation"

exports.checkMockLocation = function (getInfo=false) {
    var args = [getInfo];
    return new Promise((resolve, reject) => {
        exec(resolve, reject, PLUGIN_NAME, 'checkMockLocation', args);
    });
};
