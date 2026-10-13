/*
 * casos/factorizacion-a.js — Casos de FACTORIZACIÓN (primera parte).
 *
 *   1. Factor común
 *   2. Factor común por agrupación
 *   3. Trinomio cuadrado perfecto
 *   4. Diferencia de cuadrados
 *   5. Trinomio cuadrado perfecto por adición y sustracción
 */
(function (root) {
  'use strict';

  const { Alg, MA } = root;
  const { P, fac, h, hm, hp, hsqrt, fx, raw, rand, gcd } = Alg;
  const { mono, eq, rawParen, rawPow, MINUS, Poly } = Alg;

  /* ================================================================== */
  /* Utilidades locales                                                  */
  /* ================================================================== */

  /** Une textos al estilo español: "6, 9 y 12". */
  function lista(items) {
    if (items.length < 2) return items.join('');
    return items.slice(0, -1).join(', ') + ' y ' + items[items.length - 1];
  }

  /** Coeficiente de un monomio (Poly de un término). */
  function coef(m) {
    return m.terms[0].c;
  }

  /** Parte literal de un monomio: { x: 2, y: 1 }. */
  function literal(m) {
    return m.terms[0].v;
  }

  /** Una sola variable elevada a e: letra('x', 2) → x². */
  function letra(k, e) {
    const v = {};
    v[k] = e;
    return mono(1, v);
  }

  /** Polinomio con los monomios en el orden dado (junta semejantes, pero no reordena). */
  function enOrden(monos) {
    return new Poly(
      monos.map((m) => m.terms[0]),
      { keepOrder: true }
    );
  }

  /** ¿El polinomio ya está en el orden estándar? */
  function ordenado(p) {
    return raw(p) === raw(p.sorted());
  }

  /** ¿Contenido 1 y ninguna variable común a todos los términos? */
  function primitivo(p) {
    return p.content() === 1 && Object.keys(p.monoGcd().terms[0].v).length === 0;
  }

  /** HTML crudo de una suma de monomios en el orden dado, SIN juntar semejantes: "x⁴ + 3x² + x² + 4 − x²". */
  function rawSuma(monos) {
    return monos
      .map((m, i) => {
        const t = m.terms[0];
        const cuerpo = raw(mono(Math.abs(t.c), t.v));
        if (i === 0) return (t.c < 0 ? MINUS : '') + cuerpo;
        return (t.c < 0 ? ' ' + MINUS + ' ' : ' + ') + cuerpo;
      })
      .join('');
  }

  /** Monomio por binomio entre paréntesis: "3(y + 2)", "x(y + 2)", "−3(y + 2)"; con 1 o −1: "(y + 2)", "−(y + 2)". */
  function rawPor(m, bin) {
    const t = m.terms[0];
    const unidad = Object.keys(t.v).length === 0 && Math.abs(t.c) === 1;
    return (unidad ? (t.c < 0 ? MINUS : '') : raw(m)) + rawParen(bin);
  }

  /** "6x³ ÷ 3x = 2x²" */
  function division(t, g, q) {
    return hm(raw(t) + ' ÷ ' + raw(g) + ' = ' + raw(q));
  }

  /** Copia de p (mismo orden) con el término i cambiado por c·v; null si se junta con otro término. */
  function cambiaTermino(p, i, c, v) {
    const r = new Poly(
      p.terms.map((t, j) => (j === i ? { c, v } : t)),
      { keepOrder: true }
    );
    return r.length === p.length ? r : null;
  }

  /** Raíz cuadrada de un monomio explicada: "√(49x⁶) = 7x³, porque (7x³)² = 49x⁶." */
  function raizExplicada(cuadrado, raiz) {
    const prueba =
      hp(raiz, 2) === h(cuadrado) ? hm(raw(raiz) + ' · ' + raw(raiz) + ' = ' + raw(cuadrado)) : eq(hp(raiz, 2), h(cuadrado));
    const t = raiz.terms[0];
    const ks = Object.keys(t.v);
    let nota = '';
    if (ks.length && !(t.c === 1 && ks.length === 1 && t.v[ks[0]] === 1)) {
      nota =
        t.c === 1
          ? ' (cada exponente se divide entre 2)'
          : ' (raíz del coeficiente y cada exponente entre 2)';
    }
    return eq(hsqrt(cuadrado), h(raiz)) + nota + ', porque ' + prueba + '.';
  }

  /**
   * ¿Todos los factores de varios términos tienen al menos 2 términos?
   * (para que un distractor tenga la misma forma que la respuesta)
   */
  function factoresCompletos(f) {
    return f.factors.every((fc) => fc.p.length >= 2);
  }

  /** Quita distractores equivalentes a la respuesta o repetidos entre sí (y deja a lo más 7). */
  function limpiar(ds, answer) {
    const vistos = new Set([Alg.valueOf(answer).key()]);
    const out = ds.filter((d) => {
      if (!d || !d.expr) return false;
      const k = Alg.valueOf(d.expr).key();
      if (vistos.has(k)) return false;
      vistos.add(k);
      return true;
    });
    return out.length > 7 ? rand.sample(out, 7) : out;
  }

  /**
   * Comprobación extra (además de reducibleReason) de que Q no se puede factorizar.
   * Una variable: grado ≤ 3 (sin raíces racionales ⇒ irreducible).
   * Dos variables con grado en x ≤ 3: si alguna potencia de x aparece en un solo
   * término, no hay factor que dependa solo de y; y si al sustituir y por un número
   * el polinomio en x (del mismo grado) no tiene raíces racionales, tampoco hay dos
   * factores que dependan de x.
   */
  function esIrreducible(Q) {
    if (Alg.reducibleReason(Q)) return false;
    const vs = Q.vars();
    if (vs.length === 1) return Q.degree(vs[0]) <= 3;
    if (vs.length !== 2) return false;
    const x = vs[0];
    const y = vs[1];
    const n = Q.degree(x);
    if (n > 3) return false;
    const cuenta = {};
    for (const t of Q.terms) {
      const e = t.v[x] || 0;
      cuenta[e] = (cuenta[e] || 0) + 1;
    }
    if (!Object.keys(cuenta).some((e) => cuenta[e] === 1)) return false;
    if (n <= 1) return true;
    for (const y0 of [2, 3, 5, 7, -2, -3]) {
      const coefs = new Array(n + 1).fill(0);
      for (const t of Q.terms) coefs[t.v[x] || 0] += t.c * Math.pow(y0, t.v[y] || 0);
      if (coefs[n] !== 0 && !Alg.findRationalRoot(coefs)) return true;
    }
    return false;
  }

  /* ================================================================== */
  /* 1. Factor común: ab + ac = a(b + c)                                 */
  /* ================================================================== */

  /** Elige el factor común g (positivo) y el polinomio Q (primitivo e irreducible). */
  function datosFactorComun(level) {
    for (let intento = 0; intento < 500; intento++) {
      let g;
      let terminos;
      if (level === 'facil') {
        // Dos términos: g numérico, x o un monomio pequeño
        const tipo = rand.int(1, 3);
        const a = rand.int(1, 6);
        const b = rand.nonZero(-9, 9);
        if (gcd(a, b) !== 1) continue;
        const d = tipo === 1 ? 1 : rand.pick([1, 1, 1, 2]);
        terminos = [
          { c: a, v: { x: d } },
          { c: b, v: {} },
        ];
        if (tipo === 1) g = mono(rand.int(2, 9));
        else if (tipo === 2) g = P('x');
        else g = rand.chance(0.7) ? mono(rand.int(2, 5), { x: 1 }) : P('x^2');
      } else if (level === 'medio') {
        // Tres términos: g como 4x² o 5x (a veces con y)
        if (rand.chance(0.6)) {
          const grados = rand.pick([
            [2, 1, 0],
            [2, 1, 0],
            [3, 1, 0],
            [3, 2, 0],
          ]);
          terminos = grados.map((e, i) => ({
            c: i === 0 ? rand.int(1, 5) : i === 2 && rand.chance(0.35) ? rand.sign() : rand.nonZero(-9, 9),
            v: { x: e },
          }));
          g = mono(rand.chance(0.8) ? rand.int(2, 6) : 1, { x: rand.pick([1, 1, 2, 2, 3]) });
        } else {
          const plantilla = rand.pick([
            [[2, 0], [1, 1], [0, 2]],
            [[1, 0], [0, 1], [0, 0]],
            [[2, 0], [0, 1], [0, 0]],
            [[1, 1], [1, 0], [0, 0]],
          ]);
          terminos = plantilla.map((e, i) => ({
            c: i === 0 ? rand.int(1, 5) : e[0] + e[1] === 0 && rand.chance(0.4) ? rand.sign() : rand.nonZero(-9, 9),
            v: { x: e[0], y: e[1] },
          }));
          g = mono(rand.chance(0.8) ? rand.int(2, 6) : 1, { x: rand.int(1, 2), y: rand.int(1, 2) });
        }
      } else {
        // Tres o cuatro términos con x y y; g como 6x²y³
        const pares = [];
        for (let i = 0; i <= 3; i++) for (let j = 0; j <= 3; j++) pares.push([i, j]);
        const elegidos = rand.sample(pares, rand.pick([3, 3, 4]));
        terminos = elegidos.map((e) => ({
          c: e[0] + e[1] === 0 && rand.chance(0.35) ? rand.sign() : rand.nonZero(-7, 7),
          v: { x: e[0], y: e[1] },
        }));
        g = mono(rand.int(2, 9), { x: rand.int(1, 3), y: rand.int(1, 3) });
      }
      let Q = new Poly(terminos);
      if (Q.length !== terminos.length) continue;
      if (Q.terms[0].c < 0) Q = Q.scale(-1);
      if (!primitivo(Q) || !esIrreducible(Q)) continue;
      return { g, Q };
    }
    return { g: mono(3, { x: 1 }), Q: P('2x + 3') };
  }

  MA.registerCase({
    id: 'f-factor-comun',
    topic: 'factorizacion',
    order: 1,
    name: 'Factor común',
    formula: fx('ab + ac = a(b + c)'),
    generate(level) {
      const datos = datosFactorComun(level);
      const g = datos.g;
      const prompt = g.mul(datos.Q);
      const Q = prompt.divMono(g); // mismo orden que el enunciado
      const answer = fac(g, Q);

      const gc = coef(g);
      const gv = literal(g);
      const comunes = Object.keys(gv);
      const T = prompt.termPolys(); // términos del enunciado
      const C = Q.termPolys(); // cocientes

      // Paso 1: MCD de los coeficientes
      const coefs = prompt.terms.map((t) => String(Math.abs(t.c)));
      const hayNegativos = prompt.terms.some((t) => t.c < 0);
      const paso1 =
        'El máximo común divisor de ' +
        lista(coefs) +
        (hayNegativos ? ' (sin contar los signos)' : '') +
        ' es ' +
        gc +
        (gc === 1 ? ', así que no hay factor numérico.' : '.');

      // Paso 2: variables comunes con su menor exponente
      const frases = prompt.vars().map((k) => {
        const exps = prompt.terms.map((t) => t.v[k] || 0);
        const min = Math.min.apply(null, exps);
        if (min === 0) {
          return 'La ' + h(letra(k, 1)) + ' no aparece en todos los términos, así que no va en el factor común.';
        }
        return (
          'La ' +
          h(letra(k, 1)) +
          ' aparece en todos los términos con exponentes ' +
          lista(exps.map(String)) +
          '; el menor es ' +
          min +
          ', así que tomamos ' +
          h(letra(k, min)) +
          '.'
        );
      });

      // Paso 3: el factor común
      let paso3;
      if (gc > 1 && comunes.length) {
        paso3 = 'Juntamos el MCD con las variables comunes: el factor común es ' + h(g) + '.';
      } else if (gc > 1) {
        paso3 = 'No hay variables comunes, así que el factor común es solo el número ' + h(g) + '.';
      } else {
        paso3 = 'El MCD es 1, así que el factor común es solo la parte literal: ' + h(g) + '.';
      }

      // Paso 4: dividir cada término entre g
      const iUno = C.findIndex((q) => q.isConst() && Math.abs(q.constValue()) === 1);
      const paso4 =
        'Dividimos cada término entre ' +
        h(g) +
        (comunes.length ? ' (se dividen los coeficientes y se restan los exponentes): ' : ': ') +
        T.map((t, i) => division(t, g, C[i])).join('; ') +
        '.' +
        (iUno !== -1 ? ' Ojo: ' + division(T[iUno], g, C[iUno]) + ', no 0.' : '');

      const steps = [
        { title: 'MCD de los coeficientes', html: paso1 },
        { title: 'Variables comunes', html: frases.join(' ') },
        { title: 'Factor común', html: paso3 },
        { title: 'Divide cada término entre el factor común', html: paso4 },
        {
          title: 'Resultado',
          html: 'El factor común va afuera y los cocientes dentro del paréntesis: ' + eq(h(prompt), h(answer)),
        },
      ];

      const ds = [];

      // MCD incompleto (o sin parte numérica)
      if (gc >= 2) {
        const divs = Alg.divisors(gc).filter((d) => d > 1 && d < gc);
        if (divs.length) {
          const d = rand.pick(divs);
          const malMCD = fac(mono(d, gv), Q);
          ds.push({
            expr: malMCD,
            why:
              'El MCD de los coeficientes es ' +
              gc +
              ', no ' +
              d +
              '. Comprueba multiplicando: ' +
              eq(h(malMCD), h(malMCD.expand())) +
              ', que no es la expresión original.',
          });
        } else if (comunes.length) {
          ds.push({
            expr: fac(mono(1, gv), Q),
            why: 'Olvidaste la parte numérica: el MCD de los coeficientes es ' + gc + '.',
          });
        }
      }

      // Variable común olvidada o con el exponente mayor
      if (comunes.length) {
        const k = rand.pick(comunes);
        const sinK = Object.assign({}, gv);
        delete sinK[k];
        if (gc !== 1 || Object.keys(sinK).length) {
          ds.push({
            expr: fac(mono(gc, sinK), Q),
            why: 'La ' + h(letra(k, 1)) + ' está en todos los términos, así que también va en el factor común.',
          });
        }
        const maxE = Math.max.apply(
          null,
          prompt.terms.map((t) => t.v[k] || 0)
        );
        if (maxE > gv[k]) {
          const conMax = Object.assign({}, gv);
          conMax[k] = maxE;
          ds.push({
            expr: fac(mono(gc, conMax), Q),
            why: 'De cada variable común se toma el menor exponente: ' + h(letra(k, gv[k])) + ', no ' + h(letra(k, maxE)) + '.',
          });
        }
      }

      // Signo cambiado en un término del paréntesis
      const iSigno = rand.int(1, Q.length - 1);
      const conSigno = cambiaTermino(Q, iSigno, -Q.terms[iSigno].c, Q.terms[iSigno].v);
      if (conSigno) {
        ds.push({
          expr: fac(g, conSigno),
          why: 'Al dividir se conserva el signo de cada término: ' + division(T[iSigno], g, C[iSigno]) + '.',
        });
      }

      // Un término sin dividir (los demás casos quedan de reserva)
      const sinDividir = [];
      for (const i of rand.shuffle(Q.terms.map((t, j) => j))) {
        const q = cambiaTermino(Q, i, T[i].terms[0].c, T[i].terms[0].v);
        if (q) {
          sinDividir.push({
            expr: fac(g, q),
            why: 'Hay que dividir todos los términos entre ' + h(g) + ': ' + division(T[i], g, C[i]) + '.',
          });
        }
      }
      if (sinDividir.length) ds.push(sinDividir.shift());

      // Exponente sin restar al dividir
      if (comunes.length) {
        for (const i of rand.shuffle(Q.terms.map((t, j) => j))) {
          const malExp = cambiaTermino(Q, i, Q.terms[i].c, T[i].terms[0].v);
          if (malExp) {
            ds.push({
              expr: fac(g, malExp),
              why: 'Al dividir potencias de la misma base se restan los exponentes: ' + division(T[i], g, C[i]) + '.',
            });
            break;
          }
        }
      }

      // Término igual al factor común escrito como 0 (se omite); con dos términos queda de reserva
      const omitido =
        iUno === -1
          ? null
          : {
              expr: fac(
                g,
                new Poly(
                  Q.terms.filter((t, j) => j !== iUno),
                  { keepOrder: true }
                )
              ),
              why: 'Ese término no desaparece: ' + division(T[iUno], g, C[iUno]) + ', no 0. Ese ' + h(C[iUno]) + ' va dentro del paréntesis.',
            };
      if (omitido && Q.length >= 3) ds.push(omitido);

      // Variable que no es común metida en el factor común
      const noComunes = prompt.vars().filter((k) => !(k in gv));
      if (noComunes.length) {
        const k = rand.pick(noComunes);
        ds.push({
          expr: fac(g.mul(letra(k, 1)), Q),
          why: 'La ' + h(letra(k, 1)) + ' no está en todos los términos, así que no puede ir en el factor común.',
        });
      }

      // De reserva, solo si faltan opciones: número que no divide a todos los coeficientes,
      // otro término sin dividir, o ningún término dividido.
      const qs = Q.terms.map((t) => Math.abs(t.c)).filter((c) => c >= 2);
      if (qs.length && limpiar(ds, answer).length < 4) {
        const otro = gc * rand.pick(qs);
        ds.push({
          expr: fac(mono(otro, gv), Q),
          why: 'El ' + otro + ' no divide a todos los coeficientes; el MCD es ' + gc + '.',
        });
      }
      while (sinDividir.length && limpiar(ds, answer).length < 4) ds.push(sinDividir.shift());
      if (omitido && Q.length < 3 && limpiar(ds, answer).length < 4) ds.push(omitido);
      if (limpiar(ds, answer).length < 4) {
        ds.push({
          expr: fac(g, prompt),
          why: 'Después de sacar ' + h(g) + ' hay que dividir cada término entre él: ' + division(T[0], g, C[0]) + '.',
        });
      }

      return { prompt, answer, distractors: limpiar(ds, answer), steps, key: 'f-fc|' + Alg.text(prompt) };
    },
  });

  /* ================================================================== */
  /* 2. Factor común por agrupación: ax + ay + bx + by = (a + b)(x + y)  */
  /* ================================================================== */

  /** Monomios [A, B, C, D] para (A + B)(C + D); el binomio común es C + D. */
  function terminosAgrupacion(level) {
    const k = () => rand.nonZero(-9, 9);
    if (level === 'facil') {
      if (rand.chance(0.6)) return [P('x'), P(k()), P('y'), P(k())];
      return [P('x^2'), P(k()), P('x'), P(k())];
    }
    if (level === 'medio') {
      const tipo = rand.int(1, 3);
      if (tipo === 1) return [mono(rand.int(2, 6), { x: 1 }), P(k()), P('y'), P(k())];
      if (tipo === 2) return [P('x^2'), P(k()), mono(rand.int(2, 6), { x: 1 }), P(k())];
      return [P('x'), P(k()), mono(rand.int(1, 5), { x: 1 }), mono(k(), { y: 1 })];
    }
    const a = rand.int(1, 5);
    const b = rand.nonZero(-7, 7);
    const c = rand.int(1, 5);
    const d = rand.nonZero(-7, 7);
    const tipo = rand.int(1, 3);
    if (tipo === 1) {
      return [mono(a, { x: rand.int(1, 3) }), mono(b, { y: rand.int(1, 2) }), mono(c, { x: rand.int(1, 2) }), mono(d, { y: rand.int(1, 2) })];
    }
    if (tipo === 2) {
      return [mono(a, { x: rand.int(1, 3) }), mono(b, { y: rand.int(1, 2) }), mono(c, { x: rand.int(1, 2) }), P(d)];
    }
    return [mono(a, { x: rand.int(1, 3) }), P(b), mono(c, { y: rand.int(1, 2) }), P(d)];
  }

  /** Elige A, B, C, D cumpliendo todas las condiciones (enunciado ordenado, binomios primitivos e irreducibles). */
  function datosAgrupacion(level) {
    for (let intento = 0; intento < 500; intento++) {
      let [A, B, C, D] = terminosAgrupacion(level);
      let prompt = enOrden([A.mul(C), A.mul(D), B.mul(C), B.mul(D)]);
      if (prompt.length !== 4) continue;
      if (!ordenado(prompt)) {
        // Intercambia los papeles de los binomios para que el enunciado quede ordenado
        [A, B, C, D] = [C, D, A, B];
        prompt = enOrden([A.mul(C), A.mul(D), B.mul(C), B.mul(D)]);
        if (!ordenado(prompt)) continue;
      }
      const F1 = enOrden([A, B]);
      const F2 = enOrden([C, D]);
      if (F1.length !== 2 || F2.length !== 2 || !ordenado(F1) || !ordenado(F2)) continue;
      if (coef(A) < 0 || coef(C) < 0) continue;
      if (!primitivo(F1) || !primitivo(F2) || !primitivo(prompt)) continue;
      if (Alg.reducibleReason(F1) || Alg.reducibleReason(F2)) continue;
      return { A, B, C, D, F1, F2, prompt };
    }
    const [A, B, C, D] = [P('x'), P(3), P('y'), P(2)];
    return { A, B, C, D, F1: P('x + 3'), F2: P('y + 2'), prompt: P('xy + 2x + 3y + 6') };
  }

  MA.registerCase({
    id: 'f-agrupacion',
    topic: 'factorizacion',
    order: 2,
    name: 'Factor común por agrupación',
    formula: fx('ax + ay + bx + by = (a + b)(x + y)'),
    generate(level) {
      const { A, B, C, D, F1, F2, prompt } = datosAgrupacion(level);
      const answer = fac(1, F1, F2);

      const AC = A.mul(C);
      const AD = A.mul(D);
      const BC = B.mul(C);
      const BD = B.mul(D);
      const g1 = enOrden([AC, AD]);
      const g2 = enOrden([BC, BD]);
      const cB = coef(B);
      const bUnidad = B.isConst() && Math.abs(cB) === 1;

      let paso3;
      if (cB < 0) {
        paso3 =
          'Como ' +
          h(g2) +
          ' empieza con signo negativo, sacamos ' +
          h(B) +
          ' (con su signo) para que quede el mismo binomio: ' +
          eq(h(g2), hm(rawPor(B, F2))) +
          '.';
      } else if (bUnidad) {
        paso3 = 'El segundo grupo, ' + h(g2) + ', ya es el mismo binomio (su factor común es 1).';
      } else {
        paso3 = 'En ' + h(g2) + ' el factor común es ' + h(B) + ': ' + eq(h(g2), hm(rawPor(B, F2))) + '.';
      }

      const dosGrupos = rawPor(A, F2) + (cB < 0 ? ' ' + MINUS + ' ' : ' + ') + rawPor(B.scale(Math.sign(cB)), F2);

      const steps = [
        {
          title: 'Agrupa los términos',
          html:
            'Juntamos los dos primeros términos y los dos últimos: ' +
            eq(h(prompt), hm('(' + raw(g1) + ') + (' + raw(g2) + ')')) +
            '.',
        },
        {
          title: 'Factor común del primer grupo',
          html: 'En ' + h(g1) + ' el factor común es ' + h(A) + ': ' + eq(h(g1), hm(rawPor(A, F2))) + '.',
        },
        { title: 'Factor común del segundo grupo', html: paso3 },
        {
          title: 'Saca el binomio común',
          html:
            'El binomio ' +
            hm(rawParen(F2)) +
            ' aparece en los dos grupos; lo sacamos como factor común y queda multiplicado por ' +
            hm(rawParen(F1)) +
            ': ' +
            eq(hm(dosGrupos), h(answer)) +
            '.',
        },
        { title: 'Resultado', html: eq(h(prompt), h(answer)) },
      ];

      const F1menosB = enOrden([A, B.neg()]);
      const F2menosD = enOrden([C, D.neg()]);
      const ds = [
        {
          expr: fac(1, F1menosB, F2),
          why:
            cB < 0
              ? 'Al sacar factor común de ' + h(g2) + ' hay que sacar ' + h(B) + ' con su signo: ' + eq(h(g2), hm(rawPor(B, F2))) + '.'
              : bUnidad
                ? 'El segundo grupo, ' + h(g2) + ', ya es el binomio común: su factor es 1, no ' + MINUS + '1.'
                : 'El factor del segundo grupo es ' + h(B) + ', con signo positivo: ' + eq(h(g2), hm(rawPor(B, F2))) + '.',
        },
        {
          expr: fac(1, F1, F2menosD),
          why: 'Revisa el signo dentro del binomio común: ' + eq(h(g1), hm(rawPor(A, F2))) + '.',
        },
        {
          expr: fac(1, F1menosB, F2menosD),
          why:
            'Al multiplicar tus factores, los términos ' +
            h(AD) +
            ' y ' +
            h(BC) +
            ' saldrían con el signo contrario. Revisa el signo del binomio común y el del factor del segundo grupo.',
        },
      ];
      const F1cambio = enOrden([A, D]);
      const F2cambio = enOrden([C, B]);
      if (F1cambio.length === 2 && F2cambio.length === 2) {
        ds.push({
          expr: fac(1, F1cambio.sorted(), F2cambio.sorted()),
          why: 'Intercambiaste ' + h(B) + ' y ' + h(D) + ': el binomio que se repite en los dos grupos es ' + hm(rawParen(F2)) + '.',
        });
      }
      const F1ultimo = enOrden([A, BD]);
      if (F1ultimo.length === 2) {
        ds.push({
          expr: fac(1, F1ultimo.sorted(), F2),
          why: 'El factor común del segundo grupo es ' + h(B) + ', no el último término ' + h(BD) + '.',
        });
      }
      const F1primero = enOrden([A, BC]);
      if (F1primero.length === 2) {
        ds.push({
          expr: fac(1, F1primero.sorted(), F2),
          why: 'El factor común del segundo grupo es ' + h(B) + ', no su primer término ' + h(BC) + '.',
        });
      }

      return {
        prompt,
        answer,
        distractors: limpiar(
          ds.filter((d) => factoresCompletos(d.expr)),
          answer
        ),
        steps,
        key: 'f-agr|' + Alg.text(prompt),
      };
    },
  });

  /* ================================================================== */
  /* 3. Trinomio cuadrado perfecto: a² ± 2ab + b² = (a ± b)²             */
  /* ================================================================== */

  /** Elige a (con variable) y b (positivo), con mcd de coeficientes = 1. */
  function terminosTCP(level) {
    if (level === 'facil') {
      return { a: P('x'), b: P(rand.int(1, 9)) };
    }
    if (level === 'medio') {
      if (rand.chance(0.6)) {
        let m;
        let n;
        do {
          m = rand.int(2, 6);
          n = rand.int(1, 9);
        } while (gcd(m, n) !== 1);
        return { a: P(m + 'x'), b: P(n) };
      }
      return { a: P('x'), b: P(rand.int(2, 9) + 'y') };
    }
    let m;
    let n;
    do {
      m = rand.int(2, 7);
      n = rand.int(1, 9);
    } while (gcd(m, n) !== 1);
    return { a: P(m + 'x^' + rand.int(1, 3)), b: P(n + 'y^' + rand.int(1, 2)) };
  }

  MA.registerCase({
    id: 'f-tcp',
    topic: 'factorizacion',
    order: 3,
    name: 'Trinomio cuadrado perfecto',
    formula: fx('a^2 ± 2ab + b^2 = (a ± b)^2'),
    generate(level) {
      let a;
      let b;
      let s;
      let binomio;
      // El binomio no debe poder factorizarse más (p. ej. 4x² − y² es diferencia de cuadrados).
      for (let intento = 0; ; intento++) {
        ({ a, b } = terminosTCP(level));
        s = rand.sign();
        binomio = a.add(b.scale(s));
        if (!Alg.reducibleReason(binomio)) break;
        if (intento >= 200) {
          ({ a, b } = { a: P('x'), b: P(3) });
          binomio = a.add(b.scale(s));
          break;
        }
      }
      const prompt = binomio.pow(2);
      const answer = fac(1, [binomio, 2]);

      const a2 = a.pow(2);
      const b2 = b.pow(2);
      const dobleAB = a.mul(b).scale(2);
      const central = dobleAB.scale(s);

      const steps = [
        {
          title: 'Revisa los términos extremos',
          html:
            'El primer y el último término son cuadrados perfectos y positivos: ' +
            hsqrt(a2) +
            ' = ' +
            h(a) +
            ' y ' +
            hsqrt(b2) +
            ' = ' +
            h(b) +
            '.',
        },
        {
          title: 'Comprueba el término central',
          html:
            'El doble producto de las raíces es ' +
            hm('2' + Alg.rawParen(a) + Alg.rawParen(b)) +
            ' = ' +
            h(dobleAB) +
            ', que coincide con el término central ' +
            h(central) +
            (s < 0 ? ' (sin contar su signo)' : '') +
            '. ✓ Es un trinomio cuadrado perfecto.',
        },
        {
          title: 'Elige el signo',
          html:
            'El término central es ' +
            (s > 0 ? 'positivo' : 'negativo') +
            ', así que las raíces se unen con el signo ' +
            (s > 0 ? '+' : Alg.MINUS) +
            ': ' +
            (s > 0 ? fx('a^2 + 2ab + b^2 = (a + b)^2') : fx('a^2 - 2ab + b^2 = (a - b)^2')),
        },
        {
          title: 'Resultado',
          html: h(prompt) + ' = ' + h(answer),
        },
      ];

      const coefA = a.terms[0].c;
      const distractors = [
        {
          expr: fac(1, [a.add(b.scale(-s)), 2]),
          why: 'El signo dentro del binomio debe ser el mismo que el del término central.',
        },
        {
          expr: fac(1, a.add(b), a.sub(b)),
          why: fx('(a + b)(a - b)') + ' da ' + fx('a^2 - b^2') + ', que no tiene término central. Eso es una diferencia de cuadrados.',
        },
        {
          expr: fac(1, [a.add(b2.scale(s)), 2]),
          why: 'Hay que sacar la raíz cuadrada del último término: ' + hsqrt(b2) + ' = ' + h(b) + '.',
        },
        {
          expr: fac(1, [a.add(b.scale(2 * s)), 2]),
          why: 'Dentro del binomio va la raíz del último término, no el doble de ella.',
        },
        {
          expr: fac(1, a.add(b.scale(s)), a.add(b.scale(2 * s))),
          why: 'Si es un trinomio cuadrado perfecto, los dos factores deben ser iguales.',
        },
      ];
      if (coefA !== 1) {
        distractors.push({
          expr: fac(1, [Alg.mono(coefA * coefA, a.terms[0].v).add(b.scale(s)), 2]),
          why: 'La raíz cuadrada de ' + h(a2) + ' es ' + h(a) + ': también se saca la raíz del coeficiente.',
        });
      }

      // Con b = 1 el error "sin raíz" coincide con la respuesta: limpiar() lo quita.
      return { prompt, answer, distractors: limpiar(distractors, answer), steps, key: 'f-tcp|' + Alg.text(prompt) };
    },
  });

  /* ================================================================== */
  /* 4. Diferencia de cuadrados: a² − b² = (a + b)(a − b)                */
  /* ================================================================== */

  /** Raíces a (del término positivo) y b (del negativo); el enunciado es a² − b² en ese orden. */
  function raicesDifCuadrados(level) {
    for (let intento = 0; intento < 500; intento++) {
      let a;
      let b;
      if (level === 'facil') {
        const n = rand.int(1, 12);
        if (rand.chance(0.25)) {
          a = P(n);
          b = P('x');
        } else {
          a = P('x');
          b = P(n);
        }
      } else if (level === 'medio') {
        const r = Math.random();
        const n = rand.int(1, 9);
        if (r < 0.45) {
          a = mono(rand.int(2, 6), { x: 1 });
          b = P(n);
        } else if (r < 0.75) {
          a = mono(rand.int(1, 5), { x: 1 });
          b = mono(rand.int(1, 9), { y: 1 });
        } else {
          a = P(n);
          b = mono(rand.int(2, 6), { x: 1 });
        }
      } else {
        const r = Math.random();
        if (r < 0.4) {
          const p = rand.int(1, 3);
          const q = rand.int(1, 3);
          if (p + q < 3) continue;
          a = mono(rand.int(1, 9), { x: p });
          b = mono(rand.int(1, 9), { y: q });
        } else if (r < 0.7) {
          a = mono(rand.int(1, 7), { x: rand.int(1, 3), y: rand.int(1, 2) });
          b = P(rand.int(1, 9));
        } else if (r < 0.85) {
          a = mono(rand.int(1, 9), { x: rand.int(2, 3) });
          b = P(rand.int(2, 9));
        } else {
          const p = rand.int(1, 3);
          const q = rand.int(0, 2);
          if (p + q < 2) continue;
          a = P(rand.int(1, 9));
          b = mono(rand.int(1, 7), { x: p, y: q });
        }
      }
      if (gcd(coef(a), coef(b)) !== 1) continue;
      if (Alg.reducibleReason(enOrden([a, b])) || Alg.reducibleReason(enOrden([a, b.neg()]))) continue;
      return { a, b };
    }
    return { a: P('x'), b: P(3) };
  }

  MA.registerCase({
    id: 'f-dif-cuadrados',
    topic: 'factorizacion',
    order: 4,
    name: 'Diferencia de cuadrados',
    formula: fx('a^2 - b^2 = (a + b)(a - b)'),
    generate(level) {
      const { a, b } = raicesDifCuadrados(level);
      const a2 = a.pow(2);
      const b2 = b.pow(2);
      const prompt = enOrden([a2, b2.neg()]);
      const S = enOrden([a, b]); // suma de las raíces
      const R = enOrden([a, b.neg()]); // diferencia de las raíces
      const answer = fac(1, S, R);
      const invertido = a.isConst(); // p. ej. 25 − 4x²
      const ab = a.mul(b);

      const steps = [
        {
          title: 'Identifica el caso',
          html:
            'Son dos términos que se restan y los dos son cuadrados perfectos: es una diferencia de cuadrados. Usamos ' +
            fx('a^2 - b^2 = (a + b)(a - b)') +
            '.',
        },
        {
          title: 'Raíz cuadrada del primer término',
          html: raizExplicada(a2, a),
        },
        {
          title: 'Raíz cuadrada del segundo término',
          html: 'Sin el signo menos, el segundo término es ' + h(b2) + ': ' + raizExplicada(b2, b),
        },
        {
          title: 'Forma los factores',
          html:
            'Con ' +
            fx('a') +
            ' = ' +
            h(a) +
            ' y ' +
            fx('b') +
            ' = ' +
            h(b) +
            ', un factor es la suma de las raíces, ' +
            hm(rawParen(S)) +
            ', y el otro es su diferencia, ' +
            hm(rawParen(R)) +
            '.',
        },
        {
          title: 'Resultado',
          html:
            eq(h(prompt), h(answer)) +
            '. Comprobación: al multiplicar, los términos ' +
            h(ab.neg()) +
            ' y ' +
            h(ab) +
            ' se cancelan.',
        },
      ];

      const ds = [
        {
          expr: fac(1, R, R),
          why:
            'Dos factores iguales dan un trinomio: ' +
            fx('(a - b)(a - b) = a^2 - 2ab + b^2') +
            '. En una diferencia de cuadrados un factor lleva + y el otro ' +
            MINUS +
            '.',
        },
        {
          expr: fac(1, S, S),
          why:
            'Dos factores iguales dan un trinomio: ' +
            fx('(a + b)(a + b) = a^2 + 2ab + b^2') +
            '. En una diferencia de cuadrados un factor lleva + y el otro ' +
            MINUS +
            '.',
        },
      ];

      // Coeficiente (o número) sin sacarle la raíz
      for (const [r, cuadrado, esA] of [
        [a, a2, true],
        [b, b2, false],
      ]) {
        const c = coef(r);
        if (c < 2) continue;
        const mal = mono(c * c, literal(r));
        const x = esA ? mal : a;
        const y = esA ? b : mal;
        ds.push({
          expr: fac(1, enOrden([x, y]), enOrden([x, y.neg()])),
          why: (r.isConst() ? 'Falta sacar la raíz cuadrada: ' : 'También se saca la raíz del coeficiente: ') + eq(hsqrt(cuadrado), h(r)) + '.',
        });
      }

      // Exponente sin dividir entre 2 (en uno de los términos con variable)
      const conVariable = [
        [a, a2, true],
        [b, b2, false],
      ].filter((e) => !e[0].isConst());
      if (conVariable.length) {
        const [r, cuadrado, esA] = rand.pick(conVariable);
        const mal = mono(coef(r), literal(cuadrado));
        const x = esA ? mal : a;
        const y = esA ? b : mal;
        ds.push({
          expr: fac(1, enOrden([x, y]), enOrden([x, y.neg()])),
          why:
            'Para sacar la raíz de una potencia se divide el exponente entre 2: ' +
            eq(hsqrt(mono(1, literal(cuadrado))), h(mono(1, literal(r)))) +
            '.',
        });
      }

      // La mitad en lugar de la raíz
      for (const [r, esA] of [
        [a, true],
        [b, false],
      ]) {
        const c2 = coef(r) * coef(r);
        if (c2 % 2 !== 0 || c2 / 2 === coef(r)) continue;
        const mal = mono(c2 / 2, literal(r));
        const x = esA ? mal : a;
        const y = esA ? b : mal;
        ds.push({
          expr: fac(1, enOrden([x, y]), enOrden([x, y.neg()])),
          why: 'La raíz cuadrada no es la mitad: ' + eq(hsqrt(c2), h(coef(r))) + ', no ' + c2 / 2 + '.',
        });
      }

      // Orden equivocado en el factor con resta
      if (invertido) {
        ds.push({
          expr: fac(1, enOrden([b, a]), enOrden([b, a.neg()])),
          why: 'El término positivo es ' + h(a2) + ', así que su raíz va primero en la resta: ' + hm(rawParen(R)) + '.',
        });
      } else {
        ds.push({
          expr: fac(1, S, enOrden([b, a.neg()])),
          why: 'En el factor con resta va primero la raíz del término positivo: ' + hm(rawParen(R)) + '.',
        });
      }

      return {
        prompt,
        answer,
        distractors: limpiar(
          ds.filter((d) => factoresCompletos(d.expr)),
          answer
        ),
        steps,
        key: 'f-dc|' + Alg.text(prompt),
      };
    },
  });

  /* ================================================================== */
  /* 5. Trinomio cuadrado perfecto por adición y sustracción             */
  /*    m²u⁴ + Bu²v² + n²v⁴ = (mu² + nv²)² − k²u²v²,  B = 2mn − k²        */
  /* ================================================================== */

  /** Elige m, n, k y si hay segunda variable, cumpliendo todas las condiciones. */
  function datosAdicion(level) {
    for (let intento = 0; intento < 500; intento++) {
      let m;
      let n;
      let dosVar;
      if (level === 'facil') {
        m = 1;
        n = rand.int(1, 5);
        dosVar = false;
      } else if (level === 'medio') {
        if (rand.chance(0.5)) {
          m = rand.int(2, 3);
          n = rand.int(1, 5);
          dosVar = false;
        } else {
          m = 1;
          n = rand.int(1, 4);
          dosVar = true;
        }
      } else {
        m = rand.int(1, 5);
        n = rand.int(1, 5);
        dosVar = true;
        if (m === 1 && n === 1) continue;
      }
      const doble = 2 * m * n;
      const kmax = Math.ceil(Math.sqrt(doble)) + (level === 'facil' ? 2 : 1);
      const k = rand.int(1, kmax);
      const B = doble - k * k;
      if (B === 0) continue;
      if (Alg.gcdAll([m * m, B, n * n]) !== 1) continue;
      // No debe ser un TCP ni un trinomio que se factorice directamente
      const disc = B * B - 4 * m * m * n * n;
      if (disc >= 0 && Alg.isSquare(disc)) continue;
      const U = mono(m, { x: 2 });
      const V = mono(n, dosVar ? { y: 2 } : {});
      const R = mono(k, dosVar ? { x: 1, y: 1 } : { x: 1 });
      const Fmas = U.add(R).add(V);
      const Fmenos = U.sub(R).add(V);
      if (Alg.reducibleReason(Fmas) || Alg.reducibleReason(Fmenos)) continue;
      return { m, n, k, B, U, V, R, Fmas, Fmenos, dosVar };
    }
    return datosAdicion('facil');
  }

  MA.registerCase({
    id: 'f-tcp-adicion',
    topic: 'factorizacion',
    order: 5,
    name: 'Trinomio cuadrado perfecto por adición y sustracción',
    formula: fx('x^4 + x^2y^2 + y^4 = (x^2 + y^2)^2 - x^2y^2'),
    generate(level) {
      const { k, B, U, V, R, Fmas, Fmenos, dosVar } = datosAdicion(level);
      const uv2 = dosVar ? { x: 2, y: 2 } : { x: 2 };
      const primero = U.pow(2);
      const ultimo = V.pow(2);
      const actual = mono(B, uv2); // término central del enunciado
      const necesario = U.mul(V).scale(2); // 2(mu²)(nv²)
      const falta = mono(k * k, uv2);
      const prompt = primero.add(actual).add(ultimo);
      const answer = fac(1, Fmas, Fmenos);
      const binTCP = U.add(V);
      const tcp = binTCP.pow(2);

      // Con término central negativo, se explica por qué no se completa a −2(…)(…).
      let notaSigno = '';
      if (B < 0) {
        const otroCentral = necesario.neg();
        const faltaria = otroCentral.sub(actual); // −2mn − B
        const fc = faltaria.isZero() ? 0 : coef(faltaria);
        if (fc !== 0 && !(fc > 0 && Alg.isSquare(fc))) {
          notaSigno =
            ' Aunque el término central es negativo, no sirve completar a ' +
            h(otroCentral) +
            ': faltaría ' +
            eq(hm(raw(otroCentral) + ' ' + MINUS + ' ' + rawParen(actual)), h(faltaria)) +
            ', que no es un cuadrado perfecto positivo.';
        }
      }

      const steps = [
        {
          title: 'Revisa los términos extremos',
          html:
            'El primero y el último son cuadrados perfectos: ' +
            eq(hsqrt(primero), h(U)) +
            ' y ' +
            eq(hsqrt(ultimo), h(V)) +
            '.',
        },
        {
          title: 'Compara el término central',
          html:
            'Para ser trinomio cuadrado perfecto, el término central debería ser ' +
            eq(hm('2' + rawParen(U) + rawParen(V)), h(necesario)) +
            ', pero es ' +
            h(actual) +
            '. No es un trinomio cuadrado perfecto.',
        },
        {
          title: 'Calcula lo que falta',
          html:
            'Falta ' +
            eq(hm(raw(necesario) + ' ' + MINUS + ' ' + (B < 0 ? rawParen(actual) : raw(actual))), h(falta)) +
            ', que es un cuadrado perfecto: ' +
            eq(hsqrt(falta), h(R)) +
            '.' +
            notaSigno,
        },
        {
          title: 'Suma y resta lo que falta',
          html:
            'Sumamos ' +
            h(falta) +
            ' para completar el trinomio y lo restamos para no cambiar el valor: ' +
            eq(h(prompt), hm(rawSuma([primero, actual, falta, ultimo, falta.neg()]))) +
            '.',
        },
        {
          title: 'Forma el trinomio cuadrado perfecto',
          html:
            'Juntamos ' +
            eq(hm(rawSuma([actual, falta])), h(necesario)) +
            ' y escribimos el trinomio como cuadrado: ' +
            eq(hm('(' + raw(tcp) + ') ' + MINUS + ' ' + raw(falta)), hm(rawPow(binTCP, 2) + ' ' + MINUS + ' ' + raw(falta))) +
            '.',
        },
        {
          title: 'Factoriza la diferencia de cuadrados',
          html:
            'Queda una diferencia de cuadrados, ' +
            fx('A^2 - B^2 = (A + B)(A - B)') +
            ', con ' +
            eq(fx('A'), h(binTCP)) +
            ' y ' +
            eq(fx('B'), h(R)) +
            ': ' +
            eq(
              hm(rawPow(binTCP, 2) + ' ' + MINUS + ' ' + rawPow(R, 2)),
              hm('(' + raw(binTCP) + ' + ' + raw(R) + ')(' + raw(binTCP) + ' ' + MINUS + ' ' + raw(R) + ')')
            ) +
            '.',
        },
        {
          title: 'Ordena los términos de cada factor',
          html: eq(h(prompt), h(answer)),
        },
      ];

      const ds = [
        {
          expr: fac(1, [binTCP, 2]),
          why: 'No es un trinomio cuadrado perfecto: el término central debería ser ' + h(necesario) + ', no ' + h(actual) + '.',
        },
        {
          expr: fac(1, U.add(R).sub(V), U.sub(R).sub(V)),
          why: 'El último término es positivo en los dos factores: ambos vienen de ' + hm(rawParen(binTCP)) + '.',
        },
        {
          expr: fac(1, Fmas, Fmas),
          why: 'En una diferencia de cuadrados un factor lleva + y el otro ' + MINUS + ': ' + fx('A^2 - B^2 = (A + B)(A - B)') + '.',
        },
        {
          expr: fac(1, Fmas, U.sub(R).sub(V)),
          why: 'En el segundo factor solo cambia el signo de ' + h(R) + '; ' + h(V) + ' sigue siendo positivo.',
        },
      ];
      if (k >= 2) {
        const Rmal = mono(k * k, literal(R));
        ds.push({
          expr: fac(1, U.add(Rmal).add(V), U.sub(Rmal).add(V)),
          why: 'Lo que se resta es ' + h(falta) + '; en los factores va su raíz: ' + eq(hsqrt(falta), h(R)) + '.',
        });
      }
      if (coef(V) >= 2) {
        const Vmal = mono(coef(V) * coef(V), literal(V));
        ds.push({
          expr: fac(1, U.add(R).add(Vmal), U.sub(R).add(Vmal)),
          why:
            (V.isConst() ? 'Falta sacar la raíz cuadrada del último término: ' : 'Falta sacar la raíz del coeficiente del último término: ') +
            eq(hsqrt(ultimo), h(V)) +
            '.',
        });
      }
      if (coef(U) >= 2) {
        const Umal = mono(coef(U) * coef(U), literal(U));
        ds.push({
          expr: fac(1, Umal.add(R).add(V), Umal.sub(R).add(V)),
          why: 'Falta sacar la raíz del coeficiente del primer término: ' + eq(hsqrt(primero), h(U)) + '.',
        });
      }
      if (dosVar) {
        const Rmal = mono(k, uv2);
        ds.push({
          expr: fac(1, enOrden([U, Rmal, V]), enOrden([U, Rmal.neg(), V])),
          why: 'La raíz de ' + h(falta) + ' es ' + h(R) + ': los exponentes se dividen entre 2.',
        });
      }

      return {
        prompt,
        answer,
        distractors: limpiar(
          ds.filter((d) => factoresCompletos(d.expr)),
          answer
        ),
        steps,
        key: 'f-tcp-ad|' + Alg.text(prompt),
      };
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
