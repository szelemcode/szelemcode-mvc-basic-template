<?php

use MVC\Router;
use Controllers\PaginasController;

require_once __DIR__ . '/../vendor/autoload.php';

$router=new Router();
echo 'szelemcode';

$router->get('/', [PaginasController::class, 'index']);
$router->comprobarRutas();