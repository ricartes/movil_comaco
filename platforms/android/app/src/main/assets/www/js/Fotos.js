var id_gde;
var tipoevidencia;
var evidencia_actual;

var options_gps = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: Infinity
};



// Called when a photo is successfully retrieved 
// 
function onPhotoFileSuccess(imageData) {

    movePic(imageData);

}



function movePic(file) {

    //alert("file es "+file);
    window.resolveLocalFileSystemURL(file, resolveOnSuccess, resOnError);
}


//Callback function when the file system uri has been resolved
function resolveOnSuccess(entry) {
    //alert("aca debo llegar");
    var d = new Date();
    var n = d.getTime();
    //new file name
    var newFileName = Obtener_dato_local("rut_activo") + "_" + n + ".jpg";
    //var newFileName = ID() + ".jpg";
    //alert("resolver")
    var myFolderApp = "fotos";

    window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, function (fileSys) {
        //The folder is created if doesn't exist    
        fileSys.root.getDirectory(myFolderApp,
            { create: true, exclusive: false },
            function (directory) {
                entry.moveTo(directory, newFileName, successMove, resOnError);
            },
            resOnError);
    },
        resOnError);
}




function asigna_ruta_fotos(nombre_directorio, callback) {

    //alert(nombre_directorio);
    window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, function (fileSys) {
        //The folder is created if doesn't exist    
        fileSys.root.getDirectory(nombre_directorio,
            { create: true, exclusive: false },
            function (directory) {
                typeof callback == "function" && callback(directory.nativeURL);
            },
            resOnError);
    },
        resOnError);


}







function successMove(entry) {
    //Store imagepath in session for future use
    // like to store it in database
    //alert(entry.fullPath);
    //alert(entry.toURL());
    //document.getElementById('archivo_foto').value = entry.fullPath;

    //alert(entry.fullPath)

    var fullpatch = entry.fullPath;
    asignarEvidenciaFoto(entry);






    //sessionStorage.setItem('imagepath', entry.fullPath);
}


function asignarEvidenciaFoto(entry) {


    var evidencia = new CL_GDE_Evidencia();
    evidencia.ID_UNICO_MOVIL = "evid_gde" + obtener_IDUNICO();
    evidencia.ID_GDE = id_gde
    evidencia.GDE_ESTADO_MOVIL = "B";
    evidencia.FECHA_EVIDENCIA = "";
    evidencia.OBSERVACION = "";
    evidencia.ARCHIVO = entry.toURL();
    evidencia.ENVIADO = 0;
    evidencia.TIPO_EVIDENCIA = tipoevidencia;



    DATOS_seleccionar_gde_proveedor(evidencia.ID_GDE, function (result_gde) {
        evidencia.ID_UNICO_MOVIL_GDE = result_gde.ID_UNICO_MOVIL;
        evidencia_actual = evidencia;
        getLocation_evidencia();
    });




}


function showPosition_evidencia(position) {
    app.dialog.close();
    guarda_evidencia_foto(position.coords.latitude, position.coords.longitude);
    //return position;
    //guardar_datos_guia(position.coords.latitude,position.coords.longitude );
    //alert("Latitude: " + position.coords.latitude + "Longitude: " + position.coords.longitude);
}

function error_gps_evidencia(err) {
    //console.warn('ERROR(' + err.code + '): ' + err.message);
    app.dialog.close();
    app.dialog.alert("Coordenadas no obtenidas. Favor revisar la configuración de GPS", "GFE");
    guarda_evidencia_foto(0, 0);
    //imprimir_guia();
};


function getLocation_evidencia() {
    app.dialog.preloader("Obteniendo ubicación");
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(showPosition_evidencia, error_gps_evidencia, options_gps);
    }
    else {
        app.dialog.close();
        app.dialog.alert("Coordenadas no obtenidas. Favor revisar la configuración de GPS", "GFE");
        guarda_evidencia_foto(0, 0);

    }
}



