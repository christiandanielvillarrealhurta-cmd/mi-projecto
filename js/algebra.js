/*
 * algebra.js — Núcleo algebraico de la aplicación.
 *
 * Contiene:
 *   - Aritmética entera (mcd, raíces exactas).
 *   - Utilidades de azar (rand.*).
 *   - Poly: polinomios con coeficientes enteros en varias variables.
 *   - Factored: expresiones factorizadas  prefijo · (f1)^e1 · (f2)^e2 ...
 *   - Representación en HTML (exponentes con <sup>, variables en cursiva, signo −).
 *   - Detección de polinomios que todavía se pueden factorizar (reducibleReason).
 *
 * Se carga como script clásico (sin módulos) para que funcione abriendo
 * index.html directamente desde el disco. Expone el objeto global `Alg`.
 */
(function (root) {
  'use strict';

  const MINUS = '−';
  const VAR_ORDER = ['x', 'y', 'z', 'w', 'a', 'b', 'c', 'm', 'n', 'p', 'q', 'r', 's', 't'];

  function varRank(v) {
    const i = VAR_ORDER.indexOf(v);
    return i === -1 ? 100 + v.charCodeAt(0) : i;
  }

  function sortVars(list) {
    return list.slice().sort((a, b) => varRank(a) - varRank(b));
  }

  /* ------------------------------------------------------------------ */
  /* Aritmética entera                                                   */
  /* ------------------------------------------------------------------ */

  function gcd(a, b) {
    a = Math.abs(a);
    b = Math.abs(b);
    while (b) {
      const t = a % b;
      a = b;
      b = t;
    }
    return a;
  }

  function gcdAll(list) {
    return list.reduce((g, n) => gcd(g, n), 0);
  }

  /** Raíz k-ésima entera exacta de n, o null si no existe. */
  function exactRoot(n, k) {
    if (!Number.isInteger(n)) return null;
    if (n < 0) {
      if (k % 2 === 0) return null;
      const r = exactRoot(-n, k);
      return r === null ? null : -r;
    }
    const r = Math.round(Math.pow(n, 1 / k));
    for (const c of [r - 1, r, r + 1]) {
      if (c >= 0 && Math.pow(c, k) === n) return c;
    }
    return null;
  }

  function isSquare(n) {
    return exactRoot(n, 2) !== null;
  }

  function isCube(n) {
    return exactRoot(n, 3) !== null;
  }

  function divisors(n) {
    n = Math.abs(n);
    const out = [];
    for (let d = 1; d * d <= n; d++) {
      if (n % d === 0) {
        out.push(d);
        if (d * d !== n) out.push(n / d);
      }
    }
    return out.sort((a, b) => a - b);
  }

  /* ------------------------------------------------------------------ */
  /* Azar                                                                */
  /* ------------------------------------------------------------------ */

  const rand = {
    /** Entero en [min, max] (ambos incluidos). */
    int(min, max) {
      return min + Math.floor(Math.random() * (max - min + 1));
    },
    /** Entero distinto de cero en [min, max]. */
    nonZero(min, max) {
      let n;
      do {
        n = rand.int(min, max);
      } while (n === 0);
      return n;
    },
    pick(arr) {
      return arr[Math.floor(Math.random() * arr.length)];
    },
    sign() {
      return Math.random() < 0.5 ? -1 : 1;
    },
    chance(p) {
      return Math.random() < p;
    },
    shuffle(arr) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const t = a[i];
        a[i] = a[j];
        a[j] = t;
      }
      return a;
    },
    /** k elementos distintos al azar. */
    sample(arr, k) {
      return rand.shuffle(arr).slice(0, k);
    },
  };

  /* ------------------------------------------------------------------ */
  /* Variables de un monomio: { x: 2, y: 1 }                             */
  /* ------------------------------------------------------------------ */

  function normVars(v) {
    const out = {};
    for (const k of sortVars(Object.keys(v || {}))) {
      const e = v[k];
      if (!Number.isInteger(e) || e < 0) throw new Error('Exponente inválido para ' + k + ': ' + e);
      if (e > 0) out[k] = e;
    }
    return out;
  }

  function varsKey(v) {
    return sortVars(Object.keys(v))
      .map((k) => k + (v[k] === 1 ? '' : '^' + v[k]))
      .join('');
  }

  function mulVars(a, b) {
    const out = Object.assign({}, a);
    for (const k of Object.keys(b)) out[k] = (out[k] || 0) + b[k];
    return normVars(out);
  }

  /** Orden lexicográfico: primero mayor exponente de x, luego de y, etc. */
  function compareVars(a, b) {
    const all = sortVars(Array.from(new Set(Object.keys(a).concat(Object.keys(b)))));
    for (const k of all) {
      const d = (b[k] || 0) - (a[k] || 0);
      if (d) return d;
    }
    return 0;
  }

  /* ------------------------------------------------------------------ */
  /* Poly                                                                */
  /* ------------------------------------------------------------------ */

  /**
   * Polinomio con coeficientes enteros. Los términos son { c, v }.
   * Por defecto los términos se ordenan (x de mayor a menor grado, luego y...).
   * Con { keepOrder: true } se respeta el orden dado (útil para mostrar
   * un polinomio en un orden concreto, p. ej. "49 − 4x²").
   * Siempre se agrupan términos semejantes y se eliminan los ceros.
   */
  class Poly {
    constructor(terms, opts) {
      const keep = !!(opts && opts.keepOrder);
      const map = new Map();
      const order = [];
      for (const t of terms || []) {
        if (!Number.isInteger(t.c)) throw new Error('Coeficiente no entero: ' + t.c);
        if (!Number.isSafeInteger(t.c)) throw new Error('Coeficiente demasiado grande: ' + t.c);
        const v = normVars(t.v);
        const k = varsKey(v);
        if (map.has(k)) {
          map.get(k).c += t.c;
        } else {
          map.set(k, { c: t.c, v });
          order.push(k);
        }
      }
      const list = order.map((k) => map.get(k)).filter((t) => t.c !== 0);
      if (!keep) list.sort((a, b) => compareVars(a.v, b.v));
      this.terms = list;
    }

    get length() {
      return this.terms.length;
    }

    isZero() {
      return this.terms.length === 0;
    }

    isMonomial() {
      return this.terms.length === 1;
    }

    isConst() {
      return this.terms.length === 0 || (this.terms.length === 1 && Object.keys(this.terms[0].v).length === 0);
    }

    /** Valor numérico si es constante, o null. */
    constValue() {
      if (this.terms.length === 0) return 0;
      if (this.isConst()) return this.terms[0].c;
      return null;
    }

    add(q) {
      return new Poly(this.terms.concat(P(q).terms));
    }

    sub(q) {
      return this.add(P(q).neg());
    }

    /** Cambia el signo de cada término conservando el orden de presentación. */
    neg() {
      return new Poly(
        this.terms.map((t) => ({ c: -t.c, v: t.v })),
        { keepOrder: true }
      );
    }

    /** Multiplica por un entero conservando el orden de presentación. */
    scale(k) {
      return new Poly(
        this.terms.map((t) => ({ c: t.c * k, v: t.v })),
        { keepOrder: true }
      );
    }

    mul(q) {
      q = P(q);
      const out = [];
      for (const a of this.terms) {
        for (const b of q.terms) out.push({ c: a.c * b.c, v: mulVars(a.v, b.v) });
      }
      return new Poly(out);
    }

    pow(n) {
      if (!Number.isInteger(n) || n < 0) throw new Error('Exponente inválido: ' + n);
      let r = P(1);
      for (let i = 0; i < n; i++) r = r.mul(this);
      return r;
    }

    /** Copia con los términos en el orden estándar. */
    sorted() {
      return new Poly(this.terms);
    }

    /** Copia que conserva el orden actual de presentación (para combinar con otros). */
    clone() {
      return new Poly(this.terms, { keepOrder: true });
    }

    /** Clave canónica: dos polinomios iguales tienen la misma clave, sin importar el orden. */
    key() {
      return this.sorted()
        .terms.map((t) => t.c + '*' + varsKey(t.v))
        .join(' ');
    }

    equals(q) {
      return this.key() === P(q).key();
    }

    /** MCD (positivo) de los coeficientes. */
    content() {
      return gcdAll(this.terms.map((t) => t.c));
    }

    /** Monomio máximo común divisor de todos los términos (coeficiente positivo). */
    monoGcd() {
      if (this.terms.length === 0) return P(0);
      const vars = {};
      const names = Object.keys(this.terms[0].v);
      for (const k of names) {
        vars[k] = Math.min(...this.terms.map((t) => t.v[k] || 0));
      }
      return new Poly([{ c: this.content(), v: vars }]);
    }

    /** Divide entre un monomio; lanza error si la división no es exacta. Conserva el orden. */
    divMono(m) {
      m = P(m);
      if (m.terms.length !== 1) throw new Error('divMono requiere un monomio');
      const d = m.terms[0];
      return new Poly(
        this.terms.map((t) => {
          if (t.c % d.c !== 0) throw new Error('División no exacta del coeficiente');
          const v = Object.assign({}, t.v);
          for (const k of Object.keys(d.v)) {
            v[k] = (v[k] || 0) - d.v[k];
            if (v[k] < 0) throw new Error('División no exacta de la variable ' + k);
          }
          return { c: t.c / d.c, v };
        }),
        { keepOrder: true }
      );
    }

    /** Lista ordenada de las variables que aparecen. */
    vars() {
      const s = new Set();
      for (const t of this.terms) for (const k of Object.keys(t.v)) s.add(k);
      return sortVars(Array.from(s));
    }

    /** Grado en la variable v, o grado total si v no se indica. */
    degree(v) {
      let d = 0;
      for (const t of this.terms) {
        const e = v ? t.v[v] || 0 : Object.values(t.v).reduce((s, n) => s + n, 0);
        if (e > d) d = e;
      }
      return d;
    }

    /** Primer término como polinomio de un solo término. */
    term(i) {
      return new Poly([this.terms[i]]);
    }

    /** Lista de términos, cada uno como Poly. */
    termPolys() {
      return this.terms.map((t) => new Poly([t]));
    }

    toString() {
      return polyText(this);
    }

    get html() {
      return polyHtml(this);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Lectura de polinomios desde texto: P('3x^2y - 5x + 7')              */
  /* ------------------------------------------------------------------ */

  function parse(str) {
    const s = String(str).replace(/\s+/g, '').replace(/[−–]/g, '-');
    if (!s) return new Poly([]);
    const terms = [];
    let i = 0;
    while (i < s.length) {
      let sign = 1;
      while (s[i] === '+' || s[i] === '-') {
        if (s[i] === '-') sign = -sign;
        i++;
      }
      let j = i;
      while (j < s.length && s[j] !== '+' && s[j] !== '-') j++;
      const body = s.slice(i, j);
      i = j;
      const m = body.match(/^(\d*)((?:[a-z](?:\^\d+)?)*)$/);
      if (!body || !m) throw new Error('No se pudo interpretar el término "' + body + '" en "' + str + '"');
      if (m[1] === '' && m[2] === '') throw new Error('Término vacío en "' + str + '"');
      const c = m[1] === '' ? 1 : parseInt(m[1], 10);
      const v = {};
      m[2].replace(/([a-z])(?:\^(\d+))?/g, (_, name, e) => {
        v[name] = (v[name] || 0) + (e ? parseInt(e, 10) : 1);
        return '';
      });
      terms.push({ c: sign * c, v });
    }
    return new Poly(terms, { keepOrder: true });
  }

  /**
   * Convierte a Poly:
   *   P(5)              → constante
   *   P('2x^2 - 3xy')   → se lee el texto (conserva el orden escrito)
   *   P({ c: 3, v: { x: 2 } })
   *   P([{c,v}, ...], { keepOrder })
   *   P(poly)           → el mismo
   */
  function P(x, opts) {
    if (x instanceof Poly) return x;
    if (typeof x === 'number') return new Poly([{ c: x, v: {} }]);
    if (typeof x === 'string') return parse(x);
    if (Array.isArray(x)) return new Poly(x, opts);
    if (x && typeof x === 'object' && 'c' in x) return new Poly([x]);
    throw new Error('No se puede convertir a polinomio: ' + x);
  }

  /** Monomio c·(variables). mono(3, {x: 2}) → 3x² */
  function mono(c, v) {
    return new Poly([{ c, v: v || {} }]);
  }

  /* ------------------------------------------------------------------ */
  /* Factored: prefijo · (f1)^e1 · (f2)^e2 ...                           */
  /* ------------------------------------------------------------------ */

  class Factored {
    /**
     * prefix: monomio (número, texto o Poly de un término). 1 si no hay.
     * factors: lista de Poly | texto | [Poly|texto, exponente] | { p, e }.
     */
    constructor(prefix, factors) {
      this.prefix = P(prefix == null ? 1 : prefix);
      if (this.prefix.terms.length !== 1) throw new Error('El prefijo de una factorización debe ser un monomio no nulo');
      this.factors = (factors || []).map((f) => {
        if (Array.isArray(f)) return { p: P(f[0]), e: f[1] };
        if (f && f.p) return { p: P(f.p), e: f.e || 1 };
        return { p: P(f), e: 1 };
      });
      for (const f of this.factors) {
        if (!Number.isInteger(f.e) || f.e < 1) throw new Error('Exponente de factor inválido: ' + f.e);
        if (f.p.isZero()) throw new Error('Factor nulo');
      }
    }

    expand() {
      let r = this.prefix;
      for (const f of this.factors) r = r.mul(f.p.pow(f.e));
      return r;
    }

    get html() {
      return factoredHtml(this);
    }

    toString() {
      return factoredText(this);
    }
  }

  /** fac(prefijo, factor1, factor2, [factor3, exponente], ...) */
  function fac(prefix) {
    return new Factored(prefix, Array.prototype.slice.call(arguments, 1));
  }

  /** Valor (polinomio desarrollado) de una expresión. */
  function valueOf(expr) {
    if (expr instanceof Factored) return expr.expand();
    return P(expr);
  }

  /* ------------------------------------------------------------------ */
  /* Representación en HTML y texto                                      */
  /* ------------------------------------------------------------------ */

  function numHtml(n) {
    return n < 0 ? MINUS + Math.abs(n) : String(n);
  }

  function varsHtml(v) {
    return sortVars(Object.keys(v))
      .map((k) => '<i>' + k + '</i>' + (v[k] > 1 ? '<sup>' + v[k] + '</sup>' : ''))
      .join('');
  }

  function termAbsHtml(t) {
    const hasVars = Object.keys(t.v).length > 0;
    const a = Math.abs(t.c);
    return (a === 1 && hasVars ? '' : String(a)) + varsHtml(t.v);
  }

  function polyHtml(p) {
    if (p.terms.length === 0) return '0';
    return p.terms
      .map((t, i) => {
        const body = termAbsHtml(t);
        if (i === 0) return (t.c < 0 ? MINUS : '') + body;
        return (t.c < 0 ? ' ' + MINUS + ' ' : ' + ') + body;
      })
      .join('');
  }

  function prefixHtml(f) {
    const t = f.prefix.terms[0];
    const isUnit = Object.keys(t.v).length === 0 && Math.abs(t.c) === 1;
    if (isUnit) return t.c < 0 ? MINUS : '';
    return polyHtml(f.prefix);
  }

  function factoredHtml(f) {
    const pre = prefixHtml(f);
    if (f.factors.length === 0) return polyHtml(f.prefix);
    if (f.factors.length === 1 && f.factors[0].e === 1 && pre === '') return polyHtml(f.factors[0].p);
    return (
      pre +
      f.factors
        .map((fc) => '(' + polyHtml(fc.p) + ')' + (fc.e > 1 ? '<sup>' + fc.e + '</sup>' : ''))
        .join('')
    );
  }

  function termAbsText(t) {
    const hasVars = Object.keys(t.v).length > 0;
    const a = Math.abs(t.c);
    return (
      (a === 1 && hasVars ? '' : String(a)) +
      sortVars(Object.keys(t.v))
        .map((k) => k + (t.v[k] > 1 ? '^' + t.v[k] : ''))
        .join('')
    );
  }

  function polyText(p) {
    if (p.terms.length === 0) return '0';
    return p.terms
      .map((t, i) => {
        const body = termAbsText(t);
        if (i === 0) return (t.c < 0 ? '-' : '') + body;
        return (t.c < 0 ? ' - ' : ' + ') + body;
      })
      .join('');
  }

  function factoredText(f) {
    const t = f.prefix.terms[0];
    const isUnit = Object.keys(t.v).length === 0 && Math.abs(t.c) === 1;
    const pre = isUnit ? (t.c < 0 ? '-' : '') : polyText(f.prefix);
    if (f.factors.length === 0) return polyText(f.prefix);
    if (f.factors.length === 1 && f.factors[0].e === 1 && pre === '') return polyText(f.factors[0].p);
    return pre + f.factors.map((fc) => '(' + polyText(fc.p) + ')' + (fc.e > 1 ? '^' + fc.e : '')).join('');
  }

  /** HTML "crudo" (sin envoltura) de un número, texto, Poly o Factored. */
  function raw(x) {
    if (typeof x === 'number') return numHtml(x);
    if (x instanceof Factored) return factoredHtml(x);
    if (x && typeof x === 'object' && typeof x.rawHtml === 'string') return x.rawHtml;
    return polyHtml(P(x));
  }

  /** Envuelve HTML crudo en un <span class="m"> (estilo matemático). */
  function hm(rawHtml) {
    return '<span class="m">' + rawHtml + '</span>';
  }

  /** HTML matemático de una expresión: h(poly), h('2x+3'), h(5), h(factored). */
  function h(x) {
    return hm(raw(x));
  }

  /** ¿Se puede elevar sin paréntesis? (número ≥ 0 o una sola variable sin coeficiente ni exponente) */
  function isSimpleBase(x) {
    if (typeof x === 'number') return x >= 0;
    if (x instanceof Factored) return false;
    const p = P(x);
    if (p.terms.length === 0) return true;
    if (p.terms.length !== 1) return false;
    const t = p.terms[0];
    const ks = Object.keys(t.v);
    if (ks.length === 0) return t.c >= 0;
    return t.c === 1 && ks.length === 1 && t.v[ks[0]] === 1;
  }

  /** Base elevada a un exponente, con paréntesis cuando hacen falta: (2x)², (−3)², x², 5². */
  function rawPow(x, e) {
    const base = raw(x);
    return (isSimpleBase(x) ? base : '(' + base + ')') + '<sup>' + e + '</sup>';
  }

  function hp(x, e) {
    return hm(rawPow(x, e));
  }

  /** Expresión entre paréntesis (crudo): (2x), (−3) */
  function rawParen(x) {
    return '(' + raw(x) + ')';
  }

  /** Raíz cuadrada: √(4x²) con barra superior. */
  function hsqrt(x) {
    return hm('<span class="rad">√<span class="radicand">' + raw(x) + '</span></span>');
  }

  /** Raíz cúbica: ∛(8x³) con barra superior. */
  function hcbrt(x) {
    return hm('<span class="rad">∛<span class="radicand">' + raw(x) + '</span></span>');
  }

  /**
   * Fórmula escrita en un mini‑lenguaje → HTML matemático.
   *   fx('(a ± b)^2 = a^2 ± 2ab + b^2')
   * Las letras van en cursiva, ^n o ^{...} se vuelve exponente, '-' se vuelve '−'
   * y '*' se vuelve '·'.
   */
  function fxRaw(str) {
    let out = '';
    let i = 0;
    while (i < str.length) {
      const ch = str[i];
      if (ch === '^') {
        if (str[i + 1] === '{') {
          let depth = 1;
          let j = i + 2;
          while (j < str.length && depth > 0) {
            if (str[j] === '{') depth++;
            else if (str[j] === '}') depth--;
            j++;
          }
          out += '<sup>' + fxRaw(str.slice(i + 2, j - 1)) + '</sup>';
          i = j;
        } else {
          let j = i + 1;
          while (j < str.length && /[0-9]/.test(str[j])) j++;
          out += '<sup>' + str.slice(i + 1, j) + '</sup>';
          i = j;
        }
      } else if (/[a-zA-Z]/.test(ch)) {
        out += '<i>' + ch + '</i>';
        i++;
      } else if (ch === '-') {
        out += MINUS;
        i++;
      } else if (ch === '*') {
        out += '·';
        i++;
      } else if (ch === '<') {
        out += '&lt;';
        i++;
      } else if (ch === '>') {
        out += '&gt;';
        i++;
      } else if (ch === '&') {
        out += '&amp;';
        i++;
      } else {
        out += ch;
        i++;
      }
    }
    return out;
  }

  function fx(str) {
    return hm(fxRaw(str));
  }

  /**
   * Une expresiones HTML con " = " quitando las repetidas consecutivas,
   * para evitar cosas como "x² = x²". eq(fx('a^2'), hp(a, 2), h(a2))
   */
  function eq() {
    const parts = Array.prototype.slice.call(arguments).filter((s) => s !== '' && s != null);
    const out = [];
    for (const s of parts) if (out[out.length - 1] !== s) out.push(s);
    return out.join(' = ');
  }

  /* ------------------------------------------------------------------ */
  /* Raíces de monomios                                                  */
  /* ------------------------------------------------------------------ */

  /**
   * Raíz k-ésima exacta de un monomio (Poly de un término), o null.
   * Para k par se exige coeficiente positivo y se devuelve la raíz positiva.
   */
  function monoRoot(m, k) {
    m = P(m);
    if (m.terms.length !== 1) return null;
    const t = m.terms[0];
    const c = exactRoot(t.c, k);
    if (c === null) return null;
    const v = {};
    for (const name of Object.keys(t.v)) {
      if (t.v[name] % k !== 0) return null;
      v[name] = t.v[name] / k;
    }
    return new Poly([{ c, v }]);
  }

  /* ------------------------------------------------------------------ */
  /* ¿Se puede seguir factorizando?                                      */
  /* ------------------------------------------------------------------ */

  /** Evalúa con BigInt: ¿p/q es raíz del polinomio de coeficientes coeffs (índice = grado)? */
  function isRationalRoot(coeffs, p, q) {
    const n = coeffs.length - 1;
    let sum = 0n;
    const P_ = BigInt(p);
    const Q_ = BigInt(q);
    for (let i = 0; i <= n; i++) {
      if (!coeffs[i]) continue;
      sum += BigInt(coeffs[i]) * P_ ** BigInt(i) * Q_ ** BigInt(n - i);
    }
    return sum === 0n;
  }

  /** Busca una raíz racional de un polinomio en una variable (coeficientes por grado). */
  function findRationalRoot(coeffs) {
    const n = coeffs.length - 1;
    if (n < 1) return null;
    if (coeffs[0] === 0) return { p: 0, q: 1 };
    for (const p of divisors(coeffs[0])) {
      for (const q of divisors(coeffs[n])) {
        if (gcd(p, q) !== 1) continue;
        if (isRationalRoot(coeffs, p, q)) return { p, q };
        if (isRationalRoot(coeffs, -p, q)) return { p: -p, q };
      }
    }
    return null;
  }

  function sameVars(a, b) {
    return varsKey(a) === varsKey(b);
  }

  /**
   * Si el polinomio p (de tres términos) tiene la forma A·U² + B·U·V + C·V²
   * con U, V monomios, devuelve { A, B, C, U, V } (U, V con coeficiente 1).
   */
  function quadraticForm(p) {
    if (p.terms.length !== 3) return null;
    const idx = [
      [0, 1, 2],
      [0, 2, 1],
      [1, 0, 2],
    ];
    for (const [i, j, k] of idx) {
      const t1 = p.terms[i];
      const t2 = p.terms[j];
      const t3 = p.terms[k];
      const U = monoRoot(mono(1, t1.v), 2);
      const V = monoRoot(mono(1, t3.v), 2);
      if (!U || !V) continue;
      if (!sameVars(mulVars(U.terms[0].v, V.terms[0].v), t2.v)) continue;
      return { A: t1.c, B: t2.c, C: t3.c, U, V };
    }
    return null;
  }

  /**
   * Devuelve un texto explicando por qué el polinomio todavía se puede
   * factorizar sobre los enteros, o null si no se detecta ninguna forma.
   * Revisa: factor común, diferencia de cuadrados, suma/diferencia de cubos,
   * trinomios factorizables (incluido el TCP), adición y sustracción,
   * cubo perfecto, agrupación y raíces racionales (una variable o
   * polinomios homogéneos en dos variables).
   */
  function reducibleReason(poly) {
    const p = P(poly).sorted();
    const n = p.terms.length;
    if (n === 0) return 'es cero';
    if (n === 1) return null;

    if (p.content() > 1) return 'tiene factor común numérico ' + p.content();
    const mg = p.monoGcd();
    if (Object.keys(mg.terms[0].v).length > 0) return 'tiene factor común literal';

    const T = p.terms;

    if (n === 2) {
      const [a, b] = T;
      const ra = monoRoot(mono(Math.abs(a.c), a.v), 2);
      const rb = monoRoot(mono(Math.abs(b.c), b.v), 2);
      if (ra && rb && Math.sign(a.c) !== Math.sign(b.c)) return 'es una diferencia de cuadrados';
      const ca = monoRoot(mono(a.c, a.v), 3);
      const cb = monoRoot(mono(b.c, b.v), 3);
      const degA = Object.values(a.v).reduce((s, e) => s + e, 0);
      const degB = Object.values(b.v).reduce((s, e) => s + e, 0);
      if (ca && cb && degA + degB > 0) return 'es una suma o diferencia de cubos';
      // Suma de cuadrados del tipo a·u⁴ + c·v⁴ con 2√a√c cuadrado perfecto (adición y sustracción)
      if (a.c > 0 && b.c > 0) {
        const sa = monoRoot(mono(a.c, a.v), 2);
        const sb = monoRoot(mono(b.c, b.v), 2);
        const ua = monoRoot(mono(1, a.v), 4);
        const ub = monoRoot(mono(1, b.v), 4);
        if (sa && sb && ua && ub) {
          const s = 2 * sa.terms[0].c * sb.terms[0].c;
          if (isSquare(s)) return 'se factoriza por adición y sustracción';
        }
      }
    }

    if (n === 3) {
      const qf = quadraticForm(p);
      if (qf) {
        const disc = qf.B * qf.B - 4 * qf.A * qf.C;
        if (disc >= 0 && isSquare(disc)) {
          return disc === 0 ? 'es un trinomio cuadrado perfecto' : 'es un trinomio factorizable';
        }
        // Adición y sustracción: A·u⁴ + B·u²v² + C·v⁴
        const u = monoRoot(qf.U, 2);
        const v = monoRoot(qf.V, 2);
        const ra = exactRoot(qf.A, 2);
        const rc = exactRoot(qf.C, 2);
        if (u && v && ra !== null && rc !== null) {
          const s = 2 * ra * rc;
          for (const k2 of [s - qf.B, -s - qf.B]) {
            if (k2 > 0 && isSquare(k2)) return 'se factoriza por adición y sustracción';
          }
        }
      }
    }

    if (n === 4) {
      // Cubo perfecto
      const r1 = monoRoot(p.term(0), 3);
      const r4 = monoRoot(p.term(3), 3);
      if (r1 && r4 && r1.add(r4).pow(3).equals(p)) return 'es un cubo perfecto';
      // Agrupación en parejas
      const pairs = [
        [[0, 1], [2, 3]],
        [[0, 2], [1, 3]],
        [[0, 3], [1, 2]],
      ];
      for (const [g1, g2] of pairs) {
        const A = new Poly([T[g1[0]], T[g1[1]]], { keepOrder: true });
        const B = new Poly([T[g2[0]], T[g2[1]]], { keepOrder: true });
        const ga = A.monoGcd().scale(Math.sign(A.terms[0].c));
        const gb = B.monoGcd().scale(Math.sign(B.terms[0].c));
        const ra = A.divMono(ga);
        const rb = B.divMono(gb);
        if (ra.equals(rb) || ra.equals(rb.neg())) return 'se factoriza por agrupación';
      }
    }

    // Raíces racionales: una sola variable
    const vs = p.vars();
    if (vs.length === 1) {
      const x = vs[0];
      const deg = p.degree(x);
      if (deg >= 2) {
        const coeffs = new Array(deg + 1).fill(0);
        for (const t of T) coeffs[t.v[x] || 0] += t.c;
        if (findRationalRoot(coeffs)) return 'tiene una raíz racional (un factor lineal)';
      }
    }

    // Polinomio homogéneo en dos variables: se deshomogeneiza con la segunda = 1
    if (vs.length === 2) {
      const degs = T.map((t) => Object.values(t.v).reduce((s, e) => s + e, 0));
      if (degs.every((d) => d === degs[0]) && degs[0] >= 2) {
        const x = vs[0];
        const deg = p.degree(x);
        const coeffs = new Array(deg + 1).fill(0);
        for (const t of T) coeffs[t.v[x] || 0] += t.c;
        if (deg >= 1 && findRationalRoot(coeffs)) return 'tiene un factor lineal';
      }
    }

    return null;
  }

  root.Alg = {
    MINUS,
    gcd,
    gcdAll,
    exactRoot,
    isSquare,
    isCube,
    divisors,
    rand,
    Poly,
    Factored,
    P,
    mono,
    fac,
    valueOf,
    raw,
    rawPow,
    rawParen,
    h,
    hm,
    hp,
    hsqrt,
    hcbrt,
    fx,
    fxRaw,
    eq,
    num: numHtml,
    monoRoot,
    reducibleReason,
    findRationalRoot,
    text(expr) {
      if (expr instanceof Factored) return factoredText(expr);
      if (typeof expr === 'number') return String(expr);
      return polyText(P(expr));
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
