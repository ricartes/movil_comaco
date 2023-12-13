


   var defaultDiacriticsRemovalMap = [
        {'base':'A', 'letters':'\u0041\u24B6\uFF21\u00C0\u00C1\u00C2\u1EA6\u1EA4\u1EAA\u1EA8\u00C3\u0100\u0102\u1EB0\u1EAE\u1EB4\u1EB2\u0226\u01E0\u00C4\u01DE\u1EA2\u00C5\u01FA\u01CD\u0200\u0202\u1EA0\u1EAC\u1EB6\u1E00\u0104\u023A\u2C6F'},
        {'base':'AA','letters':'\uA732'},
        {'base':'AE','letters':'\u00C6\u01FC\u01E2'},
        {'base':'AO','letters':'\uA734'},
        {'base':'AU','letters':'\uA736'},
        {'base':'AV','letters':'\uA738\uA73A'},
        {'base':'AY','letters':'\uA73C'},
        {'base':'B', 'letters':'\u0042\u24B7\uFF22\u1E02\u1E04\u1E06\u0243\u0182\u0181'},
        {'base':'C', 'letters':'\u0043\u24B8\uFF23\u0106\u0108\u010A\u010C\u00C7\u1E08\u0187\u023B\uA73E'},
        {'base':'D', 'letters':'\u0044\u24B9\uFF24\u1E0A\u010E\u1E0C\u1E10\u1E12\u1E0E\u0110\u018B\u018A\u0189\uA779\u00D0'},
        {'base':'DZ','letters':'\u01F1\u01C4'},
        {'base':'Dz','letters':'\u01F2\u01C5'},
        {'base':'E', 'letters':'\u0045\u24BA\uFF25\u00C8\u00C9\u00CA\u1EC0\u1EBE\u1EC4\u1EC2\u1EBC\u0112\u1E14\u1E16\u0114\u0116\u00CB\u1EBA\u011A\u0204\u0206\u1EB8\u1EC6\u0228\u1E1C\u0118\u1E18\u1E1A\u0190\u018E'},
        {'base':'F', 'letters':'\u0046\u24BB\uFF26\u1E1E\u0191\uA77B'},
        {'base':'G', 'letters':'\u0047\u24BC\uFF27\u01F4\u011C\u1E20\u011E\u0120\u01E6\u0122\u01E4\u0193\uA7A0\uA77D\uA77E'},
        {'base':'H', 'letters':'\u0048\u24BD\uFF28\u0124\u1E22\u1E26\u021E\u1E24\u1E28\u1E2A\u0126\u2C67\u2C75\uA78D'},
        {'base':'I', 'letters':'\u0049\u24BE\uFF29\u00CC\u00CD\u00CE\u0128\u012A\u012C\u0130\u00CF\u1E2E\u1EC8\u01CF\u0208\u020A\u1ECA\u012E\u1E2C\u0197'},
        {'base':'J', 'letters':'\u004A\u24BF\uFF2A\u0134\u0248'},
        {'base':'K', 'letters':'\u004B\u24C0\uFF2B\u1E30\u01E8\u1E32\u0136\u1E34\u0198\u2C69\uA740\uA742\uA744\uA7A2'},
        {'base':'L', 'letters':'\u004C\u24C1\uFF2C\u013F\u0139\u013D\u1E36\u1E38\u013B\u1E3C\u1E3A\u0141\u023D\u2C62\u2C60\uA748\uA746\uA780'},
        {'base':'LJ','letters':'\u01C7'},
        {'base':'Lj','letters':'\u01C8'},
        {'base':'M', 'letters':'\u004D\u24C2\uFF2D\u1E3E\u1E40\u1E42\u2C6E\u019C'},
        {'base':'N', 'letters':'\u004E\u24C3\uFF2E\u01F8\u0143\u00D1\u1E44\u0147\u1E46\u0145\u1E4A\u1E48\u0220\u019D\uA790\uA7A4'},
        {'base':'NJ','letters':'\u01CA'},
        {'base':'Nj','letters':'\u01CB'},
        {'base':'O', 'letters':'\u004F\u24C4\uFF2F\u00D2\u00D3\u00D4\u1ED2\u1ED0\u1ED6\u1ED4\u00D5\u1E4C\u022C\u1E4E\u014C\u1E50\u1E52\u014E\u022E\u0230\u00D6\u022A\u1ECE\u0150\u01D1\u020C\u020E\u01A0\u1EDC\u1EDA\u1EE0\u1EDE\u1EE2\u1ECC\u1ED8\u01EA\u01EC\u00D8\u01FE\u0186\u019F\uA74A\uA74C'},
        {'base':'OI','letters':'\u01A2'},
        {'base':'OO','letters':'\uA74E'},
        {'base':'OU','letters':'\u0222'},
        {'base':'OE','letters':'\u008C\u0152'},
        {'base':'oe','letters':'\u009C\u0153'},
        {'base':'P', 'letters':'\u0050\u24C5\uFF30\u1E54\u1E56\u01A4\u2C63\uA750\uA752\uA754'},
        {'base':'Q', 'letters':'\u0051\u24C6\uFF31\uA756\uA758\u024A'},
        {'base':'R', 'letters':'\u0052\u24C7\uFF32\u0154\u1E58\u0158\u0210\u0212\u1E5A\u1E5C\u0156\u1E5E\u024C\u2C64\uA75A\uA7A6\uA782'},
        {'base':'S', 'letters':'\u0053\u24C8\uFF33\u1E9E\u015A\u1E64\u015C\u1E60\u0160\u1E66\u1E62\u1E68\u0218\u015E\u2C7E\uA7A8\uA784'},
        {'base':'T', 'letters':'\u0054\u24C9\uFF34\u1E6A\u0164\u1E6C\u021A\u0162\u1E70\u1E6E\u0166\u01AC\u01AE\u023E\uA786'},
        {'base':'TZ','letters':'\uA728'},
        {'base':'U', 'letters':'\u0055\u24CA\uFF35\u00D9\u00DA\u00DB\u0168\u1E78\u016A\u1E7A\u016C\u00DC\u01DB\u01D7\u01D5\u01D9\u1EE6\u016E\u0170\u01D3\u0214\u0216\u01AF\u1EEA\u1EE8\u1EEE\u1EEC\u1EF0\u1EE4\u1E72\u0172\u1E76\u1E74\u0244'},
        {'base':'V', 'letters':'\u0056\u24CB\uFF36\u1E7C\u1E7E\u01B2\uA75E\u0245'},
        {'base':'VY','letters':'\uA760'},
        {'base':'W', 'letters':'\u0057\u24CC\uFF37\u1E80\u1E82\u0174\u1E86\u1E84\u1E88\u2C72'},
        {'base':'X', 'letters':'\u0058\u24CD\uFF38\u1E8A\u1E8C'},
        {'base':'Y', 'letters':'\u0059\u24CE\uFF39\u1EF2\u00DD\u0176\u1EF8\u0232\u1E8E\u0178\u1EF6\u1EF4\u01B3\u024E\u1EFE'},
        {'base':'Z', 'letters':'\u005A\u24CF\uFF3A\u0179\u1E90\u017B\u017D\u1E92\u1E94\u01B5\u0224\u2C7F\u2C6B\uA762'},
        {'base':'a', 'letters':'\u0061\u24D0\uFF41\u1E9A\u00E0\u00E1\u00E2\u1EA7\u1EA5\u1EAB\u1EA9\u00E3\u0101\u0103\u1EB1\u1EAF\u1EB5\u1EB3\u0227\u01E1\u00E4\u01DF\u1EA3\u00E5\u01FB\u01CE\u0201\u0203\u1EA1\u1EAD\u1EB7\u1E01\u0105\u2C65\u0250'},
        {'base':'aa','letters':'\uA733'},
        {'base':'ae','letters':'\u00E6\u01FD\u01E3'},
        {'base':'ao','letters':'\uA735'},
        {'base':'au','letters':'\uA737'},
        {'base':'av','letters':'\uA739\uA73B'},
        {'base':'ay','letters':'\uA73D'},
        {'base':'b', 'letters':'\u0062\u24D1\uFF42\u1E03\u1E05\u1E07\u0180\u0183\u0253'},
        {'base':'c', 'letters':'\u0063\u24D2\uFF43\u0107\u0109\u010B\u010D\u00E7\u1E09\u0188\u023C\uA73F\u2184'},
        {'base':'d', 'letters':'\u0064\u24D3\uFF44\u1E0B\u010F\u1E0D\u1E11\u1E13\u1E0F\u0111\u018C\u0256\u0257\uA77A'},
        {'base':'dz','letters':'\u01F3\u01C6'},
        {'base':'e', 'letters':'\u0065\u24D4\uFF45\u00E8\u00E9\u00EA\u1EC1\u1EBF\u1EC5\u1EC3\u1EBD\u0113\u1E15\u1E17\u0115\u0117\u00EB\u1EBB\u011B\u0205\u0207\u1EB9\u1EC7\u0229\u1E1D\u0119\u1E19\u1E1B\u0247\u025B\u01DD'},
        {'base':'f', 'letters':'\u0066\u24D5\uFF46\u1E1F\u0192\uA77C'},
        {'base':'g', 'letters':'\u0067\u24D6\uFF47\u01F5\u011D\u1E21\u011F\u0121\u01E7\u0123\u01E5\u0260\uA7A1\u1D79\uA77F'},
        {'base':'h', 'letters':'\u0068\u24D7\uFF48\u0125\u1E23\u1E27\u021F\u1E25\u1E29\u1E2B\u1E96\u0127\u2C68\u2C76\u0265'},
        {'base':'hv','letters':'\u0195'},
        {'base':'i', 'letters':'\u0069\u24D8\uFF49\u00EC\u00ED\u00EE\u0129\u012B\u012D\u00EF\u1E2F\u1EC9\u01D0\u0209\u020B\u1ECB\u012F\u1E2D\u0268\u0131'},
        {'base':'j', 'letters':'\u006A\u24D9\uFF4A\u0135\u01F0\u0249'},
        {'base':'k', 'letters':'\u006B\u24DA\uFF4B\u1E31\u01E9\u1E33\u0137\u1E35\u0199\u2C6A\uA741\uA743\uA745\uA7A3'},
        {'base':'l', 'letters':'\u006C\u24DB\uFF4C\u0140\u013A\u013E\u1E37\u1E39\u013C\u1E3D\u1E3B\u017F\u0142\u019A\u026B\u2C61\uA749\uA781\uA747'},
        {'base':'lj','letters':'\u01C9'},
        {'base':'m', 'letters':'\u006D\u24DC\uFF4D\u1E3F\u1E41\u1E43\u0271\u026F'},
        {'base':'n', 'letters':'\u006E\u24DD\uFF4E\u01F9\u0144\u00F1\u1E45\u0148\u1E47\u0146\u1E4B\u1E49\u019E\u0272\u0149\uA791\uA7A5'},
        {'base':'nj','letters':'\u01CC'},
        {'base':'o', 'letters':'\u006F\u24DE\uFF4F\u00F2\u00F3\u00F4\u1ED3\u1ED1\u1ED7\u1ED5\u00F5\u1E4D\u022D\u1E4F\u014D\u1E51\u1E53\u014F\u022F\u0231\u00F6\u022B\u1ECF\u0151\u01D2\u020D\u020F\u01A1\u1EDD\u1EDB\u1EE1\u1EDF\u1EE3\u1ECD\u1ED9\u01EB\u01ED\u00F8\u01FF\u0254\uA74B\uA74D\u0275'},
        {'base':'oi','letters':'\u01A3'},
        {'base':'ou','letters':'\u0223'},
        {'base':'oo','letters':'\uA74F'},
        {'base':'p','letters':'\u0070\u24DF\uFF50\u1E55\u1E57\u01A5\u1D7D\uA751\uA753\uA755'},
        {'base':'q','letters':'\u0071\u24E0\uFF51\u024B\uA757\uA759'},
        {'base':'r','letters':'\u0072\u24E1\uFF52\u0155\u1E59\u0159\u0211\u0213\u1E5B\u1E5D\u0157\u1E5F\u024D\u027D\uA75B\uA7A7\uA783'},
        {'base':'s','letters':'\u0073\u24E2\uFF53\u00DF\u015B\u1E65\u015D\u1E61\u0161\u1E67\u1E63\u1E69\u0219\u015F\u023F\uA7A9\uA785\u1E9B'},
        {'base':'t','letters':'\u0074\u24E3\uFF54\u1E6B\u1E97\u0165\u1E6D\u021B\u0163\u1E71\u1E6F\u0167\u01AD\u0288\u2C66\uA787'},
        {'base':'tz','letters':'\uA729'},
        {'base':'u','letters': '\u0075\u24E4\uFF55\u00F9\u00FA\u00FB\u0169\u1E79\u016B\u1E7B\u016D\u00FC\u01DC\u01D8\u01D6\u01DA\u1EE7\u016F\u0171\u01D4\u0215\u0217\u01B0\u1EEB\u1EE9\u1EEF\u1EED\u1EF1\u1EE5\u1E73\u0173\u1E77\u1E75\u0289'},
        {'base':'v','letters':'\u0076\u24E5\uFF56\u1E7D\u1E7F\u028B\uA75F\u028C'},
        {'base':'vy','letters':'\uA761'},
        {'base':'w','letters':'\u0077\u24E6\uFF57\u1E81\u1E83\u0175\u1E87\u1E85\u1E98\u1E89\u2C73'},
        {'base':'x','letters':'\u0078\u24E7\uFF58\u1E8B\u1E8D'},
        {'base':'y','letters':'\u0079\u24E8\uFF59\u1EF3\u00FD\u0177\u1EF9\u0233\u1E8F\u00FF\u1EF7\u1E99\u1EF5\u01B4\u024F\u1EFF'},
        {'base':'z','letters':'\u007A\u24E9\uFF5A\u017A\u1E91\u017C\u017E\u1E93\u1E95\u01B6\u0225\u0240\u2C6C\uA763'}
    ];




