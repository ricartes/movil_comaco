
import { getToken, derivePinHash, verifyPin } from "../Seguridad";
import { loginWs } from "@/app/webservices/UsuarioWebService";
import { getUsuarioDao } from '@/app/services/initServices';
import { getTrazabilidadDao } from "@/app/services/initServices";
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
     * @param {*} location 
     * @returns 
     */
    async loginWeb(rut, passwordIngresado, location) {
        try {

            const rutNum = String(rut).replace(/\D/g, '')
            const resp = await loginWs(rutNum, passwordIngresado, location)
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

            const trazabilidad = {
                rut: rutNum,
                location: location ?? null,               // objeto o null
                fecha: Utilidades.fechaHoraActual(),
                dispositivo: await Utilidades.getUIDevice(),
                evento: 'LOGIN_WEB_OK',
            };
            await getTrazabilidadDao().insertar(trazabilidad);


            return { status: true, message: resp.message || 'Login OK', session, user: userDoc }
        } catch (ex) {
            console.log(ex);
            throw ex;
        }
    },



    async obtenerPorRut(rut) {
        return await getUsuarioDao().obtenerPorRut(rut);
    },


    async guardarUsuarioLocalConPin(userDoc, pin, location) {
        if (!/^\d{4,8}$/.test(pin)) throw new Error('PIN invalido')
        const deviceId = await Utilidades.getUIDevice()
        const salt = `u:${userDoc.rut}|d:${deviceId}`
        const hash = await derivePinHash(pin, salt)

        const doc = { ...userDoc, offlinePinSalt: salt, offlinePinHash: hash }

        const trazabilidad = {
            rut: userDoc.rut,
            location: location ?? null,               // objeto o null
            fecha: Utilidades.fechaHoraActual(),
            dispositivo: deviceId,
            evento: 'PIN_GUARDADO_OK',
        };
        await getTrazabilidadDao().insertar(trazabilidad);


        await getUsuarioDao().insertar(doc) // o upsert si tu DAO lo maneja
        return doc
    },



    /**
     * Valida PIN offline contra lo guardado en PouchDB
     */
    async validarPIN(rut, pin, location) {
        const user = await getUsuarioDao().obtenerPorRut(rut);
        if (!user || !user.offlinePinSalt || !user.offlinePinHash) return false;

        const esValido = await verifyPin(pin, user.offlinePinSalt, user.offlinePinHash);
        if (!esValido) return false;

        // Objeto de trazabilidad
        const trazabilidad = {
            rut,
            location: location ?? null,
            fecha: Utilidades.fechaHoraActual(),
            dispositivo: await Utilidades.getUIDevice(),
            evento: "LOGIN_PIN_OK"
        };

        await getTrazabilidadDao().insertar(trazabilidad);

    }
}
export default UsuarioService;


