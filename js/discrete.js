/* =========================================================================
 *  Distribuciones discretas: binomial, Poisson e hipergeométrica
 *  Elección guiada, justificación y cálculo
 * ========================================================================= */
(function () {
  'use strict';

  const { $, readNum, niceTicks, lnChoose, lnFact, choose, wireFoldButtons, showError } = window.Calc;
  const dec = () => parseInt($('dDecimals').value, 10);
  const fmt = (v, d = dec()) => window.Calc.fmt(v, d);
  const pct = (p) => fmt(p * 100, Math.max(dec() - 2, 2)) + ' %';
  const isInt = (v) => Number.isInteger(v);

  /* ------------------------------------------------------- distribuciones */
  const DISTS = {
    binom: {
      name: 'Binomial',
      params: ['n', 'p'],
      nLabel: 'Número de ensayos (n)',
      notation: (P) => `X ~ Bin(n = ${P.n}, p = ${P.p})`,
      formula: 'P(X = k) = C(n, k) · p<sup>k</sup> · (1 − p)<sup>n − k</sup>,  k = 0, 1, …, n',
      validate(P) {
        const e = [];
        if (!(isInt(P.n) && P.n >= 1 && P.n <= 1e6)) e.push(['dN', 'n debe ser un entero entre 1 y 1 000 000.']);
        if (!(P.p >= 0 && P.p <= 1)) e.push(['dP', 'p debe estar entre 0 y 1.']);
        return e;
      },
      support: (P) => [0, P.n],
      pmf(k, P) {
        if (k < 0 || k > P.n) return 0;
        if (P.p === 0) return k === 0 ? 1 : 0;
        if (P.p === 1) return k === P.n ? 1 : 0;
        return Math.exp(lnChoose(P.n, k) + k * Math.log(P.p) + (P.n - k) * Math.log(1 - P.p));
      },
      mean: (P) => P.n * P.p,
      variance: (P) => P.n * P.p * (1 - P.p),
      meanStep: (P) => `E[X] = n · p = ${P.n} · ${P.p} = <b>${fmt(P.n * P.p)}</b>`,
      varStep: (P) => `Var(X) = n · p · (1 − p) = ${P.n} · ${P.p} · ${fmt(1 - P.p, 10)} = <b>${fmt(P.n * P.p * (1 - P.p))}</b>`,
      subst(k, P) {
        const q = +(1 - P.p).toPrecision(12);
        return `C(${P.n}, ${k}) · ${P.p}<sup>${k}</sup> · ${q}<sup>${P.n - k}</sup> = ${fmtBig(choose(P.n, k))} · ${fmt(Math.pow(P.p, k), 8)} · ${fmt(Math.pow(q, P.n - k), 8)}`;
      },
      excel: {
        es: (k, P, c) => `DISTR.BINOM.N(${k}; ${P.n}; ${P.p}; ${c ? 'VERDADERO' : 'FALSO'})`,
        en: (k, P, c) => `BINOM.DIST(${k}, ${P.n}, ${P.p}, ${c ? 'TRUE' : 'FALSE'})`,
        mean: (P) => [`=${P.n}*${P.p}`, `=${P.n}*${P.p}*(1-${P.p})`],
      },
      conditions: (P) => [
        `Hay un número <b>fijo</b> de ensayos: n = ${P.n}.`,
        'Cada ensayo tiene solo dos resultados posibles: <b>éxito</b> o <b>fracaso</b>.',
        'Los ensayos son <b>independientes</b> entre sí (con reposición o población muy grande).',
        `La probabilidad de éxito es <b>constante</b> en cada ensayo: p = ${P.p}.`,
        `X cuenta la <b>cantidad de éxitos</b>, por eso toma valores de 0 a ${P.n}.`,
      ],
    },

    poisson: {
      name: 'Poisson',
      params: ['lambda'],
      notation: (P) => `X ~ Poisson(λ = ${P.lambda})`,
      formula: 'P(X = k) = e<sup>−λ</sup> · λ<sup>k</sup> / k!,  k = 0, 1, 2, …',
      validate(P) {
        return P.lambda > 0 && P.lambda <= 1e5 ? [] : [['dLambda', 'λ debe ser un número mayor que 0 (hasta 100 000).']];
      },
      support: () => [0, Infinity],
      pmf: (k, P) => (k < 0 ? 0 : Math.exp(-P.lambda + k * Math.log(P.lambda) - lnFact(k))),
      mean: (P) => P.lambda,
      variance: (P) => P.lambda,
      meanStep: (P) => `E[X] = λ = <b>${fmt(P.lambda)}</b>`,
      varStep: (P) => `Var(X) = λ = <b>${fmt(P.lambda)}</b>  (en la Poisson la media y la varianza son iguales)`,
      subst(k, P) {
        const fact = k <= 20 ? fmtBig(Math.round(Math.exp(lnFact(k)))) : `${k}!`;
        return `e<sup>−${P.lambda}</sup> · ${P.lambda}<sup>${k}</sup> / ${k}! = ${fmt(Math.exp(-P.lambda), 8)} · ${fmtBig(Math.pow(P.lambda, k))} / ${fact}`;
      },
      excel: {
        es: (k, P, c) => `POISSON.DIST(${k}; ${P.lambda}; ${c ? 'VERDADERO' : 'FALSO'})`,
        en: (k, P, c) => `POISSON.DIST(${k}, ${P.lambda}, ${c ? 'TRUE' : 'FALSE'})`,
        mean: (P) => [`=${P.lambda}`, `=${P.lambda}`],
      },
      conditions: (P) => [
        'Se cuentan <b>eventos</b> que ocurren en un intervalo continuo de <b>tiempo o espacio</b>.',
        `Se conoce la <b>tasa promedio</b> de eventos en ese intervalo: λ = ${P.lambda}.`,
        'Los eventos ocurren de forma <b>independiente</b> y la tasa es constante en el intervalo.',
        'Dos eventos no ocurren exactamente en el mismo instante.',
        'No hay un máximo: X puede valer 0, 1, 2, 3, …',
      ],
    },

    hyper: {
      name: 'Hipergeométrica',
      params: ['N', 'K', 'n'],
      nLabel: 'Tamaño de la muestra (n)',
      notation: (P) => `X ~ H(N = ${P.N}, K = ${P.K}, n = ${P.n})`,
      formula: 'P(X = k) = C(K, k) · C(N − K, n − k) / C(N, n)',
      validate(P) {
        const e = [];
        if (!(isInt(P.N) && P.N >= 1 && P.N <= 1e7)) e.push(['dPopN', 'N debe ser un entero mayor o igual a 1.']);
        if (!(isInt(P.K) && P.K >= 0 && P.K <= P.N)) e.push(['dPopK', 'K debe ser un entero entre 0 y N.']);
        if (!(isInt(P.n) && P.n >= 1 && P.n <= P.N)) e.push(['dN', 'n debe ser un entero entre 1 y N (no se puede sacar más de lo que hay).']);
        return e;
      },
      support: (P) => [Math.max(0, P.n - (P.N - P.K)), Math.min(P.n, P.K)],
      pmf(k, P) {
        const [lo, hi] = DISTS.hyper.support(P);
        if (k < lo || k > hi) return 0;
        return Math.exp(lnChoose(P.K, k) + lnChoose(P.N - P.K, P.n - k) - lnChoose(P.N, P.n));
      },
      mean: (P) => P.n * P.K / P.N,
      variance: (P) => (P.N === 1 ? 0 : P.n * (P.K / P.N) * (1 - P.K / P.N) * (P.N - P.n) / (P.N - 1)),
      meanStep: (P) => `E[X] = n · K / N = ${P.n} · ${P.K} / ${P.N} = <b>${fmt(P.n * P.K / P.N)}</b>`,
      varStep: (P) => `Var(X) = n · (K/N) · (1 − K/N) · (N − n)/(N − 1) = ${P.n} · ${fmt(P.K / P.N)} · ${fmt(1 - P.K / P.N)} · ${P.N - P.n}/${P.N - 1} = <b>${fmt(DISTS.hyper.variance(P))}</b>`,
      subst: (k, P) => `C(${P.K}, ${k}) · C(${P.N - P.K}, ${P.n - k}) / C(${P.N}, ${P.n}) = ${fmtBig(choose(P.K, k))} · ${fmtBig(choose(P.N - P.K, P.n - k))} / ${fmtBig(choose(P.N, P.n))}`,
      excel: {
        es: (k, P, c) => `DISTR.HIPERGEOM.N(${k}; ${P.n}; ${P.K}; ${P.N}; ${c ? 'VERDADERO' : 'FALSO'})`,
        en: (k, P, c) => `HYPGEOM.DIST(${k}, ${P.n}, ${P.K}, ${P.N}, ${c ? 'TRUE' : 'FALSE'})`,
        mean: (P) => [`=${P.n}*${P.K}/${P.N}`, `=${P.n}*(${P.K}/${P.N})*(1-${P.K}/${P.N})*(${P.N}-${P.n})/(${P.N}-1)`],
      },
      conditions: (P) => [
        `Hay una <b>población finita</b> de N = ${P.N} elementos, de los cuales K = ${P.K} son "éxitos".`,
        `Se toma una muestra de n = ${P.n} elementos <b>sin reposición</b>.`,
        'Como no se repone, la probabilidad de éxito <b>cambia</b> en cada extracción: los ensayos no son independientes (por eso no es binomial).',
        `X cuenta los <b>éxitos en la muestra</b>; sus valores posibles van de ${DISTS.hyper.support(P)[0]} a ${DISTS.hyper.support(P)[1]}.`,
      ],
    },
  };

  const EXAMPLES = {
    binom: {
      P: { n: 10, p: 0.3 }, type: 'ge', k: 3,
      text: 'El 30 % de los clientes que entran a un local compra algo. Si entran 10 clientes, ¿cuál es la probabilidad de que <b>al menos 3</b> compren?',
    },
    poisson: {
      P: { lambda: 4 }, type: 'le', k: 2,
      text: 'A una central llegan en promedio 4 llamadas por minuto. ¿Cuál es la probabilidad de que en un minuto lleguen <b>como máximo 2</b> llamadas?',
    },
    hyper: {
      P: { N: 50, K: 10, n: 5 }, type: 'eq', k: 2,
      text: 'En un lote de 50 piezas hay 10 defectuosas. Se eligen 5 al azar sin reposición. ¿Cuál es la probabilidad de que <b>exactamente 2</b> sean defectuosas?',
    },
  };

  const TYPE_TEXT = {
    eq: (e) => `sea exactamente ${e.k}`,
    le: (e) => `sea como máximo ${e.k}`,
    lt: (e) => `sea menor que ${e.k}`,
    ge: (e) => `sea al menos ${e.k}`,
    gt: (e) => `sea mayor que ${e.k}`,
    between: (e) => `esté entre ${e.a} y ${e.b} (inclusive)`,
  };

  const state = { dist: 'binom', q1: null, q2: null, last: null };

  function fmtBig(v) {
    if (!Number.isFinite(v)) return '∞';
    if (Math.abs(v) >= 1e15) return v.toExponential(4).replace('e+', '·10^');
    return Number.isInteger(v) ? String(v) : fmt(v, 6);
  }

  /* ------------------------------------------------------- elección guiada */
  function recommended() {
    if (state.q1 === 'eventos') return 'poisson';
    if (state.q1 === 'exitos' && state.q2 === 'indep') return 'binom';
    if (state.q1 === 'exitos' && state.q2 === 'sinrep') return 'hyper';
    return null;
  }

  function renderChooser() {
    document.querySelectorAll('#discCalc .choice-grid').forEach((g) => {
      const val = state[g.dataset.q];
      g.querySelectorAll('.choice').forEach((c) => c.classList.toggle('active', c.dataset.value === val));
    });
    $('q2Box').hidden = state.q1 !== 'exitos';
    const rec = recommended();
    const box = $('dRecommend');
    if (!rec) {
      box.hidden = state.q1 !== 'exitos';
      box.innerHTML = state.q1 === 'exitos' ? 'Respondé la segunda pregunta para decidir entre <b>binomial</b> e <b>hipergeométrica</b>.' : '';
      return;
    }
    const why = {
      binom: 'X cuenta éxitos en un número fijo de ensayos independientes, con la misma probabilidad de éxito en cada uno.',
      poisson: 'X cuenta eventos en un intervalo continuo (tiempo o espacio) y se conoce la tasa promedio λ.',
      hyper: 'X cuenta éxitos en una muestra tomada sin reposición de una población finita, por lo que la probabilidad cambia en cada extracción.',
    }[rec];
    box.hidden = false;
    box.innerHTML = `<div class="rec-name">Recomendación: <b>${DISTS[rec].name}</b></div><div>${why}</div>` +
      `<div class="muted small">Ya la seleccioné abajo ↓. Completá los parámetros y calculá.</div>`;
  }

  /* ------------------------------------------------------- formulario */
  function readParams() {
    return { n: readNum('dN'), p: readNum('dP'), lambda: readNum('dLambda'), N: readNum('dPopN'), K: readNum('dPopK') };
  }

  function setDist(name) {
    state.dist = name;
    const D = DISTS[name];
    document.querySelectorAll('#dDistTabs .mode-btn').forEach((b) => b.classList.toggle('active', b.dataset.dist === name));
    document.querySelectorAll('[data-dparam]').forEach((el) => { el.hidden = !D.params.includes(el.dataset.dparam); });
    if (D.nLabel) $('dNLabel').textContent = D.nLabel;
    $('dFormula').innerHTML = `<b>${D.name}:</b> ${D.formula}`;
    $('dExampleText').hidden = true;
    run();
  }

  function syncTypeFields() {
    const between = $('dType').value === 'between';
    document.querySelectorAll('[data-dk]').forEach((el) => { el.hidden = (el.dataset.dk === 'ab') !== between; });
  }

  function readEvent() {
    const type = $('dType').value;
    if (type === 'between') return { type, a: readNum('dA'), b: readNum('dB') };
    return { type, k: readNum('dK') };
  }

  function validate() {
    const D = DISTS[state.dist];
    const P = readParams();
    const errs = D.validate(P);
    const ev = readEvent();
    if (ev.type === 'between') {
      if (!isInt(ev.a)) errs.push(['dA', 'a debe ser un número entero.']);
      if (!isInt(ev.b)) errs.push(['dB', 'b debe ser un número entero.']);
      if (isInt(ev.a) && isInt(ev.b) && ev.a > ev.b) errs.push(['dA', 'a debe ser menor o igual que b.']);
      if (Math.abs(ev.a) > 1e6 || Math.abs(ev.b) > 1e6) errs.push(['dB', 'Los valores deben estar entre −1 000 000 y 1 000 000.']);
    } else if (!isInt(ev.k) || Math.abs(ev.k) > 1e6) {
      errs.push(['dK', 'k debe ser un número entero (los valores de una variable discreta se cuentan: 0, 1, 2, …).']);
    }
    ['dN', 'dP', 'dLambda', 'dPopN', 'dPopK', 'dK', 'dA', 'dB'].forEach((id) => $(id).classList.toggle('invalid', errs.some((e) => e[0] === id)));
    return errs.length ? { error: [...new Set(errs.map((e) => e[1]))].join(' ') } : { P, ev };
  }

  /* ------------------------------------------------------- cálculo */
  function sumPmf(D, P, a, b) {
    let s = 0;
    for (let k = a; k <= b; k++) s += D.pmf(k, P);
    return s;
  }

  function compute(P, ev) {
    const D = DISTS[state.dist];
    const [lo, hi] = D.support(P);
    let a, b;
    switch (ev.type) {
      case 'eq': a = b = ev.k; break;
      case 'le': a = -Infinity; b = ev.k; break;
      case 'lt': a = -Infinity; b = ev.k - 1; break;
      case 'ge': a = ev.k; b = Infinity; break;
      case 'gt': a = ev.k + 1; b = Infinity; break;
      default: a = ev.a; b = ev.b;
    }
    const ea = Math.max(a, lo), eb = Math.min(b, hi);
    const empty = ea > eb;
    // usar el complemento cuando hay menos términos o la cola es infinita
    let complement = false, prob;
    if (empty) prob = 0;
    else if (eb === Infinity || (eb === hi && ea > lo && ea - lo < eb - ea)) {
      complement = true;
      prob = ea <= lo ? 1 : 1 - sumPmf(D, P, lo, ea - 1);
    } else prob = sumPmf(D, P, ea, eb);
    prob = Math.min(Math.max(prob, 0), 1);

    const mean = D.mean(P), variance = D.variance(P), sd = Math.sqrt(variance);
    return { D, P, ev, lo, hi, a, b, ea, eb, empty, complement, prob, mean, variance, sd };
  }

  function eventLabel(ev) {
    return {
      eq: `P(X = ${ev.k})`, le: `P(X ≤ ${ev.k})`, lt: `P(X < ${ev.k})`, ge: `P(X ≥ ${ev.k})`, gt: `P(X > ${ev.k})`,
      between: `P(${ev.a} ≤ X ≤ ${ev.b})`,
    }[ev.type];
  }

  function displayRange(r) {
    let dl = r.lo, dh = r.hi;
    const spread = Math.max(5 * r.sd, 6);
    if (dh === Infinity || dh - dl > 60) {
      dl = Math.max(r.lo, Math.floor(r.mean - spread));
      dh = Math.min(r.hi, Math.ceil(r.mean + spread));
    }
    [r.a, r.b].forEach((v) => {
      if (Number.isFinite(v) && v >= r.lo && v <= r.hi) { dl = Math.min(dl, v); dh = Math.max(dh, v); }
    });
    if (dh - dl > 160) { // demasiadas barras: centrar en la media
      dl = Math.max(r.lo, Math.round(r.mean - 80));
      dh = dl + 160;
    }
    return [dl, Math.min(dh, r.hi)];
  }

  /* ------------------------------------------------------- render */
  function render(r) {
    const { D, P, ev } = r;
    $('dResult').hidden = false;
    $('dMain').textContent = `${eventLabel(ev)} = ${fmt(r.prob)}`;
    $('dPct').textContent = pct(r.prob);
    $('dSub').textContent = `${D.notation(P)} · E[X] = ${fmt(r.mean)} · σ = ${fmt(r.sd)}`;
    $('dExplanation').textContent =
      `Si ${D.notation(P)}, la probabilidad de que X ${TYPE_TEXT[ev.type](ev)} es ${fmt(r.prob)} (${pct(r.prob)}). ` +
      `En promedio se espera E[X] = ${fmt(r.mean)}.`;

    // avisos
    const warns = [];
    const rec = recommended();
    if (rec && rec !== state.dist) warns.push(`Según tus respuestas del paso 1, la distribución adecuada sería la <b>${DISTS[rec].name}</b>, pero estás calculando con la <b>${D.name}</b>.`);
    if (r.empty) warns.push(`Ningún valor posible de X cumple la condición (X solo puede valer ${r.lo}${r.hi === Infinity ? ', ' + (r.lo + 1) + ', …' : ' a ' + r.hi}), por eso la probabilidad es 0.`);
    $('dWarn').innerHTML = warns.join('<br>');
    $('dWarn').hidden = !warns.length;

    renderJustification(r);
    renderMeasures(r);
    renderTable(r);
    renderSteps(r);
    renderExcel(r);
    drawChart(r);
  }

  function renderJustification(r) {
    const { D, P } = r;
    let html = `<p>Usamos la distribución <b>${D.name}</b>, ${D.notation(P)}, porque se cumplen sus condiciones:</p><ul class="checks">` +
      D.conditions(P).map((c) => `<li>${c}</li>`).join('') + '</ul>';
    if (state.q1) {
      const a1 = state.q1 === 'exitos' ? 'X cuenta éxitos en n ensayos o elementos' : 'X cuenta eventos en un intervalo';
      const a2 = state.q2 === 'indep' ? ', con ensayos independientes y p constante' : state.q2 === 'sinrep' ? ', elegidos sin reposición de una población finita' : '';
      html += `<p class="muted small">Tus respuestas: ${a1}${state.q1 === 'exitos' ? a2 : ''}.</p>`;
    }
    // aproximaciones
    const approx = [];
    if (state.dist === 'binom' && P.n >= 20 && P.p <= 0.05) {
      const lam = P.n * P.p;
      const save = state.dist; state.dist = 'poisson';
      const pa = compute({ lambda: lam }, r.ev).prob; state.dist = save;
      approx.push(`Como n = ${P.n} ≥ 20 y p = ${P.p} ≤ 0,05, se puede <b>aproximar con Poisson</b> de λ = n·p = ${fmt(lam)}: daría ${fmt(pa)} (valor exacto binomial: ${fmt(r.prob)}).`);
    }
    if (state.dist === 'hyper' && P.n / P.N <= 0.05) {
      const save = state.dist; state.dist = 'binom';
      const pa = compute({ n: P.n, p: P.K / P.N }, r.ev).prob; state.dist = save;
      approx.push(`Como la muestra es chica respecto de la población (n/N = ${fmt(P.n / P.N)} ≤ 0,05), se puede <b>aproximar con una binomial</b> de n = ${P.n} y p = K/N = ${fmt(P.K / P.N)}: daría ${fmt(pa)} (valor exacto: ${fmt(r.prob)}).`);
    }
    if (approx.length) html += `<h3 class="code-title">Aproximación</h3><p>${approx.join('<br>')}</p>`;
    $('dJustification').innerHTML = html;
  }

  function renderMeasures(r) {
    const [dl, dh] = displayRange(r);
    let mode = dl, best = -1;
    for (let k = dl; k <= dh; k++) { const v = r.D.pmf(k, r.P); if (v > best + 1e-15) { best = v; mode = k; } }
    const sup = r.hi === Infinity ? `${r.lo}, ${r.lo + 1}, ${r.lo + 2}, …` : `${r.lo}, ${r.lo + 1}, …, ${r.hi}`;
    $('dMeasures').innerHTML = [
      ['Valor esperado E[X]', fmt(r.mean)], ['Varianza Var(X)', fmt(r.variance)], ['Desviación estándar σ', fmt(r.sd)],
      ['Coeficiente de variación σ / E[X]', r.mean ? fmt(r.sd / r.mean) : '—'], ['Moda (valor más probable)', `${mode}  (P = ${fmt(best)})`],
      ['Valores posibles', r.hi - r.lo <= 4 && r.hi !== Infinity ? [...Array(r.hi - r.lo + 1)].map((_, i) => r.lo + i).join(', ') : sup],
    ].map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('');
  }

  function renderTable(r) {
    const [dl, dh] = displayRange(r);
    let cum = dl > r.lo ? sumPmf(r.D, r.P, r.lo, dl - 1) : 0;
    let rows = '';
    for (let k = dl; k <= dh; k++) {
      const v = r.D.pmf(k, r.P);
      const before = cum;
      cum += v;
      const inEv = !r.empty && k >= r.ea && k <= r.eb;
      rows += `<tr class="${inEv ? 'current' : ''}"><td>${k}</td><td>${fmt(v)}</td><td>${fmt(Math.min(cum, 1))}</td><td>${fmt(Math.max(1 - before, 0))}</td></tr>`;
    }
    const note = (dl > r.lo || dh < r.hi) ? `<caption class="muted small">Se muestran k = ${dl} a ${dh}; fuera de ese rango las probabilidades son prácticamente 0.</caption>` : '';
    $('dTable').innerHTML = note + '<thead><tr><th>k</th><th>P(X = k)</th><th>P(X ≤ k)</th><th>P(X ≥ k)</th></tr></thead><tbody>' + rows + '</tbody>';
  }

  function renderSteps(r) {
    const { D, P, ev } = r;
    const steps = [
      `Distribución: ${D.notation(P)}`,
      `Fórmula: ${D.formula}`,
    ];
    const term = (k) => `P(X = ${k})`;
    const listTerms = (a, b) => {
      const n = b - a + 1;
      if (n <= 6) {
        const ks = [...Array(n)].map((_, i) => a + i);
        return { names: ks.map(term).join(' + '), values: ks.map((k) => fmt(D.pmf(k, P))).join(' + ') };
      }
      return { names: `${term(a)} + ${term(a + 1)} + … + ${term(b)}`, values: `${fmt(D.pmf(a, P))} + ${fmt(D.pmf(a + 1, P))} + … + ${fmt(D.pmf(b, P))}` };
    };

    if (r.empty) {
      steps.push(`Ningún valor de X cumple la condición, entonces ${eventLabel(ev)} = <b>0</b>`);
    } else if (r.ea === r.eb) {
      if (ev.type !== 'eq') steps.push(`${eventLabel(ev)} = ${term(r.ea)}`);
      steps.push(`${term(r.ea)} = ${D.subst(r.ea, P)} = <b>${fmt(D.pmf(r.ea, P))}</b>`);
    } else if (r.complement) {
      if (r.ea <= r.lo) {
        steps.push(`${eventLabel(ev)} abarca todos los valores posibles, entonces vale <b>1</b>`);
      } else {
        const t = listTerms(r.lo, r.ea - 1);
        const c = sumPmf(D, P, r.lo, r.ea - 1);
        steps.push(`Usamos el complemento: ${eventLabel(ev)} = 1 − P(X ≤ ${r.ea - 1})`);
        steps.push(`P(X ≤ ${r.ea - 1}) = ${t.names}`);
        steps.push(`Cada término con la fórmula, por ejemplo ${term(r.lo)} = ${D.subst(r.lo, P)} = ${fmt(D.pmf(r.lo, P))}`);
        steps.push(`P(X ≤ ${r.ea - 1}) = ${t.values} = ${fmt(c)}`);
        steps.push(`${eventLabel(ev)} = 1 − ${fmt(c)} = <b>${fmt(r.prob)}</b>`);
      }
    } else {
      const t = listTerms(r.ea, r.eb);
      if (ev.type !== 'between' || r.ea !== ev.a || r.eb !== ev.b) steps.push(`Valores de X que cumplen la condición: ${r.ea} a ${r.eb}`);
      steps.push(`${eventLabel(ev)} = ${t.names}`);
      steps.push(`Cada término con la fórmula, por ejemplo ${term(r.ea)} = ${D.subst(r.ea, P)} = ${fmt(D.pmf(r.ea, P))}`);
      steps.push(`${eventLabel(ev)} = ${t.values} = <b>${fmt(r.prob)}</b>`);
    }
    steps.push(D.meanStep(P));
    steps.push(D.varStep(P) + `;  σ = √Var(X) = <b>${fmt(r.sd)}</b>`);
    $('dSteps').innerHTML = steps.map((s) => `<li>${s}</li>`).join('');
  }

  function renderExcel(r) {
    const { D, P } = r;
    const build = (loc) => {
      const pmf = (k) => D.excel[loc](k, P, false);
      const cdf = (k) => D.excel[loc](k, P, true);
      let f;
      if (r.empty) f = '=0';
      else if (r.ea === r.eb) f = `=${pmf(r.ea)}`;
      else if (r.ea <= r.lo && r.eb >= r.hi) f = '=1';
      else if (r.ea <= r.lo) f = `=${cdf(r.eb)}`;
      else if (r.eb >= r.hi) f = `=1 - ${cdf(r.ea - 1)}`;
      else f = `=${cdf(r.eb)} - ${cdf(r.ea - 1)}`;
      const [m, v] = D.excel.mean(P);
      const lbl = loc === 'es' ? ['Probabilidad', 'Valor esperado', 'Varianza', 'Desvío estándar', 'RAIZ'] : ['Probability', 'Expected value', 'Variance', 'Standard deviation', 'SQRT'];
      return `${lbl[0]}:   ${f}\n${lbl[1]}:   ${m}\n${lbl[2]}:   ${v}\n${lbl[3]}:   =${lbl[4]}(${v.slice(1)})`;
    };
    $('dExcelEs').textContent = build('es');
    $('dExcelEn').textContent = build('en');
  }

  function drawChart(r) {
    const [dl, dh] = displayRange(r);
    const count = dh - dl + 1;
    const W = 800, L = 58, R = 20, T = 30, H = 340, base = H - 50;
    const plotW = W - L - R, plotH = base - T;
    const vals = [];
    let vmax = 0;
    for (let k = dl; k <= dh; k++) { const v = r.D.pmf(k, r.P); vals.push(v); vmax = Math.max(vmax, v); }
    const yMax = (vmax || 1) * 1.15;
    const Y = (v) => base - v / yMax * plotH;
    const slot = plotW / count;
    const X = (k) => L + (k - dl + 0.5) * slot;
    const bw = Math.min(slot * 0.72, 46);
    const font = 'font-family="Segoe UI, Arial, sans-serif"';
    let s = `<defs><linearGradient id="dGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7c3aed"/><stop offset="1" stop-color="#a78bfa"/></linearGradient></defs><rect width="${W}" height="${H}" fill="#fff"/>`;
    niceTicks(0, yMax, 5).forEach((t) => {
      if (t > yMax) return;
      s += `<line x1="${L}" y1="${Y(t)}" x2="${W - R}" y2="${Y(t)}" stroke="#eef0f3"/>`;
      s += `<text x="${L - 8}" y="${Y(t) + 4}" text-anchor="end" font-size="12" fill="#6b7280" ${font}>${window.Calc.fmt(t, 4)}</text>`;
    });
    const labelEvery = count <= 30 ? 1 : Math.ceil(count / 25);
    vals.forEach((v, i) => {
      const k = dl + i;
      const inEv = !r.empty && k >= r.ea && k <= r.eb;
      s += `<rect x="${X(k) - bw / 2}" y="${Y(v)}" width="${bw}" height="${Math.max(base - Y(v), 0)}" rx="${Math.min(4, bw / 4)}" fill="${inEv ? 'url(#dGrad)' : '#d9d6e3'}"><title>P(X = ${k}) = ${fmt(v)}</title></rect>`;
      if (count <= 16 && v > 0) s += `<text x="${X(k)}" y="${Y(v) - 6}" text-anchor="middle" font-size="11.5" fill="${inEv ? '#5b21b6' : '#6b7280'}" font-weight="${inEv ? 700 : 400}" ${font}>${window.Calc.fmt(v, 3)}</text>`;
      if (i % labelEvery === 0) s += `<text x="${X(k)}" y="${base + 18}" text-anchor="middle" font-size="12" fill="#374151" ${font}>${k}</text>`;
    });
    s += `<line x1="${L}" y1="${base}" x2="${W - R}" y2="${base}" stroke="#6b7280"/>`;
    s += `<text x="${L + plotW / 2}" y="${H - 8}" text-anchor="middle" font-size="12.5" fill="#6b7280" ${font}>k</text>`;
    // valor esperado
    if (r.mean >= dl - 0.5 && r.mean <= dh + 0.5) {
      const mx = L + (r.mean - dl + 0.5) * slot;
      s += `<line x1="${mx}" y1="${T - 6}" x2="${mx}" y2="${base}" stroke="#2563eb" stroke-width="1.5" stroke-dasharray="5,4"/>`;
      s += `<text x="${mx}" y="${T - 12}" text-anchor="middle" font-size="12.5" font-weight="700" fill="#2563eb" ${font}>E[X] = ${fmt(r.mean)}</text>`;
    }
    const svg = $('dChart');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.innerHTML = s;
  }

  /* ------------------------------------------------------- control */
  function run(showErrors = false) {
    const v = validate();
    if (v.error) { if (showErrors) showError('dError', v.error); return false; }
    showError('dError', '');
    state.last = compute(v.P, v.ev);
    render(state.last);
    return true;
  }

  function loadExample() {
    const ex = EXAMPLES[state.dist];
    const map = { n: 'dN', p: 'dP', lambda: 'dLambda', N: 'dPopN', K: 'dPopK' };
    Object.entries(ex.P).forEach(([k, v]) => { $(map[k]).value = v; });
    $('dType').value = ex.type;
    $('dK').value = ex.k;
    syncTypeFields();
    state.q1 = state.dist === 'poisson' ? 'eventos' : 'exitos';
    state.q2 = state.dist === 'binom' ? 'indep' : state.dist === 'hyper' ? 'sinrep' : null;
    renderChooser();
    $('dExampleText').innerHTML = `<b>Ejemplo:</b> ${ex.text}`;
    $('dExampleText').hidden = false;
    run(true);
  }

  function init() {
    document.querySelectorAll('#discCalc .choice-grid').forEach((g) => g.querySelectorAll('.choice').forEach((c) => c.addEventListener('click', () => {
      state[g.dataset.q] = c.dataset.value;
      if (g.dataset.q === 'q1' && c.dataset.value !== 'exitos') state.q2 = null;
      renderChooser();
      const rec = recommended();
      if (rec) setDist(rec); else run();
    })));
    document.querySelectorAll('#dDistTabs .mode-btn').forEach((b) => b.addEventListener('click', () => setDist(b.dataset.dist)));
    ['dN', 'dP', 'dLambda', 'dPopN', 'dPopK', 'dK', 'dA', 'dB'].forEach((id) => {
      $(id).addEventListener('input', () => run());
      $(id).addEventListener('keydown', (e) => { if (e.key === 'Enter') run(true); });
    });
    $('dType').addEventListener('change', () => { syncTypeFields(); run(); });
    $('dDecimals').addEventListener('change', () => run());
    $('dCalcBtn').addEventListener('click', () => { if (run(true)) $('dResult').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    $('dClearBtn').addEventListener('click', () => {
      ['dK', 'dA', 'dB'].forEach((id) => { $(id).value = ''; });
      state.q1 = state.q2 = null; renderChooser();
      $('dResult').hidden = true; $('dExampleText').hidden = true; showError('dError', '');
    });
    $('dExampleBtn').addEventListener('click', loadExample);
    wireFoldButtons('dExpandAll', 'dCollapseAll', 'dResult');
    document.addEventListener('calc:show', (e) => { if (e.detail === 'disc') run(); });
    syncTypeFields();
    renderChooser();
    setDist('binom');
  }

  document.addEventListener('DOMContentLoaded', init);
})();