var normalize = (function() {
  var from = "ÃÀÁÄÂÈÉËÊÌÍÏÎÒÓÖÔÙÚÜÛãàáäâèéëêìíïîòóöôùúüûÑñÇç", 
      to   = "AAAAAEEEEIIIIOOOOUUUUaaaaaeeeeiiiioooouuuunncc",
      mapping = {};
 
  for(var i = 0, j = from.length; i < j; i++ )
      mapping[ from.charAt( i ) ] = to.charAt( i );
 
  return function( str ) {
      var ret = [];
      for( var i = 0, j = str.length; i < j; i++ ) {
          var c = str.charAt( i );
          if( mapping.hasOwnProperty( str.charAt( i ) ) )
              ret.push( mapping[ c ] );
          else
              ret.push( c );
      }      
      return ret.join( '' );
  }
 
})();


function CrearError(dict,err){
	var er=new CL_Error(parseInt(dict["CODIGO"]),dict["MENSAJE"]);
	return er;
}





function Obtener_dato_local(nombre){
	return localStorage.getItem(nombre);
}

function Guardar_dato_local(nombre,valor){
	localStorage.setItem(nombre, valor);
}

function Borrar_dato_local(nombre){
	localStorage.removeItem(nombre);
}


function coordenadas_avanzadas(valor,callback){ 
  AdvancedGeolocation.start(function(success){
        try{
            var jsonObject = JSON.parse(success);


            switch(jsonObject.provider){
                case "gps":
                  if(jsonObject.latitude != "0.0"){
                    var ubicacion = new CL_Ubicacion(jsonObject.latitude,jsonObject.longitude,jsonObject.accuracy);

                    typeof callback == "function" && callback(ubicacion);
                  }
           
                  break;

                case "network":

                     
                    break;

                case "satellite":
                
                    break;
                    
                case "cell_info":
                
                  break;
                  
                case "cell_location":
                
                  break;  
                
                case "signal_strength":
                
                  break;                
            }

           
        }
        catch(exc){
            console.log("Invalid JSON: " + exc);
        }
    },
    function(error){
        console.log("ERROR! " + JSON.stringify(error));
    },
    ////////////////////////////////////////////
    //
    // REQUIRED:
    // These are required Configuration options!
    // See API Reference for additional details.
    //
    ////////////////////////////////////////////
    {
        "minTime":500,         // Min time interval between updates (ms)
        "minDistance":1,       // Min distance between updates (meters)
        "noWarn":true,         // Native location provider warnings
        "providers":"all",     // Return GPS, NETWORK and CELL locations
        "useCache":true,       // Return GPS and NETWORK cached locations
        "satelliteData":false, // Return of GPS satellite info
        "buffer":false,        // Buffer location data
        "bufferSize":0,        // Max elements in buffer
        "signalStrength":false // Return cell signal strength data
    });
}


