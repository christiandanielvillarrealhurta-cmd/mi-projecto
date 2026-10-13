/*
 * app.js — Interfaz: elegir tema → casos y dificultad → práctica → resultados.
 *
 * La sesión no tiene límite de ejercicios: termina cuando el estudiante
 * presiona "Terminar sesión". Al final se muestra el porcentaje de aciertos
 * y en qué casos falló más y menos.
 */
(function (root) {
  'use strict';

  const { MA, Alg } = root;
  const doc = root.document;
  const $ = (id) => doc.getElementById(id);

  const LEVEL_NAMES = { facil: 'Fácil', medio: 'Medio', dificil: 'Difícil', revuelto: 'Revuelto' };
  const LEVEL_DESC = {
    facil: 'Una sola variable y números pequeños. Ideal para empezar.',
    medio: 'Coeficientes más grandes o una segunda variable.',
    dificil: 'Dos variables, exponentes mayores y coeficientes más grandes.',
    revuelto: 'Cada ejercicio sale con una dificultad al azar: fácil, medio o difícil.',
  };
  const TOPIC_NAMES = {
    productos: 'Productos notables',
    factorizacion: 'Factorización',
    mezcla: 'Productos notables y factorización',
  };
  const STORAGE_KEY = 'productos-y-factores:config';

  let state = freshState();

  function freshState() {
    return {
      screen: 'inicio',
      topic: null,
      selected: [],
      level: 'medio',
      session: null,
      lastSession: null,
    };
  }

  /* ------------------------------------------------------------------ */
  /* Utilidades                                                          */
  /* ------------------------------------------------------------------ */

  /** Evita que una línea se corte entre un signo y el término que le sigue. */
  function nb(html) {
    return String(html).replace(/ ([+=−]) /g, ' $1 ');
  }

  function el(tag, attrs, children) {
    const e = doc.createElement(tag);
    if (attrs) {
      for (const k of Object.keys(attrs)) {
        if (k === 'html') e.innerHTML = attrs[k];
        else if (k === 'text') e.textContent = attrs[k];
        else if (k === 'class') e.className = attrs[k];
        else e.setAttribute(k, attrs[k]);
      }
    }
    for (const c of children || []) if (c) e.appendChild(c);
    return e;
  }

  function pct(ok, total) {
    return total ? Math.round((100 * ok) / total) : 0;
  }

  function topicCases(topic) {
    if (topic === 'mezcla') return MA.casesOf('productos').concat(MA.casesOf('factorizacion'));
    return MA.casesOf(topic);
  }

  function saveConfig() {
    try {
      root.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ topic: state.topic, selected: state.selected, level: state.level })
      );
    } catch (e) {
      /* el almacenamiento es opcional */
    }
  }

  function loadConfig() {
    try {
      const raw = root.localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  /* ------------------------------------------------------------------ */
  /* Navegación                                                          */
  /* ------------------------------------------------------------------ */

  const SCREENS = ['inicio', 'casos', 'practica', 'resultados'];

  function show(screen) {
    state.screen = screen;
    for (const s of SCREENS) $('pantalla-' + s).hidden = s !== screen;
    root.scrollTo(0, 0);
  }

  function goHome() {
    if (state.screen === 'practica' && state.session && state.session.history.length) {
      openEndDialog();
      return;
    }
    state.session = null;
    show('inicio');
  }

  /* ------------------------------------------------------------------ */
  /* Pantalla: casos y dificultad                                        */
  /* ------------------------------------------------------------------ */

  function openCases(topic) {
    const prev = loadConfig();
    const available = topicCases(topic).map((c) => c.id);
    state.topic = topic;
    if (prev && prev.topic === topic && Array.isArray(prev.selected)) {
      state.selected = prev.selected.filter((id) => available.indexOf(id) !== -1);
    } else {
      state.selected = [];
    }
    if (prev && LEVEL_NAMES[prev.level]) state.level = prev.level;
    renderCases();
    show('casos');
  }

  function renderCases() {
    $('casos-tema').textContent = TOPIC_NAMES[state.topic];
    const list = $('lista-casos');
    list.innerHTML = '';
    const groups = state.topic === 'mezcla' ? ['productos', 'factorizacion'] : [state.topic];
    for (const g of groups) {
      const box = el('div', { class: 'grupo-casos' });
      if (groups.length > 1) box.appendChild(el('h2', { text: MA.TOPICS[g].name }));
      for (const c of MA.casesOf(g)) {
        const input = el('input', { type: 'checkbox', id: 'caso-' + c.id, value: c.id });
        input.checked = state.selected.indexOf(c.id) !== -1;
        input.addEventListener('change', () => {
          if (input.checked) {
            if (state.selected.indexOf(c.id) === -1) state.selected.push(c.id);
          } else {
            state.selected = state.selected.filter((id) => id !== c.id);
          }
          updateCasesFooter();
        });
        const label = el('label', { class: 'caso', for: 'caso-' + c.id }, [
          input,
          el('span', { class: 'caso-nombre', text: c.name }),
          el('span', { class: 'caso-formula', html: nb(c.formula) }),
        ]);
        box.appendChild(label);
      }
      list.appendChild(box);
    }
    const radio = $('nivel-' + state.level);
    if (radio) radio.checked = true;
    $('nivel-desc').textContent = LEVEL_DESC[state.level];
    updateCasesFooter();
  }

  function updateCasesFooter() {
    const n = state.selected.length;
    $('casos-conteo').textContent = n === 0 ? 'Marca al menos un caso' : n === 1 ? '1 caso seleccionado' : n + ' casos seleccionados';
    $('btn-comenzar').disabled = n === 0;
  }

  function setAllCases(on) {
    state.selected = on ? topicCases(state.topic).map((c) => c.id) : [];
    for (const input of $('lista-casos').querySelectorAll('input[type=checkbox]')) input.checked = on;
    updateCasesFooter();
  }

  /* ------------------------------------------------------------------ */
  /* Sesión de práctica                                                  */
  /* ------------------------------------------------------------------ */

  function startSession(caseIds, level, topic) {
    const ordered = topicCases(topic || state.topic)
      .map((c) => c.id)
      .filter((id) => caseIds.indexOf(id) !== -1);
    state.session = {
      topic: topic || state.topic,
      cases: ordered,
      level,
      bag: [],
      recent: [],
      lastCase: null,
      current: null,
      answered: false,
      chosen: -1,
      history: [],
    };
    saveConfig();
    show('practica');
    nextExercise();
  }

  /** Bolsa barajada: todos los casos elegidos salen con la misma frecuencia. */
  function nextCaseId(s) {
    if (s.bag.length === 0) {
      s.bag = Alg.rand.shuffle(s.cases);
      if (s.bag.length > 1 && s.bag[0] === s.lastCase) {
        const t = s.bag[0];
        s.bag[0] = s.bag[1];
        s.bag[1] = t;
      }
    }
    const id = s.bag.shift();
    s.lastCase = id;
    return id;
  }

  function pickLevel(level) {
    return level === 'revuelto' ? Alg.rand.pick(['facil', 'medio', 'dificil']) : level;
  }

  function nextExercise() {
    const s = state.session;
    let q = null;
    for (let i = 0; i < 6 && !q; i++) {
      const caseDef = MA.getCase(nextCaseId(s));
      try {
        q = MA.buildQuestion(caseDef, pickLevel(s.level), new Set(s.recent));
      } catch (e) {
        if (root.console) console.error(e);
      }
    }
    if (!q) {
      $('ejercicio-enunciado').textContent = 'No se pudo generar un ejercicio. Intenta con otros casos.';
      return;
    }
    s.recent.push(q.key);
    if (s.recent.length > 40) s.recent.shift();
    s.current = q;
    s.answered = false;
    s.chosen = -1;
    renderExercise(true);
  }

  function renderScore() {
    const s = state.session;
    const ok = s.history.filter((h) => h.correct).length;
    const bad = s.history.length - ok;
    $('practica-num').textContent = 'Ejercicio ' + (s.history.length + (s.answered ? 0 : 1));
    $('marcador').innerHTML =
      '<span class="marcador-ok">' + ok + '</span> bien · <span class="marcador-mal">' + bad + '</span> mal';
  }

  function renderExercise(isNew) {
    const s = state.session;
    const q = s.current;
    renderScore();
    if (s.answered) $('practica-num').textContent = 'Ejercicio ' + s.history.length;
    $('ejercicio-instruccion').textContent = q.instruction;
    $('ejercicio-nivel').textContent = LEVEL_NAMES[q.level];
    $('ejercicio-nivel').className = 'chip chip-' + q.level;
    $('ejercicio-enunciado').innerHTML = nb(q.promptHtml);

    const hoja = $('hoja');
    if (isNew) {
      hoja.classList.remove('nueva');
      void hoja.offsetWidth;
      hoja.classList.add('nueva');
    }

    const box = $('opciones');
    box.innerHTML = '';
    q.options.forEach((o, i) => {
      const btn = el('button', { class: 'opcion', type: 'button', 'data-indice': String(i) }, [
        el('span', { class: 'opcion-letra', text: 'ABCD'[i] }),
        el('span', { class: 'opcion-expr m', html: nb(o.html) }),
        el('span', { class: 'opcion-marca', 'aria-hidden': 'true' }),
      ]);
      btn.setAttribute('aria-label', 'Opción ' + 'ABCD'[i]);
      btn.addEventListener('click', () => answer(i));
      box.appendChild(btn);
    });

    if (s.answered) paintAnswer();
    else $('retro').hidden = true;
  }

  function answer(i) {
    const s = state.session;
    if (!s || s.answered) return;
    const q = s.current;
    s.answered = true;
    s.chosen = i;
    const correct = q.options[i].correct;
    s.history.push({
      caseId: q.caseId,
      caseName: q.caseName,
      topic: q.topic,
      level: q.level,
      correct,
      instruction: q.instruction,
      promptHtml: q.promptHtml,
      chosenHtml: q.options[i].html,
      answerHtml: q.answerHtml,
      why: q.options[i].why || '',
      steps: q.steps,
    });
    paintAnswer();
    renderScore();
    $('practica-num').textContent = 'Ejercicio ' + s.history.length;
    const retro = $('retro');
    retro.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    $('btn-continuar').focus({ preventScroll: true });
  }

  function paintAnswer() {
    const s = state.session;
    const q = s.current;
    const chosen = s.chosen;
    const ok = q.options[chosen].correct;
    const buttons = $('opciones').querySelectorAll('.opcion');
    buttons.forEach((b, i) => {
      b.disabled = true;
      const o = q.options[i];
      const mark = b.querySelector('.opcion-marca');
      if (o.correct) {
        b.classList.add('es-correcta');
        mark.textContent = '✓';
      } else if (i === chosen) {
        b.classList.add('es-incorrecta');
        mark.textContent = '✗';
      } else {
        b.classList.add('atenuada');
      }
    });

    const letter = 'ABCD'[q.correctIndex];
    const ver = $('retro-veredicto');
    ver.className = 'retro-veredicto ' + (ok ? 'bien' : 'mal');
    ver.innerHTML = '';
    ver.appendChild(el('strong', { text: ok ? '¡Correcto!' : 'Incorrecto' }));
    if (ok) {
      ver.appendChild(el('p', { text: 'Muy bien. Revisa el procedimiento para reforzar el método.' }));
    } else {
      ver.appendChild(el('p', { html: 'La respuesta correcta es la opción <strong>' + letter + '</strong>: ' + Alg.hm(nb(q.answerHtml)) }));
      const why = q.options[chosen].why;
      if (why) ver.appendChild(el('p', { class: 'retro-porque', html: '<strong>Posible error:</strong> ' + nb(why) }));
    }

    $('retro-caso').innerHTML = '';
    $('retro-caso').appendChild(el('span', { class: 'caso-etiqueta', text: 'Caso: ' + q.caseName }));
    $('retro-caso').appendChild(el('span', { html: nb(q.formula) }));

    renderSteps($('pasos'), q.steps);
    $('retro').hidden = false;
  }

  function renderSteps(list, steps) {
    list.innerHTML = '';
    for (const st of steps) {
      list.appendChild(
        el('li', null, [
          st.title ? el('span', { class: 'paso-titulo', text: st.title }) : null,
          el('span', { class: 'paso-texto', html: nb(st.html) }),
        ])
      );
    }
  }

  /* ------------------------------------------------------------------ */
  /* Terminar sesión                                                     */
  /* ------------------------------------------------------------------ */

  function openEndDialog() {
    const s = state.session;
    const n = s.history.length;
    let txt;
    if (n === 0) txt = 'Todavía no resuelves ningún ejercicio. Si terminas ahora, volverás a elegir los casos.';
    else txt = 'Llevas ' + n + (n === 1 ? ' ejercicio resuelto' : ' ejercicios resueltos') + '. Verás tu porcentaje y los casos en los que más fallaste.';
    if (n > 0 && !s.answered) txt += ' El ejercicio actual no se contará.';
    $('dialogo-texto').textContent = txt;
    $('btn-confirmar-fin').textContent = n === 0 ? 'Terminar' : 'Ver mi resultado';
    $('capa-terminar').hidden = false;
    $('btn-seguir').focus();
  }

  function closeEndDialog() {
    $('capa-terminar').hidden = true;
  }

  function endSession() {
    closeEndDialog();
    const s = state.session;
    if (!s || s.history.length === 0) {
      state.session = null;
      renderCases();
      show('casos');
      return;
    }
    state.lastSession = { topic: s.topic, cases: s.cases, level: s.level, history: s.history };
    state.session = null;
    renderResults();
    show('resultados');
  }

  /* ------------------------------------------------------------------ */
  /* Resultados                                                          */
  /* ------------------------------------------------------------------ */

  function statsByCase(last) {
    const rows = last.cases.map((id) => {
      const c = MA.getCase(id);
      const hs = last.history.filter((h) => h.caseId === id);
      const ok = hs.filter((h) => h.correct).length;
      return { id, name: c.name, topic: c.topic, attempts: hs.length, ok, bad: hs.length - ok, pct: pct(ok, hs.length) };
    });
    return rows.filter((r) => r.attempts > 0);
  }

  function barColor(p) {
    if (p >= 80) return 'var(--bien)';
    if (p >= 50) return 'var(--acento)';
    return 'var(--mal)';
  }

  function ring(p) {
    const r = 52;
    const c = 2 * Math.PI * r;
    const ns = 'http://www.w3.org/2000/svg';
    const svg = doc.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 128 128');
    svg.setAttribute('class', 'anillo');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', p + '% de aciertos');
    const bg = doc.createElementNS(ns, 'circle');
    bg.setAttribute('cx', '64');
    bg.setAttribute('cy', '64');
    bg.setAttribute('r', String(r));
    bg.setAttribute('stroke-width', '12');
    bg.setAttribute('class', 'anillo-fondo');
    const fg = doc.createElementNS(ns, 'circle');
    fg.setAttribute('cx', '64');
    fg.setAttribute('cy', '64');
    fg.setAttribute('r', String(r));
    fg.setAttribute('stroke-width', '12');
    fg.setAttribute('class', 'anillo-valor');
    fg.setAttribute('stroke', barColor(p));
    fg.setAttribute('stroke-dasharray', (c * p) / 100 + ' ' + c);
    fg.setAttribute('transform', 'rotate(-90 64 64)');
    const t = doc.createElementNS(ns, 'text');
    t.setAttribute('x', '64');
    t.setAttribute('y', '64');
    t.setAttribute('text-anchor', 'middle');
    t.setAttribute('dominant-baseline', 'central');
    t.setAttribute('font-size', '28');
    t.setAttribute('class', 'anillo-texto');
    t.textContent = p + '%';
    svg.appendChild(bg);
    if (p > 0) svg.appendChild(fg);
    svg.appendChild(t);
    return svg;
  }

  function message(p) {
    if (p === 100) return '¡Perfecto! Resolviste todo bien.';
    if (p >= 90) return '¡Excelente trabajo!';
    if (p >= 70) return '¡Muy bien! Ya dominas la mayoría de los casos.';
    if (p >= 50) return 'Vas por buen camino. Repasa los casos donde fallaste.';
    return 'Sigue practicando: revisa los procedimientos y vuelve a intentarlo.';
  }

  function plural(n, uno, varios) {
    return n + ' ' + (n === 1 ? uno : varios);
  }

  function renderResults() {
    const last = state.lastSession;
    const box = $('resultado-contenido');
    box.innerHTML = '';
    const total = last.history.length;
    const ok = last.history.filter((h) => h.correct).length;
    const p = pct(ok, total);

    // Resumen general
    box.appendChild(
      el('section', { class: 'resumen' }, [
        ring(p),
        el('div', { class: 'resumen-texto' }, [
          el('strong', { text: message(p) }),
          el('p', { text: 'Contestaste bien ' + ok + ' de ' + plural(total, 'ejercicio', 'ejercicios') + ' (' + p + '%).' }),
          el('p', { text: TOPIC_NAMES[last.topic] + ' · nivel ' + LEVEL_NAMES[last.level].toLowerCase() }),
        ]),
      ])
    );

    // Dónde fallaste más y menos (si hay empate se nombran todos los empatados)
    const rows = statsByCase(last);
    const worstSorted = rows.slice().sort((a, b) => b.bad - a.bad || a.pct - b.pct || b.attempts - a.attempts);
    const failed = rows.filter((r) => r.bad > 0);
    const tile = (cls, label, value, detail) =>
      el('div', { class: cls }, [
        el('span', { class: 'etiqueta', text: label }),
        el('span', { class: 'valor', text: value }),
        el('span', { class: 'detalle', text: detail }),
      ]);
    const names = (list) => {
      const n = list.map((r) => r.name);
      if (n.length === 1) return n[0];
      if (n.length <= 3) return n.slice(0, -1).join(', ') + ' y ' + n[n.length - 1];
      return n.slice(0, 2).join(', ') + ' y ' + plural(n.length - 2, 'caso más', 'casos más');
    };

    const tiles = [];
    if (failed.length === 0) {
      tiles.push(tile('destacado mejor', 'Sin errores', 'No fallaste en ningún caso', 'Prueba subir la dificultad o agregar más casos.'));
    } else {
      const top = worstSorted[0];
      const worst = worstSorted.filter((r) => r.bad === top.bad && r.pct === top.pct);
      tiles.push(
        tile(
          'destacado',
          worst.length > 1 ? 'Donde más fallaste (empate)' : 'Donde más fallaste',
          names(worst),
          worst.length > 1
            ? plural(top.bad, 'error', 'errores') + ' en cada uno (' + top.pct + '% bien)'
            : plural(top.bad, 'error', 'errores') + ' en ' + plural(top.attempts, 'ejercicio', 'ejercicios') + ' (' + top.pct + '% bien)'
        )
      );
      const rest = rows
        .filter((r) => worst.indexOf(r) === -1 && r.pct > top.pct)
        .sort((a, b) => b.pct - a.pct || a.bad - b.bad || b.attempts - a.attempts);
      if (rest.length) {
        const b0 = rest[0];
        const best = rest.filter((r) => r.pct === b0.pct && r.bad === b0.bad);
        tiles.push(
          tile(
            'destacado mejor',
            best.length > 1 ? 'Donde menos fallaste (empate)' : 'Donde menos fallaste',
            names(best),
            best.length > 1 ? b0.pct + '% bien en cada uno' : b0.ok + ' de ' + plural(b0.attempts, 'ejercicio', 'ejercicios') + ' bien (' + b0.pct + '%)'
          )
        );
      }
    }
    box.appendChild(el('section', { class: 'destacados' }, tiles));

    // Tabla por caso (de más errores a menos)
    const showTopic = last.topic === 'mezcla';
    const tbody = el('tbody');
    for (const r of worstSorted) {
      const nameCell = el('td', null, [
        el('span', { text: r.name }),
        showTopic ? el('span', { class: 'tema-celda', text: MA.TOPICS[r.topic].name }) : null,
      ]);
      const bar = el('div', { class: 'barra' }, [
        el('div', { class: 'barra-pista' }, [el('div', { class: 'barra-relleno', style: 'width:' + r.pct + '%;background:' + barColor(r.pct) })]),
        el('span', { class: 'barra-pct', text: r.pct + '%' }),
      ]);
      tbody.appendChild(
        el('tr', null, [
          nameCell,
          el('td', { class: 'num', text: String(r.ok) }),
          el('td', { class: 'num', text: String(r.bad) }),
          el('td', null, [bar]),
        ])
      );
    }
    const table = el('table', { class: 'tabla' }, [
      el('thead', null, [
        el('tr', null, [
          el('th', { text: 'Caso' }),
          el('th', { class: 'num', text: 'Bien' }),
          el('th', { class: 'num', text: 'Mal' }),
          el('th', { text: 'Aciertos' }),
        ]),
      ]),
      tbody,
    ]);
    box.appendChild(
      el('section', { class: 'bloque' }, [
        el('h2', { text: 'Resultado por caso' }),
        el('div', { class: 'tabla-envoltura' }, [table]),
      ])
    );

    // Por dificultad (solo si hubo más de una)
    const levelsUsed = ['facil', 'medio', 'dificil'].filter((l) => last.history.some((h) => h.level === l));
    if (levelsUsed.length > 1) {
      const lb = el('tbody');
      for (const l of levelsUsed) {
        const hs = last.history.filter((h) => h.level === l);
        const k = hs.filter((h) => h.correct).length;
        const lp = pct(k, hs.length);
        lb.appendChild(
          el('tr', null, [
            el('td', { text: LEVEL_NAMES[l] }),
            el('td', { class: 'num', text: String(k) }),
            el('td', { class: 'num', text: String(hs.length - k) }),
            el('td', null, [
              el('div', { class: 'barra' }, [
                el('div', { class: 'barra-pista' }, [el('div', { class: 'barra-relleno', style: 'width:' + lp + '%;background:' + barColor(lp) })]),
                el('span', { class: 'barra-pct', text: lp + '%' }),
              ]),
            ]),
          ])
        );
      }
      box.appendChild(
        el('section', { class: 'bloque' }, [
          el('h2', { text: 'Resultado por dificultad' }),
          el('div', { class: 'tabla-envoltura' }, [
            el('table', { class: 'tabla' }, [
              el('thead', null, [
                el('tr', null, [
                  el('th', { text: 'Dificultad' }),
                  el('th', { class: 'num', text: 'Bien' }),
                  el('th', { class: 'num', text: 'Mal' }),
                  el('th', { text: 'Aciertos' }),
                ]),
              ]),
              lb,
            ]),
          ]),
        ])
      );
    }

    // Repaso de errores
    const wrong = last.history.filter((h) => !h.correct);
    if (wrong.length) {
      const list = el('div', { class: 'errores' });
      for (const h of wrong) {
        const steps = el('ol', { class: 'pasos' });
        renderSteps(steps, h.steps);
        list.appendChild(
          el('article', { class: 'error' }, [
            el('div', { class: 'error-cabeza' }, [el('span', { text: h.caseName }), el('span', { text: LEVEL_NAMES[h.level] })]),
            el('div', { class: 'error-enunciado m', html: nb(h.promptHtml) }),
            el('div', { class: 'error-linea tuya' }, [el('span', { class: 'lbl', text: 'Tu respuesta' }), el('span', { class: 'm', html: nb(h.chosenHtml) })]),
            el('div', { class: 'error-linea buena' }, [el('span', { class: 'lbl', text: 'Respuesta correcta' }), el('span', { class: 'm', html: nb(h.answerHtml) })]),
            el('details', null, [el('summary', { text: 'Ver procedimiento' }), steps]),
          ])
        );
      }
      box.appendChild(el('section', { class: 'bloque' }, [el('h2', { text: 'Repasa tus errores' }), list]));
    }

    $('btn-practicar-fallos').hidden = failed.length === 0;
  }

  /* ------------------------------------------------------------------ */
  /* Eventos                                                             */
  /* ------------------------------------------------------------------ */

  function bind() {
    for (const b of doc.querySelectorAll('[data-tema]')) {
      b.addEventListener('click', () => openCases(b.getAttribute('data-tema')));
    }
    for (const b of doc.querySelectorAll('[data-accion="inicio"]')) b.addEventListener('click', goHome);
    for (const t of ['productos', 'factorizacion']) {
      const span = doc.querySelector('[data-conteo="' + t + '"]');
      const n = MA.casesOf(t).length;
      if (span) span.textContent = n + (n === 1 ? ' caso' : ' casos');
    }

    $('btn-todos').addEventListener('click', () => setAllCases(true));
    $('btn-ninguno').addEventListener('click', () => setAllCases(false));
    for (const r of doc.querySelectorAll('input[name=nivel]')) {
      r.addEventListener('change', () => {
        state.level = r.value;
        $('nivel-desc').textContent = LEVEL_DESC[state.level];
      });
    }
    $('btn-comenzar').addEventListener('click', () => {
      if (state.selected.length) startSession(state.selected.slice(), state.level, state.topic);
    });

    $('btn-continuar').addEventListener('click', nextExercise);
    $('btn-terminar').addEventListener('click', openEndDialog);
    $('btn-seguir').addEventListener('click', closeEndDialog);
    $('btn-confirmar-fin').addEventListener('click', endSession);
    $('capa-terminar').addEventListener('click', (e) => {
      if (e.target === $('capa-terminar')) closeEndDialog();
    });

    $('btn-repetir').addEventListener('click', () => {
      const last = state.lastSession;
      if (last) startSession(last.cases, last.level, last.topic);
    });
    $('btn-practicar-fallos').addEventListener('click', () => {
      const last = state.lastSession;
      if (!last) return;
      const failed = statsByCase(last)
        .filter((r) => r.bad > 0)
        .map((r) => r.id);
      if (failed.length) startSession(failed, last.level, last.topic);
    });

    doc.addEventListener('keydown', (e) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (!$('capa-terminar').hidden) {
        if (e.key === 'Escape') closeEndDialog();
        return;
      }
      if (state.screen !== 'practica' || !state.session || !state.session.current) return;
      const k = e.key.toLowerCase();
      const map = { 1: 0, 2: 1, 3: 2, 4: 3, a: 0, b: 1, c: 2, d: 3 };
      if (!state.session.answered && k in map) {
        e.preventDefault();
        answer(map[k]);
      } else if (state.session.answered && e.key === 'Enter' && doc.activeElement === $('btn-continuar')) {
        // el propio botón ya maneja Enter
      } else if (state.session.answered && (e.key === 'Enter' || e.key === 'ArrowRight')) {
        e.preventDefault();
        nextExercise();
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /* Arranque (conserva la sesión si la página se actualiza en vivo)     */
  /* ------------------------------------------------------------------ */

  function restore(data) {
    if (!data || !data.screen) return false;
    try {
      state = Object.assign(freshState(), data);
      if (state.screen === 'casos' && state.topic) {
        renderCases();
        show('casos');
      } else if (state.screen === 'practica' && state.session && state.session.current) {
        show('practica');
        renderExercise(false);
      } else if (state.screen === 'resultados' && state.lastSession) {
        renderResults();
        show('resultados');
      } else {
        show('inicio');
      }
      return true;
    } catch (e) {
      state = freshState();
      return false;
    }
  }

  function start(data) {
    bind();
    if (!restore(data)) show('inicio');
  }

  const hot = root.claude && root.claude.hot;
  if (hot && typeof hot.snapshot === 'function') {
    try {
      hot.snapshot(() => JSON.parse(JSON.stringify(state)));
    } catch (e) {
      /* opcional */
    }
  }
  if (hot && typeof hot.ready === 'function') hot.ready(start);
  else start((hot && hot.data) || {});
})(typeof window !== 'undefined' ? window : globalThis);
