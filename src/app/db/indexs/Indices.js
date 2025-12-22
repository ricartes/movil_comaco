// src/app/db/crearIndices.js
export async function crearIndicesTipo(db) {
    const toCreate = [
        // === genéricos / sesión ===
        { ddoc: 'idx_type', fields: ['type'] },
        { ddoc: 'idx_user_rut', fields: ['type', 'rut'] },
        { ddoc: 'idx_user_rut_empresa', fields: ['type', 'rut', 'empresa'] },
        // === empresa ===
        { ddoc: 'idx_empresa_id', fields: ['type', 'id'] },
        // === parámetro-general ===
        { ddoc: 'idx_param_gen_empId', fields: ['type', 'empId'] },
        { ddoc: 'idx_param_gen_id', fields: ['type', 'id'] },
        // === transportista === (búsquedas por patentes / chofer)
        { ddoc: 'idx_trans_patCamion', fields: ['type', 'patCamion'] },
        { ddoc: 'idx_trans_patCarro', fields: ['type', 'patCarro'] },
        { ddoc: 'idx_trans_rutChofer', fields: ['type', 'rutChofer'] },
        // === socio ===
        { ddoc: 'idx_socio_codigo', fields: ['type', 'codigo'] },
        { ddoc: 'idx_socio_rut', fields: ['type', 'rut'] },
        // === precio === (ojo: nested path cliente.codigo)
        { ddoc: 'idx_precio_emp', fields: ['type', 'empresaId'] },
        { ddoc: 'idx_precio_prod', fields: ['type', 'codigoProducto'] },
        { ddoc: 'idx_precio_cli', fields: ['type', 'cliente.codigo'] },
        // si filtras por empresa + producto a la vez:
        { ddoc: 'idx_precio_emp_prod', fields: ['type', 'empresaId', 'codigoProducto'] },
        // === orden-venta === (aunque el _id es compuesto, a veces sirve filtrar)
        { ddoc: 'idx_ov_num', fields: ['type', 'numOv'] },
        { ddoc: 'idx_ov_producto_largo', fields: ['type', 'codProducto', 'largoPorTrozo'] },
        // === orden-compra ===
        { ddoc: 'idx_oc_num', fields: ['type', 'numOc'] },
        { ddoc: 'idx_oc_cliente', fields: ['type', 'codCliente'] },
        { ddoc: 'idx_oc_producto_largo', fields: ['type', 'codProducto', 'largoTrozo'] },
        // === empresa-contratista === (búsquedas por rol/rut línea)
        { ddoc: 'idx_ec_rol', fields: ['type', 'rolPredio'] },
        { ddoc: 'idx_ec_rut', fields: ['type', 'rutContratista'] },
        { ddoc: 'idx_ec_rol_rut', fields: ['type', 'rolPredio', 'rutContratista'] },
        // === carguio === (id es compuesto pero busca por campos planos)
        { ddoc: 'idx_carg_rut', fields: ['type', 'rutCarguio'] },
        { ddoc: 'idx_carg_patente', fields: ['type', 'patenteCarguio'] },
        { ddoc: 'idx_carg_conductor', fields: ['type', 'conductor'] },
        // === rodal ===
        { ddoc: 'idx_rodal_origen', fields: ['type', 'codOrigen'] },
        { ddoc: 'idx_rodal_origen_cod', fields: ['type', 'codOrigen', 'codrodal'] },
        //proveedor
        { ddoc: 'idx_proveedor_encargado_proveedor', fields: ['type', 'codEncargado', 'rutProveedor'] },
        // orden-compra → predios por zona/proveedor/predio/cliente
        { ddoc: 'idx_oc_zona_prov_predio_cli', fields: ['type', 'codEncargado', 'rutProveedor', 'rolPredio', 'rutCliente'] },
        // (opcional) si consultas mucho por zona+proveedor solamente:
        { ddoc: 'idx_oc_zona_prov', fields: ['type', 'codEncargado', 'rutProveedor'] },
        // === error_envio (si lo usas con fechas) ===
        { ddoc: 'idx_err_fecha', fields: ['type', 'fechaHora'] },
        { ddoc: 'idx_gde_empId_rut', fields: ['type', 'rutEmisor', 'empId'] },
        // === largo ===
        { ddoc: 'idx_largo_largo', fields: ['type', 'largo'] },
        // --- base / lista ---
        {
            ddoc: 'idx_gde_emp_rut_createdAt_id',
            fields: ['type', 'empId', 'rutEmisor', 'createdAt', '_id']
        },

        {
            ddoc: 'idx_gde_emp_rut_estado_createdAt_id',
            fields: ['type', 'empId', 'rutEmisor', 'estado.id', 'createdAt', '_id']
        },

        {
            ddoc: 'idx_gde_emp_rut_folio_createdAt_id',
            fields: ['type', 'empId', 'rutEmisor', 'folio', 'createdAt', '_id']
        },

        {
            ddoc: 'idx_gde_emp_rut_estado_folio_createdAt_id',
            fields: ['type', 'empId', 'rutEmisor', 'estado.id', 'folio', 'createdAt', '_id']
        },

        {
            ddoc: 'idx_gde_emp_rut_folio_id',
            fields: ['type', 'empId', 'rutEmisor', 'folio', '_id']
        },

        { ddoc: 'idx_gde_emp_folio_id', fields: ['type', 'empId', 'folio', '_id'] },



        // --- pendientes de envío (incluye _id para tie-breaker) ---
        {
            ddoc: 'idx_gde_sync_estado_syncing_sinc_createdAt_id',
            fields: ['type', 'empId', 'rutEmisor', 'estado.id', 'syncing', 'sincronizado', 'createdAt', '_id']
        },

        {
            ddoc: 'idx_gde_emp_rut_estado_fechaEmision_id',
            fields: ['type', 'empId', 'rutEmisor', 'estado.id', 'fechaEmision', '_id']
        },


        //folios

        // Folios por empresa y rango de folio (para $gte/$lte)
        { ddoc: 'idx_folio_emp_folio', fields: ['type', 'empId', 'folio'] },

        // (Opcional) si a veces tendrás urfId real y harás rango con él:
        { ddoc: 'idx_folio_emp_urf_folio', fields: ['type', 'empId', 'urfId', 'folio'] },

        // (Opcional) si filtras por estado además del rango:
        { ddoc: 'idx_folio_emp_estado_folio', fields: ['type', 'empId', 'estado', 'folio'] },

        { ddoc: 'idx_folio_emp_estado_folio_urf', fields: ['type', 'empId', 'estado', 'folio', 'urfId'] },



        // === motivo-anulacion ===
        { ddoc: 'idx_motAnu_type', fields: ['type'] },
        { ddoc: 'idx_motAnu_empId', fields: ['type', 'empId'] },
        { ddoc: 'idx_motAnu_empId_id', fields: ['type', 'empId', 'id'] },

        // === forestruck-import-log ===
        { ddoc: 'idx_forestruckImportLog_fileKey', fields: ['type', 'status'] },



    ];

    for (const { ddoc, fields } of toCreate) {
        try {
            await db.createIndex({ index: { ddoc, name: ddoc, fields } });
        } catch (err) {
            // No revientes si uno falla; solo loguea y sigue
            console.warn(`createIndex ${ddoc} (${fields.join(', ')}):`, err?.message || err);
        }
    }
}