function ubicacion_kill(valor,callback){

    AdvancedGeolocation.stop(function(success){
       typeof callback == "function" && callback(1);
       
    });


}


function Coordenadas(callback){

   watchPositionOptions = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        };
        
    watchID = navigator.geolocation.watchPosition(function (position) {
        
        var coords = position.coords;
       typeof callback == "function" && callback(coords);
    }, function (error) {
      typeof callback == "function" && callback(0);
        
    }, watchPositionOptions);
}
setTimeout(Coordenadas(), 5000);


function checkConnection() {
    var networkState = navigator.connection.type;
 
    var states = {};
    states[Connection.UNKNOWN]  = 'Unknown connection';
    states[Connection.ETHERNET] = 'Ethernet connection';
    states[Connection.WIFI]     = 'WiFi connection';
    states[Connection.CELL_2G]  = 'Cell 2G connection';
    states[Connection.CELL_3G]  = 'Cell 3G connection';
    states[Connection.CELL_4G]  = 'Cell 4G connection';
    states[Connection.CELL]     = 'Cell generic connection';
    states[Connection.NONE]     = 'No network connection';
 
    return states[networkState];
}

function reiniciar_combo(combo,divtexto,opcion){
    var htmls="";
    htmls+="<option value='' selected> SELECCIONAR</option>";
    $$(combo).html(htmls);
    $$(divtexto).html('SELECCIONAR<div class="item-title" style="width: 100%;"></div>');

    //if(opcion==1) combo_cliente();


}


  function cargar_datos_usuario(zona){
    $$("#usuario").html(Obtener_dato_local("user_activo"))
  }


