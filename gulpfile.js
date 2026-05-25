import path from 'path'                                             // utilidades de rutas
import fs from 'fs'                                                 // sistema de archivos
import { glob } from 'glob'                                         // globbing para imágenes
import { src, dest, watch, series } from 'gulp'                     // tareas gulp
import * as dartSass from 'sass'                                    // motor Sass (Dart Sass)
import gulpSass from 'gulp-sass'                                    // wrapper de Sass para gulp
import concat from 'gulp-concat'                                    // concatenar JS
import terser from 'gulp-terser'                                    // minificar JS
import rename from 'gulp-rename'                                    // renombrar archivos
import sharp from 'sharp'                                           // procesar imágenes
import browserSync from 'browser-sync'                              // live reload / proxy
import phpServer from 'gulp-connect-php'                            // servidor PHP embebido
import shell from 'gulp-shell'                                      // correr comandos (composer)

const bs = browserSync.create()                                     // instancia de BrowserSync
const sass = gulpSass(dartSass)                                     // inicializa gulp-sass

// ========= Config =========
const PORT_PHP = process.env.PHP_PORT || 8010                       // puerto para php
const PORT_BS  = process.env.BS_PORT  || 3000                       // puerto para browsersync

const paths = {                                                     // rutas del proyecto
  scss: 'src/scss/**/*.scss',                                       // todos los .scss
  js:   'src/js/**/*.js',                                           // todos los .js
  img:  'src/img/**/*.{png,jpg,jpeg,webp,avif,svg}',                // imágenes soportadas
  php:  [                                                           // PHP a observar
    '**/*.php',                                                     // todo PHP...
    '!vendor/**',                                                   // ...excepto vendor
    '!node_modules/**',                                             // ...node_modules
    '!public/build/**'                                              // ...y carpeta de build
  ],
  outCSS: 'public/build/css',                                       // salida CSS
  outJS:  'public/build/js',                                        // salida JS
  outIMG: 'public/build/img'                                        // salida imágenes
}

// ========= Util: manejo de errores elegante =========
function handleError(task) {                                        // helper de errores
  return function(err) {                                            // devuelve handler
    console.error(`[${task}]`, err.message)                         // imprime mensaje
    this.emit('end')                                                // no romper el stream
  }
}

// ========= CSS (con live-inject) =========
export function css() {                                             // tarea CSS
  return src(paths.scss, { sourcemaps: true })                      // lee SCSS con mapas
    .pipe(sass({ outputStyle: 'compressed' })                       // compila y minifica
      .on('error', sass.logError))                                  // log de errores Sass
    .pipe(dest(paths.outCSS, { sourcemaps: '.' }))                  // escribe CSS + .map
    .pipe(bs.stream({ match: '**/*.css' }))                         // inyecta CSS sin recargar
}

// ========= JS =========
export function js() {                                              // tarea JS
  return src(paths.js)                                              // lee JS
    .pipe(concat('app.js'))                                         // concat a app.js
    .pipe(terser().on('error', handleError('terser')))              // minifica (maneja errores)
    .pipe(rename({ suffix: '.min' }))                               // renombra a app.min.js
    .pipe(dest(paths.outJS))                                        // escribe a build/js
    .pipe(bs.stream())                                              // avisa a BrowserSync
}

// ========= Imágenes =========
export async function imagenes() {                                  // tarea imágenes
  const srcDir   = './src/img'                                      // base de src
  const buildDir = paths.outIMG                                     // base de salida
  const images   = await glob(paths.img)                            // lista de archivos

  for (const file of images) {                                      // procesa cada imagen
    const relDir = path.relative(srcDir, path.dirname(file))         // subruta relativa
    const outDir = path.join(buildDir, relDir)                      // carpeta destino
    await procesarImagen(file, outDir)                              // procesar
  }
}

