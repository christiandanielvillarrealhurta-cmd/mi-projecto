#!/usr/bin/env node
/*
 * Verificador automático de los casos.
 *
 * Genera muchos ejercicios de cada caso y nivel, y comprueba:
 *   - que la respuesta correcta sea equivalente al enunciado;
 *   - que haya 4 opciones distintas y solo una correcta;
 *   - que ninguna opción incorrecta sea equivalente a la correcta;
 *   - en factorización: que el enunciado no tenga factor común (salvo el caso
 *     "factor común") y que la respuesta esté factorizada por completo;
 *   - en productos notables: que todas las opciones estén ordenadas igual;
 *   - que el HTML no tenga cosas raras (1x, x¹, + −, undefined...);
 *   - que el procedimiento termine con la respuesta exacta.
 *
 * Uso:
 *   node tests/verificar.js                 (300 ejercicios por caso y nivel)
 *   node tests/verificar.js --n=1000
 *   node tests/verificar.js --caso=f-tcp    (solo un caso; se puede repetir separado por comas)
 *   node tests/verificar.js --muestras=3    (imprime ejemplos en texto para revisarlos)
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const FILES = [
  'js/algebra.js',
  'js/motor.js',
  'js/casos/productos.js',
  'js/casos/factorizacion-a.js',
  'js/casos/factorizacion-b.js',
];

const EXPECTED = {
  productos: [
    'pn-binomio-cuadrado',
    'pn-conjugados',
    'pn-termino-comun',
    'pn-binomio-cubo',
    'pn-trinomio-cuadrado',
    'pn-binomio-trinomio',
  ],
  factorizacion: [
    'f-factor-comun',
    'f-agrupacion',
    'f-tcp',
    'f-dif-cuadrados',
    'f-tcp-adicion',
    'f-trinomio-x2',
    'f-trinomio-ax2',
    'f-cubo-perfecto',
    'f-suma-dif-cubos',
  ],
};

function parseArgs() {
  const out = { n: 300, casos: null, muestras: 0, strict: false };
  for (const a of process.argv.slice(2)) {
    const m = a.match(/^--([a-z]+)(?:=(.*))?$/);
    if (!m) continue;
    if (m[1] === 'n') out.n = parseInt(m[2], 10);
    else if (m[1] === 'caso') out.casos = m[2].split(',');
    else if (m[1] === 'muestras') out.muestras = parseInt(m[2], 10);
    else if (m[1] === 'estricto') out.strict = true;
  }
  return out;
}

function load(loadErrors) {
  const ctx = { console: { log() {}, warn() {}, error: console.error }, Math, BigInt, Number, Object, Array, JSON };
  ctx.window = ctx;
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  for (const f of FILES) {
    const code = fs.readFileSync(path.join(ROOT, f), 'utf8');
    try {
      vm.runInContext(code, ctx, { filename: f });
    } catch (e) {
      // Un archivo de casos con error no debe impedir revisar los demás.
      if (f.indexOf('js/casos/') !== 0) throw e;
      loadErrors.push('No se pudo cargar ' + f + ': ' + e.message);
    }
  }
  return ctx;
}

function strip(html) {
  return String(html)
    .replace(/<sup>(.*?)<\/sup>/g, '^$1')
    .replace(/<span class="radicand">/g, '(')
    .replace(/<span class="rad">(.)/g, '$1')
    .replace(/<\/span><\/span>/g, ')')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function main() {
  const args = parseArgs();
  const loadErrors = [];
  const { Alg, MA } = load(loadErrors);
  const errors = [];
  const warnings = [];
  const report = [];
  // Con --caso solo importan los archivos de esos casos; sin filtro, cualquier fallo de carga es error.
  for (const e of loadErrors) (args.casos ? warnings : errors).push(e);

  // ¿Están todos los casos esperados?
  for (const topic of Object.keys(EXPECTED)) {
    for (const id of EXPECTED[topic]) {
      const c = MA.getCase(id);
      if (!c) warnings.push('Falta registrar el caso ' + id);
      else if (c.topic !== topic) errors.push('El caso ' + id + ' tiene tema ' + c.topic + ' y debería ser ' + topic);
    }
  }
  for (const c of MA.cases) {
    const all = EXPECTED.productos.concat(EXPECTED.factorizacion);
    if (all.indexOf(c.id) === -1) errors.push('Caso inesperado: ' + c.id);
  }

  const levels = MA.LEVELS.map((l) => l.id);
  const cases = MA.cases.filter((c) => !args.casos || args.casos.indexOf(c.id) !== -1);
  if (args.casos) {
    for (const id of args.casos) if (!MA.getCase(id)) errors.push('El caso pedido ' + id + ' no está registrado');
  }

  for (const c of cases) {
    for (const level of levels) {
      const keys = new Set();
      let fallback = 0;
      let maxCoef = 0;
      let errCount = 0;
      const t0 = Date.now();
      const err = (msg, ex) => {
        errCount++;
        if (errCount <= 5) {
          errors.push('[' + c.id + ' / ' + level + '] ' + msg + (ex ? '\n      enunciado: ' + Alg.text(ex.prompt) : ''));
        }
      };

      for (let i = 0; i < args.n; i++) {
        let ex;
        try {
          ex = c.generate(level);
        } catch (e) {
          err('generate() lanzó un error: ' + e.stack);
          continue;
        }
        const problems = MA.validateExercise(ex, c);
        if (problems.length) {
          err(problems.join(' | '), ex.prompt ? ex : null);
          continue;
        }
        keys.add(ex.key);

        const promptVal = Alg.valueOf(ex.prompt);
        for (const t of promptVal.terms) maxCoef = Math.max(maxCoef, Math.abs(t.c));
        for (const t of Alg.valueOf(ex.answer).terms) maxCoef = Math.max(maxCoef, Math.abs(t.c));

        // Calidad del HTML del enunciado y la respuesta
        for (const [label, expr] of [
          ['enunciado', ex.prompt],
          ['respuesta', ex.answer],
        ]) {
          const html = Alg.raw(expr);
          if (/(^|[^0-9])1<i>/.test(html)) err('coeficiente 1 visible en ' + label + ': ' + strip(html), ex);
          if (html.indexOf('<sup>1</sup>') !== -1) err('exponente 1 visible en ' + label + ': ' + strip(html), ex);
          if (html.indexOf('+ ' + Alg.MINUS) !== -1) err('signo doble en ' + label + ': ' + strip(html), ex);
        }

        if (c.topic === 'factorizacion') {
          if (ex.prompt.terms.length < 2) err('el enunciado tiene menos de 2 términos', ex);
          if (c.id !== 'f-factor-comun') {
            const why = promptVal.content() > 1 || Object.keys(promptVal.monoGcd().terms[0].v).length > 0;
            if (why) err('el enunciado tiene factor común (' + Alg.text(promptVal.monoGcd()) + ')', ex);
          } else {
            const g = promptVal.monoGcd();
            const pre = ex.answer.prefix;
            const preAbs = Alg.mono(Math.abs(pre.terms[0].c), pre.terms[0].v);
            if (!preAbs.equals(g)) err('el factor común de la respuesta no es el máximo (' + Alg.text(g) + ')', ex);
          }
          for (const f of ex.answer.factors) {
            if (f.p.isConst()) err('la respuesta tiene un factor constante', ex);
            if (f.p.isMonomial() && c.id !== 'f-factor-comun') err('la respuesta tiene un factor monomio entre paréntesis', ex);
            const reason = Alg.reducibleReason(f.p);
            if (reason) err('la respuesta no está factorizada por completo: (' + Alg.text(f.p) + ') ' + reason, ex);
          }
        }

        // Pregunta de opción múltiple
        let q;
        try {
          q = MA.buildQuestion(c, level, null);
        } catch (e) {
          err('buildQuestion lanzó un error: ' + e.message);
          continue;
        }
        if (q.options.length !== 4) err('hay ' + q.options.length + ' opciones');
        if (q.options.filter((o) => o.correct).length !== 1) err('no hay exactamente una opción correcta');
        const htmls = new Set(q.options.map((o) => o.html));
        if (htmls.size !== 4) err('hay opciones repetidas');
        fallback += q.fallbackCount;
        for (const o of q.options) {
          if (/(^|[^0-9])1<i>/.test(o.html)) err('coeficiente 1 visible en una opción: ' + strip(o.html));
          if (o.html.indexOf('<sup>1</sup>') !== -1) err('exponente 1 visible en una opción: ' + strip(o.html));
          if (o.html.indexOf('+ ' + Alg.MINUS) !== -1) err('signo doble en una opción: ' + strip(o.html));
          if (/undefined|NaN/.test(o.html)) err('opción inválida: ' + o.html);
          if (o.why && /undefined|NaN|\[object/.test(o.why)) err('explicación inválida: ' + o.why);
        }

        // Distractores: ninguno equivalente a la respuesta, y en productos notables ordenados igual
        const target = Alg.valueOf(ex.answer);
        for (const d of ex.distractors) {
          const expr = d && typeof d === 'object' && 'expr' in d ? d.expr : d;
          let val;
          try {
            val = Alg.valueOf(expr);
          } catch (e) {
            err('un distractor no se pudo desarrollar: ' + e.message, ex);
            continue;
          }
          if (c.topic === 'productos' && expr instanceof Alg.Poly) {
            if (Alg.raw(expr) !== Alg.raw(expr.sorted()) && val.key() !== target.key()) {
              err('un distractor no está en el orden estándar: ' + Alg.text(expr), ex);
            }
          }
          if (c.topic === 'productos' && !(expr instanceof Alg.Poly)) {
            err('en productos notables los distractores deben ser Poly', ex);
          }
          if (c.topic === 'factorizacion' && !(expr instanceof Alg.Factored)) {
            err('en factorización los distractores deben ser Factored', ex);
          }
        }
        if (c.topic === 'productos' && Alg.raw(ex.answer) !== Alg.raw(ex.answer.sorted())) {
          err('la respuesta no está en el orden estándar: ' + Alg.text(ex.answer), ex);
        }
      }

      const ms = Date.now() - t0;
      const fbRate = fallback / (3 * args.n);
      report.push({
        caso: c.id,
        nivel: level,
        distintos: keys.size,
        'respaldo%': Math.round(fbRate * 100),
        maxCoef,
        ms,
        errores: errCount,
      });
      if (keys.size < Math.min(10, args.n)) warnings.push('[' + c.id + ' / ' + level + '] poca variedad: ' + keys.size + ' ejercicios distintos');
      if (fbRate > 0.1) warnings.push('[' + c.id + ' / ' + level + '] ' + Math.round(fbRate * 100) + '% de distractores genéricos (se esperan ≤ 10%)');
      if (maxCoef > 2000) warnings.push('[' + c.id + ' / ' + level + '] coeficientes muy grandes (hasta ' + maxCoef + ')');
      if (ms / args.n > 20) warnings.push('[' + c.id + ' / ' + level + '] generación lenta: ' + (ms / args.n).toFixed(1) + ' ms por ejercicio');
    }
  }

  if (args.muestras > 0) {
    for (const c of cases) {
      for (const level of levels) {
        for (let i = 0; i < args.muestras; i++) {
          const q = MA.buildQuestion(c, level, null);
          console.log('\n────────── ' + c.name + ' · ' + level + ' ──────────');
          console.log(strip(q.instruction) + '  ' + strip(q.promptHtml));
          q.options.forEach((o, k) => {
            console.log(
              '  ' + 'ABCD'[k] + ') ' + strip(o.html) + (o.correct ? '   ✔' : '') + (o.generated ? '   [genérico]' : '') + (o.why ? '   ← ' + strip(o.why) : '')
            );
          });
          console.log('  Procedimiento:');
          q.steps.forEach((s, k) => console.log('    ' + (k + 1) + '. ' + (s.title ? s.title + ': ' : '') + strip(s.html)));
        }
      }
    }
    console.log('');
  }

  console.table(report);
  if (warnings.length) {
    console.log('\nAvisos (' + warnings.length + '):');
    for (const w of warnings) console.log('  ⚠ ' + w);
  }
  if (errors.length) {
    console.log('\nErrores (' + errors.length + '):');
    for (const e of errors) console.log('  ✘ ' + e);
    process.exitCode = 1;
  } else {
    console.log('\n✔ Sin errores.');
  }
  if (args.strict && warnings.length) process.exitCode = 1;
}

main();
