import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { FileOpener } from '@capacitor-community/file-opener'; // Usa este para Android/iOS
import pdfMake from 'pdfmake/build/pdfmake';
import 'pdfmake/build/vfs_fonts';

export async function createPdfAndOpen(definition, filename) {
    if (!Capacitor.isNativePlatform()) {
        // WEB: descargar directo
        pdfMake.createPdf(definition).download(filename);
        return;
    }

    // 1. CREAR DIRECTORIO PADRE SI NO EXISTE (solo nativo)
    try {
        await Filesystem.mkdir({
            path: 'gde',
            directory: Directory.Cache,
            recursive: true,
        });
    } catch (error) {
        // Ignorar si el directorio ya existe
    }

    // 2. GENERAR PDF EN BASE64
    const base64 = await new Promise((resolve) => {
        pdfMake.createPdf(definition).getBase64((b64) => resolve(b64));
    });

    // 3. ESCRIBIR ARCHIVO
    const { uri } = await Filesystem.writeFile({
        directory: Directory.Cache,
        path: `gde/${filename}`,
        data: base64,
    });

    // 4. ABRIR EL PDF CON FileOpener EN MÓVIL
    await FileOpener.open({
        filePath: uri,
        contentType: 'application/pdf',
        openWithDefault: true,
    });
}
