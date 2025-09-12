
import HelperService from "./HelperService"
import { getToken, derivePinHash, verifyPin } from "../Seguridad";
import { loginWs } from "@/app/webservices/UsuarioWebService";
import { UsuarioDTO } from "../DTO/UsuarioDTO";
import { getUsuarioDao } from './initServices';
import UsuarioResponseDTO from "../DTO/UsuarioResponseDTO";
import Utilidades from "../Utilidades";
import { Preferences } from '@capacitor/preferences'
import { mapServerUserToDoc } from '@/app/mappers/userMapper'



const TOKEN_KEY = 'auth_token'

var UsuarioService = {

    /**
     * 
     * @returns 
     */
    obtenerUltimoUsuarioIdentificado() {
        //const dao = new UsuarioDAO(localDbInstance);
        return new Promise(async (resolve, reject) => {
            try {
                const token = await getToken();
                resolve(token ? this.obtenerUsuarioDesdeJWT(token) : null);
            } catch (ex) {
                reject(ex);
            }

        });
    },

    async validarTokenAccesoDesdeWebservice() {
        let acceso = null;
        return new Promise(async (resolve, reject) => {
            try {
                const token = await getToken();
                if (token) {
                    acceso = await UsuarioWebService.validarTokenAcceso(token);
                }
                resolve(acceso);
            } catch (ex) {
                reject(ex);
            }

        });

    },

    /**
     * 
     * @returns 
     */
    async eliminarUsuarioAutentificado() {
        try {
            const token = await getToken();
            if (token) {
                const datosUsaurio = this.obtenerUsuarioDesdeJWT(token)
                await getUsuarioDao().eliminar(datosUsaurio.username);
                //const usuarioObtenido = await getUsuarioDao().obtener(username);
                removeToken();
            }
        } catch (ex) {
            throw ex;
        }

        return true
    },

    /**
     * 
     * @param {*} username 
     * @param {*} passwordIngresado 
     * @returns 
     */
    async loginWeb(rut, passwordIngresado) {
        try {

            const rutNum = String(rut).replace(/\D/g, '')

            /** @type {import('@/app/dto/auth').WebLoginResponse} */
            const resp = await loginWs(rutNum, passwordIngresado)
            // Backend SIEMPRE entrega "status" true/false → no lances error aquí
            if (!resp?.status) {
                return { status: false, message: resp?.message || 'Credenciales inválidas' }
            }

            const d = resp.data || {}
            const session = {
                tokenType: d.token_type || 'Bearer',
                token: d.access_token,
                expiresAt: d.expires_at ?? null,
            }

            // Guarda token en Preferences (no en PouchDB)
            await Preferences.set({ key: TOKEN_KEY, value: session.token })

            // Mapea y persiste usuario en PouchDB
            const userDoc = mapServerUserToDoc(d.user)

            return { status: true, message: resp.message || 'Login OK', session, user: userDoc }
        } catch (ex) {
            console.log(ex);
            throw ex;
        }
    },



    async obtener(rut) {
        return await getUsuarioDao().obtener(rut);
    },



    /**
     * Guarda el usuario en PouchDB agregando PIN offline (hash + salt)
     * @param {import('@/app/dto/auth').UsuarioDoc} userDoc
     * @param {string} pin  // 4-8 dígitos
     */
    async guardarUsuarioLocalConPin(userDoc, pin) {
        if (!/^\d{4,8}$/.test(pin)) throw new Error('PIN invalido')
        const deviceId = await Utilidades.getUIDevice()
        const salt = `u:${userDoc.rut}|d:${deviceId}`
        const hash = await derivePinHash(pin, salt)

        const doc = { ...userDoc, offlinePinSalt: salt, offlinePinHash: hash }
        console.log(doc);
        await getUsuarioDao().insertar(doc) // o upsert si tu DAO lo maneja
        return doc
    },

    

    /**
     * Valida PIN offline contra lo guardado en PouchDB
     */
    async validarPIN(rut, pin) {
        const user = await getUsuarioDao().obtener(rut)
        if (!user || !user.offlinePinSalt || !user.offlinePinHash) return false
        return await verifyPin(pin, user.offlinePinSalt, user.offlinePinHash)
    },

}
export default UsuarioService;


