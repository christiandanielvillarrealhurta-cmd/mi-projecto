/*
 * motor.js — Registro de casos y armado de preguntas de opción múltiple.
 *
 * Cada caso se registra con MA.registerCase({...}) (ver js/casos/*.js).
 * Contrato de un caso:
 *
 *   {
 *     id: 'pn-binomio-cuadrado',       // único
 *     topic: 'productos' | 'factorizacion',
 *     order: 1,                         // posición dentro de su tema
 *     name: 'Binomio al cuadrado',
 *     formula: '<span class="m">…</span>', // HTML (usa Alg.fx)
 *     generate(level) → Ejercicio      // level: 'facil' | 'medio' | 'dificil'
 *   }
 *
 * Ejercicio que devuelve generate():
 *
 *   {
 *     prompt: Factored | Poly,   // lo que se muestra arriba
 *     answer: Poly | Factored,   // la respuesta correcta
 *     distractors: [ expr | { expr, why } ],  // respuestas incorrectas (≥ 3, idealmente 4–6)
 *     steps: [ { title, html } ],             // procedimiento; el último paso contiene la respuesta
 *     key: 'texto único'                      // para no repetir ejercicios seguidos
 *   }
 *
 * En productos notables: valor(prompt) = answer (Poly ya desarrollado).
 * En factorización: prompt es el Poly a factorizar y answer su Factored.
 */
