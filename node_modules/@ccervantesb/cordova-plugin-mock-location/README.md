# cordova-plugin-mock-location

[![npm](https://img.shields.io/github/package-json/v/cesarcervantesb/cordova-plugin-mock-location
)](https://github.com/cesarcervantesb/cordova-plugin-mock-location/)
![License](https://img.shields.io/github/license/cesarcervantesb/cordova-plugin-mock-location?color=orange)

This plugin allows checking the status from your current device location and detect if it is a spoof location.

## Installation

Install plugin from npm:

```
npm i @ccervantesb/cordova-plugin-mock-location
```

Or install the latest master version from GitHub:

```
cordova plugin add https://github.com/cesarcervantesb/cordova-plugin-mock-location
```

## Supported Platforms

- Android
- iOS

## Usage

The plugin creates the object `cordova.plugins.mockLocation` and is accessible after the deviceready event has been fired.

```js
document.addEventListener('deviceready', function () {
    // cordova.plugins.mockLocation is now available
}, false);
```

## Available methods

- async `checkMockLocation` - check if current location is mock.

This function can receive one param `getInfo` by default is `false`
If it's `true`. Return two additional objects with related information about the real location and mock location.

```js
mockLocation.checkMockLocation(false);
```

OR

```js
cordova.plugins.mockLocation(true);
```

Returns a JSON Object:

- `isMockLocation`

If send param `getInfo` as true and the current location was detected as mock. Returns in same JSON Object two additionals `gpsLocation` and `mockLocation`. 
With the next attributes:

- `Latittude`
- `Longitude`
- `Accuracy`
- `Altitude`
- `Provider`

## Examples

```js
cordova.plugins.mockLocation().then( (location) => {
    // Success callback
    console.log("isMockLocation: " + location.isMockLocation);
}).catch( (error) => {
    // Error callback
    console.log("Error: " + error.message);
});
```

```js
const pluginResult = await mockLocation.checkMockLocation(true);
if (pluginResult.error) {
    console.log("Error: " + pluginResult.message);
}
else {
    console.log("isMockLocation: " + pluginResult.isMockLocation);
}
```