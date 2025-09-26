<template>
    <f7-page
        no-toolbar
        no-navbar
        no-swipeback
        login-screen
        class="login-page"
        @page:beforein="onPageInit"
    >
        <div class="login-container">
            <f7-login-screen-title>
                <img :src="logoSrc" alt="GDE" class="brand-logo" />
                <div class="brand-text">
                    <div class="brand-title">GUIA DE DESPACHO</div>
                    <div class="brand-subtitle">ELECTRONICA</div>
                </div>
            </f7-login-screen-title>
            <!-- Marca -->

            <!-- Card -->
            <f7-card class="login-card">
                <f7-card-content padding>
                    <div class="card-title">Iniciar sesión</div>

                    <f7-list form no-hairlines-md class="login-list">
                        <!-- RUT -->
                        <f7-list-input
                            label="RUT (sin DV)"
                            type="text"
                            placeholder="Ej: 12345678"
                            clear-button
                            inputmode="numeric"
                            pattern="[0-9]*"
                            maxlength="9"
                            :disabled="showPinSetup || checkingRut || loading"
                            v-model:value="form.rut"
                            @input="onRutInput"
                        >
                            <template #media
                                ><f7-icon f7="person_fill"
                            /></template>
                        </f7-list-input>

                        <!-- PIN si está registrado -->
                        <f7-list-input
                            v-if="requierePin"
                            label="PIN"
                            type="password"
                            placeholder="4 a 8 dígitos"
                            clear-button
                            inputmode="numeric"
                            pattern="[0-9]*"
                            maxlength="8"
                            :disabled="showPinSetup || loading"
                            v-model:value="form.pin"
                            @input="onPinInput"
                        >
                            <template #media
                                ><f7-icon f7="number_square"
                            /></template>
                        </f7-list-input>

                        <!-- Password si NO está registrado -->
                        <f7-list-input
                            v-if="requierePassword && !showPinSetup"
                            label="Password"
                            type="password"
                            placeholder="Password"
                            clear-button
                            toggle-password
                            autocomplete="current-password"
                            :disabled="loading"
                            v-model:value="form.password"
                        >
                            <template #media
                                ><f7-icon f7="lock_fill"
                            /></template>
                        </f7-list-input>
                    </f7-list>

                    <!-- Bloque inline para configurar PIN (cuando login web = OK) -->
                    <transition name="fade">
                        <div v-if="showPinSetup" class="pin-setup">
                            <div class="pin-title">Configurar PIN offline</div>
                            <div class="pin-subtitle">
                                El PIN se usará para iniciar sesión sin
                                Internet.
                            </div>

                            <f7-list form no-hairlines-md class="pin-list">
                                <f7-list-input
                                    label="PIN"
                                    type="password"
                                    placeholder="4 dígitos"
                                    clear-button
                                    inputmode="numeric"
                                    pattern="[0-9]*"
                                    maxlength="4"
                                    :disabled="loading"
                                    v-model:value="pin1"
                                    @input="onPin1Input"
                                >
                                    <template #media
                                        ><f7-icon f7="number"
                                    /></template>
                                </f7-list-input>

                                <f7-list-input
                                    label="Repetir PIN"
                                    type="password"
                                    placeholder="Repetir PIN"
                                    clear-button
                                    inputmode="numeric"
                                    pattern="[0-9]*"
                                    maxlength="4"
                                    :disabled="loading"
                                    v-model:value="pin2"
                                    @input="onPin2Input"
                                >
                                    <template #media
                                        ><f7-icon f7="number"
                                    /></template>
                                </f7-list-input>
                            </f7-list>

                            <div v-if="pinError" class="pin-error">
                                {{ pinError }}
                            </div>

                            <p class="grid grid-cols-2 grid-gap">
                                <f7-button
                                    fill
                                    large
                                    :disabled="!canSavePin || loading"
                                    @click="onSavePin"
                                >
                                    {{ loading ? "Guardando…" : "Guardar PIN" }}
                                </f7-button>
                                <f7-button
                                    outline
                                    large
                                    class="cancel-btn"
                                    :disabled="loading"
                                    @click="onCancelPin"
                                >
                                    Cancelar
                                </f7-button>
                            </p>
                        </div>
                    </transition>

                    <!-- Botón: solo aparece cuando NO estamos en el setup de PIN -->
                    <f7-button
                        v-if="!showPinSetup && mostrarBoton"
                        fill
                        large
                        class="login-btn"
                        :disabled="!canSubmit || loading"
                        @click="onSubmit"
                    >
                        {{ loading ? "Procesando…" : "Iniciar sesión" }}
                    </f7-button>
                </f7-card-content>
            </f7-card>
        </div>
    </f7-page>
