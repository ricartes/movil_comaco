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

        // === error_envio (si lo usas con fechas) ===
        { ddoc: 'idx_err_fecha', fields: ['type', 'fechaHora'] },
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