function currencyFormat(num) {
  return num.toFixed(0).replace(/(\d)(?=(\d{3})+(?!\d))/g, '1.')
}

function currencyFormatVolumen(num) {
  return (
    num
      .toFixed(2) // always two decimal digits
      .replace('.', ',') // replace decimal point character with ,
      .replace(/(\d)(?=(\d{3})+(?!\d))/g, '1.')
  ) // use . as a separator
}


function formatear_decimal(num){
  return num.toFixed(2);
}

function formatear_decimal_m3(num){
  return num.toFixed(3);
}

function formatear_precio(num){
  return num.toFixed(0);
}


var obtener_IDUNICO = function () { 
// Math.random should be unique because of its seeding algorithm. 
// Convert it to base 36 (numbers + letters), and grab the first 9 characters 
// after the decimal. 
  return '_' + Math.random().toString(36).substr(2, 15); 
};



function alerta(opcion){


  switch(opcion){
    case 1:
      app.dialog.alert("No se puede continuar, debido a que no existen productos asociados","Emisión desde faena");
    break;

    case 2:
      app.dialog.alert("No se puede continuar, faltan alturas laterales por ingresar","Detalle MR");
    break;

    case 3:
      app.dialog.alert("Faltan datos por ingresar","GFE");
    break;

    case 4:
      app.dialog.alert("El rut de chofer ingresado es invalido.\n Recuerde que el formato es xxxxxxxx-x","GFE");
    break;

    case 5:
      app.dialog.alert("Falta ingresar el nombre de chofer","GFE");
    break;

    case 6:
      app.dialog.alert("Fecha/Hora con formato inválido","GFE");
    break;

    case 7:
      app.dialog.alert("No se pudo obtener la ubicación.\n Si el problema persiste, reiniciar la aplicación","GFE");
    break;

    case 8:
      app.dialog.alert("Si modifica este valor, los anchos y alturas ingresadas se van a restablecer a 0","GFE");
    break;

    case 9:
      app.dialog.alert("Dato de pantente inválido","GFE");
    break;

    case 10:
      app.dialog.alert("Volumen total no debe ser igual a 0","GFE");
    break;

    case 11:
      app.dialog.alert("Precio total no debe ser igual a 0","GFE");
    break;

     case 12:
      app.dialog.alert("Cargador es requerido","GFE");
    break;

    case 13:
      app.dialog.alert("Texto ingresado en GUÍA PROVEEDOR tiene un tamaño mayor que el máximo (12)","GFE");
    break;


    case 14:
     app.dialog.alert("Texto ingresado en VOLUMEN PROVEEDOR tiene un tamaño mayor que el máximo (12)","GFE");
    break;

    case 15:
     app.dialog.alert("Dato de año ingresado es inválido","GFE");
    break;


    case 16:
     app.dialog.alert("Patente seleccionada no está habilitada para despacho. Por favor, seleccione otra.","GFE");
    break;

    case 17:
     app.dialog.alert("Ubicación se encuentra fuera del KMZ permitido.","GFE");
    break;

    case 18:
       app.dialog.alert("No se puede continuar debido a que la ubicación se encuentra fuera del KMZ.","GFE");
    break;
   

    }
    
}




