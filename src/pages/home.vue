<template>
    <f7-page name="home" with-navbar with-toolbar @page:afterin="onPageAfterIn">
        <f7-toolbar tabbar labels bottom>
            <f7-link
                :tab-link-active="activeTab === 'home'"
                href="#view-home"
                @click.prevent="showHomeTab"
                icon-ios="f7:rectangle_grid_2x2_fill"
                icon-md="material:dashboard"
                text="Dashboard"
            />
            <f7-link
                :tab-link-active="activeTab === 'gde'"
                href="#view-gde"
                @click.prevent="showGdeTab"
                icon-ios="f7:doc_text_fill"
                icon-md="material:description"
                text="Guía"
            />
            <f7-link
                :tab-link-active="activeTab === 'menu'"
                href="#view-menu"
                @click.prevent="showMenuTab"
                icon-ios="f7:line_3_horizontal"
                icon-md="material:menu"
                text="Menú"
            />
        </f7-toolbar>

        <f7-tabs>
            <f7-tab id="view-home" :tab-active="activeTab === 'home'">
                <dashboard />
            </f7-tab>

            <f7-tab
                id="view-gde"
                :tab-active="activeTab === 'gde'"
                @tab:show="onGdeTabShow"
            >
                <gde ref="gdeRef" />
            </f7-tab>

            <f7-tab id="view-menu" :tab-active="activeTab === 'menu'">
                <menu-page />
            </f7-tab>
        </f7-tabs>
    </f7-page>
</template>

<script>
import { f7 } from "framework7-vue";
import dashboard from "@/pages/Home/dashboard.vue";
import gde from "@/pages/Home/gde.vue";
import menuPage from "@/pages/Home/menu.vue";

export default {
    name: "TabsLayout",
    props: { f7router: Object },
    components: { dashboard, gde, menuPage },
    data() {
        return {
            activeTab: "home",
        };
    },
    methods: {
        async onPageAfterIn() {
            const url = f7.views.main?.router?.currentRoute?.url || "";
            const params = new URLSearchParams(url.split("?")[1] || "");
            const qtab = params.get("tab");
            await this.$nextTick();
            if (qtab === "gde") {
                this.showGdeTab();
            } else if (qtab === "menu") {
                this.showMenuTab();
            } else {
                this.showHomeTab();
            }
        },

        showHomeTab() {
            this.activeTab = "home";
            f7?.tab?.show?.("#view-home");
        },

        showMenuTab() {
            this.activeTab = "menu";
            f7?.tab?.show?.("#view-menu");
        },

        showGdeTab() {
            this.activeTab = "gde";
            f7?.tab?.show?.("#view-gde");
        },

        onGdeTabShow() {
            this.$refs.gdeRef?.ensureLoaded?.(); // usa el candado para evitar dobles cargas
        },
    },
    mounted() {
        // Si entras a esta página desde el router, sincroniza el tab al montar
        this.$nextTick(() => f7?.tab?.show?.(`#view-${this.activeTab}`));
    },
};
</script>
