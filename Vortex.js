/*
Vortex by Vortex Group is licensed under a Creative Commons Reconocimiento 3.0 Unported License.
To view a copy of this licence, visit: http://creativecommons.org/licenses/by/3.0/
Project URL: https://sourceforge.net/p/vortexnet
*/


if(typeof(require) != "undefined"){
    var NodoRouter = require("./NodoRouter").clase;
    //var NodoClienteHTTP = require("./NodoClienteHTTP").clase;
    var NodoConectorSocket = require("./NodoConectorSocket").clase;
    var NodoPortalBidi = require("./NodoPortalBidi").clase;
    var cryptico = require("cryptico");
    var io = require('socket.io-client');
    
    exports.GeneradorDeIdMensaje = require("./GeneradorDeIdMensaje").clase;
    exports.ClonadorDeObjetos = require("./ClonadorDeObjetos").clase;
    exports.PataConectora = require("./PataConectora").clase;
    exports.FiltrosYTransformaciones = require("./FiltrosYTransformaciones");
    exports.NodoMultiplexor = require("./NodoMultiplexor").clase;
    exports.NodoRouter = NodoRouter;
    exports.NodoPortalBidi = NodoPortalBidi;
    exports.NodoPortalBidiMonoFiltro = require("./NodoPortalBidiMonoFiltro").clase;
    exports.NodoConectorSocket = NodoConectorSocket;    
    //exports.NodoClienteHTTP = NodoClienteHTTP;    
    exports.NodoConectorHttpServer = require("./NodoConectorHttpServer").clase;   
    
}


var Vortex = Vx = vX = vx = {
    start:function(opt){
        this.verbose = opt.verbose;
        this.router = new NodoRouter();
        this.claveRSAComun = cryptico.generateRSAKey("VORTEXCAPO", 1024);                               //ATA
        this.clavePublicaComun = cryptico.publicKeyString(this.claveRSAComun);                          //PINGO
        this.portales = [];
		
		this.lastRequest = 0;
		
    },
    conectarPorHTTP: function(p){
        var _this = this;
        p.verbose = this.verbose;
        p.alDesconectar = function(){
            _this.conectarPorHTTP(p);
        }
        this.adaptadorHTTP = new NodoClienteHTTP(p);
        this.router.conectarBidireccionalmenteCon(this.adaptadorHTTP);
    },
    conectarPorWebSockets: function(p){
        var _this = this;
        var socket = io.connect(p.url);    
        this.adaptadorWebSockets = new NodoConectorSocket({
            id: "1",
            socket: socket, 
            verbose: this.verbose, 
            alDesconectar:function(){
                _this.conectarPorWebSockets(p);
            }
        });    
        this.router.conectarBidireccionalmenteCon(this.adaptadorWebSockets);
    },
    conectarPorBluetoothConArduino: function(p){
        this.adaptadorArduino = new NodoAdaptadorBluetoothArduino(p);
        this.router.conectarBidireccionalmenteCon(this.adaptadorArduino);
    },
    pedirMensajes: function(p){
        var filtro = p.filtro;
        if(p.filtro.evaluarMensaje === undefined) filtro = new FiltroXEjemplo(p.filtro);    //si no tiene el método evaluarMensaje, no es un filtro. creo uno usando ese objeto como ejemplo
        var portal = new NodoPortalBidi("portal" + this.portales.length);
        portal.conectarBidireccionalmenteCon(this.router);        
        portal.pedirMensajes(filtro, p.callback); 
        this.portales.push(portal);
        return this.portales.length - 1; //devuelvo id del portal/pedido para que el cliente pueda darlos de baja
    },
    pedirMensajesSeguros: function(p, claveRSA){
        var _this = this;
        return this.pedirMensajes({
            filtro:p.filtro,
            callback: function(mensaje){                
                var clave = _this.claveRSAComun;
                if(mensaje.para) clave = claveRSA;
        
                var desencriptado = cryptico.decrypt(mensaje.datos, clave);
                if(desencriptado.status == "success" && desencriptado.signature != "forged"){
                    mensaje.datos = JSON.parse(desencriptado.plaintext);
                    p.callback(mensaje);
                }                    
            }
        })
    },
    enviarMensaje:function(mensaje){
        this.router.recibirMensaje(mensaje);
    },
    enviarMensajeSeguro:function(mensaje, claveRSA){
        var mi_clave_privada = undefined;
        var su_clave_publica = this.clavePublicaComun;
        if(mensaje.de) mi_clave_privada = claveRSA;
        if(mensaje.para) su_clave_publica = mensaje.para;
        mensaje.datos = cryptico.encrypt(JSON.stringify(mensaje.datos), su_clave_publica, mi_clave_privada).cipher
        
        this.router.recibirMensaje(mensaje);
    },
	
	send: function(){
		
		var _this = this;
		
		
		
		var obj = null;
		var callback = null;
		var claveRSA = null;
		
		obj = arguments[0];
		
		if(arguments.length>=2){
			if(typeof(arguments[1])=='function'){
				callback = arguments[1];
			}else if(typeof(arguments[1])=='object'){
				claveRSA = arguments[1];
			}
		}
		
		if(arguments.length>=3){
			if(typeof(arguments[2])=='function'){
				callback = arguments[2];
			}else if(typeof(arguments[2])=='object'){
				claveRSA = arguments[2];
			}
		}
		//////////
		
		
		if(callback){
			obj.idRequest = ++this.lastRequest;
			
			var idPortal = this.when({
				filtro: {
					idRequest: obj.idRequest,
					para: obj.de
				},
				callback: function(objRespuesta){
					callback(objRespuesta);
					
					_this.portales.splice(idPortal, 1);
				}
			});
		}
		
		
		if(claveRSA){
			this.enviarMensajeSeguro(obj, claveRSA);
		}else{
			this.enviarMensaje(obj);
		}
		
	},
	
	when: function(p){
		return this.pedirMensajes(p);
	}
};

if(typeof(require) != "undefined"){
    exports.Vortex = Vortex;
}