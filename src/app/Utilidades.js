import { Network } from '@capacitor/network';
import { Geolocation } from '@capacitor/geolocation';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Device } from '@capacitor/device';
import dayjs from "dayjs";



var Utilidades = {

    async buildDispositivoPayload() {
        if (!Capacitor.isNativePlatform()) {
            // Entorno web o PWA
            return {
                uid: 'web-' + Math.random().toString(36).substring(2, 10),
                modelo: null,
                fabricante: null,
                plataforma: 'web',
                versionSo: null,
                versionApp: null,
            };
        }

        try {
            const [id, info, app] = await Promise.all([
                Device.getId(),
                Device.getInfo(),
                App.getInfo(),
            ]);

            return {
                uid: id.identifier,
                modelo: info.model ?? null,
                fabricante: info.manufacturer ?? null,
                plataforma: info.platform ?? null, // 'ios' | 'android'
                versionSo: info.osVersion ?? null,
                versionApp: app.version ?? null,
            };
        } catch (e) {
            console.warn('Error obteniendo datos del dispositivo:', e);
            return {
                uid: null,
                modelo: null,
                fabricante: null,
                plataforma: null,
                versionSo: null,
                versionApp: null,
            };
        }
    },


    async obtenerVersionApp() {
        if (!Capacitor.isNativePlatform()) {
            // opcional: si quieres solo Android nativo:
            // return null;
            return null;
        }

        try {
            const info = await App.getInfo();
            return info?.version ?? null;
        } catch (e) {
            // En caso de que algún dispositivo/ROM no lo implemente bien
            return null;
        }

    },

    fechaHoraActual() {

        return dayjs().format("YYYY-MM-DD HH:mm:ss");
    },

    async verificarConexion() {
        return await Network.getStatus();
    },

    eliminarStoreUsuarios(store) {
        store.usuarioAutentificado.informacion = null;
        store.usuarioAutentificado.token = null;
    },

    async getUIDevice() {
        let name = "web";
        if (Capacitor.getPlatform() === 'android') {
            const id = await Device.getId();
            name = id.identifier;
        }

        return name;
    },


    async obtenerInformacionDelDispositivo() {
        const info = await Device.getInfo();
        return info
    },

    async obtenerUbicacionActual() {
        try {
            const coordinates = await Geolocation.getCurrentPosition();
            return coordinates;
        } catch (error) {
            console.error('Error al obtener la ubicación:', error);
            throw error; // O manejar el error de otra manera
        }
    },

    async guardarImagenEnDispositivo(blob, nombreArchivo) {
        const base64Data = await this.blobToBase64(blob);
        const base64Content = base64Data.split(',')[1];
        try {
            // Usa Filesystem API para escribir el archivo en el almacenamiento del dispositivo
            const resultado = await Filesystem.writeFile({
                path: nombreArchivo,
                data: base64Content,
                directory: Directory.Data // Directorio de datos de la aplicación
            });

            return resultado.uri; // Devuelve el URI del archivo guardado
        } catch (e) {
            throw e;
        }
    },


    blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    },

    async procesarYGuardarImagenes(elementos, username) {
        const urisGuardadas = [];
        for (const elemento of elementos) {
            const respuesta = await fetch(elemento.url);
            const blob = await respuesta.blob();

            // Genera un nombre de archivo único para cada imagen
            const nombreArchivo = `${username}_${new Date().getTime()}.png`;
            const uriGuardada = await this.guardarImagenEnDispositivo(blob, nombreArchivo);
            urisGuardadas.push({ uri: uriGuardada, nombreArchivo: nombreArchivo });
        }

        return urisGuardadas; // Devuelve una lista de URIs de las imágenes guardadas
    },


    async convertUriToBase64(uri) {
        try {
            const readFileResponse = await Filesystem.readFile({
                path: uri
            });
            // El contenido en base64 está en readFileResponse.data
            const base64String = readFileResponse.data;
            return base64String;
        } catch (err) {
            alert('Error al convertir URI a base64:', err);
            throw err; // o maneja el error como prefieras
        }
    },

    nombreArchivoByURI(uri) {
        // Esta función asume que el URI del archivo termina en el nombre del archivo
        // y posiblemente en algún parámetro de consulta después de una marca de interrogación.
        const partes = uri.split('/'); // Separa el URI en partes
        let nombreArchivo = partes.pop() || ''; // Obtiene la última parte, que debería ser el nombre del archivo

        // Si el nombre del archivo contiene parámetros de consulta, elimínalos
        nombreArchivo = nombreArchivo.split('?')[0];

        return nombreArchivo;
    },

    fileToSrc(uri) {
        try {
            return Capacitor.convertFileSrc(uri);
        } catch (error) {
            return null
        }
    },



}

export default Utilidades;
