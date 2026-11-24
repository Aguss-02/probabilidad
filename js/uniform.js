/* =========================================================================
 *  Distribución uniforme (continua y discreta)
 * ========================================================================= */
(function () {
  'use strict';

  const { $, readNum, niceTicks, wireFoldButtons, showError } = window.Calc;
  const dec = () => parseInt($('uDecimals').value, 10);
  const fmt = (v, d = dec()) => window.Calc.fmt(v, d);
  const pct = (p) => fmt(p * 100, Math.max(dec() - 2, 2)) + ' %';
  const num = (v) => String(+v.toPrecision(12));

  const TYPES = {
    cont: [
      ['le', 'P(X ≤ x)'], ['ge', 'P(X ≥ x)'], ['between', 'P(x₁ ≤ X ≤ x₂)'],
      ['inv', 'x dado P(X ≤ x)  · percentil'], ['dens', 'Densidad f(x)'],
    ],
    disc: [
      ['eq', 'P(X = k)'], ['le', 'P(X ≤ k)'], ['lt', 'P(X < k)'], ['ge', 'P(X ≥ k)'], ['gt', 'P(X > k)'], ['between', 'P(k₁ ≤ X ≤ k₂)'],
    ],
  };

  const EXAMPLES = {
    cont: { a: 0, b: 10, type: 'between', x1: 3, x2: 7, text: 'Un colectivo pasa cada 10 minutos y llegás a la parada en un momento al azar. ¿Cuál es la probabilidad de esperar <b>entre 3 y 7 minutos</b>?' },
    disc: { a: 1, b: 6, type: 'ge', x1: 5, text: 'Se tira un dado equilibrado. ¿Cuál es la probabilidad de sacar <b>al menos un 5</b>?' },
  };

  const state = { kind: 'cont', last: null };

  /* ---------------------------------------------------------- formulario */
  function setKind(kind) {
    state.kind = kind;
    document.querySelectorAll('#uKindTabs .mode-btn').forEach((b) => b.classList.toggle('active', b.dataset.ukind === kind));
    const prev = $('uType').value;
    $('uType').innerHTML = TYPES[kind].map(([v, l]) => `<option value="${v}">${l}</option>`).join('');
    if (TYPES[kind].some(([v]) => v === prev)) $('uType').value = prev;
    ['uA', 'uB', 'uX1', 'uX2'].forEach((id) => { $(id).step = kind === 'disc' ? '1' : 'any'; });
    $('uExampleText').hidden = true;
    syncFields();
    liveUpdate();
  }

  /** Después del primer "Calcular", los cambios se recalculan al instante. */
  const liveUpdate = () => { if ($('uResult').dataset.started) run(); };

  function syncFields() {
    const t = $('uType').value;
    const show = { x1: t !== 'inv', x2: t === 'between', p: t === 'inv' };
    document.querySelectorAll('[data-ushow]').forEach((el) => { el.hidden = !show[el.dataset.ushow]; });
    const k = state.kind === 'disc';
    $('uX1Label').textContent = t === 'between' ? (k ? 'Desde (k₁)' : 'Valor inferior (x₁)') : (k ? 'Valor (k)' : 'Valor (x)');
  }

  function validate() {
    const a = readNum('uA'), b = readNum('uB'), x1 = readNum('uX1'), x2 = readNum('uX2'), p = readNum('uP');
    const t = $('uType').value, disc = state.kind === 'disc';
    const errs = [];
    if (!Number.isFinite(a)) errs.push(['uA', 'Ingresá el mínimo a.']);
    if (!Number.isFinite(b)) errs.push(['uB', 'Ingresá el máximo b.']);
    if (Number.isFinite(a) && Number.isFinite(b) && !(a < b)) errs.push(['uB', 'El máximo b tiene que ser mayor que el mínimo a.']);
    if (disc && (!Number.isInteger(a) || !Number.isInteger(b))) errs.push(['uA', 'En la uniforme discreta a y b deben ser enteros.']);
    if (disc && Number.isInteger(a) && Number.isInteger(b) && b - a > 1e6) errs.push(['uB', 'El rango es demasiado grande.']);
    if (t !== 'inv' && !Number.isFinite(x1)) errs.push(['uX1', 'Ingresá el valor.']);
    if (t === 'between' && !Number.isFinite(x2)) errs.push(['uX2', 'Ingresá el valor superior.']);
    if (t === 'between' && x1 > x2) errs.push(['uX1', 'El valor inferior debe ser menor o igual que el superior.']);
    if (disc && t !== 'inv' && ((Number.isFinite(x1) && !Number.isInteger(x1)) || (t === 'between' && Number.isFinite(x2) && !Number.isInteger(x2)))) errs.push(['uX1', 'En la discreta los valores deben ser enteros.']);
    if (t === 'inv' && !(p >= 0 && p <= 1)) errs.push(['uP', 'La probabilidad debe estar entre 0 y 1.']);
    ['uA', 'uB', 'uX1', 'uX2', 'uP'].forEach((id) => $(id).classList.toggle('invalid', errs.some((e) => e[0] === id)));
    return errs.length ? { error: [...new Set(errs.map((e) => e[1]))].join(' ') } : { a, b, x1, x2, p, t };
  }

  /* ---------------------------------------------------------- cálculo */
  function computeCont({ a, b, x1, x2, p, t }) {
    const L = b - a;
    const F = (x) => Math.min(Math.max((x - a) / L, 0), 1);
    const r = { kind: 'cont', a, b, t, x1, x2, p, L, f: 1 / L };
    r.mean = (a + b) / 2; r.variance = L * L / 12; r.sd = Math.sqrt(r.variance);
    switch (t) {
      case 'le': r.prob = F(x1); r.region = [a, Math.min(Math.max(x1, a), b)]; r.markers = [x1]; break;
      case 'ge': r.prob = 1 - F(x1); r.region = [Math.min(Math.max(x1, a), b), b]; r.markers = [x1]; break;
      case 'between': r.prob = F(x2) - F(x1); r.region = [Math.min(Math.max(x1, a), b), Math.min(Math.max(x2, a), b)]; r.markers = [x1, x2]; break;
      case 'inv': r.x = a + p * L; r.prob = p; r.region = [a, r.x]; r.markers = [r.x]; break;
      default: r.dens = x1 >= a && x1 <= b ? 1 / L : 0; r.region = null; r.markers = [x1];
    }
    return r;
  }

  function computeDisc({ a, b, x1, x2, t }) {
    const m = b - a + 1;
    const r = { kind: 'disc', a, b, t, x1, x2, m };
    r.mean = (a + b) / 2; r.variance = (m * m - 1) / 12; r.sd = Math.sqrt(r.variance);
    let lo, hi;
    switch (t) {
      case 'eq': lo = hi = x1; break;
      case 'le': lo = a; hi = x1; break;
      case 'lt': lo = a; hi = x1 - 1; break;
      case 'ge': lo = x1; hi = b; break;
      case 'gt': lo = x1 + 1; hi = b; break;
      default: lo = x1; hi = x2;
    }
    r.ea = Math.max(lo, a); r.eb = Math.min(hi, b);
    r.count = Math.max(0, r.eb - r.ea + 1);
    r.prob = r.count / m;
    r.markers = t === 'between' ? [x1, x2] : [x1];
    return r;
  }

  function label(r) {
    if (r.kind === 'disc') {
      return { eq: `P(X = ${r.x1})`, le: `P(X ≤ ${r.x1})`, lt: `P(X < ${r.x1})`, ge: `P(X ≥ ${r.x1})`, gt: `P(X > ${r.x1})`, between: `P(${r.x1} ≤ X ≤ ${r.x2})` }[r.t];
    }
    return { le: `P(X ≤ ${fmt(r.x1)})`, ge: `P(X ≥ ${fmt(r.x1)})`, between: `P(${fmt(r.x1)} ≤ X ≤ ${fmt(r.x2)})`, inv: 'x', dens: `f(${fmt(r.x1)})` }[r.t];
  }

  /* ---------------------------------------------------------- render */
  function render(r) {
    const notation = r.kind === 'cont' ? `X ~ U(${fmt(r.a)}, ${fmt(r.b)})` : `X ~ U{${r.a}, …, ${r.b}}`;
    $('uResult').hidden = false;
    if (r.t === 'inv') {
      $('uMain').textContent = `x = ${fmt(r.x)}`;
      $('uPct').textContent = `P(X ≤ x) = ${fmt(r.p)} · percentil ${fmt(r.p * 100, 2)}`;
    } else if (r.t === 'dens') {
      $('uMain').textContent = `f(${fmt(r.x1)}) = ${fmt(r.dens)}`;
      $('uPct').textContent = r.dens ? 'La densidad es constante dentro de [a, b]' : 'x está fuera de [a, b]: la densidad es 0';
    } else {
      $('uMain').textContent = `${label(r)} = ${fmt(r.prob)}`;
      $('uPct').textContent = pct(r.prob);
    }
    $('uSub').textContent = `${notation} · E[X] = ${fmt(r.mean)} · Var(X) = ${fmt(r.variance)} · σ = ${fmt(r.sd)}`;

    let ex;
    if (r.kind === 'cont') {
      ex = {
        le: `la probabilidad de que X sea menor o igual que ${fmt(r.x1)} es ${fmt(r.prob)} (${pct(r.prob)})`,
        ge: `la probabilidad de que X sea mayor o igual que ${fmt(r.x1)} es ${fmt(r.prob)} (${pct(r.prob)})`,
        between: `la probabilidad de que X esté entre ${fmt(r.x1)} y ${fmt(r.x2)} es ${fmt(r.prob)} (${pct(r.prob)})`,
        inv: `el ${fmt(r.p * 100, 2)} % de los valores son menores o iguales que ${fmt(r.x)}`,
        dens: `la densidad en x = ${fmt(r.x1)} vale ${fmt(r.dens)} (recordá que la densidad no es una probabilidad: P(X = x) = 0)`,
      }[r.t];
    } else {
      ex = `de los ${r.m} valores posibles, ${r.count} cumplen la condición, por lo que ${label(r)} = ${r.count}/${r.m} = ${fmt(r.prob)} (${pct(r.prob)})`;
    }
    $('uExplanation').textContent = `Si ${notation}, ${ex}. El valor esperado es E[X] = (a + b)/2 = ${fmt(r.mean)}.`;

    renderMeasures(r);
    renderSteps(r);
    renderExcel(r);
    drawChart(r);
  }

  function renderMeasures(r) {
    const rows = [
      ['Valor esperado E[X] = (a + b)/2', fmt(r.mean)], ['Mediana', fmt(r.mean)],
      ['Varianza Var(X)', fmt(r.variance)], ['Desviación estándar σ', fmt(r.sd)],
    ];
    if (r.kind === 'cont') {
      rows.push(['Densidad f(x) en [a, b]', fmt(1 / r.L)], ['Longitud del intervalo b − a', fmt(r.L)],
        ['Q1 (percentil 25)', fmt(r.a + 0.25 * r.L)], ['Q3 (percentil 75)', fmt(r.a + 0.75 * r.L)]);
    } else {
      rows.push(['Cantidad de valores posibles m = b − a + 1', r.m], ['P(X = k) para cada valor', `1/${r.m} = ${fmt(1 / r.m)}`]);
    }
    rows.push(['Asimetría', '0 (simétrica)']);
    $('uMeasures').innerHTML = rows.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('');
  }

  function renderSteps(r) {
    const a = fmt(r.a), b = fmt(r.b);
    const s = [];
    if (r.kind === 'cont') {
      s.push(`Distribución: X ~ U(${a}, ${b}), con densidad f(x) = 1/(b − a) = 1/(${b} − ${a}) = ${fmt(1 / r.L)} para ${a} ≤ x ≤ ${b}`);
      const clampNote = (x) => (x < r.a ? ` (${fmt(x)} está por debajo de a, se toma ${a})` : x > r.b ? ` (${fmt(x)} está por encima de b, se toma ${b})` : '');
      const c = (x) => Math.min(Math.max(x, r.a), r.b);
      if (r.t === 'le') {
        s.push(`P(X ≤ x) = (x − a)/(b − a)${clampNote(r.x1)}`);
        s.push(`P(X ≤ ${fmt(r.x1)}) = (${fmt(c(r.x1))} − ${a}) / (${b} − ${a}) = ${fmt(c(r.x1) - r.a)} / ${fmt(r.L)} = <b>${fmt(r.prob)}</b>`);
      } else if (r.t === 'ge') {
        s.push(`P(X ≥ x) = (b − x)/(b − a)${clampNote(r.x1)}`);
        s.push(`P(X ≥ ${fmt(r.x1)}) = (${b} − ${fmt(c(r.x1))}) / (${b} − ${a}) = ${fmt(r.b - c(r.x1))} / ${fmt(r.L)} = <b>${fmt(r.prob)}</b>`);
      } else if (r.t === 'between') {
        s.push(`P(x₁ ≤ X ≤ x₂) = f(x) · (x₂ − x₁) = (x₂ − x₁)/(b − a): la densidad por la longitud del tramo${clampNote(r.x1)}${clampNote(r.x2)}`);
        s.push(`P(${fmt(r.x1)} ≤ X ≤ ${fmt(r.x2)}) = ${fmt(1 / r.L)} · (${fmt(c(r.x2))} − ${fmt(c(r.x1))}) = ${fmt(1 / r.L)} · ${fmt(c(r.x2) - c(r.x1))} = <b>${fmt(r.prob)}</b>`);
      } else if (r.t === 'inv') {
        s.push('Despejando de P(X ≤ x) = (x − a)/(b − a) = p:  x = a + p · (b − a)');
        s.push(`x = ${a} + ${fmt(r.p)} · (${b} − ${a}) = ${a} + ${fmt(r.p * r.L)} = <b>${fmt(r.x)}</b>`);
      } else {
        s.push(r.dens ? `${fmt(r.x1)} está dentro de [${a}, ${b}], entonces f(${fmt(r.x1)}) = 1/(b − a) = <b>${fmt(r.dens)}</b>` : `${fmt(r.x1)} está fuera de [${a}, ${b}], entonces f(${fmt(r.x1)}) = <b>0</b>`);
      }
      s.push(`E[X] = (a + b)/2 = (${a} + ${b})/2 = <b>${fmt(r.mean)}</b>`);
      s.push(`Var(X) = (b − a)²/12 = ${fmt(r.L)}²/12 = <b>${fmt(r.variance)}</b>;  σ = √Var(X) = <b>${fmt(r.sd)}</b>`);
    } else {
      s.push(`Valores posibles: ${r.a}, ${r.a + 1}, …, ${r.b} → m = b − a + 1 = ${r.b} − ${r.a} + 1 = ${r.m} valores, cada uno con probabilidad 1/${r.m}`);
      s.push(r.count ? `Valores que cumplen la condición: ${r.ea === r.eb ? r.ea : `${r.ea} a ${r.eb}`} → ${r.count} valor${r.count === 1 ? '' : 'es'}` : 'Ningún valor posible cumple la condición');
      s.push(`${label(r)} = casos favorables / casos posibles = ${r.count}/${r.m} = <b>${fmt(r.prob)}</b>`);
      s.push(`E[X] = (a + b)/2 = (${r.a} + ${r.b})/2 = <b>${fmt(r.mean)}</b>`);
      s.push(`Var(X) = (m² − 1)/12 = (${r.m}² − 1)/12 = <b>${fmt(r.variance)}</b>;  σ = <b>${fmt(r.sd)}</b>`);
    }
    $('uSteps').innerHTML = s.map((t) => `<li>${t}</li>`).join('');
  }

  function renderExcel(r) {
    const A = num(r.a), B = num(r.b);
    const build = (es) => {
      const sep = es ? '; ' : ', ';
      const SQRT = es ? 'RAIZ' : 'SQRT';
      const lines = [];
      const P = es ? 'Probabilidad' : 'Probability';
      if (r.kind === 'cont') {
        const c = (x) => num(Math.min(Math.max(x, r.a), r.b));
        if (r.t === 'le') lines.push(`${P}:   =(${c(r.x1)}-${A})/(${B}-${A})`);
        if (r.t === 'ge') lines.push(`${P}:   =(${B}-${c(r.x1)})/(${B}-${A})`);
        if (r.t === 'between') lines.push(`${P}:   =1/(${B}-${A})*(${c(r.x2)}-${c(r.x1)})`);
        if (r.t === 'inv') lines.push(`x:   =${A}+${num(r.p)}*(${B}-${A})`);
        if (r.t === 'dens') lines.push(`f(x):   =${r.dens ? `1/(${B}-${A})` : '0'}`);
        lines.push(`${es ? 'Valor esperado' : 'Expected value'}:   =(${A}+${B})/2`);
        lines.push(`${es ? 'Varianza' : 'Variance'}:   =(${B}-${A})^2/12`);
        lines.push(`${es ? 'Desvío estándar' : 'Standard deviation'}:   =${SQRT}((${B}-${A})^2/12)`);
        lines.push(`${es ? 'Simular un valor' : 'Simulate a value'}:   =${A}+(${B}-${A})*${es ? 'ALEATORIO()' : 'RAND()'}`);
      } else {
        lines.push(`${P}:   =${r.count}/(${B}-${A}+1)`);
        lines.push(`${es ? 'Valor esperado' : 'Expected value'}:   =(${A}+${B})/2`);
        lines.push(`${es ? 'Varianza' : 'Variance'}:   =((${B}-${A}+1)^2-1)/12`);
        lines.push(`${es ? 'Desvío estándar' : 'Standard deviation'}:   =${SQRT}(((${B}-${A}+1)^2-1)/12)`);
        lines.push(`${es ? 'Simular un valor' : 'Simulate a value'}:   =${es ? 'ALEATORIO.ENTRE' : 'RANDBETWEEN'}(${A}${sep}${B})`);
      }
      return lines.join('\n');
    };
    $('uExcelEs').textContent = build(true);
    $('uExcelEn').textContent = build(false);
  }

  /* ---------------------------------------------------------- gráfico */
  function drawChart(r) {
    const W = 800, L = 58, R = 24, T = 40, H = 330, base = H - 60;
    const plotW = W - L - R, plotH = base - T;
    const font = 'font-family="Segoe UI, Arial, sans-serif"';
    const span = r.b - r.a;
    let lo = r.a - (r.kind === 'disc' ? 1 : 0.2 * span), hi = r.b + (r.kind === 'disc' ? 1 : 0.2 * span);
    (r.markers || []).forEach((m) => {
      if (Number.isFinite(m) && Math.abs(m - (r.a + r.b) / 2) < 3 * span) { lo = Math.min(lo, m - 0.05 * span); hi = Math.max(hi, m + 0.05 * span); }
    });
    const X = (x) => L + (x - lo) / (hi - lo) * plotW;
    const height = r.kind === 'cont' ? 1 / span : 1 / r.m;
    const yMax = height * 1.45;
    const Y = (y) => base - y / yMax * plotH;
    let late = '';
    let s = `<defs><linearGradient id="uGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7c3aed" stop-opacity=".9"/><stop offset="1" stop-color="#a78bfa" stop-opacity=".55"/></linearGradient></defs><rect width="${W}" height="${H}" fill="#fff"/>`;

    // ejes
    const ticks = r.kind === 'disc' && r.m <= 30 ? [...Array(r.m)].map((_, i) => r.a + i) : niceTicks(lo, hi, 9);
    ticks.forEach((t) => {
      if (t < lo || t > hi) return;
      s += `<line x1="${X(t)}" y1="${T - 10}" x2="${X(t)}" y2="${base}" stroke="#f1f0f5"/>`;
      s += `<text x="${X(t)}" y="${base + 18}" text-anchor="middle" font-size="12" fill="#4b5563" ${font}>${window.Calc.fmt(t, 4)}</text>`;
    });
    s += `<text x="${L - 8}" y="${Y(height) + 4}" text-anchor="end" font-size="12" fill="#6b7280" ${font}>${fmt(height, 3)}</text>`;
    s += `<line x1="${L}" y1="${Y(height)}" x2="${W - R}" y2="${Y(height)}" stroke="#e5e7eb" stroke-dasharray="3,4"/>`;
    s += `<text x="${L - 8}" y="${base + 4}" text-anchor="end" font-size="12" fill="#6b7280" ${font}>0</text>`;

    if (r.kind === 'cont') {
      s += `<rect x="${X(r.a)}" y="${Y(height)}" width="${X(r.b) - X(r.a)}" height="${base - Y(height)}" fill="#efeaf9"/>`;
      if (r.region && r.region[1] > r.region[0]) {
        s += `<rect x="${X(r.region[0])}" y="${Y(height)}" width="${X(r.region[1]) - X(r.region[0])}" height="${base - Y(height)}" fill="url(#uGrad)"/>`;
        if (r.t !== 'dens') {
          const cx = X((r.region[0] + r.region[1]) / 2);
          const w = X(r.region[1]) - X(r.region[0]);
          const ly = w > 70 ? Y(height / 2) : Y(height) - 12;
          late += `<text x="${cx}" y="${ly}" text-anchor="middle" font-size="15" font-weight="700" fill="${w > 70 ? '#fff' : '#5b21b6'}" stroke="${w > 70 ? '#7c3aed' : '#fff'}" stroke-width="4" paint-order="stroke" ${font}>${pct(r.prob)}</text>`;
        }
      }
      s += `<path d="M${L},${base} H${X(r.a)} V${Y(height)} H${X(r.b)} V${base} H${W - R}" fill="none" stroke="#1e1b4b" stroke-width="2"/>`;
      s += `<text x="${X(r.b) + 6}" y="${Y(height) - 6}" font-size="12.5" fill="#1e1b4b" ${font}>f(x) = 1/(b − a)</text>`;
    } else {
      const slot = plotW / (hi - lo);
      const bw = Math.max(Math.min(slot * 0.6, 40), 1.5);
      for (let k = r.a; k <= r.b; k++) {
        const inEv = r.count && k >= r.ea && k <= r.eb;
        s += `<rect x="${X(k) - bw / 2}" y="${Y(height)}" width="${bw}" height="${base - Y(height)}" rx="${Math.min(4, bw / 4)}" fill="${inEv ? 'url(#uGrad)' : '#d9d6e3'}"><title>P(X = ${k}) = 1/${r.m} = ${fmt(height)}</title></rect>`;
      }
      late += `<text x="${X((r.a + r.b) / 2)}" y="${Y(height) - 16}" text-anchor="middle" font-size="14" font-weight="700" fill="#5b21b6" stroke="#fff" stroke-width="4" paint-order="stroke" ${font}>${label(r)} = ${r.count}/${r.m} = ${pct(r.prob)}</text>`;
      s += `<line x1="${L}" y1="${base}" x2="${W - R}" y2="${base}" stroke="#6b7280"/>`;
    }

    // valor esperado
    s += `<line x1="${X(r.mean)}" y1="${T - 18}" x2="${X(r.mean)}" y2="${base}" stroke="#2563eb" stroke-width="1.5" stroke-dasharray="5,4"/>`;
    s += `<text x="${X(r.mean)}" y="${T - 24}" text-anchor="middle" font-size="12.5" font-weight="700" fill="#2563eb" ${font}>E[X] = ${fmt(r.mean)}</text>`;

    // marcadores
    (r.markers || []).forEach((m) => {
      if (!Number.isFinite(m) || m < lo || m > hi) return;
      s += `<line x1="${X(m)}" y1="${base}" x2="${X(m)}" y2="${Y(height) - 4}" stroke="#2563eb" stroke-width="2"/>`;
      const txt = fmt(m, Math.min(dec(), 4));
      const bw2 = txt.length * 8 + 16;
      s += `<rect x="${X(m) - bw2 / 2}" y="${base + 28}" width="${bw2}" height="21" rx="10" fill="#2563eb"/><text x="${X(m)}" y="${base + 43}" text-anchor="middle" font-size="12.5" font-weight="700" fill="#fff" ${font}>${txt}</text>`;
    });
    s += late;
    const svg = $('uChart');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.innerHTML = s;
  }

  /* ---------------------------------------------------------- control */
  function run(showErrors = false) {
    if (showErrors) $('uResult').dataset.started = '1'; // ya se tocó "Calcular"
    const v = validate();
    if (v.error) { if (showErrors) showError('uError', v.error); return false; }
    showError('uError', '');
    state.last = state.kind === 'cont' ? computeCont(v) : computeDisc(v);
    render(state.last);
    return true;
  }

  function init() {
    document.querySelectorAll('#uKindTabs .mode-btn').forEach((b) => b.addEventListener('click', () => setKind(b.dataset.ukind)));
    ['uA', 'uB', 'uX1', 'uX2', 'uP'].forEach((id) => {
      $(id).addEventListener('input', liveUpdate);
      $(id).addEventListener('keydown', (e) => { if (e.key === 'Enter') run(true); });
    });
    $('uType').addEventListener('change', () => { syncFields(); liveUpdate(); });
    $('uDecimals').addEventListener('change', () => { liveUpdate(); });
    $('uCalcBtn').addEventListener('click', () => { if (run(true)) $('uResult').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    $('uClearBtn').addEventListener('click', () => {
      delete $('uResult').dataset.started;
      ['uX1', 'uX2', 'uP'].forEach((id) => { $(id).value = ''; });
      $('uResult').hidden = true; $('uExampleText').hidden = true; showError('uError', '');
    });
    $('uExampleBtn').addEventListener('click', () => {
      const ex = EXAMPLES[state.kind];
      $('uA').value = ex.a; $('uB').value = ex.b; $('uType').value = ex.type; $('uX1').value = ex.x1;
      if (ex.x2 !== undefined) $('uX2').value = ex.x2;
      syncFields();
      $('uExampleText').innerHTML = `<b>Ejemplo:</b> ${ex.text}`;
      $('uExampleText').hidden = false;
      ['uA', 'uB', 'uX1', 'uX2', 'uP'].forEach((id) => $(id).classList.remove('invalid'));
      liveUpdate();
    });
    wireFoldButtons('uExpandAll', 'uCollapseAll', 'uResult');
    setKind('cont');
  }

  document.addEventListener('DOMContentLoaded', init);
})();
