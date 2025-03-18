package com.ccervantesb.mocklocation;

import android.Manifest;
import android.annotation.SuppressLint;
import android.content.Context;
import android.content.pm.PackageManager;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Build;
import android.util.Log;

import androidx.annotation.NonNull;

import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.CallbackContext;

import org.apache.cordova.PluginResult;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.List;
import java.util.function.Consumer;

/**
 * This class echoes a string called from JavaScript.
 */
public class PluginMockLocation extends CordovaPlugin {

    private static final int REQUEST_LOCATION_PERMISSION = 1;
    private CallbackContext callbackContext;
    private boolean getInfoFromLocation = false;
    private JSONObject resultJSON;

    @Override
    public boolean execute(String action, JSONArray args, CallbackContext callbackContext) throws JSONException {
        this.callbackContext = callbackContext;
        if(!args.isNull(0)) {
            this.getInfoFromLocation = args.getBoolean(0);
        }
        if (action.equals("checkMockLocation")) {
            this.checkMockLocation(callbackContext);
            return true;
        }
        return false;
    }

    private void checkMockLocation(CallbackContext callbackContext) {
        if (this.checkLocationPermissions()) {
            detectMockLocation(callbackContext);
        } else {
            cordova.requestPermission(this, REQUEST_LOCATION_PERMISSION, Manifest.permission.ACCESS_FINE_LOCATION);
        }
    }

    @SuppressLint("MissingPermission")
    private void detectMockLocation(CallbackContext callbackContext) {
        this.resultJSON = new JSONObject();

        LocationManager locationManager = (LocationManager) cordova.getActivity().getSystemService(Context.LOCATION_SERVICE);

        if (locationManager == null) {
            handleError(this.resultJSON, "LOCATION_MANAGER_NOT_FOUND", "\"LocationManager\" not found.", callbackContext);
        } else {
            Location location = null;
            String usedProvider = "";
            List<String> providers = locationManager.getProviders(true);

            for (String provider : providers) {
                Location locationFromProvider = locationManager.getLastKnownLocation(provider);

                if (locationFromProvider != null
                        && (location == null || locationFromProvider.getAccuracy() < location.getAccuracy())) {
                    location = locationFromProvider;
                    usedProvider = provider;
                }
            }

            if (location != null) {
                boolean isMockLocation = (Build.VERSION.SDK_INT < 31) ? location.isFromMockProvider() : location.isMock();
                try {
                    this.resultJSON.put("isMockLocation", isMockLocation);
                    Log.d("DetectMockLocation", "Used location provider is: " + usedProvider);
                    if(this.getInfoFromLocation && isMockLocation) {
                        JSONObject mockLocation = getLocationInfo(location);
                        this.resultJSON.put("mockLocation", mockLocation);
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                            locationManager.getCurrentLocation(LocationManager.GPS_PROVIDER, null, cordova.getActivity().getMainExecutor(), new Consumer<Location>() {
                                @Override
                                public void accept(Location location) {
                                    try {
                                        JSONObject gpsLocation = getLocationInfo(location);
                                        resultJSON.put("gpsLocation", gpsLocation);
                                        PluginResult result = new PluginResult(PluginResult.Status.OK, resultJSON);
                                        callbackContext.sendPluginResult(result);
                                    } catch (Exception e) {
                                        e.printStackTrace();
                                    }
                                }
                            });
                        } else {
                            LocationListener listener = new LocationListener() {
                                @Override
                                public void onLocationChanged(@NonNull Location location) {
                                    try {
                                        JSONObject gpsLocation = getLocationInfo(location);
                                        resultJSON.put("gpsLocation", gpsLocation);
                                        PluginResult result = new PluginResult(PluginResult.Status.OK, resultJSON);
                                        callbackContext.sendPluginResult(result);
                                    } catch (Exception e) {
                                        e.printStackTrace();
                                    }
                                }
                            };
                            locationManager.requestSingleUpdate(LocationManager.GPS_PROVIDER, listener, cordova.getActivity().getMainLooper());
                        }
                    }
                    else {
                        PluginResult result = new PluginResult(PluginResult.Status.OK, this.resultJSON);
                        callbackContext.sendPluginResult(result);
                    }
                } catch (JSONException e) {
                    e.printStackTrace();
                }
            } else {
                handleError(this.resultJSON, "LOCATION_NOT_FOUND", "\"Location\" object not found.", callbackContext);
            }
        }
    }

    private boolean checkLocationPermissions() {
        return cordova.hasPermission(Manifest.permission.ACCESS_FINE_LOCATION) || cordova.hasPermission(Manifest.permission.ACCESS_COARSE_LOCATION);
    }

    @Override
    public void onRequestPermissionResult(int requestCode, String[] permissions, int[] grantResults) throws JSONException {
        super.onRequestPermissionResult(requestCode, permissions, grantResults);
        if (requestCode == REQUEST_LOCATION_PERMISSION) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                detectMockLocation(callbackContext);
            } else {
                handleError(new JSONObject(), "PERMISSION_DENIED", "Location permission denied.", callbackContext);
            }
        }
    }

    private void handleError(JSONObject resultJSON, String code, String message, CallbackContext callbackContext) {
        try {
            JSONObject error = new JSONObject();
            error.put("code", code);
            error.put("message", message);
            resultJSON.put("isMockLocation", "");
            resultJSON.put("error", error);
            PluginResult result = new PluginResult(PluginResult.Status.ERROR, resultJSON);
            callbackContext.sendPluginResult(result);
        } catch (JSONException e) {
            Log.e("PluginMockLocation", "Error creating JSON Object", e);
        }
    }

    private JSONObject getLocationInfo(Location location) {
        JSONObject result = new JSONObject();
        try {
            result.put("latitude", location.getLatitude());
            result.put("longitude", location.getLongitude());
            result.put("accuracy", location.getAccuracy());
            result.put("altitude", location.getAltitude());
            result.put("provider", location.getProvider());
        }
        catch (JSONException e) {
            Log.e("PluginMockLocation", "Error creating JSON Object", e);
        }
        return result;
    }
}
