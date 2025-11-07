import { f7 } from 'framework7-vue';

import Utilidades from "@/app/Utilidades.js";
import HelperService from "@/app/services/HelperService.js";

export async function validarSesionDispositivo({ silent = false, nonIntrusive = true } = {}) {

    const conexion = await Utilidades.verificarConexion();
    if (!conexion?.connected) return { ok: false, conexion: false };

    f7.dialog.preloader("Estableciendo conexión…");
    const online = await HelperService.validarConexion(3000);
    f7.dialog.close();

    if (!online) return { ok: false, conexion: false };

    const validate = window.appValidate?.bind?.(window) || window.appValidate;
    if (typeof validate === "function") {
        const res = await validate({ silent, nonIntrusive });
        if (!res?.ok || res?.bloquea) {
            return { ok: false, bloquea: true, conexion: true };
        }
    }

    return { ok: true, conexion: true };
}


export function usuarioLogeadoNoCorresponde(rutUsuarioSesion, rutAsignadoDispositivo) {
    if (!rutUsuarioSesion || !rutAsignadoDispositivo) return false;
    return String(rutUsuarioSesion) !== String(rutAsignadoDispositivo);
}

