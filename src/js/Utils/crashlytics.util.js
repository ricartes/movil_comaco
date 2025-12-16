import { FirebaseCrashlytics } from "@capacitor-firebase/crashlytics";

/**
 * Reporta un error JS de forma segura a Crashlytics
 * @param {any} error - excepción capturada
 * @param {string} tag - contexto (ej: Geocerca, Huella, Sync)
 * @param {object} extraKeys - custom keys opcionales
 */
export async function reportException(error, tag = "JS", extraKeys = {}) {
    try {
        // ---- message seguro ----
        let message = "Error desconocido";

        if (error && typeof error === "object" && "message" in error) {
            message = String(error.message);
        } else if (typeof error === "string") {
            message = error;
        } else {
            try {
                message = JSON.stringify(error);
            } catch {
                message = "Error no serializable";
            }
        }

        // ---- stacktrace seguro ----
        let stacktrace = "";
        if (
            error &&
            typeof error === "object" &&
            "stack" in error &&
            typeof error.stack === "string"
        ) {
            stacktrace = error.stack;
        }

        // ---- contexto ----
        if (tag) {
            await FirebaseCrashlytics.log(`[${tag}] Exception`);
        }

        for (const [key, value] of Object.entries(extraKeys)) {
            await FirebaseCrashlytics.setCustomKey({
                key,
                value: String(value),
            });
        }

        // ---- envío ----
        await FirebaseCrashlytics.recordException({
            message: tag ? `[${tag}] ${message}` : message,
            stacktrace,
        });
    } catch (_) {
        // NUNCA romper la app por Crashlytics
    }
}
