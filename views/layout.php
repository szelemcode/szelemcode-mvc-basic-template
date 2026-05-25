<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Szelem Code</title>
    <link rel="stylesheet" href="/build/css/app.css">
</head>
<body>

    <header>
        <h1>Szelem Code</h1>
    </header>

    <main>
        <?php echo $contenido; ?>
    </main>
    <footer class="footer">Todos los derechos reservados <span class="fecha"><?php
    echo date('d-m-y');
    ?>
    </span></footer>

    <script src="/build/js/app.min.js"></script>
</body>
</html>