</template>

<script>
import { f7 } from "framework7-vue";
import store from "@/js/store";
import logoSrc from "@/assets/img/logo.png";
import UsuarioService from "@/app/services/UsuarioService";
import { getLocationOnce } from "@/app/helpers/GeolocationHelpers";

export default {
    name: "LoginPage",
    props: { f7router: Object },
    data() {
        return {
            paginaPrincipal: "/home/",
            logoSrc,
            loading: false,
            checkingRut: false,
            requierePin: false,
            requierePassword: false,
            form: { rut: "", pin: "", password: "" },
            _rutTimer: null,
            _rutQueryId: 0,

            // 👇 nuevo estado para setup de PIN
            showPinSetup: false,
            pin1: "",
            pin2: "",
            pinError: "",
            pendingLogin: null, // { user, session } luego del login web OK
        };
    },
    created() {},
    computed: {
        canSubmit() {
            if (this.requierePin) return /^\d{4,8}$/.test(this.form.pin);
            if (this.requierePassword)
                return this.form.password.trim().length > 0;
            return false;
        },
        mostrarBoton() {
            if (this.checkingRut || this.showPinSetup) return false;
            if (this.requierePin) return this.form.pin.length > 0;
            if (this.requierePassword)
                return this.form.password.trim().length > 0;
            return false;
        },
        canSavePin() {
            return /^\d{4}$/.test(this.pin1) && this.pin1 === this.pin2;
        },
    },
    methods: {
        onPageInit() {
            const autenticado = !!localStorage.getItem("auth_token");
            if (autenticado) {
                //console.log(this.paginaPrincipal);
                this.f7router.navigate(this.paginaPrincipal);
            }
        },
        onPinInput(e) {
            this.form.pin = (e?.target?.value || "")
                .replace(/\D/g, "")
                .slice(0, 8);
        },
        onPin1Input(e) {
            this.pin1 = (e?.target?.value || "").replace(/\D/g, "").slice(0, 4);
            this.pinError = "";
        },
        onPin2Input(e) {
            this.pin2 = (e?.target?.value || "").replace(/\D/g, "").slice(0, 4);
            this.pinError = "";
        },

        onRutInput(e) {
            const val = (e?.target?.value || "").replace(/\D/g, "").slice(0, 9);
            this.form.rut = val;

            // reset dependientes
            this.requierePin = false;
            this.requierePassword = false;
            this.form.pin = "";
            this.form.password = "";
            this.showPinSetup = false;
            this.pin1 = "";
            this.pin2 = "";
            this.pinError = "";
            this.pendingLogin = null;

            if (this._rutTimer) clearTimeout(this._rutTimer);
            if (!/^\d{7,9}$/.test(val)) {
                this.checkingRut = false;
                return;
            }

            const myQueryId = ++this._rutQueryId;
            this._rutTimer = setTimeout(async () => {
                this.checkingRut = true;
                try {
                    const usuario = await UsuarioService.obtenerPorRut(val);
                    if (this._rutQueryId !== myQueryId || this.form.rut !== val)
                        return;

                    if (
                        usuario &&
                        usuario.offlinePinHash &&
                        usuario.offlinePinSalt
                    ) {
                        this.requierePin = true;
                        this.requierePassword = false;
                    } else {
                        this.requierePin = false;
                        this.requierePassword = true;
                    }
                } catch (err) {
                    this.requierePin = false;
                    this.requierePassword = false;
                    f7.toast.show({
                        text: "Error consultando usuario local",
                        closeTimeout: 1500,
                    });
                } finally {
                    if (this._rutQueryId === myQueryId)
                        this.checkingRut = false;
                }
            }, 250);
        },

        async onSubmit() {
            if (!this.canSubmit || this.loading) return;
            this.loading = true;
            try {
                const location = await getLocationOnce();
                if (this.requierePin) {
                    const ok = await UsuarioService.validarPIN(
                        this.form.rut,
                        this.form.pin,
                        location
                    );
                    if (!ok) throw new Error("PIN incorrecto");
                    const user = await UsuarioService.obtenerPorRut(
                        this.form.rut
                    );
                    await store.dispatch("setSessionOffline", { user });
                    localStorage.setItem("auth_token", "1");
                    window.dispatchEvent(new Event("auth:login"));
                    this.f7router.navigate(this.paginaPrincipal);
                    return;
                }

                if (this.requierePassword) {
                    const loginWeb = await UsuarioService.loginWeb(
                        this.form.rut,
                        this.form.password,
                        location
                    );
                    if (!loginWeb.status) {
                        f7.dialog.alert(
                            loginWeb.message || "Credenciales inválidas"
                        );
                        return;
                    }
                    // en vez de dialog: mostramos UI inline para setear PIN (4 dígitos)
                    this.pendingLogin = loginWeb; // { user, session }
                    this.showPinSetup = true;
                    this.$nextTick(() => {
                        const el = this.$el.querySelector(".pin-list input");
                        el?.focus();
                    });
                }
            } catch (e) {
                f7.dialog.alert(e.message || "No se pudo iniciar sesión");
            } finally {
                this.loading = false;
            }
        },

        async onSavePin() {
            if (!/^\d{4}$/.test(this.pin1)) {
                this.pinError = "El PIN debe tener 4 dígitos.";
                return;
            }
            if (this.pin1 !== this.pin2) {
                this.pinError = "Los PIN no coinciden.";
                return;
            }
            if (!this.pendingLogin?.user || !this.pendingLogin?.session) {
                this.pinError = "Sesión no disponible. Intenta de nuevo.";
                return;
            }

            this.loading = true;
            try {
                 const location = await getLocationOnce();
                await UsuarioService.guardarUsuarioLocalConPin(
                    this.pendingLogin.user,
                    this.pin1,
                    location
                );
                await store.dispatch("setSessionOnline", {
                    user: this.pendingLogin.user,
                    token: this.pendingLogin.session.token,
                });
                localStorage.setItem("auth_token", "1");
                window.dispatchEvent(new Event("auth:login"));
                this.f7router.navigate(this.paginaPrincipal);
            } catch (e) {
                this.pinError = e?.message || "No se pudo guardar el PIN";
            } finally {
                this.loading = false;
            }
        },

        onCancelPin() {
            // volver a la etapa de password
            this.showPinSetup = false;
            this.pin1 = "";
            this.pin2 = "";
            this.pinError = "";
            this.pendingLogin = null;
        },
    },
};
</script>

<style scoped>
@media (min-width: 768px) {
    .login-container {
        max-width: 600px;
        margin: auto;
    }
}

/* Fondo y centrado */
.login-page {
    background: #f5f7fb;
    display: grid;
    place-items: center;
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

/* Card/login */

.login-card .login-list {
    margin: 8px 0 18px;
}
.login-card .item-input-wrap {
    margin-bottom: 12px;
}

.login-card .login-btn {
    width: 100%;
    display: block;
    margin-top: 10px;
}

/* PIN setup */
.pin-setup {
    margin-top: 8px;
}
.pin-title {
    font-weight: 600;
    color: #374151;
    margin-bottom: 4px;
}
.pin-subtitle {
    font-size: 13px;
    color: #6b7280;
    margin-bottom: 10px;
}
.pin-list .item-input-wrap {
    margin-bottom: 10px;
}
.pin-actions {
    display: flex;
    gap: 10px;
    margin-top: 6px;
}
.pin-error {
    color: #dc2626;
    font-size: 13px;
    margin-top: 6px;
}

/* pequeña transición */
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>
