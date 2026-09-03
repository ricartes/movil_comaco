# Crashlytics para COMACO móvil

## Objetivo

Capturar crashes y errores no fatales de dispositivos de terreno, incluidos fallos nativos que ocurran antes de `deviceready`, sin modificar el comportamiento del tracking GPS.

La integración está aislada en `plugins-local/cordova-plugin-comaco-crashlytics` y no depende de Firebase Analytics, Messaging, Auth ni otros módulos.

## Compatibilidad fijada

- Aplicación Android: `io.gestionasi.gfe_comaco`.
- Proyecto actual: `cordova-android ^13.0.0`, target SDK 34.
- Firebase Crashlytics Android SDK: `19.4.4`.
- Firebase Crashlytics Gradle plugin: `3.0.7`.
- Google Services Gradle plugin: `4.4.4`.

Se mantiene explícitamente Crashlytics en la última línea estable 19.x. En este proyecto Cordova Android 13, la línea Crashlytics 20.x incorpora Firebase Sessions 3.x y provocó durante las pruebas un `NoClassDefFoundError` fatal al resolver `androidx.datastore.DataStoreFile`. Para una APK diagnóstica de producción se prioriza una combinación estable que no altere el arranque de COMACO.

El plugin no se registra automáticamente hasta disponer de una configuración Firebase real. Esto evita romper builds existentes o introducir una configuración ficticia.

## 1. Crear la aplicación en Firebase

En Firebase Console, crear o utilizar un proyecto y registrar una aplicación **Android** con este package exacto:

```text
io.gestionasi.gfe_comaco
```

Descargar `google-services.json` y copiarlo localmente a:

```text
firebase/google-services.json
```

Ese archivo está ignorado por Git en esta implementación.

## 2. Activar Crashlytics en el proyecto Cordova

Desde la raíz del repositorio:

```bash
node scripts/enable-crashlytics.js
```

El script:

1. comprueba que `firebase/google-services.json` exista;
2. valida que incluya `io.gestionasi.gfe_comaco`;
3. refresca `cordova-plugin-comaco-crashlytics` desde `plugins-local`;
4. ejecuta `cordova prepare android`;
5. el hook copia el JSON al módulo `platforms/android/app`;
6. el hook incorpora los classpath de Google Services y Crashlytics al Gradle generado.

Después de activar el plugin, Cordova modificará `package.json` y `package-lock.json`. Esos cambios sí deben versionarse en la rama de la APK diagnóstica.

## 3. Qué captura

Una vez Firebase está configurado, el SDK nativo queda disponible para capturar automáticamente excepciones fatales del proceso Android, incluso si el error sucede antes de que la WebView termine de inicializar Cordova.

El bridge `COMACO_OBS` agrega además:

- `android_sdk`;
- `android_release`;
- `app_version`;
- `app_version_code`;
- `cordova_bridge_loaded`;
- `startup_phase`;
- estado de lifecycle;
- errores JavaScript globales y `unhandledrejection` como non-fatal.

La fase `startup_phase=device_ready` permite diferenciar una caída temprana nativa de una caída posterior al arranque de Cordova.

## 4. Datos que NO deben enviarse

No registrar como keys, logs ni excepciones:

- RUT o nombre del usuario;
- usuario o contraseña;
- tokens o credenciales técnicas;
- UUID/identificador persistente del dispositivo;
- latitud o longitud;
- dirección, cliente, receptor o producto;
- contenido de una guía;
- respuestas completas de servicios web.

El bridge JavaScript sólo admite una lista cerrada de claves técnicas para reducir el riesgo de incorporar esos datos accidentalmente.

## 5. Validar antes de entregar al cliente

Primero compilar e instalar en un dispositivo de prueba propio. Confirmar antes que la aplicación abre y se mantiene operativa sin crashes introducidos por la instrumentación. Con la app abierta y Cordova inicializado, ejecutar deliberadamente:

```javascript
COMACO_OBS.testCrash()
```

Esto provoca únicamente el crash controlado:

```text
COMACO_CRASHLYTICS_TEST
```

La aplicación se cerrará. Abrirla nuevamente para permitir el envío del reporte y comprobar en Firebase Crashlytics que el evento aparezca con la versión correcta.

**No ejecutar `testCrash()` en el dispositivo del cliente.** Su único objetivo es validar la instalación antes de distribuir la APK diagnóstica.

## 6. APK para el cliente Android 13

Antes de distribuir:

1. validar que COMACO abra normalmente con Crashlytics activo;
2. validar el crash controlado en un equipo propio;
3. confirmar que el build usa el mismo package y firma que la APK instalada en terreno;
4. aumentar el versionCode si corresponde al mecanismo de actualización usado;
5. entregar la APK diagnóstica;
6. pedir al cliente únicamente abrir la aplicación y reproducir el fallo;
7. revisar Crashlytics por versión, Android 13/API 33 y stacktrace.

No corregir el tracking o los permisos hasta obtener el stacktrace real: el crash puede venir de un plugin Cordova, SQLite, WebView, el foreground service u otra etapa del arranque.

## 7. Validación del contrato sin Firebase

La estructura puede validarse sin credenciales ni SDK descargados:

```bash
node --test tests/crashlytics-observability.test.js
```

Esta prueba verifica versiones fijadas, restricciones de datos y el hook que prepara Gradle con un fixture local.