function separador_miles (n) {
  n = String(n).replace(/\D/g, "");
  return n === '' ? n : Number(n).toLocaleString();
}



function FechaHoraActual() {

  var d = new Date();
  var dformat =
  d.getFullYear() + "-" + 
  ("00" + (d.getMonth() + 1)).slice(-2) + "-" + 
  ("00" + d.getDate()).slice(-2) + " " + 
  ("00" + d.getHours()).slice(-2) + ":" + 
  ("00" + d.getMinutes()).slice(-2);
  
  return dformat;

}



function fecha_actual(){
  var today = new Date();
  var dd = String(today.getDate()).padStart(2, '0');
  var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
  var yyyy = today.getFullYear();
  var fechita = yyyy+"-"+mm+"-"+dd;
  //alert(fechita);
  return fechita;
}


function calcula_volumen(num) {
   
    var with2Decimals = num.toString().match(/^-?\d+(?:\.\d{0,2})?/)[0]
    rounded.value = with2Decimals;

    return with2Decimals;
}


var formatNumber = {
   separador: ".", // separador para los miles
   sepDecimal: ',', // separador para los decimales
   formatear:function (num){
   num +='';
   var splitStr = num.split('.');
   var splitLeft = splitStr[0];
   var splitRight = splitStr.length > 1 ? this.sepDecimal + splitStr[1] : '';
   var regx = /(\d+)(\d{3})/;
   while (regx.test(splitLeft)) {
   splitLeft = splitLeft.replace(regx, '$1' + this.separador + '$2');
   }
   return this.simbol + splitLeft +splitRight;
   },
   new:function(num, simbol){
   this.simbol = simbol ||'';
   return this.formatear(num);
   }
}