(function (root) {
  'use strict';

  const Alg = root.Alg;
  const { rand } = Alg;

  const TOPICS = {
    productos: {
      id: 'productos',
      name: 'Productos notables',
      instruction: 'Desarrolla el producto notable:',
    },
    factorizacion: {
      id: 'factorizacion',
      name: 'Factorización',
      instruction: 'Factoriza la expresión:',
    },
  };

  const LEVELS = [
    { id: 'facil', name: 'Fácil' },
    { id: 'medio', name: 'Medio' },
    { id: 'dificil', name: 'Difícil' },
  ];

  const cases = [];

  function registerCase(def) {
    const required = ['id', 'topic', 'name', 'formula', 'generate'];
    for (const k of required) {
      if (!def[k]) throw new Error('El caso ' + (def.id || '?') + ' no tiene el campo ' + k);
    }
    if (!TOPICS[def.topic]) throw new Error('Tema desconocido: ' + def.topic);
    if (cases.some((c) => c.id === def.id)) throw new Error('Caso repetido: ' + def.id);
    cases.push(def);
    cases.sort((a, b) => (a.topic === b.topic ? (a.order || 0) - (b.order || 0) : a.topic < b.topic ? 1 : -1));
  }

  function getCase(id) {
    return cases.find((c) => c.id === id) || null;
  }

  function casesOf(topic) {
    return cases.filter((c) => c.topic === topic);
  }

  /* ------------------------------------------------------------------ */
  /* Validación de un ejercicio                                          */
  /* ------------------------------------------------------------------ */

  /** Devuelve una lista de problemas (vacía si el ejercicio es correcto). */
  function validateExercise(ex, caseDef) {
    const problems = [];
    if (!ex || typeof ex !== 'object') return ['generate() no devolvió un objeto'];
    for (const k of ['prompt', 'answer', 'distractors', 'steps', 'key']) {
      if (ex[k] == null) problems.push('falta el campo ' + k);
    }
    if (problems.length) return problems;

    let promptVal;
    let answerVal;
    try {
      promptVal = Alg.valueOf(ex.prompt);
      answerVal = Alg.valueOf(ex.answer);
    } catch (e) {
      return ['error al desarrollar: ' + e.message];
    }
    if (!promptVal.equals(answerVal)) {
      problems.push(
        'la respuesta no es equivalente al enunciado: ' + Alg.text(ex.prompt) + ' ≠ ' + Alg.text(ex.answer)
      );
    }

    if (caseDef.topic === 'productos') {
      if (!(ex.prompt instanceof Alg.Factored)) problems.push('en productos notables el enunciado debe ser Factored');
      if (!(ex.answer instanceof Alg.Poly)) problems.push('en productos notables la respuesta debe ser Poly');
    } else {
      if (!(ex.prompt instanceof Alg.Poly)) problems.push('en factorización el enunciado debe ser Poly');
      if (!(ex.answer instanceof Alg.Factored)) problems.push('en factorización la respuesta debe ser Factored');
    }

    if (!Array.isArray(ex.steps) || ex.steps.length < 2) {
      problems.push('el procedimiento debe tener al menos 2 pasos');
    } else {
      const last = ex.steps[ex.steps.length - 1];
      if (!last || typeof last.html !== 'string' || last.html.indexOf(Alg.raw(ex.answer)) === -1) {
        problems.push('el último paso del procedimiento debe mostrar la respuesta exacta');
      }
      for (const s of ex.steps) {
        const txt = (s.title || '') + ' ' + (s.html || '');
        if (/undefined|NaN|\[object|null/.test(txt)) problems.push('texto inválido en un paso: ' + txt);
        if (txt.indexOf('+ ' + Alg.MINUS) !== -1 || txt.indexOf(Alg.MINUS + ' ' + Alg.MINUS) !== -1) {
          problems.push('signos dobles en un paso: ' + txt);
        }
      }
    }
    if (!Array.isArray(ex.distractors)) problems.push('distractors debe ser una lista');
    return problems;
  }

  /* ------------------------------------------------------------------ */
  /* Distractores de respaldo                                            */
  /* ------------------------------------------------------------------ */

  function tweakCoef(c) {
    const options = [c + 1, c - 1, c + 2, c - 2, -c, c * 2].filter((n) => n !== 0 && n !== c);
    return rand.pick(options);
  }

  function tweakPoly(p) {
    const i = rand.int(0, p.terms.length - 1);
    const terms = p.terms.map((t, j) => (j === i ? { c: tweakCoef(t.c), v: t.v } : t));
    return new Alg.Poly(terms, { keepOrder: true });
  }

  /** Respuesta incorrecta genérica: cambia un coeficiente de la respuesta correcta. */
  function perturb(answer) {
    if (answer instanceof Alg.Factored) {
      const multi = answer.factors.map((f, i) => i).filter((i) => answer.factors[i].p.terms.length >= 2);
      if (multi.length === 0 || rand.chance(0.15)) {
        const t = answer.prefix.terms[0];
        return new Alg.Factored(Alg.P({ c: tweakCoef(t.c), v: t.v }), answer.factors);
      }
      const i = rand.pick(multi);
      const factors = answer.factors.map((f, j) => (j === i ? { p: tweakPoly(f.p), e: f.e } : f));
      return new Alg.Factored(answer.prefix, factors);
    }
    return tweakPoly(Alg.P(answer));
  }

  /* ------------------------------------------------------------------ */
  /* Armado de la pregunta                                               */
  /* ------------------------------------------------------------------ */

  function normDistractor(d) {
    if (d && typeof d === 'object' && 'expr' in d) return { expr: d.expr, why: d.why || '' };
    return { expr: d, why: '' };
  }

  /**
   * Genera un ejercicio válido del caso y arma la pregunta con 4 opciones.
   * recentKeys: Set de claves usadas recientemente (para no repetir).
   */
  function buildQuestion(caseDef, level, recentKeys) {
    let ex = null;
    let lastProblems = [];
    for (let attempt = 0; attempt < 40; attempt++) {
      const cand = caseDef.generate(level);
      const problems = validateExercise(cand, caseDef);
      if (problems.length) {
        lastProblems = problems;
        if (root.console) console.warn('[' + caseDef.id + '] ejercicio descartado:', problems);
        continue;
      }
      ex = cand;
      if (!recentKeys || !recentKeys.has(cand.key) || attempt >= 30) break;
    }
    if (!ex) throw new Error('No se pudo generar un ejercicio válido de ' + caseDef.id + ': ' + lastProblems.join('; '));

    const target = Alg.valueOf(ex.answer);
    const answerHtml = Alg.raw(ex.answer);
    const usedVals = new Set([target.key()]);
    const usedHtml = new Set([answerHtml]);
    const chosen = [];

    const tryAdd = (expr, why, generated) => {
      let val;
      let html;
      try {
        val = Alg.valueOf(expr);
        html = Alg.raw(expr);
      } catch (e) {
        return false;
      }
      if (val.isZero() || usedVals.has(val.key()) || usedHtml.has(html)) return false;
      usedVals.add(val.key());
      usedHtml.add(html);
      chosen.push({ html, why, generated });
      return true;
    };

    for (const d of rand.shuffle(ex.distractors.map(normDistractor))) {
      if (chosen.length === 3) break;
      tryAdd(d.expr, d.why, false);
    }
    let guard = 0;
    while (chosen.length < 3 && guard++ < 300) {
      tryAdd(perturb(ex.answer), '', true);
    }

    const options = rand.shuffle(
      [{ html: answerHtml, correct: true, why: '' }].concat(
        chosen.map((c) => ({ html: c.html, correct: false, why: c.why, generated: c.generated }))
      )
    );

    return {
      caseId: caseDef.id,
      caseName: caseDef.name,
      formula: caseDef.formula,
      topic: caseDef.topic,
      level,
      instruction: ex.instruction || TOPICS[caseDef.topic].instruction,
      promptHtml: Alg.raw(ex.prompt),
      answerHtml,
      options,
      correctIndex: options.findIndex((o) => o.correct),
      steps: ex.steps,
      key: ex.key,
      fallbackCount: chosen.filter((c) => c.generated).length,
    };
  }

  root.MA = {
    TOPICS,
    LEVELS,
    cases,
    registerCase,
    getCase,
    casesOf,
    validateExercise,
    buildQuestion,
    perturb,
  };
})(typeof window !== 'undefined' ? window : globalThis);
