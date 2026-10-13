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

  /** Letra del nivel fácil: casi siempre x; a veces m o y, para variar. */
  function letraFacil() {
    return P(rand.pick(['x', 'x', 'x', 'm', 'y']));
  }

  /**
   * Repite la elección de los términos a y b hasta que el binomio no tenga
   * factor común numérico, como en los libros: (2x + 3)², no (4x + 8)².
   */
  function coprimos(elegir) {
    let t = elegir();
    for (let i = 0; i < 200 && Alg.gcd(t.a.terms[0].c, t.b.terms[0].c) !== 1; i++) t = elegir();
    return t;
  }

  /* ================================================================== */
  /* 1. Binomio al cuadrado: (a ± b)² = a² ± 2ab + b²                    */
  /* ================================================================== */

  /** Elige a (con variable) y b (positivo) según la dificultad. */
  function terminosBinomioCuadrado(level) {
    return coprimos(() => elegirBinomioCuadrado(level));
  }

  function elegirBinomioCuadrado(level) {
    if (level === 'facil') {
      return { a: letraFacil(), b: P(rand.int(1, 9)) };
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
          why: 'Olvidaste el doble producto ' + fx('2ab') + ': ' + fx('(a ± b)^2') + ' no es igual a ' + fx('a^2 ± b^2') + '.',
        },
        {
          expr: a2.add(b2),
          why: 'Falta el término central: el doble producto del primero por el segundo, ' + fx('2ab') + '.',
        },
        {
          expr: a2.add(a.mul(b).scale(s)).add(b2),
          why: 'El término central es el doble del producto: ' + fx('2ab') + ', no solo ' + fx('ab') + '.',
        },
        {
          expr: a2.add(dobleAB.scale(-s)).add(b2),
          why: 'El signo del término central debe ser el mismo que el del binomio.',
        },
        {
          expr: a2.add(dobleAB.scale(s)).sub(b2),
          why: 'El cuadrado del segundo término siempre es positivo: ' + fx('b^2 = b*b') + '.',
        },
        {
          expr: a2.add(dobleAB.scale(s)).add(b.scale(2)),
          why: fx('b^2') + ' significa ' + fx('b*b') + ', no ' + fx('2*b') + '.',
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
  /* Ayudantes para los casos 2–6                                        */
  /* ================================================================== */

  const { mono, rawParen, rawPow } = Alg;
  const MENOS = ' ' + Alg.MINUS + ' ';

  /**
   * Escribe varios términos (monomios) seguidos, cada uno con su signo y SIN
   * juntar los semejantes. Sirve para mostrar la suma antes de simplificarla:
   * rawSuma([x⁴, 9x², −4x²]) → "x⁴ + 9x² − 4x²".
   */
  function rawSuma(terminos) {
    return terminos
      .filter((t) => !t.isZero())
      .map((t, i) => {
        if (i === 0) return raw(t);
        return t.terms[0].c < 0 ? MENOS + raw(t.neg()) : ' + ' + raw(t);
      })
      .join('');
  }

  /** Término dentro de una suma: entre paréntesis si es negativo, como en 3 + (−5). */
  function rawSumando(t) {
    return t.terms[0].c < 0 ? rawParen(t) : raw(t);
  }

  /** Potencia para usarla como factor de un producto, siempre entre paréntesis: (5²), (x²), (2y)². */
  function rawPotFactor(x, e) {
    const r = rawPow(x, e);
    return r.charAt(0) === '(' ? r : '(' + r + ')';
  }

  /** Monomio con coeficiente c y la parte literal del monomio m: conLiteral(5, 9x²) → 5x². */
  function conLiteral(c, m) {
    return mono(c, m.terms[0].v);
  }

  /** ¿El monomio tiene alguna variable con exponente 2 o más? */
  function tieneExponente(m) {
    const v = m.terms[0].v;
    return Object.keys(v).some((k) => v[k] >= 2);
  }

  /**
   * Error típico al elevar una potencia: SUMAR los exponentes en vez de
   * multiplicarlos. potenciaSumandoExp(3x³, 2) → 9x⁵ (lo correcto es 9x⁶).
   */
  function potenciaSumandoExp(m, k) {
    const t = m.terms[0];
    const v = {};
    for (const name of Object.keys(t.v)) v[name] = t.v[name] + k;
    return mono(Math.pow(t.c, k), v);
  }

  /**
   * Limpia la lista de distractores: quita los que valen lo mismo que la
   * respuesta o que otro distractor, los deja en el orden estándar y conserva
   * como máximo 7.
   */
  function depurar(answer, lista) {
    const vistos = new Set([answer.key()]);
    const out = [];
    for (const d of lista) {
      const expr = d.expr.sorted();
      if (expr.isZero() || vistos.has(expr.key())) continue;
      vistos.add(expr.key());
      out.push({ expr, why: d.why });
    }
    return out.length > 7 ? rand.sample(out, 7) : out;
  }

  /* ================================================================== */
  /* 2. Binomios conjugados: (a + b)(a − b) = a² − b²                    */
  /* ================================================================== */

  /** Elige a (con x) y b (positivo) según la dificultad. */
  function terminosConjugados(level) {
    return coprimos(() => elegirConjugados(level));
  }

  function elegirConjugados(level) {
    if (level === 'facil') {
      return { a: letraFacil(), b: P(rand.int(1, 9)) };
    }
    if (level === 'medio') {
      if (rand.chance(0.6)) return { a: P(rand.int(2, 6) + 'x'), b: P(rand.int(1, 9)) };
      return { a: P('x'), b: P(rand.int(1, 9) + 'y') };
    }
    const m = rand.int(2, 7);
    const n = rand.int(1, 9);
    return { a: P(m + 'x^' + rand.int(1, 3)), b: P(n + 'y^' + rand.int(1, 2)) };
  }

  MA.registerCase({
    id: 'pn-conjugados',
    topic: 'productos',
    order: 2,
    name: 'Binomios conjugados',
    formula: fx('(a + b)(a - b) = a^2 - b^2'),
    generate(level) {
      const { a, b } = terminosConjugados(level);
      const suma = a.add(b);
      const resta = a.sub(b);
      // A veces la resta va primero: (a − b)(a + b) es el mismo producto.
      const prompt = rand.chance(0.5) ? fac(1, suma, resta) : fac(1, resta, suma);
      const a2 = a.pow(2);
      const b2 = b.pow(2);
      const answer = a2.sub(b2);
      const ab = a.mul(b);
      const cruzados = hm(raw(ab) + MENOS + raw(ab) + ' = 0');

      const steps = [
        {
          title: 'Identifica el caso',
          html:
            'Los dos binomios tienen los mismos términos y solo cambia el signo del segundo: son binomios conjugados. Usamos: ' +
            fx('(a + b)(a - b) = a^2 - b^2'),
        },
        {
          title: 'Identifica los términos',
          html:
            'Primer término (tiene el mismo signo en los dos binomios): ' +
            fx('a') +
            ' = ' +
            h(a) +
            '. Segundo término (cambia de signo): ' +
            fx('b') +
            ' = ' +
            h(b) +
            '.',
        },
        {
          title: 'Cuadrado del primer término',
          html: eq(fx('a^2'), hp(a, 2), h(a2)),
        },
        {
          title: 'Cuadrado del segundo término',
          html: eq(fx('b^2'), hp(b, 2), h(b2)),
        },
        {
          title: 'Resta los cuadrados',
          html:
            'Los productos cruzados se cancelan (' +
            cruzados +
            '), así que queda el cuadrado del primero menos el cuadrado del segundo: ' +
            eq(h(prompt), hm(raw(a2) + MENOS + raw(b2)), h(answer)),
        },
      ];

      const coefA = a.terms[0].c;
      const distractors = [
        {
          expr: a2.add(b2),
          why: 'El resultado es una resta: el cuadrado del primero MENOS el cuadrado del segundo.',
        },
        {
          expr: a2.sub(ab.scale(2)).add(b2),
          why: 'Eso es ' + fx('(a - b)^2') + '. En los conjugados los productos cruzados se cancelan: ' + cruzados + '.',
        },
        {
          expr: a2.add(ab.scale(2)).sub(b2),
          why: 'Los productos cruzados tienen signos opuestos y se cancelan, no se suman: ' + cruzados + '.',
        },
        {
          expr: a2.sub(b),
          why: 'También hay que elevar al cuadrado el segundo término: ' + eq(fx('b^2'), hp(b, 2), h(b2)) + '.',
        },
        {
          expr: a2.sub(b.scale(2)),
          why: fx('b^2') + ' significa ' + fx('b * b') + ', no ' + fx('2 * b') + ': ' + eq(fx('b^2'), hp(b, 2), h(b2)) + '.',
        },
        {
          expr: b2.sub(a2),
          why: 'Se resta el cuadrado del término que cambia de signo (' + h(b) + '): es ' + fx('a^2 - b^2') + ', no ' + fx('b^2 - a^2') + '.',
        },
      ];
      if (coefA !== 1) {
        distractors.push({
          expr: conLiteral(coefA, a2).sub(b2),
          why: 'Al elevar al cuadrado también se eleva el coeficiente: ' + eq(hp(a, 2), h(a2)) + '.',
        });
      }
      if (tieneExponente(a)) {
        distractors.push({
          expr: potenciaSumandoExp(a, 2).sub(b2),
          why: 'Al elevar una potencia al cuadrado se multiplican los exponentes: ' + eq(hp(a, 2), h(a2)) + '.',
        });
      }

      return { prompt, answer, distractors: depurar(answer, distractors), steps, key: 'pn-conj|' + Alg.text(prompt) };
    },
  });

  /* ================================================================== */
  /* 3. Binomios con término común: (x + a)(x + b) = x² + (a + b)x + ab  */
  /* ================================================================== */

  /**
   * Elige el término común u y los no comunes p·r y q·r (r es su parte
   * literal: 1, y, y²...). Se exige p ≠ q (si no, sería un cuadrado) y
   * p + q ≠ 0 (si no, serían conjugados).
   */
  function terminosTerminoComun(level) {
    let u;
    let r = P(1);
    if (level === 'facil') {
      u = P('x');
    } else if (level === 'medio') {
      if (rand.chance(0.6)) {
        u = P(rand.int(2, 5) + 'x');
      } else {
        u = P('x');
        r = P('y');
      }
    } else {
      const tipo = rand.int(1, 4);
      if (tipo === 1) {
        u = P('x^2');
        r = P(rand.pick(['1', 'y', 'y^2']));
      } else if (tipo === 2) {
        u = P(rand.int(2, 4) + 'x^2');
        r = P(rand.pick(['1', 'y']));
      } else if (tipo === 3) {
        u = P(rand.int(1, 3) + 'xy');
      } else {
        u = P('x^3');
        r = P(rand.pick(['1', 'y']));
      }
    }
    let p;
    let q;
    do {
      p = rand.nonZero(-9, 9);
      q = rand.nonZero(-9, 9);
    } while (p === q || p + q === 0 || Alg.gcd(u.terms[0].c, p) !== 1 || Alg.gcd(u.terms[0].c, q) !== 1);
    return { u, r, p, q };
  }

  MA.registerCase({
    id: 'pn-termino-comun',
    topic: 'productos',
    order: 3,
    name: 'Binomios con término común',
    formula: fx('(x + a)(x + b) = x^2 + (a + b)x + ab'),
    generate(level) {
      const { u, r, p, q } = terminosTerminoComun(level);
      const np = r.scale(p); // primer término no común (con su signo)
      const nq = r.scale(q); // segundo término no común (con su signo)
      const f1 = u.add(np);
      const f2 = u.add(nq);
      const prompt = fac(1, f1, f2);
      const answer = f1.mul(f2);

      const u2 = u.pow(2);
      const suma = r.scale(p + q);
      const central = suma.mul(u);
      const producto = np.mul(nq);
      const sumaHtml = eq(hm(raw(np) + ' + ' + rawSumando(nq)), h(suma));
      const productoHtml = eq(hm(rawParen(np) + rawParen(nq)), h(producto));

      const steps = [
        {
          title: 'Identifica el caso',
          html:
            'Los dos binomios tienen un término común, ' +
            h(u) +
            ', y sus otros términos son distintos. La regla: el cuadrado del término común, más la suma de los no comunes por el término común, más el producto de los no comunes.',
        },
        {
          title: 'Identifica los términos',
          html:
            'Término común: ' +
            h(u) +
            '. Términos no comunes (cada uno con su signo): en el primer binomio, ' +
            h(np) +
            '; en el segundo, ' +
            h(nq) +
            '.',
        },
        {
          title: 'Cuadrado del término común',
          html: eq(hp(u, 2), h(u2)),
        },
        {
          title: 'Suma de los no comunes por el término común',
          html:
            'Suma: ' +
            sumaHtml +
            '. Multiplicada por el término común: ' +
            eq(hm(rawParen(suma) + rawParen(u)), h(central)) +
            '.',
        },
        {
          title: 'Producto de los no comunes',
          html: productoHtml,
        },
        {
          title: 'Junta los resultados',
          html: eq(h(prompt), hm(rawSuma([u2, central, producto])), h(answer)),
        },
      ];

      const ur = u.mul(r);
      const coefU = u.terms[0].c;
      const distractors = [
        {
          expr: u2.add(ur.scale(p * q)).add(producto),
          why: 'En el término central los no comunes se SUMAN, no se multiplican: ' + sumaHtml + '.',
        },
        {
          expr: u2.sub(central).add(producto),
          why: 'El término central lleva el signo de la suma de los no comunes: ' + sumaHtml + '.',
        },
        {
          expr: u2.add(ur.scale(p - q)).add(producto),
          why: 'Cuida los signos al sumar los no comunes: ' + sumaHtml + '.',
        },
        {
          expr: u2.add(central).sub(producto),
          why: 'El último término es el producto de los no comunes con sus signos: ' + productoHtml + '.',
        },
        {
          expr: u2.add(producto),
          why: 'Falta el término central: la suma de los no comunes multiplicada por el término común.',
        },
        {
          expr: u2.add(central).add(r.pow(2).scale(p + q)),
          why: 'El último término es el PRODUCTO de los no comunes, no su suma: ' + productoHtml + '.',
        },
      ];
      if (coefU !== 1) {
        distractors.push({
          expr: conLiteral(coefU, u2).add(central).add(producto),
          why: 'Al elevar al cuadrado el término común también se eleva su coeficiente: ' + eq(hp(u, 2), h(u2)) + '.',
        });
        distractors.push({
          expr: u2.add(suma.mul(conLiteral(1, u))).add(producto),
          why: 'La suma de los no comunes se multiplica por TODO el término común, ' + h(u) + ', incluido su coeficiente.',
        });
      }

      return { prompt, answer, distractors: depurar(answer, distractors), steps, key: 'pn-tc|' + Alg.text(prompt) };
    },
  });

  /* ================================================================== */
  /* 4. Binomio al cubo: (a ± b)³ = a³ ± 3a²b + 3ab² ± b³                */
  /* ================================================================== */

  /** Elige a (con x) y b (positivo) según la dificultad. */
  function terminosBinomioCubo(level) {
    return coprimos(() => elegirBinomioCubo(level));
  }

  function elegirBinomioCubo(level) {
    if (level === 'facil') {
      return { a: letraFacil(), b: P(rand.int(1, 6)) };
    }
    if (level === 'medio') {
      if (rand.chance(0.6)) return { a: P(rand.int(2, 3) + 'x'), b: P(rand.int(1, 4)) };
      return { a: P('x'), b: P(rand.int(1, 4) + 'y') };
    }
    // El primer término no debe ser solo "x": 2x, 3x, x², 2x² o 3x².
    let m;
    let p;
    do {
      m = rand.int(1, 3);
      p = rand.int(1, 2);
    } while (m === 1 && p === 1);
    return { a: P(m + 'x^' + p), b: P(rand.int(1, 4) + 'y^' + rand.int(1, 2)) };
  }

  MA.registerCase({
    id: 'pn-binomio-cubo',
    topic: 'productos',
    order: 4,
    name: 'Binomio al cubo',
    formula: fx('(a ± b)^3 = a^3 ± 3a^2b + 3ab^2 ± b^3'),
    generate(level) {
      const { a, b } = terminosBinomioCubo(level);
      const s = rand.sign(); // +1: (a + b)³   −1: (a − b)³
      const binomio = a.add(b.scale(s));
      const prompt = fac(1, [binomio, 3]);
      const answer = binomio.pow(3);

      const a2 = a.pow(2);
      const a3 = a.pow(3);
      const b2 = b.pow(2);
      const b3 = b.pow(3);
      const t2 = a2.mul(b).scale(3); // 3a²b (sin el signo)
      const t3 = a.mul(b2).scale(3); // 3ab² (siempre positivo)
      const formula = s > 0 ? fx('(a + b)^3 = a^3 + 3a^2b + 3ab^2 + b^3') : fx('(a - b)^3 = a^3 - 3a^2b + 3ab^2 - b^3');
      const t2Html = eq(fx('3a^2b'), hm('3' + rawPotFactor(a, 2) + rawParen(b)), hm('3' + rawParen(a2) + rawParen(b)), h(t2));
      const t3Html = eq(fx('3ab^2'), hm('3' + rawParen(a) + rawPotFactor(b, 2)), hm('3' + rawParen(a) + rawParen(b2)), h(t3));

      const steps = [
        {
          title: 'Identifica el caso',
          html:
            'Es el cubo de ' + (s > 0 ? 'una suma' : 'una diferencia') + ' de dos términos, así que usamos: ' + formula,
        },
        {
          title: 'Identifica los términos',
          html:
            'Primer término: ' +
            fx('a') +
            ' = ' +
            h(a) +
            '. Segundo término: ' +
            fx('b') +
            ' = ' +
            h(b) +
            (s > 0 ? '.' : ' (el signo ' + Alg.MINUS + ' ya está en la fórmula).'),
        },
        {
          title: 'Cubo del primer término',
          html: eq(fx('a^3'), hp(a, 3), h(a3)),
        },
        {
          title: 'Triple del cuadrado del primero por el segundo',
          html: t2Html + (s > 0 ? '' : '. En la diferencia este término lleva signo ' + Alg.MINUS + '.'),
        },
        {
          title: 'Triple del primero por el cuadrado del segundo',
          html: t3Html + (s > 0 ? '' : '. Este término es positivo, porque ' + fx('(-b)^2 = b^2') + '.'),
        },
        {
          title: 'Cubo del segundo término',
          html:
            eq(fx('b^3'), hp(b, 3), h(b3)) +
            (s > 0 ? '' : '. En la diferencia lleva signo ' + Alg.MINUS + ', porque ' + fx('(-b)^3 = -b^3') + '.'),
        },
        {
          title: 'Junta los resultados',
          html:
            'Con los signos ' +
            (s > 0 ? '+, +, +, +' : '+, ' + Alg.MINUS + ', +, ' + Alg.MINUS) +
            ': ' +
            eq(h(prompt), hm(rawSuma([a3, t2.scale(s), t3, b3.scale(s)])), h(answer)),
        },
      ];

      const coefA = a.terms[0].c;
      // Con el signo correcto, el término de a²b y el último.
      const sT2 = t2.scale(s);
      const sB3 = b3.scale(s);
      const distractors = [
        {
          expr: a3.add(sB3),
          why:
            (s > 0 ? fx('(a + b)^3') + ' no es ' + fx('a^3 + b^3') : fx('(a - b)^3') + ' no es ' + fx('a^3 - b^3')) +
            ': faltan los términos ' +
            fx('3a^2b') +
            ' y ' +
            fx('3ab^2') +
            '.',
        },
        {
          expr: a3.sub(sT2).add(t3).sub(sB3),
          why:
            s > 0
              ? 'Los signos se alternan solo en la diferencia; en ' + fx('(a + b)^3') + ' todos los términos son positivos.'
              : 'En ' + fx('(a - b)^3') + ' los signos se alternan: +, ' + Alg.MINUS + ', +, ' + Alg.MINUS + '.',
        },
        {
          expr: a3.add(a2.mul(b).scale(s)).add(a.mul(b2)).add(sB3),
          why: 'Los términos centrales llevan coeficiente 3: ' + fx('3a^2b') + ' y ' + fx('3ab^2') + '.',
        },
        {
          expr: a3.add(a2.mul(b).scale(2 * s)).add(a.mul(b2).scale(2)).add(sB3),
          why: 'En el cubo los términos centrales llevan 3, no 2 (el 2 es del binomio al cuadrado).',
        },
        {
          expr: a3.add(conLiteral(s * t3.terms[0].c, t2)).add(conLiteral(t2.terms[0].c, t3)).add(sB3),
          why: 'Intercambiaste los términos centrales: ' + eq(fx('3a^2b'), h(t2)) + '; ' + eq(fx('3ab^2'), h(t3)) + '.',
        },
        {
          expr: a3.add(sT2).add(a.mul(b).scale(3)).add(sB3),
          why: 'En ' + fx('3ab^2') + ' el segundo término va al cuadrado: ' + t3Html + '.',
        },
      ];
      if (s < 0) {
        distractors.push({
          expr: a3.sub(t2).sub(t3).sub(b3),
          why: 'El término ' + fx('3ab^2') + ' es positivo, porque ' + fx('(-b)^2') + ' es positivo.',
        });
        distractors.push({
          expr: a3.sub(t2).add(t3).add(b3),
          why: 'El último término es negativo, porque ' + fx('(-b)^3 = -b^3') + '.',
        });
      }
      if (coefA !== 1) {
        distractors.push({
          expr: conLiteral(coefA, a3).add(sT2).add(t3).add(sB3),
          why: 'Al elevar al cubo también se eleva el coeficiente: ' + eq(hp(a, 3), h(a3)) + '.',
        });
      }
      if (tieneExponente(a)) {
        distractors.push({
          expr: potenciaSumandoExp(a, 3).add(sT2).add(t3).add(sB3),
          why: 'Al elevar una potencia al cubo se multiplican los exponentes: ' + eq(hp(a, 3), h(a3)) + '.',
        });
      }

      return { prompt, answer, distractors: depurar(answer, distractors), steps, key: 'pn-cubo|' + Alg.text(prompt) };
    },
  });

  /* ================================================================== */
  /* 5. Trinomio al cuadrado:                                            */
  /*    (a + b + c)² = a² + b² + c² + 2ab + 2ac + 2bc                    */
  /* ================================================================== */

  /** Devuelve los tres términos [a, b, c], cada uno con su signo (a siempre positivo). */
  function terminosTrinomioCuadrado(level) {
    if (level === 'facil') {
      return [P('x'), mono(rand.sign(), { y: 1 }), P(rand.sign() * rand.int(1, 5))];
    }
    if (level === 'medio') {
      let m;
      let n;
      let k;
      do {
        m = rand.int(1, 4);
        n = rand.int(1, 4);
        k = rand.int(1, 6);
      } while ((m === 1 && n === 1) || Alg.gcdAll([m, n, k]) !== 1);
      return [mono(m, { x: 1 }), mono(rand.sign() * n, { y: 1 }), P(rand.sign() * k)];
    }
    if (rand.chance(0.5)) {
      // (x² ± mx ± n)²: b² y 2ac son términos semejantes (los dos llevan x²).
      // Se evita que se cancelen (m² + 2n = 0).
      let m;
      let n;
      do {
        m = rand.sign() * rand.int(1, 5);
        n = rand.sign() * rand.int(1, 6);
      } while (m * m + 2 * n === 0);
      return [P('x^2'), mono(m, { x: 1 }), P(n)];
    }
    let m;
    let n;
    let k;
    do {
      m = rand.int(1, 4);
      n = rand.int(1, 4);
      k = rand.int(1, 5);
    } while (m * n * k === 1 || Alg.gcdAll([m, n, k]) !== 1);
    return [mono(m, { x: 1 }), mono(rand.sign() * n, { y: 1 }), mono(rand.sign() * k, { z: 1 })];
  }

  MA.registerCase({
    id: 'pn-trinomio-cuadrado',
    topic: 'productos',
    order: 5,
    name: 'Trinomio al cuadrado',
    formula: fx('(a + b + c)^2 = a^2 + b^2 + c^2 + 2ab + 2ac + 2bc'),
    generate(level) {
      const [a, b, c] = terminosTrinomioCuadrado(level);
      const trinomio = a.add(b).add(c);
      const prompt = fac(1, [trinomio, 2]);
      const answer = trinomio.pow(2);

      const a2 = a.pow(2);
      const b2 = b.pow(2);
      const c2 = c.pow(2);
      const ab2 = a.mul(b).scale(2);
      const ac2 = a.mul(c).scale(2);
      const bc2 = b.mul(c).scale(2);
      // En (x² ± mx ± n)² los términos b² y 2ac tienen la misma parte literal.
      const semejantes = b2.add(ac2).length < 2;
      const dobleHtml = (nombre, u, v, res) => eq(fx(nombre), hm('2' + rawParen(u) + rawParen(v)), h(res));

      const steps = [
        {
          title: 'Identifica el caso',
          html: 'Es el cuadrado de un trinomio, así que usamos: ' + fx('(a + b + c)^2 = a^2 + b^2 + c^2 + 2ab + 2ac + 2bc'),
        },
        {
          title: 'Identifica los términos (con su signo)',
          html: fx('a') + ' = ' + h(a) + ', ' + fx('b') + ' = ' + h(b) + ', ' + fx('c') + ' = ' + h(c) + '.',
        },
        {
          title: 'Cuadrado de cada término',
          html:
            eq(fx('a^2'), hp(a, 2), h(a2)) +
            '; ' +
            eq(fx('b^2'), hp(b, 2), h(b2)) +
            '; ' +
            eq(fx('c^2'), hp(c, 2), h(c2)) +
            '. Los cuadrados siempre son positivos.',
        },
        {
          title: 'Dobles productos',
          html:
            dobleHtml('2ab', a, b, ab2) +
            '; ' +
            dobleHtml('2ac', a, c, ac2) +
            '; ' +
            dobleHtml('2bc', b, c, bc2) +
            '. El signo de cada uno sale de multiplicar los signos.',
        },
      ];
      if (semejantes) {
        steps.push({
          title: 'Junta los términos semejantes',
          html:
            h(b2) +
            ' y ' +
            h(ac2) +
            ' tienen la misma parte literal (' +
            h(conLiteral(1, b2)) +
            '), así que se suman: ' +
            eq(hm(rawSuma([b2, ac2])), h(b2.add(ac2))) +
            '.',
        });
      }
      steps.push({
        title: 'Suma todo y ordena',
        html: eq(h(prompt), hm(rawSuma([a2, b2, c2, ab2, ac2, bc2])), h(answer)),
      });

      const cuadrados = a2.add(b2).add(c2);
      const distractors = [
        {
          expr: cuadrados,
          why: 'Faltan los dobles productos ' + fx('2ab') + ', ' + fx('2ac') + ' y ' + fx('2bc') + '.',
        },
        {
          expr: cuadrados.add(a.mul(b)).add(a.mul(c)).add(b.mul(c)),
          why: 'Los productos cruzados van multiplicados por 2: ' + fx('2ab') + ', ' + fx('2ac') + ' y ' + fx('2bc') + '.',
        },
        {
          expr: answer.sub(ac2),
          why: semejantes
            ? 'Hay dos términos con ' + h(conLiteral(1, b2)) + ': ' + eq(fx('b^2'), h(b2)) + ' y ' + eq(fx('2ac'), h(ac2)) + '; hay que sumarlos.'
            : 'Falta el doble producto del primero por el tercero: ' + dobleHtml('2ac', a, c, ac2) + '.',
        },
        {
          expr: answer.sub(ac2).sub(bc2),
          why: 'Lo trataste como binomio: faltan los dobles productos con el tercer término, ' + fx('2ac') + ' y ' + fx('2bc') + '.',
        },
      ];
      // Error de signo en un doble producto (solo si interviene un término negativo).
      for (const [nombre, u, v, res] of [
        ['2ab', a, b, ab2],
        ['2ac', a, c, ac2],
        ['2bc', b, c, bc2],
      ]) {
        if (u.terms[0].c < 0 || v.terms[0].c < 0) {
          distractors.push({
            expr: answer.sub(res.scale(2)),
            why: 'Cuida el signo de ' + fx(nombre) + ': ' + dobleHtml(nombre, u, v, res) + '.',
          });
        }
      }
      // Cuadrado de un término negativo escrito con signo −.
      const negativo = c.terms[0].c < 0 ? c : b.terms[0].c < 0 ? b : null;
      if (negativo) {
        const cuadNeg = negativo.pow(2);
        distractors.push({
          expr: answer.sub(cuadNeg.scale(2)),
          why: 'Un cuadrado siempre es positivo: ' + eq(hp(negativo, 2), h(cuadNeg)) + '.',
        });
      }
      // c² confundido con 2c (cuando c es un número).
      if (c.isConst()) {
        const doble = P(2 * Math.abs(c.terms[0].c));
        distractors.push({
          expr: answer.sub(c2).add(doble),
          why: 'Elevar al cuadrado es multiplicar por sí mismo: ' + eq(hp(c, 2), h(c2)) + ', no ' + h(doble) + '.',
        });
      }
      // Coeficiente sin elevar al cuadrado: (3x)² → 3x².
      const conCoef = [a, b].find((t) => Math.abs(t.terms[0].c) !== 1);
      if (conCoef) {
        const cuad = conCoef.pow(2);
        distractors.push({
          expr: answer.sub(cuad).add(conLiteral(Math.abs(conCoef.terms[0].c), cuad)),
          why: 'Al elevar al cuadrado también se eleva el coeficiente: ' + eq(hp(conCoef, 2), h(cuad)) + '.',
        });
      }

      return { prompt, answer, distractors: depurar(answer, distractors), steps, key: 'pn-trin|' + Alg.text(prompt) };
    },
  });

  /* ================================================================== */
  /* 6. Binomio por trinomio (suma o diferencia de cubos):               */
  /*    (a + b)(a² − ab + b²) = a³ + b³   (a − b)(a² + ab + b²) = a³ − b³  */
  /* ================================================================== */

  /** Elige a (con x) y b (positivo) según la dificultad. */
  function terminosBinomioTrinomio(level) {
    return coprimos(() => elegirBinomioTrinomio(level));
  }

  function elegirBinomioTrinomio(level) {
    if (level === 'facil') {
      return { a: letraFacil(), b: P(rand.int(1, 5)) };
    }
    if (level === 'medio') {
      if (rand.chance(0.6)) return { a: P(rand.int(2, 4) + 'x'), b: P(rand.int(1, 5)) };
      return { a: P('x'), b: P(rand.int(1, 5) + 'y') };
    }
    // El primer término no debe ser solo "x".
    let m;
    let p;
    do {
      m = rand.int(1, 5);
      p = rand.int(1, 2);
    } while (m === 1 && p === 1);
    return { a: P(m + 'x^' + p), b: P(rand.int(1, 5) + 'y^' + rand.int(1, 2)) };
  }

  MA.registerCase({
    id: 'pn-binomio-trinomio',
    topic: 'productos',
    order: 6,
    name: 'Binomio por trinomio (suma o diferencia de cubos)',
    formula: fx('(a + b)(a^2 - ab + b^2) = a^3 + b^3') + ' y ' + fx('(a - b)(a^2 + ab + b^2) = a^3 - b^3'),
    generate(level) {
      const { a, b } = terminosBinomioTrinomio(level);
      const s = rand.sign(); // +1: suma de cubos   −1: diferencia de cubos
      const binomio = a.add(b.scale(s));
      const a2 = a.pow(2);
      const b2 = b.pow(2);
      const ab = a.mul(b);
      const trinomio = a2.add(ab.scale(-s)).add(b2);
      // A veces el trinomio va primero.
      const prompt = rand.chance(0.7) ? fac(1, binomio, trinomio) : fac(1, trinomio, binomio);
      const a3 = a.pow(3);
      const b3 = b.pow(3);
      const answer = a3.add(b3.scale(s));
      const a2b = a2.mul(b);
      const ab2 = a.mul(b2);

      const steps = [
        {
          title: 'Identifica el binomio',
          html:
            'En el binomio ' +
            h(binomio) +
            ': primer término ' +
            fx('a') +
            ' = ' +
            h(a) +
            ', segundo término ' +
            fx('b') +
            ' = ' +
            h(b) +
            ', unidos con signo ' +
            (s > 0 ? '+' : Alg.MINUS) +
            '.',
        },
        {
          title: 'Revisa el trinomio',
          html:
            'Debe ser ' +
            (s > 0 ? fx('a^2 - ab + b^2') : fx('a^2 + ab + b^2')) +
            ': ' +
            eq(fx('a^2'), hp(a, 2), h(a2)) +
            '; ' +
            eq(fx('ab'), hm(rawParen(a) + rawParen(b)), h(ab)) +
            '; ' +
            eq(fx('b^2'), hp(b, 2), h(b2)) +
            '. ✓ Coincide con ' +
            h(trinomio) +
            ', con el término central de signo contrario al del binomio.',
        },
        {
          title: 'Aplica la fórmula',
          html:
            'Es una ' +
            (s > 0 ? 'suma' : 'diferencia') +
            ' de cubos: ' +
            (s > 0 ? fx('(a + b)(a^2 - ab + b^2) = a^3 + b^3') : fx('(a - b)(a^2 + ab + b^2) = a^3 - b^3')) +
            '. Si multiplicas término a término, ' +
            hm(rawSuma([a3, a2b.scale(-s), ab2, a2b.scale(s), ab2.neg(), b3.scale(s)])) +
            ', los términos del centro se cancelan y solo quedan los cubos.',
        },
        {
          title: 'Cubo de cada término',
          html: eq(fx('a^3'), hp(a, 3), h(a3)) + '; ' + eq(fx('b^3'), hp(b, 3), h(b3)) + '.',
        },
        {
          title: 'Resultado',
          html: eq(h(prompt), hm(raw(a3) + (s > 0 ? ' + ' : MENOS) + raw(b3)), h(answer)),
        },
      ];

      const coefA = a.terms[0].c;
      const coefB = b.terms[0].c;
      const sB3 = b3.scale(s);
      const distractors = [
        {
          expr: a3.add(b3.scale(-s)),
          why: 'El resultado lleva el signo del binomio (' + (s > 0 ? '+' : Alg.MINUS) + '), no el del término central del trinomio.',
        },
        {
          expr: binomio.pow(3),
          why: 'Eso sería ' + hp(binomio, 3) + '; aquí el segundo factor es el trinomio y los términos centrales se cancelan.',
        },
        {
          expr: a3.add(a2b.scale(2 * s)).add(ab2.scale(2)).add(sB3),
          why: 'Al multiplicar, los términos con ' + fx('a^2b') + ' y con ' + fx('ab^2') + ' tienen signos opuestos: se cancelan, no se suman.',
        },
        {
          expr: a2.add(b2.scale(s)),
          why: 'Se multiplica ' + fx('a') + ' por ' + fx('a^2') + ': el resultado tiene cubos, ' + fx('a^3') + ' y ' + fx('b^3') + ', no cuadrados.',
        },
        {
          expr: a3.add(b.scale(3 * s)),
          why: fx('b^3') + ' significa ' + fx('b * b * b') + ', no ' + fx('3 * b') + ': ' + eq(fx('b^3'), hp(b, 3), h(b3)) + '.',
        },
      ];
      if (coefA !== 1) {
        distractors.push({
          expr: conLiteral(coefA, a3).add(sB3),
          why: 'Al elevar al cubo también se eleva el coeficiente: ' + eq(hp(a, 3), h(a3)) + '.',
        });
      }
      if (coefB !== 1) {
        distractors.push({
          expr: a3.add(conLiteral(s * coefB, b3)),
          why:
            (b.isConst() ? 'También hay que elevar al cubo el segundo término: ' : 'Al elevar al cubo también se eleva el coeficiente: ') +
            eq(hp(b, 3), h(b3)) +
            '.',
        });
      }
      const conExp = tieneExponente(a) ? a : !b.isConst() && tieneExponente(b) ? b : null;
      if (conExp) {
        const malo = potenciaSumandoExp(conExp, 3);
        distractors.push({
          expr: conExp === a ? malo.add(sB3) : a3.add(malo.scale(s)),
          why: 'Al elevar una potencia al cubo se multiplican los exponentes: ' + eq(hp(conExp, 3), h(conExp.pow(3))) + '.',
        });
      }

      return { prompt, answer, distractors: depurar(answer, distractors), steps, key: 'pn-bt|' + Alg.text(prompt) };
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
