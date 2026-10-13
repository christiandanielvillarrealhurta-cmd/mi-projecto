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
      do {
        ({ a, b } = terminosTCP(level));
        s = rand.sign();
        binomio = a.add(b.scale(s));
      } while (Alg.reducibleReason(binomio));
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
            ' (sin contar su signo). ✓ Es un trinomio cuadrado perfecto.',
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
          why: '(a + b)(a − b) da a² − b², que no tiene término central. Eso es una diferencia de cuadrados.',
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

      return { prompt, answer, distractors, steps, key: 'f-tcp|' + Alg.text(prompt) };
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
