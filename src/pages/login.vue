<template>
    <f7-page name="login" no-swipeback class="login-page">
        <div class="login-container">
            <!-- Marca / Logo -->
            <div class="brand">
                <img :src="logoSrc" alt="GDE" class="brand-logo" />
                <div class="brand-text">
                    <div class="brand-title">GUIA DE DESPACHO</div>
                    <div class="brand-subtitle">ELECTRONICA</div>
                </div>
            </div>

            <!-- Card de login -->
            <f7-card class="login-card">
                <f7-card-content padding>
                    <div class="card-title">Iniciar sesión</div>

                    <f7-list form no-hairlines-md>
                        <f7-list-input
                            label="RUT (sin DV)"
                            type="text"
                            placeholder="Ej: 12345678"
                            clear-button
                            inputmode="numeric"
                            pattern="[0-9]*"
                            maxlength="9"
                            v-model="form.rut"
                            @input="onRutInput"
                        >
                            <template #media
                                ><f7-icon f7="person_fill"
                            /></template>
                        </f7-list-input>

                        <f7-list-input
                            label="Password"
                            type="password"
                            placeholder="Password"
                            clear-button
                            toggle-password
                            autocomplete="current-password"
                            v-model="form.password"
                        >
                            <template #media
                                ><f7-icon f7="lock_fill"
                            /></template>
                        </f7-list-input>
                    </f7-list>

                    <div class="remember-row">
                        <label class="checkbox">
                            <input type="checkbox" v-model="remember" />
                            <i class="icon-checkbox"></i>
                        </label>
                        <span>Recuérdame</span>
                    </div>

                    <f7-button
                        fill
                        large
                        class="login-btn"
                        :disabled="!canSubmit || loading"
                        @click="onSubmit"
                    >
                        {{ loading ? "Ingresando…" : "Iniciar sesión" }}
                    </f7-button>
                </f7-card-content>
            </f7-card>
        </div>
    </f7-page>
</template>

<script>
import logoSrc from "@/assets/img/logo.png";

export default {
    name: "LoginPage",
    data() {
        return {
            logoSrc,
            form: { rut: "", password: "" },
            remember: false,
            loading: false,
        };
    },
    computed: {
        canSubmit() {
            return (
                /^\d{7,9}$/.test(this.form.rut) && this.form.password.length > 0
            );
        },
    },
    methods: {
        onRutInput(e) {
            // Solo dígitos, máx 9 (sin DV)
            this.form.rut = (e?.target?.value || "")
                .replace(/\D/g, "")
                .slice(0, 9);
        },
        async onSubmit() {
            if (!this.canSubmit || this.loading) return;
            this.loading = true;
            try {
                // TODO: POST /mapi/v1/auth/login
                // await api.post('/auth/login', { rut: this.form.rut, password: this.form.password, remember: this.remember })
                // this.$f7.views.main.router.navigate('/home/')
                console.log("Login:", this.form, { remember: this.remember });
            } finally {
                this.loading = false;
            }
        },
    },
};
</script>

<style scoped>
/* Fondo y centrado vertical */
.login-page {
    min-height: 100svh;
    background: #f5f7fb;
    display: grid;
    place-items: center;
}
/* Ligeramente más abajo del centro */
.login-container {
    transform: translateY(4vh);
    display: flex;
    flex-direction: column;
    gap: 18px;
    align-items: center;
}

/* Marca */
.brand {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
}
.brand-logo {
    width: 120px;
    height: 120px;
    object-fit: contain;
}
.brand-text {
    text-align: center;
    letter-spacing: 0.08em;
}
.brand-title {
    color: #8a8f98;
    font-size: 14px;
    text-transform: uppercase;
    line-height: 1;
}
.brand-subtitle {
    color: #0a58ff;
    font-weight: 700;
    font-size: 20px;
    text-transform: uppercase;
    margin-top: 2px;
    line-height: 1;
}

/* Card */
.login-card {
    width: 420px;
    max-width: calc(100vw - 32px);
    border-radius: 12px;
    box-shadow: 0 10px 22px rgba(0, 0, 0, 0.06);
}
.card-title {
    text-align: center;
    font-weight: 600;
    font-size: 18px;
    margin-bottom: 6px;
    color: #4a4f57;
}

/* Otros */
.remember-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 10px 0 8px;
    color: #6b7280;
}
.login-btn {
    width: 100%;
}
</style>
