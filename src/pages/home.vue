<template>
    <!-- Página host de los tabs -->
    <f7-page name="home" with-navbar with-toolbar>
        <!-- Navbar: hijo directo del page -->

        <!-- Toolbar/Tabbar: también hijo directo del page -->
        <f7-toolbar tabbar labels bottom>
            <f7-link
                tab-link="#view-home"
                tab-link-active
                icon-ios="f7:rectangle_grid_2x2_fill"
                icon-md="material:dashboard"
                text="Dashboard"
            />
            <f7-link
                tab-link="#view-gde"
                icon-ios="f7:doc_text_fill"
                icon-md="material:description"
                text="GDE"
            />
            <f7-link
                tab-link="#view-menu"
                icon-ios="f7:line_3_horizontal"
                icon-md="material:menu"
                text="Menú"
            />
        </f7-toolbar>

        <!-- Contenido scrolleable: aquí van los tabs -->
        <f7-tabs>
            <f7-tab id="view-home" tab-active><dashboard /></f7-tab>
            <f7-tab id="view-gde"><gde /></f7-tab>
            <f7-tab id="view-menu"><menu-page /></f7-tab>
        </f7-tabs>
    </f7-page>
</template>

<script>
import dashboard from "@/pages/Home/dashboard.vue";
import gde from "@/pages/Home/gde.vue";
import menuPage from "@/pages/Home/menu.vue";
export default { name: "TabsLayout", components: { dashboard, gde, menuPage } };
</script>
