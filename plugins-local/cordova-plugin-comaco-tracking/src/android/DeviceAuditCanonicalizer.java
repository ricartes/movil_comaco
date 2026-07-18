package io.gestionasi.comaco.tracking;

import org.json.JSONArray;
import org.json.JSONObject;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Iterator;
import java.util.Set;
import java.util.TreeSet;

final class DeviceAuditCanonicalizer {
    private static final Set<String> VOLATILE = new HashSet<>(Arrays.asList(
            "capturedAtUtc", "checkedAtUtc", "reason", "lastCallbackUtc",
            "lastCallbackAgeMs", "lastPersistedCallbackAgeMs", "registrationGeneration",
            "registrationStartedUtc", "registrationStartedElapsedMs", "firstFixGraceMs",
            "firstFixGraceActive", "firstFixGraceRemainingMs", "staleThresholdMs",
            "foregroundObservationGraceActive", "serviceGeneration", "serviceCreatedMs",
            "serviceDestroyedMs", "batteryPercentage", "screenOn"));

    private DeviceAuditCanonicalizer() {
    }

    static String hash(JSONObject snapshot) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        byte[] value = digest.digest(canonical(snapshot).getBytes(StandardCharsets.UTF_8));
        StringBuilder hex = new StringBuilder(value.length * 2);
        for (byte b : value) hex.append(String.format(java.util.Locale.US, "%02x", b & 0xff));
        Arrays.fill(value, (byte) 0);
        return hex.toString();
    }

    static String canonical(JSONObject snapshot) throws Exception {
        return append(snapshot);
    }

    private static String append(Object value) throws Exception {
        if (value == null || value == JSONObject.NULL) return "null";
        if (value instanceof JSONObject) {
            JSONObject object = (JSONObject) value;
            TreeSet<String> keys = new TreeSet<>();
            Iterator<String> iterator = object.keys();
            while (iterator.hasNext()) {
                String key = iterator.next();
                if (!VOLATILE.contains(key)) keys.add(key);
            }
            StringBuilder result = new StringBuilder("{");
            boolean first = true;
            for (String key : keys) {
                if (!first) result.append(',');
                first = false;
                result.append(JSONObject.quote(key)).append(':').append(append(object.get(key)));
            }
            return result.append('}').toString();
        }
        if (value instanceof JSONArray) {
            JSONArray array = (JSONArray) value;
            StringBuilder result = new StringBuilder("[");
            for (int i = 0; i < array.length(); i++) {
                if (i > 0) result.append(',');
                result.append(append(array.get(i)));
            }
            return result.append(']').toString();
        }
        if (value instanceof String) return JSONObject.quote((String) value);
        if (value instanceof Boolean) return value.toString();
        if (value instanceof Number) {
            if (value instanceof Double) {
                double number = (Double) value;
                if (Double.isNaN(number) || Double.isInfinite(number)) return "null";
            } else if (value instanceof Float) {
                float number = (Float) value;
                if (Float.isNaN(number) || Float.isInfinite(number)) return "null";
            }
            return value.toString();
        }
        return JSONObject.quote(String.valueOf(value));
    }
}
