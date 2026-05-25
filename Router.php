<?php

namespace MVC;




class Router {
    public function __construct()
    {
        echo "Creando el Router  ";
    }

    public $rutasGET = [];
    public $rutasPOST = [];//sepasan como arreglos porque se utiliza una funcion que necesita que sean arreglos

    public function get($url, $fn) {
        $this->rutasGET[$url] = $fn;
    }

    public function post($url, $fn) {
        $this->rutasPOST[$url] = $fn;
    }

    public function comprobarRutas(){
        $urlActual = $_SERVER['PATH_INFO'] ?? '/';//guarda la url que se escriba en esa variable
        //$urlActual = $_SERVER['REQUEST_URI'] ?? '/';
       // $urlActual = parse_url($urlActual, PHP_URL_PATH);//SACA QUERYSTRING
        $metodo = $_SERVER['REQUEST_METHOD'];//guarda el tipo de request en a variable

        if($metodo ==="GET"){
            $fn = $this->rutasGET[$urlActual] ?? null; //fn es la funcion asociada , si se intenta acceder a una url que no este registrada fn no existira y dara error por eso se le asigna un null
        }else {
            $fn = $this->rutasPOST[$urlActual] ?? null;
        }

        if($fn){
            //la URL existe y hay una funcion asociada  
            call_user_func($fn, $this); //nos permite llamar a una funcion que no se sabemos como se llama esa funcion     
        // echo "<pre>";
        // var_dump($fn);
        // echo "</pre>";
        }else{
            echo "Pagina no encontrada";
        }
    }

    //muestra una vista 
    public function render($view, $datos=[]){
        // debuggear($datos);
        foreach($datos as $key => $value){
            $$key = $value;
        }

        ob_start();//almacenamiento en memoria durante un momento...
       include_once __DIR__ ."/views/$view.php";
       $contenido = ob_get_clean(); //limpia la memoria
       include_once __DIR__ . "/views/layout.php";

       
}
}