var Fn = {
  // Valida el rut con su cadena completa "XXXXXXXX-X"
  validaRut : function (rutCompleto) {
    rutCompleto = rutCompleto.replace("‐","-");
    if (!/^[0-9]+[-|‐]{1}[0-9kK]{1}$/.test( rutCompleto ))
      return false;
    var tmp   = rutCompleto.split('-');
    var digv  = tmp[1]; 
    var rut   = tmp[0];
    if ( digv == 'K' ) digv = 'k' ;
    
    return (Fn.dv(rut) == digv );
  },
  dv : function(T){
    var M=0,S=1;
    for(;T;T=Math.floor(T/10))
      S=(S+T%10*(9-M++%6))%11;
    return S?S-1:'k';
  }
}


function formateaRut(rut) {

    var actual = rut.replace(/^0+/, "");
    if (actual != '' && actual.length > 1) {
        var sinPuntos = actual.replace(/\./g, "");
        var actualLimpio = sinPuntos.replace(/-/g, "");
        var inicio = actualLimpio.substring(0, actualLimpio.length - 1);
        var rutPuntos = "";
        var i = 0;
        var j = 1;
        for (i = inicio.length - 1; i >= 0; i--) {
            var letra = inicio.charAt(i);
            rutPuntos = letra + rutPuntos;
            if (j % 3 == 0 && j <= inicio.length - 1) {
                rutPuntos = "." + rutPuntos;
            }
            j++;
        }
        var dv = actualLimpio.substring(actualLimpio.length - 1);
        rutPuntos = rutPuntos + "-" + dv;
    }
    return rutPuntos;
}




  function ValidateDate(dt) {
        try {
            var isValidDate = false;
            var arr1 = dt.split('/');
            var year=0;var month=0;var day=0;var hour=0;var minute=0;var sec=0;
            if(arr1.length == 3)
            {
                var arr2 = arr1[2].split(' ');
                if(arr2.length == 2)
                {
                    var arr3 = arr2[1].split(':');
                    try{
                        year = parseInt(arr2[0],10);
                        month = parseInt(arr1[1],10);
                        day = parseInt(arr1[0],10);
                        hour = parseInt(arr3[0],10);
                        minute = parseInt(arr3[1],10);
                        //sec = parseInt(arr3[0],10);
                        sec = 0;
                        var isValidTime=false;
                        if(hour >=0 && hour <=23 && minute >=0 && minute<=59 && sec >=0 && sec<=59)
                            isValidTime=true;
                        else if(hour ==24 && minute ==0 && sec==0)
                            isValidTime=true;

                        if(isValidTime)
                        {
                            var isLeapYear = false;
                            if(year % 4 == 0)
                                 isLeapYear = true;

                            if((month==4 || month==6|| month==9|| month==11) && (day>=0 && day <= 30))
                                    isValidDate=true;
                            else if((month!=2) && (day>=0 && day <= 31))
                                    isValidDate=true;

                            if(!isValidDate){
                                if(isLeapYear)
                                {
                                    if(month==2 && (day>=0 && day <= 29))
                                        isValidDate=true;
                                }
                                else
                                {
                                    if(month==2 && (day>=0 && day <= 28))
                                        isValidDate=true;
                                }
                            }
                        }
                    }
                    catch(er){isValidDate = false;}
                }

            }

            return isValidDate;
        }
        catch (err) { alert('ValidateDate: ' + err); }
    }



    function nombre_mes(mes){
    
      var messtr ="";
      switch (mes){
        case 1:
          messtr="ENERO";
        break;
         case 2:
          messtr="FEBRERO";
        break;
         case 3:
          messtr="MARZO";
        break;
         case 4:
          messtr="ABRIL";
        break;
         case 5:
          messtr="MAYO";
        break;
         case 6:
          messtr="JUNIO";
        break;
         case 7:
          messtr="JULIO";
        break;
         case 8:
          messtr="AGOSTO";
        break;
         case 9:
          messtr="SEPTIEMBRE";
        break;
         case 10:
          messtr="OCTUBRE";
        break;
         case 11:
          messtr="NOVIEMBRE";
        break;
         case 12:
          messtr="DICIEMBRE";
        break;
      }


      return messtr;

    }




