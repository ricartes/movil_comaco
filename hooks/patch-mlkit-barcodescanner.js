#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const androidRoot = path.join(root, "platforms", "android", "app", "src", "main");

function patchFile(filePath, replacements) {
    if (!fs.existsSync(filePath)) return;
    const original = fs.readFileSync(filePath, "utf8");
    let patched = original;
    replacements.forEach(function (replacement) {
        patched = patched.replace(replacement.from, replacement.to);
    });
    if (patched !== original) {
        fs.writeFileSync(filePath, patched, "utf8");
        console.log("Patched ML Kit barcode scanner: " + path.relative(root, filePath));
    }
}

patchFile(path.join(androidRoot, "java", "com", "mcc", "cordova", "plugins", "mlkit", "barcode", "scanner", "MLKitBarcodeScanner.java"), [
    { from: "String err = data.getStringExtra(\"err\");", to: "String err = data == null ? \"USER_CANCELLED\" : data.getStringExtra(\"err\");" },
    { from: "Log.d(\"MLKitBarcodeScanner\", \"Barcode read: \" + barcodeValue);", to: "Log.d(\"MLKitBarcodeScanner\", \"Barcode read successfully\");" }
]);

patchFile(path.join(androidRoot, "java", "com", "mcc", "cordova", "plugins", "mlkit", "barcode", "scanner", "CaptureActivity.java"), [
    { from: /final String\[\] permissions = new String\[\] \{ Manifest\.permission\.CAMERA,\s*Manifest\.permission\.WRITE_EXTERNAL_STORAGE \};/, to: "final String[] permissions = new String[] { Manifest.permission.CAMERA };" },
    { from: /\s*shouldShowPermission = shouldShowPermission\s*&& !ActivityCompat\.shouldShowRequestPermissionRationale\(this, Manifest\.permission\.WRITE_EXTERNAL_STORAGE\);/, to: "" }
]);

const manifestPath = path.join(androidRoot, "AndroidManifest.xml");

if (fs.existsSync(manifestPath)) {
    const original = fs.readFileSync(manifestPath, "utf8");
    const captureActivityPattern =
        /\s*<activity\b(?=[^>]*android:name="com\.mcc\.cordova\.plugins\.mlkit\.barcode\.scanner\.CaptureActivity")[^>]*\/>/g;
    let captureActivityEncontrada = false;

    const patched = original
        .replace(/android:label="Read Barcode"/g, 'android:label="Escanear QR"')
        .replace(captureActivityPattern, function (activity) {
            if (captureActivityEncontrada) {
                return "";
            }
            captureActivityEncontrada = true;
            return activity;
        });

    if (patched !== original) {
        fs.writeFileSync(manifestPath, patched, "utf8");
        console.log("Patched ML Kit barcode scanner: " + path.relative(root, manifestPath));
    }
}
