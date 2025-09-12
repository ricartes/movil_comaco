<template>
    <f7-page name="login" no-swipeback class="login-page">
        <div class="login-container">
            <!-- Marca -->
            <div class="brand">
                <img :src="logoSrc" alt="GDE" class="brand-logo" />
                <div class="brand-text">
                    <div class="brand-title">GUIA DE DESPACHO</div>
                    <div class="brand-subtitle">ELECTRONICA</div>
                </div>
            </div>

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
                            v-model:value="form.pin"
                            @input="onPinInput"
                        >
                            <template #media
                                ><f7-icon f7="number_square"
                            /></template>
                        </f7-list-input>

                        <!-- Password si NO está registrado -->
                        <f7-list-input
                            v-if="requierePassword"
                            label="Password"
                            type="password"
                            placeholder="Password"
                            clear-button
                            toggle-password
                            autocomplete="current-password"
                            v-model:value="form.password"
                        >
                            <template #media
                                ><f7-icon f7="lock_fill"
                            /></template>
                        </f7-list-input>
                    </f7-list>

                    <!-- Botón: solo aparece cuando hay campo de PIN o Password visible y con algo escrito -->
                    <f7-button
                        v-if="mostrarBoton"
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
import logoSrc from "@/assets/img/logo.png";
import UsuarioService from "@/app/services/UsuarioService";

export default {
    name: "LoginPage",
    data() {
        return {
            logoSrc,
            loading: false,
            checkingRut: false, // ⬅ para bloquear mientras consultamos
            requierePin: false,
            requierePassword: false,
            form: { rut: "", pin: "", password: "" },
            _rutTimer: null, // ⬅ debounce timer
            _rutQueryId: 0, // ⬅ evita condiciones de carrera
        };
    },
    computed: {
        canSubmit() {
            if (this.requierePin) return /^\d{4,8}$/.test(this.form.pin);
            if (this.requierePassword)
                return this.form.password.trim().length > 0;
            return false;
        },
        mostrarBoton() {
            if (this.checkingRut) return false;
            if (this.requierePin) return this.form.pin.length > 0;
            if (this.requierePassword)
                return this.form.password.trim().length > 0;
            return false;
        },
    },
    methods: {
        onPinInput(e) {
            this.form.pin = (e?.target?.value || "")
                .replace(/\D/g, "") // solo dígitos
                .slice(0, 8); // máx 8
        },

        onRutInput(e) {
            // Normaliza RUT (solo dígitos, máx 9)
            const val = (e?.target?.value || "").replace(/\D/g, "").slice(0, 9);
            this.form.rut = val;

            // Resetea estado dependiente del RUT
            this.requierePin = false;
            this.requierePassword = false;
            this.form.pin = "";
            this.form.password = "";

            // Cancela debounce anterior
            if (this._rutTimer) clearTimeout(this._rutTimer);

            // Si aún no es válido (7–9 dígitos), no consultamos
            if (!/^\d{7,9}$/.test(val)) {
                this.checkingRut = false;
                return;
            }

            // Debounce para no consultar en cada tecla
            const myQueryId = ++this._rutQueryId;
            this._rutTimer = setTimeout(async () => {
                this.checkingRut = true;
                try {
                    const usuario = await UsuarioService.obtener(val);
                    // Si cambió el RUT o llegó otra consulta más nueva, ignora este resultado
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
                    // En caso de error, deja ambos ocultos
                    this.requierePin = false;
                    this.requierePassword = false;
                    this.$f7.toast.show({
                        text: "Error consultando usuario local",
                        closeTimeout: 1500,
                    });
                } finally {
                    // Asegura que seguimos mirando el mismo RUT
                    if (this._rutQueryId === myQueryId)
                        this.checkingRut = false;
                }
            }, 250); // debounce 250ms
        },

        async onSubmit() {
            if (!this.canSubmit || this.loading) return;
            this.loading = true;
            try {
                if (this.requierePin) {
                    console.log("requiere pin");
                    const resultadoPin = await UsuarioService.validarPIN(
                        this.form.rut,
                        this.form.pin
                    );
                    console.log(resultadoPin);
                }
                if (this.requierePassword) {
                    const loginWeb = await UsuarioService.loginWeb(
                        this.form.rut,
                        this.form.password
                    );
                    if (!loginWeb.status) {
                        f7.dialog.alert(loginWeb.message); // o this.$f7.dialog.alert(dto.message)
                    } else {
                        const pin = await this.pedirPinConConfirmacion();
                        if (!pin) {
                            // si quieres hacerlo OBLIGATORIO, lanza error:
                            throw new Error(
                                "Se requiere configurar un PIN para continuar"
                            );
                            // si NO obligatorio: puedes seguir sin offline (token ya guardado)
                        } else {
                            await UsuarioService.guardarUsuarioLocalConPin(
                                loginWeb.user,
                                pin
                            );
                            f7.toast
                                .create({
                                    text: `PIN configurado`,
                                    closeTimeout: 1200,
                                })
                                .open();
                        }
                    }
                }
            } catch (e) {
                f7.dialog.alert(e.message || "No se pudo iniciar sesión");
            } finally {
                this.loading = false;
            }
        },
        pedirPinConConfirmacion() {
            return new Promise((resolve) => {
                const dlg = f7.dialog.create({
                    title: "Configurar PIN offline",
                    text: "Ingresa un PIN de 4 a 8 dígitos",
                    content: `<div class="dialog-input-field">
             <input type="password" id="pin1" inputmode="numeric" maxlength="8" class="dialog-input" placeholder="PIN" />
           </div>
           <div class="dialog-input-field">
             <input type="password" id="pin2" inputmode="numeric" maxlength="8" class="dialog-input" placeholder="Repetir PIN" />
           </div>`,
                    buttons: [
                        {
                            text: "Cancelar",
                            onClick: () => {
                                resolve(null);
                            },
                        },
                        {
                            text: "Guardar",
                            bold: true,
                            onClick: () => {
                                const p1 = (
                                    dlg.el.querySelector("#pin1")?.value || ""
                                ).replace(/\D/g, "");
                                const p2 = (
                                    dlg.el.querySelector("#pin2")?.value || ""
                                ).replace(/\D/g, "");
                                if (!/^\d{4,8}$/.test(p1)) {
                                    f7.dialog.alert(
                                        "El PIN debe tener 4 a 8 dígitos"
                                    );
                                    return;
                                }
                                if (p1 !== p2) {
                                    f7.dialog.alert("Los PIN no coinciden");
                                    return;
                                }
                                resolve(p1);
                            },
                        },
                    ],
                    on: {
                        opened() {
                            dlg.el.querySelector("#pin1")?.focus();
                        },
                        closed() {
                            dlg.destroy();
                        },
                    },
                });
                dlg.open();
            });
        },
    },
};
</script>


<style scoped>
/* Fondo y centrado */
.login-page {
    min-height: 100svh;
    background: #f5f7fb;
    display: grid;
    place-items: center;
}
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

/* Solo card/login */
.login-card {
    width: clamp(380px, 92vw, 640px);
    border-radius: 12px;
    box-shadow: 0 10px 22px rgba(0, 0, 0, 0.06);
    --f7-input-height: 40px;
    --f7-input-font-size: 16px;
}
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
</style>
