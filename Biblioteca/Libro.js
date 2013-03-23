var FabricaDeLibros = {
    conectarLibroALaRed : function(nodo, libro){
        var portal_libro = new NodoPortalBidiMonoFiltro("libro");
        nodo.conectarCon(portal_libro);
        portal_libro.conectarCon(nodo); 
        
        un_controlador_de_libro = new ControladorDeLibro(libro, portal_libro);
    }
}

var Libro = function(cfg){
    this._titulo = cfg.titulo || "";
    this._autor = cfg.autor || "";
}

Libro.prototype = {
    titulo : function() {
        return this._titulo;
    },
    autor : function() {
        return this._autor;
    }
};

var ControladorDeLibro = function(un_libro, un_portal){
    this._libro = un_libro;
    this._portal = un_portal;   
    
    var self = this;
    this._portal.pedirMensajes(new FiltroAND([new FiltroXClaveValor("tipoDeMensaje", "vortexComm.biblioteca.busquedaDeLibrosPorAutor"),
                                              new FiltroXClaveValor("autor", un_libro.autor())]),  
                           function(mensaje){
                                self.enviarLibro();
                           });
//    this._portal.pedirMensajes(new FiltroXClaveValor("tipoDeMensaje", "vortexComm.biblioteca.pedidoDeLibros"), 
//                           function(mensaje){
//                                self.enviarLibro();
//                           });
}
    
ControladorDeLibro.prototype = {
    enviarLibro : function() {
        this._portal.enviarMensaje({tipoDeMensaje: "vortexComm.biblioteca.libro", 
                                    autor:this._libro.autor(),
                                    titulo: this._libro.titulo()});
    }
};