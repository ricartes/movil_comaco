<template>
    <f7-navbar title="Menú principal" />
    <f7-card class="user-card">
        <f7-card-content>
            <div class="user-row">
                <div class="avatar">{{ initials }}</div>
                <div class="meta">
                    <div class="name">{{ user?.nombre || "Usuario" }}</div>
                    <div class="sub">RUT: {{ user?.rut ?? "-" }}</div>
                    <div class="sub ellipsis">{{ user?.email || "" }}</div>
                    <div class="status">
                        <span
                            class="dot"
                            :class="offline ? 'bg-orange' : 'bg-green'"
                        ></span>
                        {{ offline ? "Offline" : "Online" }}
                    </div>
                </div>
            </div>
        </f7-card-content>
    </f7-card>

    <!-- Opciones -->
    <f7-list inset strong class="menu-list">
        <f7-list-item title="Cargar parámetros" @click="onCargarParametros">
            <template #media><f7-icon f7="arrow_down_circle_fill" /></template>
        </f7-list-item>

        <f7-list-item title="Cargar folios" @click="onCargarFolios">
            <template #media><f7-icon f7="doc_on_doc_fill" /></template>
        </f7-list-item>

        <f7-list-item title="Configuración general" @click="onConfig">
            <template #media><f7-icon f7="gear" /></template>
        </f7-list-item>
    </f7-list>

    <f7-block strong>
        <f7-button fill color="red" @click="logout">Cerrar sesión</f7-button>
    </f7-block>
</template>

<script>
import { f7 } from "framework7-vue";
import store from "@/js/store";
import config from "@/Common/json/config.json";
import CargaParametrosService from "@/app/services/CargaParametrosService";

export default {
    name: "MenuPage",
    computed: {
        user() {
            return store.state.user;
        },
        offline() {
            return store.state.offline;
        },

        initials() {
            const n = this.user?.nombre || "";
            const parts = n.trim().split(/\s+/);
            const a = parts[0]?.[0] ?? "";
            const b = parts[1]?.[0] ?? "";
            const ini = (a + b).toUpperCase();
            return ini || n[0]?.toUpperCase() || "U";
        },
    },
    methods: {
        async onCargarParametros() {
            const tasks = [
                {
                    key: "Órdenes de compra",
                    run: () =>
                        CargaParametrosService.cargarOrdenesCompra(
                            this.user.empresa,
                            this.user.rut
                        ),
                },
                {
                    key: "Órdenes de venta",
                    run: () =>
                        CargaParametrosService.cargarOrdenesVenta(
                            this.user.empresa,
                            this.user.rut
                        ),
                },
                {
                    key: "Transportista",
                    run: () =>
                        CargaParametrosService.cargarTransportista(
                            this.user.empresa,
                            this.user.rut
                        ),
                },
                {
                    key: "Socios",
                    run: () =>
                        CargaParametrosService.cargarSocios(
                            this.user.empresa,
                            this.user.rut
                        ),
                },
                {
                    key: "Precio Producto",
                    run: () =>
                        CargaParametrosService.cargarPrecios(
                            this.user.empresa,
                            this.user.rut
                        ),
                },
                {
                    key: "Empresa",
                    run: () =>
                        CargaParametrosService.cargarEmpresas(
                            this.user.empresa,
                            this.user.rut
                        ),
                },
                {
                    key: "Parámetro general",
                    run: () =>
                        CargaParametrosService.cargarParametroGeneral(
                            this.user.empresa,
                            this.user.rut
                        ),
                },
                {
                    key: "Carguios",
                    run: () =>
                        CargaParametrosService.cargarCarguios(
                            this.user.empresa,
                            this.user.rut
                        ),
                },
                {
                    key: "Empresa Contratista",
                    run: () =>
                        CargaParametrosService.cargarEmpresaContratista(
                            this.user.empresa,
                            this.user.rut
                        ),
                },
                {
                    key: "Rodales",
                    run: () =>
                        CargaParametrosService.cargarRodales(
                            this.user.empresa,
                            this.user.rut
                        ),
                },
            ];

            const total = tasks.length;
            const dlg = f7.dialog.progress("Cargando…", 0);
            const resumen = [];

            try {
                for (let i = 0; i < tasks.length; i++) {
                    const t = tasks[i];
                    dlg.setText(`${t.key} (${i + 1}/${total})`);
                    try {
                        const res = await t.run(); // 👈 acá ya pasamos empId y rut
                        const count =
                            res?.count ??
                            (Array.isArray(res?.data) ? res.data.length : 0);
                        resumen.push({ key: t.key, ok: true, count });
                    } catch (e) {
                        resumen.push({
                            key: t.key,
                            ok: false,
                            error: e?.message || "Error",
                        });
                    }
                    dlg.setProgress(Math.round(((i + 1) / total) * 100));
                }
            } finally {
                dlg.close();
                const html = resumen
                    .map((s) =>
                        s.ok
                            ? `• ${s.key}: OK (${s.count})`
                            : `• ${s.key}: <b>ERROR</b> — ${s.error}`
                    )
                    .join("<br>");
                f7.dialog.alert(
                    `<div style="text-align:left">${
                        html || "Sin resultados"
                    }</div>`,
                    "Resultado de carga"
                );
            }
        },
        onCargarFolios() {
            // TODO: llama a tu servicio para folios
            f7.toast
                .create({ text: "Cargando folios…", closeTimeout: 1500 })
                .open();
        },
        onConfig() {
            // Si tienes ruta de settings, navega. Si no, muestra aviso.
            const router = f7.views.main?.router;
            if (router) router.navigate("/settings/", { reloadCurrent: false });
            else
                f7.toast
                    .create({
                        text: "Configuración próximamente",
                        closeTimeout: 1200,
                    })
                    .open();
        },
        async logout() {
            f7.dialog.confirm(
                "¿Está seguro que desea cerrar sesión?",
                async () => {
                    await store.dispatch("clearSession");
                    localStorage.removeItem("auth_token");
                    f7.views.main?.router?.navigate("/login/", {
                        clearPreviousHistory: true,
                    });
                }
            );
        },
    },
};
</script>

<style scoped>
.user-card {
    margin-top: 12px;
    border-radius: 14px;
}
.user-row {
    display: flex;
    align-items: center;
    gap: 14px;
}
.avatar {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: #0a58ff;
    color: #fff;
    font-weight: 700;
    display: grid;
    place-items: center;
    font-size: 18px;
    flex: 0 0 auto;
}
.meta .name {
    font-weight: 600;
    font-size: 16px;
}
.meta .sub {
    font-size: 13px;
    color: #6b7280;
    line-height: 1.2;
}
.ellipsis {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.status {
    margin-top: 6px;
    font-size: 12px;
    color: #6b7280;
    display: flex;
    align-items: center;
    gap: 6px;
}
.dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    display: inline-block;
}
.bg-green {
    background: #10b981;
}
.bg-orange {
    background: #f59e0b;
}

.menu-list :deep(.item-media) {
    align-self: center;
}
</style>
