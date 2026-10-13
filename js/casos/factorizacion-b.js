/*
 * casos/factorizacion-b.js — Casos de FACTORIZACIÓN (segunda parte).
 *
 *   6. Trinomio de la forma x² + bx + c
 *   7. Trinomio de la forma ax² + bx + c
 *   8. Cubo perfecto de binomios
 *   9. Suma o diferencia de cubos
 */
(function (root) {
  'use strict';

  const { Alg, MA } = root;
  const { P, fac, h, hm, hp, hsqrt, hcbrt, fx, raw, rand, gcd } = Alg;
  const { mono, eq, rawParen, rawPow, MINUS, Poly } = Alg;
  const MENOS = ' ' + MINUS + ' ';

  /* ================================================================== */
  /* Utilidades locales                                                  */
  /* ================================================================== */

  /** Coeficiente de un monomio (Poly de un término). */
  function coef(m) {
    return m.terms[0].c;
  }

  /** Parte literal de un monomio: { x: 2, y: 1 }. */
  function literal(m) {
    return m.terms[0].v;
  }

  /** Polinomio con los monomios en el orden dado (junta semejantes, pero no reordena). */
  function enOrden(monos) {
    return new Poly(
      monos.map((m) => m.terms[0]),
      { keepOrder: true }
    );
  }

  /** Número dentro de una operación: entre paréntesis si es negativo. 5, (−3) */
  function rawNum(n) {
    return n < 0 ? rawParen(n) : raw(n);
  }

  /** Producto de dos números: "9 · (−2)". */
  function rawProducto(r, s) {
    return raw(r) + ' · ' + rawNum(s);
  }

  /** Suma de dos números: "9 + (−2)". */
  function rawSumaNum(r, s) {
    return raw(r) + ' + ' + rawNum(s);
  }

  /** HTML crudo de una suma de monomios en el orden dado, SIN juntar semejantes: "6x² + 9x − 2x − 3". */
  function rawSuma(monos) {
    return monos
      .map((m, i) => {
        const t = m.terms[0];
        const cuerpo = raw(mono(Math.abs(t.c), t.v));
        if (i === 0) return (t.c < 0 ? MINUS : '') + cuerpo;
        return (t.c < 0 ? MENOS : ' + ') + cuerpo;
      })
      .join('');
  }

  /** Monomio por binomio entre paréntesis: "3x(2x + 3)", "y(2x + 3y)"; con 1: "(2x + 3)". */
  function rawPor(m, bin) {
    const t = m.terms[0];
    const unidad = Object.keys(t.v).length === 0 && Math.abs(t.c) === 1;
    return (unidad ? (t.c < 0 ? MINUS : '') : raw(m)) + rawParen(bin);
  }

  /** Potencia para usarla como factor de un producto, siempre entre paréntesis: (x²), (2x)², (3²). */
  function rawPotFactor(x, e) {
    const r = rawPow(x, e);
    return r.charAt(0) === '(' ? r : '(' + r + ')';
  }

  /** Raíz cúbica explicada: "∛(8x³) = 2x, porque (2x)³ = 8x³". */
  function raizCubica(cubo, raiz) {
    const prueba =
      hp(raiz, 3) === h(cubo)
        ? hm(raw(raiz) + ' · ' + raw(raiz) + ' · ' + raw(raiz) + ' = ' + raw(cubo))
        : eq(hp(raiz, 3), h(cubo));
    return eq(hcbrt(cubo), h(raiz)) + ', porque ' + prueba;
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
   * Parejas [r, s] de enteros con r · s = prod que respetan la regla de los
   * signos para poder sumar `suma`: si prod > 0, los dos llevan el signo de la
   * suma; si prod < 0, signos contrarios y el de mayor valor absoluto lleva el
   * signo de la suma. Van de la más separada a la más cercana, con |r| ≥ |s|.
   */
  function parejas(prod, suma) {
    const sg = suma > 0 ? 1 : -1;
    const N = Math.abs(prod);
    const out = [];
    for (const d of Alg.divisors(N)) {
      const e = N / d;
      if (d > e) break;
      if (prod > 0) out.push([sg * e, sg * d]);
      else if (d !== e) out.push([sg * e, -sg * d]);
    }
    return out;
  }

  /**
   * Muestra la búsqueda de los dos números: las parejas probadas hasta llegar
   * a la que suma `suma` (a lo más 4; si hay más, empieza con "…").
   */
  function pruebaParejas(prod, suma) {
    const lista = parejas(prod, suma);
    const k = lista.findIndex((pr) => pr[0] + pr[1] === suma);
    const desde = Math.max(0, k - 3);
    const items = lista
      .slice(desde, k + 1)
      .map((pr, i) => h(pr[0]) + ' y ' + h(pr[1]) + ' suman ' + h(pr[0] + pr[1]) + (desde + i === k ? ' ✓' : ''));
    return (desde > 0 ? '… ' : '') + items.join('; ');
  }

  /* ================================================================== */
  /* 6. Trinomio de la forma x² + bx + c = (x + m)(x + n)                */
  /* ================================================================== */

  /**
   * Elige u (lo que va primero en cada binomio: x, x² o xy), v (1, y o y²)
   * y los números p, q del resultado (u + pv)(u + qv), con |p| > |q|.
   */
  function datosTrinomioX2(level) {
    for (let intento = 0; intento < 500; intento++) {
      let u = P('x');
      let v = P(1);
      let max = 9;
      let min = 1; // valor absoluto mínimo del número mayor
      if (level === 'medio') {
        if (rand.chance(0.55)) {
          max = 15;
          min = 7;
        } else {
          v = P('y');
        }
      } else if (level === 'dificil') {
        const r = Math.random();
        if (r < 0.3) {
          u = P('x^2');
          max = 12;
        } else if (r < 0.5) {
          u = P('xy');
          max = 12;
        } else if (r < 0.7) {
          u = P('x^2');
          v = P(rand.pick(['y', 'y^2']));
        } else {
          max = 25;
          min = 12;
          if (rand.chance(0.3)) v = P('y');
        }
      }
      let p = rand.sign() * rand.int(1, max);
      let q = rand.sign() * rand.int(1, max);
      // p ≠ q: si fueran iguales sería un trinomio cuadrado perfecto; p + q ≠ 0: debe haber término central.
      if (p === q || p + q === 0) continue;
      if (Math.abs(q) > Math.abs(p)) {
        const t = p;
        p = q;
        q = t;
      }
      if (Math.abs(p) < min) continue;
      // Cada binomio debe quedar irreducible (p. ej. no x² − 4).
      if (Alg.reducibleReason(u.add(v.scale(p))) || Alg.reducibleReason(u.add(v.scale(q)))) continue;
      return { u, v, p, q };
    }
    return { u: P('x'), v: P(1), p: 3, q: 2 };
  }

  MA.registerCase({
    id: 'f-trinomio-x2',
    topic: 'factorizacion',
    order: 6,
    name: 'Trinomio de la forma x² + bx + c',
    formula: fx('x^2 + bx + c = (x + m)(x + n)') + ', con ' + fx('m + n = b') + ' y ' + fx('m*n = c'),
    generate(level) {
      const { u, v, p, q } = datosTrinomioX2(level);
      const b = p + q;
      const c = p * q;
      const u2 = u.pow(2);
      const uv = u.mul(v);
      const v2 = v.pow(2);
      const conV = !v.isConst();
      const esX = u.equals('x');

      /** (u + rv)(u + sv), con el número de mayor valor absoluto primero (como en Baldor). */
      const par = (r, s) => {
        if (Math.abs(s) > Math.abs(r) || (Math.abs(s) === Math.abs(r) && s > r)) return par(s, r);
        return fac(1, u.add(v.scale(r)), u.add(v.scale(s)));
      };

      const prompt = u2.add(uv.scale(b)).add(v2.scale(c));
      const answer = par(p, q);

      const vRaw = conV ? raw(v) : '';
      const forma = hm('(' + raw(u) + ' + <i>m</i>' + vRaw + ')(' + raw(u) + ' + <i>n</i>' + vRaw + ')');
      let tipo;
      if (esX && !conV) tipo = 'Es un trinomio de la forma ' + fx('x^2 + bx + c');
      else if (esX) tipo = 'Es como ' + fx('x^2 + bx + c') + ', pero el último término lleva ' + h(v2);
      else tipo = 'Es como ' + fx('x^2 + bx + c') + ' con ' + h(u) + ' en lugar de ' + fx('x') + (conV ? ' y con ' + h(v2) + ' en el último término' : '');
      const signoB = b > 0 ? '+' : MINUS;

      const steps = [
        {
          title: 'Identifica el caso',
          html:
            'El primer término tiene coeficiente 1 y es un cuadrado: ' +
            eq(hsqrt(u2), h(u)) +
            '. ' +
            tipo +
            ', así que se factoriza como ' +
            forma +
            '.',
        },
        {
          title: 'Identifica b y c',
          html:
            'Aquí ' +
            fx('b') +
            ' = ' +
            h(b) +
            ' (el coeficiente de ' +
            h(uv) +
            ') y ' +
            fx('c') +
            ' = ' +
            h(c) +
            (conV ? ' (el coeficiente de ' + h(v2) + ')' : '') +
            '. Buscamos dos números ' +
            fx('m') +
            ' y ' +
            fx('n') +
            ' con ' +
            eq(fx('m + n'), h(b)) +
            ' y ' +
            eq(fx('m*n'), h(c)) +
            '.',
        },
        {
          title: 'Regla de los signos',
          html:
            c > 0
              ? 'Como ' + fx('c') + ' = ' + h(c) + ' es positivo, los dos números tienen el mismo signo, y es el signo de ' + fx('b') + ' (' + signoB + ').'
              : 'Como ' +
                fx('c') +
                ' = ' +
                h(c) +
                ' es negativo, los números tienen signos contrarios, y el de mayor valor absoluto lleva el signo de ' +
                fx('b') +
                ' (' +
                signoB +
                ').',
        },
        {
          title: 'Busca los dos números',
          html:
            'Parejas con producto ' +
            h(c) +
            ': ' +
            pruebaParejas(c, b) +
            '. Los números son ' +
            h(p) +
            ' y ' +
            h(q) +
            ', porque ' +
            hm(rawProducto(p, q) + ' = ' + raw(c)) +
            ' y ' +
            hm(rawSumaNum(p, q) + ' = ' + raw(b)) +
            '.',
        },
        {
          title: 'Resultado',
          html:
            'Cada número va en un binomio junto a ' +
            h(u) +
            (conV ? ', acompañado de ' + h(v) : '') +
            ': ' +
            eq(h(prompt), h(answer)) +
            '.',
        },
      ];

      const reglaC =
        'Como ' +
        fx('c') +
        ' = ' +
        h(c) +
        (c > 0 ? ' es positivo, los dos números llevan el mismo signo' : ' es negativo, los números deben tener signos contrarios');
      const ds = [
        {
          expr: par(-p, -q),
          why:
            (c > 0 ? 'Los dos números llevan el signo de ' : 'El número de mayor valor absoluto lleva el signo de ') +
            fx('b') +
            ': con ' +
            h(-p) +
            ' y ' +
            h(-q) +
            ' la suma da ' +
            h(-b) +
            ', no ' +
            h(b) +
            '.',
        },
        {
          expr: par(p, -q),
          why: reglaC + ': ' + h(p) + ' y ' + h(-q) + ' multiplicados dan ' + h(-c) + '.',
        },
        {
          expr: par(-p, q),
          why: reglaC + '.',
        },
      ];

      // Producto correcto, pero suma incorrecta
      const otras = parejas(c, b).filter((pr) => pr[0] !== p || pr[1] !== q);
      for (const [r, s] of rand.sample(otras, 2)) {
        ds.push({
          expr: par(r, s),
          why: 'El producto ' + hm(rawProducto(r, s) + ' = ' + raw(c)) + ' es correcto, pero la suma da ' + h(r + s) + ', no ' + h(b) + '.',
        });
      }

      // Suma correcta, pero producto incorrecto (con los mismos signos)
      for (const k of rand.shuffle([1, 2, 3, -1, -2, -3])) {
        const r = p + k;
        const s = q - k;
        if (r === 0 || s === 0 || r === q) continue;
        if (Math.sign(r) !== Math.sign(p) || Math.sign(s) !== Math.sign(q)) continue;
        ds.push({
          expr: par(r, s),
          why: 'Los números ' + h(r) + ' y ' + h(s) + ' suman ' + h(b) + ', pero su producto es ' + h(r * s) + ', no ' + h(c) + '.',
        });
        break;
      }

      // Errores con las variables
      if (conV) {
        ds.push({
          expr: fac(1, u.add(v.scale(p)), u.add(q)),
          why: 'El último término lleva ' + h(v2) + ', así que el segundo término de cada binomio lleva ' + h(v) + '.',
        });
      } else if (!esX && u.vars().length === 1) {
        const x = P('x');
        ds.push({
          expr: fac(1, x.add(p), x.add(q)),
          why: 'La raíz cuadrada de ' + h(u2) + ' es ' + h(u) + ': cada binomio empieza con ' + h(u) + ', no con ' + fx('x') + '.',
        });
      }

      return { prompt, answer, distractors: limpiar(ds, answer), steps, key: 'f-tx2|' + Alg.text(prompt) };
    },
  });

  /* ================================================================== */
  /* 7. Trinomio de la forma ax² + bx + c                                */
  /*    (mx + p)(nx + q), descomponiendo el término central (método a·c) */
  /* ================================================================== */

  /**
   * Elige los binomios (nx + qy)(mx + py) (y = 1 si hay una sola variable),
   * con gcd(m, p) = gcd(n, q) = 1, b ≠ 0 y sin ser un TCP. El primer factor
   * (n, q) es el de mayor coeficiente en x (si empatan, el de mayor número).
   */
  function datosTrinomioAx2(level) {
    for (let intento = 0; intento < 500; intento++) {
      let a;
      let lim;
      let dosVar = false;
      if (level === 'facil') {
        a = rand.int(2, 3);
        lim = 5;
      } else if (level === 'medio') {
        a = rand.pick([2, 3, 4, 4, 5, 5, 6, 6]);
        lim = 7;
      } else if (rand.chance(0.5)) {
        a = rand.int(6, 12);
        lim = 9;
      } else {
        a = rand.int(2, 12);
        lim = 7;
        dosVar = true;
      }
      let m = rand.pick(Alg.divisors(a));
      let n = a / m;
      let p = rand.nonZero(-lim, lim);
      let q = rand.nonZero(-lim, lim);
      if (gcd(m, p) !== 1 || gcd(n, q) !== 1) continue;
      if (m === n && p === q) continue; // sería un trinomio cuadrado perfecto
      if (m * q + n * p === 0) continue; // sin término central
      if (m > n || (m === n && Math.abs(p) > Math.abs(q))) {
        let t = m;
        m = n;
        n = t;
        t = p;
        p = q;
        q = t;
      }
      return { m, n, p, q, dosVar };
    }
    return { m: 1, n: 2, p: 3, q: 1, dosVar: false };
  }

  MA.registerCase({
    id: 'f-trinomio-ax2',
    topic: 'factorizacion',
    order: 7,
    name: 'Trinomio de la forma ax² + bx + c',
    formula: fx('ax^2 + bx + c') + ' (se multiplica ' + fx('a*c') + ' y se descompone el término central)',
    generate(level) {
      const { m, n, p, q, dosVar } = datosTrinomioAx2(level);
      const u = P('x');
      const v = dosVar ? P('y') : P(1);
      const u2 = u.pow(2);
      const uv = u.mul(v);
      const v2 = v.pow(2);
      const a = m * n;
      const b = m * q + n * p;
      const c = p * q;
      const ac = a * c;

      /** Binomio k·u + j·v */
      const bin = (k, j) => u.scale(k).add(v.scale(j));
      /** (k1u + j1v)(k2u + j2v), con el de mayor coeficiente en x primero (si empatan, el de mayor número). */
      const par = (k1, j1, k2, j2) => {
        const A1 = Math.abs(j1);
        const A2 = Math.abs(j2);
        if (k2 > k1 || (k2 === k1 && (A2 > A1 || (A2 === A1 && j2 > j1)))) return fac(1, bin(k2, j2), bin(k1, j1));
        return fac(1, bin(k1, j1), bin(k2, j2));
      };

      const F1 = bin(n, q); // binomio común
      const F2 = bin(m, p);
      const prompt = F1.mul(F2);
      const answer = par(n, q, m, p);

      // Descomposición del término central: bx = (mq)x + (np)x
      const r1 = m * q;
      const r2 = n * p;
      const R = Math.abs(r1) >= Math.abs(r2) ? r1 : r2;
      const S = R === r1 ? r2 : r1;
      const T1 = u2.scale(a);
      const T2 = uv.scale(r1);
      const T3 = uv.scale(r2);
      const T4 = v2.scale(c);
      const G1 = enOrden([T1, T2]); // = mu(nu + qv)
      const G2 = enOrden([T3, T4]); // = pv(nu + qv)
      const g1 = u.scale(m);
      const g2abs = v.scale(Math.abs(p));
      const unidad = g2abs.isConst() && g2abs.constValue() === 1;
      const grupos = rawParen(G1) + (p < 0 ? MENOS + rawParen(G2.neg()) : ' + ' + rawParen(G2));
      const porGrupos = rawPor(g1, F1) + (p < 0 ? MENOS : ' + ') + rawPor(g2abs, F1);
      const bTerm = uv.scale(b);

      let segundo;
      if (!unidad) segundo = ' y del segundo, ' + h(g2abs);
      else if (p > 0) segundo = '; el segundo grupo ya es el binomio';
      else segundo = '; el segundo grupo, sin el signo, ya es el binomio';

      const steps = [
        {
          title: 'Identifica el caso',
          html:
            'Es un trinomio de la forma ' +
            fx('ax^2 + bx + c') +
            ' con ' +
            fx('a') +
            ' = ' +
            h(a) +
            ', ' +
            fx('b') +
            ' = ' +
            h(b) +
            ' y ' +
            fx('c') +
            ' = ' +
            h(c) +
            (dosVar ? ' (los coeficientes de ' + h(u2) + ', ' + h(uv) + ' y ' + h(v2) + ')' : '') +
            '. Como ' +
            fx('a') +
            ' no es 1, multiplicamos ' +
            fx('a*c') +
            ' y descomponemos el término central.',
        },
        {
          title: 'Multiplica a · c',
          html:
            eq(fx('a*c'), hm(rawProducto(a, c)), h(ac)) +
            '. Buscamos dos números que multiplicados den ' +
            h(ac) +
            ' y sumados den ' +
            fx('b') +
            ' = ' +
            h(b) +
            '.',
        },
        {
          title: 'Busca los dos números',
          html:
            (ac > 0
              ? 'Como ' + h(ac) + ' es positivo, los dos números tienen el signo de ' + fx('b') + '. '
              : 'Como ' + h(ac) + ' es negativo, tienen signos contrarios y el de mayor valor absoluto lleva el signo de ' + fx('b') + '. ') +
            'Probamos parejas: ' +
            pruebaParejas(ac, b) +
            '. Los números son ' +
            h(R) +
            ' y ' +
            h(S) +
            ', porque ' +
            hm(rawProducto(R, S) + ' = ' + raw(ac)) +
            ' y ' +
            hm(rawSumaNum(R, S) + ' = ' + raw(b)) +
            '.',
        },
        {
          title: 'Descompón el término central',
          html:
            'Escribimos ' +
            eq(h(bTerm), hm(rawSuma([T2, T3]))) +
            ', así que ' +
            eq(h(prompt), hm(rawSuma([T1, T2, T3, T4]))) +
            '.',
        },
        {
          title: 'Agrupa y saca factor común',
          html:
            'Agrupamos de dos en dos' +
            (p < 0
              ? ' (el tercer término es negativo: sacamos el signo ' + MINUS + ' del segundo grupo y adentro cambian los signos)'
              : '') +
            '. Del primer grupo sacamos ' +
            h(g1) +
            segundo +
            ': ' +
            eq(hm(grupos), hm(porGrupos)) +
            '.',
        },
        {
          title: 'Saca el binomio común',
          html:
            'En los dos grupos aparece el mismo binomio ' +
            hm(rawParen(F1)) +
            '; lo sacamos como factor común: ' +
            eq(hm(porGrupos), h(answer)) +
            '. Por lo tanto, ' +
            eq(h(prompt), h(answer)) +
            '.',
        },
      ];

      const central = (k) => (k === 0 ? 'se anularía' : 'sería ' + h(uv.scale(k)));
      const ds = [
        {
          expr: par(n, p, m, q),
          why: 'Intercambiaste los números de los binomios: así el término central ' + central(n * q + m * p) + ' y debe ser ' + h(bTerm) + '.',
        },
        {
          expr: par(n, -q, m, -p),
          why: 'Con esos signos el término central sería ' + h(bTerm.neg()) + ', no ' + h(bTerm) + '.',
        },
        {
          expr: par(n, q, m, -p),
          why:
            'Como ' +
            fx('c') +
            ' = ' +
            h(c) +
            (c > 0
              ? ' es positivo, los números de los dos binomios llevan el mismo signo.'
              : ' es negativo, los números de los dos binomios llevan signos contrarios.'),
        },
        {
          expr: par(n, -q, m, p),
          why: 'Revisa los signos: ese producto da ' + h(T4.neg()) + ' como último término, no ' + h(T4) + '.',
        },
        {
          expr: par(a, r1, a, r2),
          why: 'Ese producto vale ' + h(a) + ' veces el trinomio: después de usar ' + fx('a*c') + ' falta dividir entre ' + fx('a') + ' = ' + h(a) + '.',
        },
        {
          expr: par(1, r1, 1, r2),
          why: 'Los números ' + h(R) + ' y ' + h(S) + ' sirven para descomponer ' + h(bTerm) + '; no van directo en los binomios.',
        },
      ];

      // Tanteo con otra combinación: los extremos salen bien, pero el término central no
      const tanteos = [];
      for (const k1 of Alg.divisors(a)) {
        const k2 = a / k1;
        for (const d of Alg.divisors(c)) {
          for (const sg of [1, -1]) {
            const j1 = sg * d;
            const j2 = c / j1;
            if (gcd(k1, j1) !== 1 || gcd(k2, j2) !== 1) continue;
            const mid = k1 * j2 + k2 * j1;
            if (mid === b || mid === -b || mid === 0) continue;
            tanteos.push({ k1, j1, k2, j2, mid });
          }
        }
      }
      // Se prefieren los tanteos "cercanos" (término central parecido), que son los que confunden.
      tanteos.sort((t1, t2) => Math.abs(t1.mid - b) - Math.abs(t2.mid - b));
      for (const t of rand.sample(tanteos.slice(0, 4), 2)) {
        ds.push({
          expr: par(t.k1, t.j1, t.k2, t.j2),
          why:
            'Los extremos están bien (' +
            h(T1) +
            ' y ' +
            h(T4) +
            '), pero el término central da ' +
            h(uv.scale(t.mid)) +
            ', no ' +
            h(bTerm) +
            '.',
        });
      }

      return { prompt, answer, distractors: limpiar(ds, answer), steps, key: 'f-tax2|' + Alg.text(prompt) };
    },
  });

  /* ================================================================== */
  /* 8. Cubo perfecto de binomios:                                       */
  /*    a³ ± 3a²b + 3ab² ± b³ = (a ± b)³                                 */
  /* ================================================================== */

  /** Elige a (con x), b (positivo) y el signo s, con el binomio a ± b irreducible. */
  function datosCuboPerfecto(level) {
    for (let intento = 0; intento < 500; intento++) {
      let A;
      let B;
      if (level === 'facil') {
        A = P(rand.pick(['x', 'x', 'x', 'x', 'm', 'y']));
        B = P(rand.int(1, 6));
      } else if (level === 'medio') {
        if (rand.chance(0.6)) {
          A = mono(rand.int(2, 3), { x: 1 });
          B = P(rand.int(1, 5));
        } else {
          A = P('x');
          B = mono(rand.int(1, 4), { y: 1 });
        }
      } else {
        const r = Math.random();
        const m = rand.int(1, 5);
        const n = rand.int(1, 5);
        if (r < 0.45) {
          const e1 = rand.int(1, 2);
          const e2 = rand.int(1, 2);
          if (e1 + e2 < 3 && m * n < 6) continue;
          A = mono(m, { x: e1 });
          B = mono(n, { y: e2 });
        } else if (r < 0.7) {
          A = mono(m, { x: 2 });
          B = P(n);
        } else {
          A = mono(m, { x: 1, y: 1 });
          B = P(n);
        }
      }
      if (gcd(coef(A), coef(B)) !== 1) continue;
      const s = rand.sign();
      const binomio = A.add(B.scale(s));
      if (Alg.reducibleReason(binomio)) continue;
      if (binomio.pow(3).terms.some((t) => Math.abs(t.c) > 1000)) continue;
      return { A, B, s };
    }
    return { A: P('x'), B: P(2), s: 1 };
  }

  MA.registerCase({
    id: 'f-cubo-perfecto',
    topic: 'factorizacion',
    order: 8,
    name: 'Cubo perfecto de binomios',
    formula: fx('a^3 ± 3a^2b + 3ab^2 ± b^3 = (a ± b)^3'),
    generate(level) {
      const { A, B, s } = datosCuboPerfecto(level);
      const binomio = A.add(B.scale(s));
      const prompt = binomio.pow(3);
      const answer = fac(1, [binomio, 3]);

      const A2 = A.pow(2);
      const A3 = A.pow(3);
      const B2 = B.pow(2);
      const B3 = B.pow(3);
      const t2 = A2.mul(B).scale(3); // 3a²b (sin el signo)
      const t3 = A.mul(B2).scale(3); // 3ab²
      const letra = A.vars()[0];
      const formula =
        s > 0 ? fx('a^3 + 3a^2b + 3ab^2 + b^3 = (a + b)^3') : fx('a^3 - 3a^2b + 3ab^2 - b^3 = (a - b)^3');
      const t2Html = eq(fx('3a^2b'), hm('3' + rawPotFactor(A, 2) + rawParen(B)), hm('3' + rawParen(A2) + rawParen(B)), h(t2));
      const t3Html = eq(fx('3ab^2'), hm('3' + rawParen(A) + rawPotFactor(B, 2)), hm('3' + rawParen(A) + rawParen(B2)), h(t3));

      const steps = [
        {
          title: 'Identifica el caso',
          html:
            'Tiene cuatro términos, ordenados de mayor a menor potencia de ' +
            fx(letra) +
            '. Puede ser un cubo perfecto: ' +
            formula +
            '.',
        },
        {
          title: 'Raíces cúbicas de los extremos',
          html:
            'Primer término: ' +
            raizCubica(A3, A) +
            '. Último término' +
            (s < 0 ? ' (sin su signo)' : '') +
            ': ' +
            raizCubica(B3, B) +
            '. Entonces ' +
            fx('a') +
            ' = ' +
            h(A) +
            ' y ' +
            fx('b') +
            ' = ' +
            h(B) +
            '.',
        },
        {
          title: 'Comprueba los términos centrales',
          html:
            t2Html +
            ' y ' +
            t3Html +
            '. Coinciden con el segundo y el tercer término (sin contar el signo). ✓ Es un cubo perfecto.',
        },
        {
          title: 'Revisa los signos',
          html:
            s > 0
              ? 'Todos los términos son positivos, así que es el cubo de una suma: ' + fx('(a + b)^3') + '.'
              : 'Los signos se alternan (+, ' + MINUS + ', +, ' + MINUS + '), así que es el cubo de una diferencia: ' + fx('(a - b)^3') + '.',
        },
        {
          title: 'Resultado',
          html: eq(h(prompt), h(answer)) + '.',
        },
      ];

      const ds = [
        {
          expr: fac(1, [A.add(B.scale(-s)), 3]),
          why:
            s > 0
              ? 'Todos los términos son positivos: es el cubo de una suma, no de una diferencia.'
              : 'Los signos se alternan (+, ' + MINUS + ', +, ' + MINUS + '): es el cubo de una diferencia, no de una suma.',
        },
        {
          expr: fac(1, binomio, A2.add(A.mul(B).scale(-s)).add(B2)),
          why:
            'Esa es la factorización de ' +
            (s > 0 ? fx('a^3 + b^3') : fx('a^3 - b^3')) +
            ', que tiene solo dos términos; aquí hay cuatro.',
        },
        {
          expr: fac(1, [binomio, 2]),
          why: 'El exponente es 3: ' + (s > 0 ? fx('(a + b)^2') : fx('(a - b)^2')) + ' solo da tres términos y aquí hay cuatro.',
        },
        {
          expr: fac(1, [A.add(B.scale(3 * s)), 3]),
          why: 'Dentro del binomio va ' + fx('b') + ' = ' + h(B) + '; el 3 solo aparece en los términos centrales.',
        },
        {
          expr: fac(1, [A.add(B3.scale(s)), 3]),
          why: 'Dentro del binomio va la raíz cúbica del último término: ' + eq(hcbrt(B3), h(B)) + '.',
        },
        {
          expr: fac(1, [mono(coef(A), literal(A3)).add(B.scale(s)), 3]),
          why:
            'Para sacar la raíz cúbica de una potencia, el exponente se divide entre 3: ' +
            eq(hcbrt(mono(1, literal(A3))), h(mono(1, literal(A)))) +
            '.',
        },
      ];
      if (coef(A) > 1) {
        ds.push({
          expr: fac(1, [mono(coef(A3), literal(A)).add(B.scale(s)), 3]),
          why: 'También se saca la raíz cúbica del coeficiente: ' + eq(hcbrt(A3), h(A)) + '.',
        });
      }

      return { prompt, answer, distractors: limpiar(ds, answer), steps, key: 'f-cp|' + Alg.text(prompt) };
    },
  });

  /* ================================================================== */
  /* 9. Suma o diferencia de cubos:                                      */
  /*    a³ + b³ = (a + b)(a² − ab + b²)   a³ − b³ = (a − b)(a² + ab + b²) */
  /* ================================================================== */

  /**
   * Elige a = mx (o mxy) y b = n (o ny), con gcd(m, n) = 1 y sin exponentes ≥ 2
   * en a ni en b (así el trinomio ya no se puede factorizar).
   */
  function datosCubos(level) {
    for (let intento = 0; intento < 500; intento++) {
      let A;
      let B;
      if (level === 'facil') {
        A = P(rand.pick(['x', 'x', 'x', 'x', 'm', 'y']));
        B = P(rand.int(1, 6));
      } else if (level === 'medio') {
        if (rand.chance(0.6)) {
          A = mono(rand.int(2, 4), { x: 1 });
          B = P(rand.int(1, 5));
        } else {
          A = P('x');
          B = mono(rand.int(1, 5), { y: 1 });
        }
      } else if (rand.chance(0.55)) {
        A = mono(rand.int(1, 6), { x: 1 });
        B = mono(rand.int(1, 6), { y: 1 });
        if (coef(A) * coef(B) < 2) continue;
      } else {
        A = mono(rand.int(1, 5), { x: 1, y: 1 });
        B = P(rand.int(1, 6));
      }
      if (gcd(coef(A), coef(B)) !== 1) continue;
      const s = rand.sign();
      const F1 = A.add(B.scale(s));
      const F2 = A.pow(2).add(A.mul(B).scale(-s)).add(B.pow(2));
      if (Alg.reducibleReason(F1) || Alg.reducibleReason(F2)) continue;
      return { A, B, s, F1, F2 };
    }
    return datosCubos('facil');
  }

  MA.registerCase({
    id: 'f-suma-dif-cubos',
    topic: 'factorizacion',
    order: 9,
    name: 'Suma o diferencia de cubos',
    formula: fx('a^3 + b^3 = (a + b)(a^2 - ab + b^2)') + ' y ' + fx('a^3 - b^3 = (a - b)(a^2 + ab + b^2)'),
    generate(level) {
      const { A, B, s, F1, F2 } = datosCubos(level);
      const A2 = A.pow(2);
      const A3 = A.pow(3);
      const B2 = B.pow(2);
      const B3 = B.pow(3);
      const AB = A.mul(B);
      const prompt = A3.add(B3.scale(s));
      const answer = fac(1, F1, F2);
      const formula =
        s > 0 ? fx('a^3 + b^3 = (a + b)(a^2 - ab + b^2)') : fx('a^3 - b^3 = (a - b)(a^2 + ab + b^2)');

      const steps = [
        {
          title: 'Identifica el caso',
          html:
            'Son dos términos que ' +
            (s > 0 ? 'se suman' : 'se restan') +
            ' y los dos son cubos perfectos: es una ' +
            (s > 0 ? 'suma' : 'diferencia') +
            ' de cubos. Usamos ' +
            formula +
            '.',
        },
        {
          title: 'Raíces cúbicas',
          html:
            'Primer término: ' +
            raizCubica(A3, A) +
            '. Segundo término' +
            (s < 0 ? ' (sin su signo)' : '') +
            ': ' +
            raizCubica(B3, B) +
            '. Entonces ' +
            fx('a') +
            ' = ' +
            h(A) +
            ' y ' +
            fx('b') +
            ' = ' +
            h(B) +
            '.',
        },
        {
          title: 'Regla de los signos',
          html:
            'El binomio lleva el mismo signo que la expresión: ' +
            hm(rawParen(F1)) +
            '. En el trinomio, el término ' +
            fx('ab') +
            ' lleva el signo contrario (' +
            (s > 0 ? MINUS : '+') +
            ') y el último término siempre es positivo.',
        },
        {
          title: 'Calcula los términos del trinomio',
          html:
            eq(fx('a^2'), hp(A, 2), h(A2)) +
            '; ' +
            eq(fx('ab'), hm(rawParen(A) + rawParen(B)), h(AB)) +
            '; ' +
            eq(fx('b^2'), hp(B, 2), h(B2)) +
            '. Con los signos, el trinomio es ' +
            hm(rawParen(F2)) +
            '.',
        },
        {
          title: 'Resultado',
          html: eq(h(prompt), h(answer)) + '.',
        },
      ];

      /** Trinomio a1² + kMid·a1·b1 + kLast·b1² */
      const tri = (a1, b1, kMid, kLast) => a1.pow(2).add(a1.mul(b1).scale(kMid)).add(b1.pow(2).scale(kLast));
      const ds = [
        {
          expr: fac(1, F1, tri(A, B, s, 1)),
          why:
            s > 0
              ? 'En la suma de cubos, el término ' + fx('ab') + ' del trinomio lleva signo ' + MINUS + ': ' + fx('a^2 - ab + b^2') + '.'
              : 'En la diferencia de cubos, el término ' + fx('ab') + ' del trinomio lleva signo +: ' + fx('a^2 + ab + b^2') + '.',
        },
        {
          expr: fac(1, A.add(B.scale(-s)), F2),
          why: 'El binomio lleva el mismo signo que la expresión original: ' + hm(rawParen(F1)) + '.',
        },
        {
          expr: fac(1, A.add(B.scale(-s)), tri(A, B, s, 1)),
          why:
            s > 0
              ? 'Usaste la fórmula de la diferencia de cubos, pero aquí los términos se suman.'
              : 'Usaste la fórmula de la suma de cubos, pero aquí los términos se restan.',
        },
        {
          expr: fac(1, [F1, 3]),
          why:
            (s > 0 ? fx('(a + b)^3') : fx('(a - b)^3')) +
            ' da cuatro términos; ' +
            (s > 0 ? fx('a^3 + b^3') : fx('a^3 - b^3')) +
            ' se factoriza como binomio por trinomio.',
        },
        {
          expr: fac(1, F1, tri(A, B, -2 * s, 1)),
          why: 'El término central del trinomio es ' + fx('ab') + ', no ' + fx('2ab') + '.',
        },
        {
          expr: fac(1, F1, tri(A, B, -s, -1)),
          why: 'El último término del trinomio, ' + fx('b^2') + ', siempre es positivo.',
        },
      ];
      if (coef(A) > 1) {
        ds.push({
          expr: fac(1, F1, mono(coef(A), literal(A2)).add(AB.scale(-s)).add(B2)),
          why: 'Al elevar al cuadrado también se eleva el coeficiente: ' + eq(hp(A, 2), h(A2)) + '.',
        });
      }
      if (coef(A) > 1 && coef(A3) <= 64) {
        const Am = mono(coef(A3), literal(A));
        ds.push({
          expr: fac(1, Am.add(B.scale(s)), tri(Am, B, -s, 1)),
          why: 'También se saca la raíz cúbica del coeficiente: ' + eq(hcbrt(A3), h(A)) + '.',
        });
      }
      if (coef(B) > 1 && coef(B3) <= 64) {
        const Bm = mono(coef(B3), literal(B));
        ds.push({
          expr: fac(1, A.add(Bm.scale(s)), tri(A, Bm, -s, 1)),
          why: 'Falta sacar la raíz cúbica: ' + eq(hcbrt(B3), h(B)) + '.',
        });
      }
      if (B.isConst() && coef(B) > 2) {
        ds.push({
          expr: fac(1, F1, A2.add(AB.scale(-s)).add(B.scale(2))),
          why: fx('b^2') + ' significa ' + fx('b*b') + ': ' + eq(hp(B, 2), h(B2)) + ', no ' + h(2 * coef(B)) + '.',
        });
      }

      return { prompt, answer, distractors: limpiar(ds, answer), steps, key: 'f-cubos|' + Alg.text(prompt) };
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
