#!/usr/bin/env node
/*
 * Empaqueta la aplicación en un solo archivo HTML (estilos y scripts incluidos).
 *
 *   node tools/empaquetar.js                      → dist/productos-y-factores.html
 *   node tools/empaquetar.js --fragmento salida.html
 *        → solo el contenido de la página (sin <html>/<head>/<body>), para
 *          publicarla en servicios que agregan su propio esqueleto.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

function inlineScripts(html) {
  return html.replace(/<script src="([^"]+)"><\/script>/g, (_, src) => {
    const code = read(src).replace(/<\/script/gi, '<\\/script');
    return '<script>\n/* ' + src + ' */\n' + code + '\n</script>';
  });
}

function inlineStyles(html) {
  return html.replace(/<link rel="stylesheet" href="(css\/[^"]+)">/g, (_, href) => '<style>\n' + read(href) + '\n</style>');
}

function full() {
  return inlineScripts(inlineStyles(read('index.html')));
}

function fragment() {
  const html = read('index.html');
  const title = html.match(/<title>[\s\S]*?<\/title>/)[0];
  const fonts = (html.match(/<link rel="stylesheet" href="https:\/\/fonts[^>]+>/) || [''])[0];
  const body = html.match(/<!--CONTENIDO-->([\s\S]*?)<!--\/CONTENIDO-->/)[1];
  return [title, fonts, '<style>\n' + read('css/estilos.css') + '\n</style>', inlineScripts(body)].join('\n');
}

const args = process.argv.slice(2);
const i = args.indexOf('--fragmento');
if (i !== -1) {
  const out = path.resolve(args[i + 1] || 'fragmento.html');
  fs.writeFileSync(out, fragment());
  console.log('Fragmento escrito en ' + out);
} else {
  const out = path.join(ROOT, 'dist', 'productos-y-factores.html');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, full());
  console.log('Archivo único escrito en ' + path.relative(ROOT, out));
}