function ir_atras_boton(){
  mainView.router.navigate('/');
}


function htmlEscape(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}


function numberWithCommas(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}


function encode_utf8(s) {
  return unescape(encodeURIComponent(s));
}

function decode_utf8(s) {
  return decodeURIComponent(escape(s));
}

function utf8_from_str(s) {
    for(var i=0, enc = encodeURIComponent(s), a = []; i < enc.length;) {
        if(enc[i] === '%') {
            a.push(parseInt(enc.substr(i+1, 2), 16))
            i += 3
        } else {
            a.push(enc.charCodeAt(i++))
        }
    }
    return a
}


function removeSpecials(str) {
    var lower = str.toLowerCase();
    var upper = str.toUpperCase();

    var res = "";
    for(var i=0; i<lower.length; ++i) {
        if(lower[i] != upper[i] || lower[i].trim() === '')
            res += str[i];
    }
    return res;
}


function daysBetween(first, second) {

    // Copy date parts of the timestamps, discarding the time parts.
    var one = new Date(first.getFullYear(), first.getMonth(), first.getDate());
    var two = new Date(second.getFullYear(), second.getMonth(), second.getDate());

    // Do the math.
    var millisecondsPerDay = 1000 * 60 * 60 * 24;
    var millisBetween = two.getTime() - one.getTime();
    var days = millisBetween / millisecondsPerDay;

    // Round down.
    return Math.floor(days);
}


/**
 * 
 */
function permisosCamara() {
    cordova.plugins.permissions.requestPermission(cordova.plugins.permissions.READ_MEDIA_IMAGES);
    cordova.plugins.permissions.requestPermission(cordova.plugins.permissions.READ_MEDIA_VIDEO );
  }