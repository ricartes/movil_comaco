// @ts-nocheck
import { ref, computed } from 'vue'
import PouchDB from 'pouchdb-browser'
import pouchdbFind from 'pouchdb-find'
import Utilidades from '@/Utilidades'
import { crearIndicesTipo } from '@/db/indexs/Tipo'

PouchDB.plugin(pouchdbFind)

/** @type {import('vue').Ref<import('pouchdb-browser').Database|null>} */
const localDbRef = ref(null)
/** @type {import('pouchdb-browser').Database|null} */
let localDbInstance = null

export async function initializeDatabases() {
    if (localDbInstance) return localDbInstance

    let nameDB = 'gde_fs'
    const uid = await Utilidades.getUIDevice()
    nameDB += uid

    localDbInstance = new PouchDB(nameDB, { auto_compaction: true, revs_limit: 5 })
    localDbRef.value = localDbInstance

    try {
        await crearIndicesTipo(localDbInstance)
    } catch (err) {
        console.error('Error configurando índices de tipo:', err)
    }
    return localDbInstance
}

export async function insertarDocumento(documento) {
    if (!localDbInstance) throw new Error('DB no inicializada')
    return await localDbInstance.post(documento)
}

export function useLocalDb() {
    return {
        localDb: localDbRef,
        isReady: computed(() => !!localDbRef.value),
        initializeDatabases,
        insertarDocumento,
    }
}
