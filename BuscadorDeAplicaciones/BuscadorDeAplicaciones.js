//var scriptNodoBuscadorDeAplicaciones = function(){
    var NodoBuscadorDeAplicaciones = function(cfg){
        this._plantilla_aplicacion = $(cfg.plantilla_aplicacion);
        this._ui = $(cfg.UI);
        this._panel_gadgets = $(cfg.panel_gadgets);
        this._plantilla_gadget = $(cfg.plantilla_gadget);
        this.start();
    };
    
    NodoBuscadorDeAplicaciones.prototype = {
        start: function(){
            this._router = new NodoRouter("buscador de aplicaciones");
            this._portal = new NodoPortalBidiMonoFiltro("buscador de aplicaciones");
            this._router.conectarBidireccionalmenteCon(this._portal);
            
            this._aplicaciones_encontradas = [];
            this._input_busqueda = this._ui.find('#input_de_busqueda_del_buscador_de_aplicaciones');
            this._panel_aplicaciones_encontradas = this._ui.find('#lista_de_aplicaciones_encontradas_del_buscador_de_aplicaciones');
            
            this._input_busqueda.change(this.nuevoCriterioDeBusqueda.bind(this));
        },
        nuevoCriterioDeBusqueda : function(){
            this.pedirAplicacionesPorNombre(this._input_busqueda.val());
        },
        pedirAplicacionesPorNombre : function(nombre) {        
            this.limpiarAplicacionesEncontradas();
            this._portal.pedirMensajes(new FiltroAND([new FiltroXClaveValor("tipoDeMensaje", "vortexComm.market.resumenAplicacion"),
                                                        new FiltroXClaveValor("nombre", nombre)]),
                                  this.onAppEncontrada.bind(this));  
            this._portal.enviarMensaje({tipoDeMensaje: "vortexComm.market.busquedaDeAplicaciones", nombre:nombre});
        },
        limpiarAplicacionesEncontradas: function(){
            this._aplicaciones_encontradas = [];
            this._panel_aplicaciones_encontradas.empty();
        },
        onAppEncontrada : function (mensaje) {      
            var app = new NodoVistaDeAppEncontradaEnBuscador({UI: this._plantilla_aplicacion.clone(),
                                                              idApp: mensaje.idApp,
                                                              nombre: mensaje.nombre,
                                                              panel_gadgets: this._panel_gadgets,
                                                              plantilla_gadget: this._plantilla_gadget
                                                            });
            if(this.appsEncontradas().Any(function(l){return (l._id==app._id)})) return;
            this._aplicaciones_encontradas.push(app);    
    
            this._router.conectarBidireccionalmenteCon(app);
            app.dibujarEn(this._panel_aplicaciones_encontradas);        
        },
        appsEncontradas : function() {
            return Enumerable.From(this._aplicaciones_encontradas);
        },    
        dibujarEn: function(panel){
            panel.append(this._ui);
        },
        conectarCon: function(un_nodo){
            this._router.conectarCon(un_nodo);   
        },
        recibirMensaje: function(un_mensaje){
            this._router.recibirMensaje(un_mensaje);    
        }   
    };

    var NodoVistaDeAppEncontradaEnBuscador = function(cfg){
        this._ui = $(cfg.UI);
        this._id = cfg.idApp;
        this._nombre = cfg.nombre;
        this._panel_gadgets = $(cfg.panel_gadgets);
        this._plantilla_gadget = $(cfg.plantilla_gadget);
        this.start();
    };

    NodoVistaDeAppEncontradaEnBuscador.prototype = {
        start: function(){
            this._router = new NodoRouter("vista app en buscador" + this._id);
            this._portal = new NodoPortalBidi("vista app en buscador" + this._id);
            this._router.conectarBidireccionalmenteCon(this._portal);
                        
            this._label_nombre = this._ui.find('#nombre_de_app_encontrada');            
            this._label_nombre.text(this._nombre);
            var self= this;
            this._label_nombre.click(function(){
                    self.pedirAplicacion();
                });
            
        },  
        pedirAplicacion:function(){
            this._portal.pedirMensajes(new FiltroAND([new FiltroXClaveValor("tipoDeMensaje", "vortexComm.market.aplicacion"),
                                                        new FiltroXClaveValor("id", 'buscadorDeLibros')]),
                                       this.onMensajeAplicacionRecibido.bind(this)  
                                      );
            this._portal.enviarMensaje({tipoDeMensaje: "vortexComm.market.pedidoDeAplicacion", id:this._id});
        },
        onMensajeAplicacionRecibido: function(mensaje){
            $("head").append($(mensaje.estilo));
            $.globalEval(mensaje.script); 
            this.app = new Aplicacion(mensaje);
            this._label_nombre.css("background-color", "green")
            this._label_nombre.unbind("click");
            this._label_nombre.click(this.instanciarAplicacion.bind(this));            
        },
        instanciarAplicacion:function(){
            var instanciaApp = this.app.instanciar();
            this._router.conectarBidireccionalmenteCon(instanciaApp);
            var un_gadget =  $.extend(true,{}, gadget);
            un_gadget.start({
                title			: this.app.nombre(),
                UI 				: this._plantilla_gadget.clone()
            });
            un_gadget.agregarContenido(instanciaApp);
            un_gadget.dibujarEn(this._panel_gadgets); 
        },
        dibujarEn: function(panel){
            panel.append(this._ui);
        },
        conectarCon: function(un_nodo){
            this._portal.conectarCon(un_nodo);   
        },
        recibirMensaje: function(un_mensaje){
            this._portal.recibirMensaje(un_mensaje);
        } 
    };
    
    var Aplicacion = function(cfg){
        this._clase = cfg.clase;
        this._cfg = cfg.cfg;
        this._nombre = cfg.nombre;
    }
    Aplicacion.prototype = {
        instanciar: function(){
            return new window[this._clase](this._cfg);
        },
        nombre: function(){
            return this._nombre;
        }
    }
//};
//
//scriptNodoBuscadorDeAplicaciones.script = function(){
//    var script = scriptNodoBuscadorDeAplicaciones.toString();
//    return script.substring(12, script.length-2);
//};