<?php
namespace Controllers;
use MVC\Router;
use PHPMailer\PHPMailer\PHPMailer;


 
class PaginasController{

    public static function index(Router $router){
        $router->render('/paginas/index',[

        ]);
    }
}
    ?>