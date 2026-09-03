# Firebase local para COMACO

Coloque en esta carpeta el `google-services.json` descargado desde Firebase para la aplicación Android exacta:

`io.gestionasi.gfe_comaco`

El archivo está ignorado por Git y no debe reemplazarse por un JSON inventado o de otra aplicación.

Luego ejecute desde la raíz del proyecto:

```bash
node scripts/enable-crashlytics.js
```

El script valida el package antes de instalar el plugin local y preparar Android.