function procesarImagen(file, outDir) {                             // procesa 1 imagen
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true }) // crea carpeta

  const base = path.basename(file, path.extname(file))              // nombre base
  const ext  = path.extname(file).toLowerCase()                     // extensión

  const outStd  = path.join(outDir, `${base}${ext}`)                // salida formato original
  const outWebp = path.join(outDir, `${base}.webp`)                 // salida webp
  const outAvif = path.join(outDir, `${base}.avif`)                 // salida avif
  const opts    = { quality: 80 }                                   // calidad por defecto

  if (ext === '.svg') {                                             // para SVG...
    fs.copyFileSync(file, outStd)                                   // solo copiar
    return Promise.resolve()                                        // fin
  }

  return sharp(file)                                                // abre imagen
    .toBuffer()                                                     // buffer en memoria
    .then(buf => Promise.all([                                      // procesa en paralelo
      sharp(buf).toFile(outStd),                                    // guarda formato original
      sharp(buf).webp(opts).toFile(outWebp),                        // guarda webp
      sharp(buf).avif().toFile(outAvif)                             // guarda avif
    ]))
    .catch(handleError('imagenes'))                                 // maneja error
}

// ========= Composer Autoload =========
export const autoloadComposer = shell.task([                       // tarea composer
  'composer dump-autoload'                                         // ejecuta dump-autoload
])

// ========= Servidor PHP + BrowserSync (con recarga completa) =========
export function serve(done) {                                       // inicia el servidor local de desarrollo
  phpServer.server({                                                // lanza un servidor PHP embebido
    base: './public',                                               // directorio raíz del servidor → carpeta public
    port: PORT_PHP,                                                 // puerto PHP usando la constante PORT_PHP
    keepalive: true                                                 // mantiene el servidor activo
  }, function () {                                                  // callback al levantar PHP
    bs.init({                                                       // inicializa BrowserSync
      proxy: `127.0.0.1:${PORT_PHP}`,                               // proxya el servidor PHP usando PORT_PHP
      port: PORT_BS,                                                // puerto BrowserSync usando PORT_BS
      open: false,                                                  // no abre automáticamente el navegador
      notify: false,                                                // desactiva pop-ups de BrowserSync
      files: [                                                      // archivos que BrowserSync vigila
        'public/**/*.php',                                          // recarga si cambia PHP dentro de public
        'public/build/**/*.css',                                    // recarga/injecta si cambia CSS compilado
        'public/build/**/*.js'                                      // recarga si cambia app JS
      ]
    })

    done()                                                          // marca final de la tarea serve
  })

  // ========= Recargas adicionales fuera del /public =========
  bs.watch([                                                        // BrowserSync también observará:
    'views/**/*.php',                                               // archivos PHP en views
    'controllers/**/*.php',                                         // archivos PHP en controllers
    'models/**/*.php'                                               // archivos PHP en models
  ]).on('change', bs.reload)                                        // recarga completa del navegador
}

// ========= Recarga (con debounce) =========
let reloadTimer = null                                              // timer de debounce

export function recargar(done) {                                    // recarga con debounce
  clearTimeout(reloadTimer)                                         // limpia timer previo
  reloadTimer = setTimeout(() => bs.reload(), 120)                  // recarga tras 120ms
  done()                                                            // fin tarea
}

// ========= Watchers =========
export function dev() {                                             // tarea de desarrollo
  watch(paths.scss, series(css))                                    // recompila e inyecta CSS
  watch(paths.js, series(js))                                       // recompila JS + recarga
  watch(paths.img, series(imagenes, recargar))                      // procesa imágenes + recarga

  watch(paths.php, series(recargar))                                // recarga al cambiar PHP

  watch(['models/**/*.php', 'controllers/**/*.php'],                // observa clases MVC
        series(autoloadComposer, recargar))                         // dump-autoload + recarga
}

// ========= Tareas compuestas =========
export const build = series(css, js, imagenes)                      // build completo
export default series(build, serve, dev)                            // flujo por defecto