// Dom7
var $$ = Dom7;
var db= null;
var ip_interna=null;
var ip_externa=null






// Framework7 App main instance
var app  = new Framework7({
  root: '#app', // App root element
  id: 'io.gestiona.gfe', // App bundle ID
  name: 'Framework7', // App name
  theme: 'auto', // Automatic theme detection


  smartSelect: {
    pageTitle: 'Seleccionar Opción',
    sheetCloseLinkText: 'Aceptar',
  },



 
  routes: routes,
  // Enable panel left visibility breakpoint
  panel: {
    leftBreakpoint: 960,
  },


});







// Init/Create left panel view


// Init/Create main view
var mainView = app.views.create('.view-main', {
  pushState: true,
});



//acelerometro
function onSuccess(acceleration) {
    alert('Aceleration X: '  + acceleration.x + '\n' +
          'Aceleration Y: '  + acceleration.y + '\n' +
          'Aceleration Z: '  + acceleration.z + '\n' +
          'Timestamp: '      + acceleration.timestamp + '\n');
}

//error acelerometro
function onError() {
    alert('onError!');
}



//cuando el dispositivo ha cargado todos los elementos
document.addEventListener('deviceready', function() {

  //alert("readys!");
  
  CrearTablas();


  document.addEventListener("backbutton", onBackKeyDown, false);





  //document.addEventListener("backbutton", yourCallbackFunction, false);
  /*function yourCallbackFunction(){
   alert(window.location);
  }*/

  
});


//falta controlar otros aspectos del boton, como las barritas
function onBackKeyDown() {

var p=app.views.main.router.url
var index_android="/android_asset/www/index.html";
var index_n="/";

if(p==index_android || p==index_n){
    app.dialog.confirm("Está seguro que desea salir?","GFE" , function() {
    //alert("salir");
    var deviceType = device.platform;
    //alert(deviceType);
    if(deviceType == "Android" || deviceType == "android"){
      navigator.app.exitApp();
    }
  });
}
else{
  mainView.router.back();
}



function query(){


  alert("la query");
}




function sincronizar()
{

  if (checkConnection()=="No network connection"){
    alert("NO HAY CONEXION A INTERNET")
    return false;
  }
  else{

    }
}



function goBack() {
  window.history.back();
}


function CrearTablas(){

 Tablas_crear_tablas();
 
}


app.init()

