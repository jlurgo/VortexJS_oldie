/*
Vortex by Vortex Group is licensed under a Creative Commons Reconocimiento 3.0 Unported License.
To view a copy of this licence, visit: http://creativecommons.org/licenses/by/3.0/
Project URL: https://sourceforge.net/p/vortexnet
*/
            
var NodoRouter = function(aliasRouter){
    this._patas = [];
	this._proximoIdPata = 0;	
	this._generadorDeIdMensaje = new GeneradorDeIdMensaje();
    this._aliasRouter = "router " + aliasRouter;
};

NodoRouter.prototype = {
    mergearFiltrosParaUnaPata : function(pata){
        var filtrosParaLaPata = [];
        this._patas.forEach(function (p) {
            if(p === pata ) return;
            filtrosParaLaPata.push(p.filtroRecibido());
        });
        if(filtrosParaLaPata.length>0){
            var filtroAPublicarALaPata = new FiltroOR(filtrosParaLaPata);
            pata.publicarFiltro(filtroAPublicarALaPata);
        }
    },
    mergearYEnviarFiltros : function(){
        var self = this;
        this._patas.forEach(function (pata) {
            self.mergearFiltrosParaUnaPata(pata);
        });
    },
    enviarMensajeATodasLasPatas : function(un_mensaje){
        this._patas.forEach(function (pata) {
            pata.recibirMensaje(un_mensaje);
        });
    },
    recibirMensaje : function (un_mensaje) {	
        //console.log('mensaje recibido en ' + this._aliasRouter, un_mensaje);
        this.enviarMensajeATodasLasPatas(un_mensaje);        
    },
    conectarCon : function (un_receptor) {
		var nuevaPata = new PataConectora(this._proximoIdPata, this._generadorDeIdMensaje);
		this._proximoIdPata++;
        this._patas.push(nuevaPata);
		nuevaPata.conectarCon(un_receptor);
        var self = this;
        nuevaPata.onFiltroRecibidoModificado = function(){
            self.mergearYEnviarFiltros();
        };
        this.mergearFiltrosParaUnaPata(nuevaPata);
    },
    conectarBidireccionalmenteCon : function (un_nodo) {
		this.conectarCon(un_nodo);
        un_nodo.conectarCon(this);
    },
    conectadoBidireccionalmenteEnTodasSusPatas : function(){
        var conectado = true;
        this._patas.forEach(function(pata){            
            if(!pata.conectadaBidireccionalmente()) conectado = false;
        });
        return conectado;
    }
};  