package io.gestionasi.gdefds;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.provider.DocumentsContract;
import androidx.documentfile.provider.DocumentFile;
import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Logger;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.PluginMethod;

@CapacitorPlugin(name = "StorageAccess")
public class StorageAccessPlugin extends Plugin {

    @ActivityCallback  // <-- QUITA el duplicado @
    private void pickFolderCallback(PluginCall call, ActivityResult result) {
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null) {
            call.reject("Selección cancelada.");
            return;
        }

        Intent data = result.getData();
        Uri treeUri = data.getData();
        if (treeUri == null) {
            call.reject("No se recibió la carpeta.");
            return;
        }

        // Persistir permisos
        try {
            int flags = Intent.FLAG_GRANT_READ_URI_PERMISSION |
                    Intent.FLAG_GRANT_WRITE_URI_PERMISSION;
            getContext().getContentResolver().takePersistableUriPermission(treeUri, flags);
        } catch (Exception e) {
            Logger.warn("StorageAccess", "No se pudo persistir permiso: " + e.getMessage());
        }

        // Generar displayPath
        String displayPath;
        try {
            String docId = DocumentsContract.getTreeDocumentId(treeUri);
            displayPath = docId.replace("primary:", "").replace(":", "/");
        } catch (Exception e) {
            displayPath = "Carpeta seleccionada";
        }

        JSObject ret = new JSObject();
        ret.put("treeUri", treeUri.toString());
        ret.put("displayPath", displayPath);

        call.resolve(ret);
    }

    @PluginMethod
    public void pickFolder(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
        intent.addFlags(
                Intent.FLAG_GRANT_READ_URI_PERMISSION |
                        Intent.FLAG_GRANT_WRITE_URI_PERMISSION |
                        Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION |
                        Intent.FLAG_GRANT_PREFIX_URI_PERMISSION
        );

        startActivityForResult(call, intent, "pickFolderCallback");
    }

    @PluginMethod
    public void listJson(PluginCall call) {
        String treeUriStr = call.getString("treeUri");
        if (treeUriStr == null || treeUriStr.isEmpty()) {
            call.reject("treeUri es requerido.");
            return;
        }

        Uri treeUri = Uri.parse(treeUriStr);
        DocumentFile root = DocumentFile.fromTreeUri(getContext(), treeUri);

        if (root == null || !root.isDirectory()) {
            call.reject("No se pudo acceder a la carpeta.");
            return;
        }

        JSArray out = new JSArray();

        for (DocumentFile f : root.listFiles()) {
            if (f.isFile() && f.getName() != null && f.getName().toLowerCase().endsWith(".json")) {
                JSObject o = new JSObject();
                o.put("name", f.getName());
                o.put("uri", f.getUri().toString());
                o.put("size", f.length());
                o.put("lastModified", f.lastModified());
                out.put(o);
            }
        }

        JSObject ret = new JSObject();
        ret.put("files", out);
        call.resolve(ret);
    }
}
