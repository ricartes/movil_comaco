import { Filesystem, Directory } from "@capacitor/filesystem";

// Ajusta: tu carpeta real dentro del sandbox de la app
const DEFAULT_FOLDER = "forestruck";

export async function listForestruckJsonFiles(folderPath = DEFAULT_FOLDER) {
    const res = await Filesystem.readdir({
        path: folderPath,
        directory: Directory.Data,
    });

    const files = (res.files || [])
        .filter((f) => (f?.name || "").toLowerCase().endsWith(".json"))
        .map((f) => ({
            name: f.name,
            path: `${folderPath}/${f.name}`,
            size: f.size || 0,
            mtime: f.mtime || 0,
            uri: f.uri,
        }));

    files.sort((a, b) => (b.mtime || 0) - (a.mtime || 0));
    return files;
}

export async function readForestruckFileText(filePath) {
    const res = await Filesystem.readFile({
        path: filePath,
        directory: Directory.Data,
        encoding: "utf8",
    });
    return res.data;
}

// fileKey simple (rápido). Si quieres “perfecto”: hash del contenido.
export function buildFileKey(file) {
    return `${file.name}|${file.size || 0}|${file.mtime || 0}`;
}
