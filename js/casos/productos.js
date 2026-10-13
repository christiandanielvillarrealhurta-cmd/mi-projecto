/*
 * casos/productos.js — Casos de PRODUCTOS NOTABLES.
 *
 *   1. Binomio al cuadrado
 *   2. Binomios conjugados
 *   3. Binomios con término común
 *   4. Binomio al cubo
 *   5. Trinomio al cuadrado
 *   6. Binomio por trinomio (suma o diferencia de cubos)
 */
(function (root) {
  'use strict';

  const { Alg, MA } = root;
  const { P, fac, h, hm, hp, fx, eq, raw, rand } = Alg;

  /* ================================================================== */
  /* 1. Binomio al cuadrado: (a ± b)² = a² ± 2ab + b²                    */
  /* ================================================================== */

  /** Elige a (con variable) y b (positivo) según la dificultad. */
  function terminosBinomioCuadrado(level) {
    if (level === 'facil') {
      return { a: P('x'), b: P(rand.int(1, 9)) };
    }
    if (level === 'medio') {
      if (rand.chance(0.6)) return { a: P(rand.int(2, 6) + 'x'), b: P(rand.int(1, 9)) };
      return { a: P('x'), b: P(rand.int(2, 9) + 'y') };
    }
    const m = rand.int(2, 7);
    const n = rand.int(1, 9);
    const p = rand.int(1, 3);
    const q = rand.int(1, 2);
    return { a: P(m + 'x^' + p), b: P(n + 'y^' + q) };
  }

  MA.registerCase({
    id: 'pn-binomio-cuadrado',
    topic: 'productos',
    order: 1,
    name: 'Binomio al cuadrado',
    formula: fx('(a ± b)^2 = a^2 ± 2ab + b^2'),
    generate(level) {
      const { a, b } = terminosBinomioCuadrado(level);
      const s = rand.sign(); // +1: (a + b)²   −1: (a − b)²
      const binomio = a.add(b.scale(s));
      const prompt = fac(1, [binomio, 2]);
      const answer = binomio.pow(2);

      const a2 = a.pow(2);
      const b2 = b.pow(2);
      const dobleAB = a.mul(b).scale(2);
      const signo = s > 0 ? ' + ' : ' ' + Alg.MINUS + ' ';
      const formula = s > 0 ? fx('(a + b)^2 = a^2 + 2ab + b^2') : fx('(a - b)^2 = a^2 - 2ab + b^2');

      const steps = [
        {
          title: 'Identifica el caso',
          html:
            'Es el cuadrado de ' +
            (s > 0 ? 'una suma' : 'una diferencia') +
            ' de dos términos, así que usamos: ' +
            formula,
        },
        {
          title: 'Identifica los términos',
          html: 'Primer término: ' + fx('a') + ' = ' + h(a) + '. Segundo término: ' + fx('b') + ' = ' + h(b) + '.',
        },
        {
          title: 'Cuadrado del primer término',
          html: eq(fx('a^2'), hp(a, 2), h(a2)),
        },
        {
          title: 'Doble producto del primero por el segundo',
          html:
            eq(fx('2ab'), hm('2' + Alg.rawParen(a) + Alg.rawParen(b)), h(dobleAB)) +
            (s > 0 ? '' : '. Como el binomio es una resta, este término lleva signo ' + Alg.MINUS + '.'),
        },
        {
          title: 'Cuadrado del segundo término',
          html: eq(fx('b^2'), hp(b, 2), h(b2)) + ' (siempre es positivo).',
        },
        {
          title: 'Junta los resultados',
          html: eq(h(prompt), hm(raw(a2) + signo + raw(dobleAB) + ' + ' + raw(b2)), h(answer)),
        },
      ];

      // Coeficiente sin elevar al cuadrado: (3x)² → 3x² (solo si el coeficiente no es 1)
      const coefA = a.terms[0].c;
      const a2MalCoef = Alg.mono(coefA, a2.terms[0].v);

      const distractors = [
        {
          expr: a2.add(b2.scale(s)),
          why: 'Olvidaste el doble producto 2ab: (a ± b)² no es igual a a² ± b².',
        },
        {
          expr: a2.add(b2),
          why: 'Falta el término central: el doble producto del primero por el segundo (2ab).',
        },
        {
          expr: a2.add(a.mul(b).scale(s)).add(b2),
          why: 'El término central es el DOBLE del producto: 2ab, no solo ab.',
        },
        {
          expr: a2.add(dobleAB.scale(-s)).add(b2),
          why: 'El signo del término central debe ser el mismo que el del binomio.',
        },
        {
          expr: a2.add(dobleAB.scale(s)).sub(b2),
          why: 'El cuadrado del segundo término siempre es positivo: b² = b · b.',
        },
        {
          expr: a2.add(dobleAB.scale(s)).add(b.scale(2)),
          why: 'b² significa b · b, no 2 · b.',
        },
      ];
      if (coefA !== 1) {
        distractors.push({
          expr: a2MalCoef.add(dobleAB.scale(s)).add(b2),
          why: 'Al elevar al cuadrado el primer término también se eleva su coeficiente: ' + hp(a, 2) + ' = ' + h(a2) + '.',
        });
      }

      return { prompt, answer, distractors, steps, key: 'pn-bc|' + Alg.text(prompt) };
    },
  });

  /* ================================================================== */
  /* 2–6: (pendientes)                                                   */
  /* ================================================================== */
})(typeof window !== 'undefined' ? window : globalThis);
