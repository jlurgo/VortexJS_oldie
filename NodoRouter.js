/*
Vortex by Vortex Group is licensed under a Creative Commons Reconocimiento 3.0 Unported License.
To view a copy of this licence, visit: http://creativecommons.org/licenses/by/3.0/
Project URL: https://sourceforge.net/p/vortexnet
*/

if(typeof(require) != "undefined"){
    var Filtros = require("./Filtros");
    var _ = require("./underscore-min");
    var FiltroOR = Filtros.FiltroOR;
    var FiltroAND = Filtros.FiltroAND;
    var FiltroFalse = Filtros.FiltroFalse;
    var FiltroXEjemplo = Filtros.FiltroXEjemplo;
    var DesSerializadorDeFiltros = Filtros.DesSerializadorDeFiltros;
}

var NodoRouter = function(){
    this.datosVecinos = [];
	this.pedidos = [];
    this.proximoIdPedido = 0;
};

NodoRouter.prototype.send = function (un_mensaje, callback) {		
	var _this = this;
	if(callback){
		un_mensaje.idRequest = this.randomString(32);
		var pedido = this.when({
            tipoDeMensaje: "Vortex.respuesta",
            responseTo: un_mensaje.idRequest
        }, function(respuesta){
            callback(respuesta);
            pedido.remove();
        });
	}	
	
	//ejecuto el callback que corresponda
	_.forEach(this.pedidos, function (un_pedido) {
        if(un_pedido.filtro.eval(un_mensaje)){ 
            setTimeout(function(){    
				if(un_mensaje.idRequest) 
					un_pedido.callback(un_mensaje, {
						send: function(respuesta){
							respuesta.tipoDeMensaje = "Vortex.respuesta";
							respuesta.responseTo = un_mensaje.idRequest;
							_this.send(respuesta);
						}
					});
				else un_pedido.callback(un_mensaje); 
            },0);
        }
    });
	
	
	//envío a los vecinos que corresponda
	_.forEach(this.datosVecinos, function (datos_de_un_vecino) {
        if(datos_de_un_vecino.filtroRecibido.eval(un_mensaje)){ 
            setTimeout(function(){              
                datos_de_un_vecino.vecino.recibirMensaje(un_mensaje, this);  
            },0);
        }
    });
};

NodoRouter.prototype.when = function (filtro, callback) {
	if(!filtro.eval) filtro = new FiltroXEjemplo(filtro);
    var id_pedido = this.proximoIdPedido;
    this.proximoIdPedido += 1;
    var _this = this;
    var pedido = {
        id: id_pedido, 
        filtro: filtro, 
        callback: callback,
        remove: function(){
            _this.quitarPedido(id_pedido);
        }
    };
    this.pedidos.push(pedido);
    this.publicarFiltros();
    return pedido;
};

NodoRouter.prototype.quitarPedido = function (id_pedido) {
    this.pedidos = _.filter(this.pedidos, function(pedido){ return pedido.id != id_pedido;});
    this.publicarFiltros();
};

NodoRouter.prototype.recibirMensaje = function (un_mensaje, vecino_emisor) {
	if(this.verbose) console.log("llegó a vx:", un_mensaje);
    var _this = this;
    //si es una publicacion de filtros
	if(un_mensaje.tipoDeMensaje)
    {
		if(un_mensaje.tipoDeMensaje == "Vortex.Filtro.Publicacion"){   
			var datos_del_vecino_emisor = _.find(this.datosVecinos, function(datos_de_un_vecino){ return datos_de_un_vecino.vecino === vecino_emisor});
			//si no conozco al vecino me rajo
			if(!datos_del_vecino_emisor) return;
			datos_del_vecino_emisor.filtroRecibido = DesSerializadorDeFiltros.desSerializarFiltro(un_mensaje.filtro);
			this.publicarFiltros();
			return;
		}
	}
    //envío a todos los vecinos menos al que me me mandó el mensaje
    _.forEach(this.datosVecinos, function (datos_de_un_vecino) {
        if(vecino_emisor === datos_de_un_vecino.vecino) return;
        if(datos_de_un_vecino.filtroRecibido.eval(un_mensaje)){ 
            setTimeout(function(){              
                datos_de_un_vecino.vecino.recibirMensaje(un_mensaje, this);  
            },0);
        }
    });
	
	//ejecuto los callbacks que correspondan
	_.forEach(this.pedidos, function (un_pedido) {
        if(un_pedido.filtro.eval(un_mensaje)){ 
            setTimeout(function(){    
				if(un_mensaje.idRequest) 
					un_pedido.callback(un_mensaje, {
						send: function(respuesta){
							respuesta.tipoDeMensaje = "Vortex.respuesta";
							respuesta.responseTo = un_mensaje.idRequest;
							_this.send(respuesta);
						}
					});
				else un_pedido.callback(un_mensaje); 
            },0);
        }
    });
};

NodoRouter.prototype.conectarCon = function(un_vecino) {
    var datos_del_vecino = _.find(this.datosVecinos, function(datos_de_un_vecino){ return datos_de_un_vecino.vecino === un_vecino });
    if(datos_del_vecino) return;
	var datos_del_vecino = {
		vecino: un_vecino,
		filtroRecibido: new FiltroFalse(),
		filtroEnviado: new FiltroFalse()
	};
	this.datosVecinos.push(datos_del_vecino);   
	this.publicarFiltrosAUnVecino(datos_del_vecino);
	un_vecino.conectarCon(this);
};

NodoRouter.prototype.publicarFiltrosAUnVecino = function(datos_del_vecino){
    var filtros_para_el_vecino = [];
    _.forEach(this.datosVecinos, function (datos_de_un_vecino) {
        if(datos_del_vecino === datos_de_un_vecino ) return;
        filtros_para_el_vecino.push(datos_de_un_vecino.filtroRecibido);
    });
	_.forEach(this.pedidos, function (un_pedido) {
        filtros_para_el_vecino.push(un_pedido.filtro);
    });
    var filtro_a_publicar_al_vecino = new FiltroOR(filtros_para_el_vecino).simplificar();
    if(filtro_a_publicar_al_vecino.equals(datos_del_vecino.filtroEnviado)) return;
    datos_del_vecino.filtroEnviado = filtro_a_publicar_al_vecino;
    var publicacion_de_filtro = {
        tipoDeMensaje : "Vortex.Filtro.Publicacion",
        filtro: filtro_a_publicar_al_vecino.serializar()
    }
    var _this = this;
    setTimeout(function(){              
        datos_del_vecino.vecino.recibirMensaje(publicacion_de_filtro, _this);  
    },0);	    
};

NodoRouter.prototype.publicarFiltros = function(){
    //para cada vecino mergeo los filtros de los demas
	var _this = this;
    _.forEach(this.datosVecinos, function (datos_de_un_vecino) {            
        _this.publicarFiltrosAUnVecino(datos_de_un_vecino);
    });
};

NodoRouter.prototype.desconectarDe = function(un_vecino) {
    this.datosVecinos = _.filter(this.datosVecinos, function(datos_de_un_vecino){ return datos_de_un_vecino.vecino!==un_vecino;});
	this.publicarFiltros();
};

NodoRouter.prototype.randomString = function (length) {
	var chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    var result = '';
    for (var i = length; i > 0; --i) result += chars[Math.round(Math.random() * (chars.length - 1))];
    return result;
};

if(typeof(require) != "undefined"){
    exports.clase = NodoRouter;
}