function guarda_evidencia_foto(latitud, longitud) {

    evidencia_actual.EVIDENCIA_COORDENADA_X = latitud;
    evidencia_actual.EVIDENCIA_COORDENADA_Y = longitud;
    if (evidencia_actual.TIPO_EVIDENCIA == constantes.tipoEvidencia.camionVacio1) {
        evidencia_actual.OBSERVACION = "EVIDENCIA CAMION VACIO 1";
    }
    if (evidencia_actual.TIPO_EVIDENCIA == constantes.tipoEvidencia.camionCargado1) {
        evidencia_actual.OBSERVACION = "EVIDENCIA CAMION CARGADO 1";
    }

    if (evidencia_actual.TIPO_EVIDENCIA == constantes.tipoEvidencia.camionVacio2) {
        evidencia_actual.OBSERVACION = "EVIDENCIA CAMION VACIO 2";
    }

    if (evidencia_actual.TIPO_EVIDENCIA == constantes.tipoEvidencia.camionCargado2) {
        evidencia_actual.OBSERVACION = "EVIDENCIA CAMION CARGADO 2";
    }

    if (evidencia_actual.TIPO_EVIDENCIA == constantes.tipoEvidencia.padronVehiculo) {
        evidencia_actual.OBSERVACION = "EVIDENCIA PADRON VEHICULO";
    }

    if (evidencia_actual.TIPO_EVIDENCIA == constantes.tipoEvidencia.ingresoPlanta) {
        evidencia_actual.OBSERVACION = "EVIDENCIA CONFIRMA INGRESO PLANTA";
    }




    if (evidencia_actual.TIPO_EVIDENCIA == constantes.tipoEvidencia.camionVacio1
        || evidencia_actual.TIPO_EVIDENCIA == constantes.tipoEvidencia.camionCargado1
        || evidencia_actual.TIPO_EVIDENCIA == constantes.tipoEvidencia.camionVacio2
        || evidencia_actual.TIPO_EVIDENCIA == constantes.tipoEvidencia.camionCargado2
        || evidencia_actual.TIPO_EVIDENCIA == constantes.tipoEvidencia.padronVehiculo) {
        DATOS_borra_evidencia_guia(evidencia_actual, function (result_guardado) {
            DATOS_guardar_evidencia_guia(evidencia_actual, function (result_guardado) {
                //vacio 1, vacio 2
                if (evidencia_actual.TIPO_EVIDENCIA == constantes.tipoEvidencia.camionVacio1
                    || evidencia_actual.TIPO_EVIDENCIA == constantes.tipoEvidencia.camionVacio2) {
                    cargar_evidencia_camion_vacio(evidencia_actual, evidencia_actual.TIPO_EVIDENCIA);
                }
                //cargado 1, cargado 2
                if (evidencia_actual.TIPO_EVIDENCIA == constantes.tipoEvidencia.camionCargado1
                    || evidencia_actual.TIPO_EVIDENCIA == constantes.tipoEvidencia.camionCargado2) {
                    cargar_evidencia_camion_cargado(evidencia_actual, evidencia_actual.TIPO_EVIDENCIA);
                }

                //padron
                if (evidencia_actual.TIPO_EVIDENCIA == constantes.tipoEvidencia.padronVehiculo) {
                    cargar_evidencia_padron_vehiculo(evidencia_actual, evidencia_actual.TIPO_EVIDENCIA);
                }


            });

        });
    } else {
        DATOS_guardar_evidencia_guia(evidencia_actual, function (result_guardado) {
            confirmaCargaEvidencia(evidencia_actual.ID_GDE);
            //cargar_datos_evidencia(evidencia_actual.ID_GDE);
        });
    }


}


function resOnError(error) {
    //alert("un error");
    alert(error.code);
}


/*
  1=camion vacio 1
  2=camion cargado 1
  3= camion vacio 2 
  4= camion cargado 2
  5= padron
*/
function capturePhotoWithFile(idgde, tipo_evidencia) {

    id_gde = idgde;
    tipoevidencia = tipo_evidencia;

    navigator.camera.getPicture(onPhotoFileSuccess, onFail, {
        quality: 90, destinationType: Camera.DestinationType.FILE_URI, targetWidth: 1920,
        targetHeight: 1080
    });
}


// Called if something bad happens. 
//  
function onFail(message) {
    alert('Failed because: ' + message);
}


function borra_archivo_foto(idgde, RutaImagen) {

    var lastIndex = RutaImagen.lastIndexOf("/")
    var path = RutaImagen.substr(0, lastIndex);
    var filename = RutaImagen.substr(lastIndex + 1);

    window.resolveLocalFileSystemURL(path, function (dir) {
        dir.getFile(filename, { create: false }, function (fileEntry) {
            fileEntry.remove(function () {
                confirma_borrado_foto(idgde);
            }, function (error) {
                // Error deleting the file
            }, function () {
                // The file doesn't exist
            });
        });
    });
}


function confirma_borrado_foto(idgde) {
    cargar_datos_evidencia(idgde);
}