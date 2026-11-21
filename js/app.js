/* =========================================================================
 *  Calculadora de distribución normal — interfaz
 * ========================================================================= */
(function () {
  'use strict';

  const { Normal, stdInv } = window.NormalDist;
  const $ = (id) => document.getElementById(id);

  /* ---------------------------------------------------------------- modos */
  const MODES = {
    left:     { fields: ['x1'],       x1Label: 'Valor (x)' },
    right:    { fields: ['x1'],       x1Label: 'Valor (x)' },
    between:  { fields: ['x1', 'x2'], x1Label: 'Valor inferior (x₁)' },
    tails:    { fields: ['x1', 'x2'], x1Label: 'Valor inferior (x₁)' },
    density:  { fields: ['x1'],       x1Label: 'Valor (x)' },
    invLeft:  { fields: ['p'],        pLabel: 'Probabilidad P(X ≤ x)' },
    invRight: { fields: ['p'],        pLabel: 'Probabilidad P(X ≥ x)' },
    invTails: { fields: ['p', 'pType'], pLabel: 'Probabilidad' },
    zscore:   { fields: ['x1'],       x1Label: 'Valor (x)' },
  };

  const state = {
    mode: 'left',
    drag: null,       // campo que se está arrastrando ('x1' | 'x2')
    range: null,      // rango fijo del eje x mientras se arrastra
    last: null,       // último resultado calculado
  };

  /* ------------------------------------------------------------- formatos */
  const decimals = () => parseInt($('decimals').value, 10);

  function fmt(v, d = decimals()) {
    if (v === Infinity) return '∞';
    if (v === -Infinity) return '−∞';
    if (!Number.isFinite(v)) return 'NaN';
    if (v !== 0 && Math.abs(v) < Math.pow(10, -d)) return v.toExponential(Math.min(d, 4)).replace('-', '−');
    const s = String(parseFloat(v.toFixed(d)));
    return (s === '-0' ? '0' : s).replace('-', '−');
  }
  const pct = (p) => fmt(p * 100, Math.max(decimals() - 2, 2)) + '%';
  const code = (v) => String(v); // número plano para R / Excel

  /* ----------------------------------------------------------- íconos */
  function modeIcon(mode) {
    const W = 28, H = 16, X = (z) => 1 + (z + 3) / 6 * (W - 2), Y = (z) => H - 1 - 12 * Math.exp(-z * z / 2);
    const curve = (a, b) => {
      let d = `M${X(a).toFixed(1)},${H - 1}`;
      for (let i = 0; i <= 20; i++) { const z = a + (b - a) * i / 20; d += `L${X(z).toFixed(1)},${Y(z).toFixed(1)}`; }
      return d + `L${X(b).toFixed(1)},${H - 1}Z`;
    };
    const shade = { left: [[-3, 0.5]], invLeft: [[-3, 0.5]], right: [[-0.5, 3]], invRight: [[-0.5, 3]],
      between: [[-0.8, 0.8]], tails: [[-3, -0.8], [0.8, 3]], invTails: [[-3, -0.8], [0.8, 3]] }[mode] || [];
    let line = '';
    if (mode === 'density' || mode === 'zscore') {
      const z = mode === 'density' ? 0.6 : 0.9;
      line = `<line x1="${X(z)}" y1="${H - 1}" x2="${X(z)}" y2="${Y(z)}" stroke="#334155" stroke-dasharray="${mode === 'zscore' ? '2,1.5' : ''}"/>` +
             `<circle cx="${X(z)}" cy="${Y(z)}" r="1.6" fill="#334155"/>`;
    }
    let outline = `M${X(-3)},${Y(-3)}`;
    for (let i = 0; i <= 40; i++) { const z = -3 + 6 * i / 40; outline += `L${X(z).toFixed(1)},${Y(z).toFixed(1)}`; }
    return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true">` +
      shade.map(([a, b]) => `<path d="${curve(a, b)}" fill="#a78bfa"/>`).join('') +
      `<path d="${outline}" fill="none" stroke="#334155" stroke-width="1"/>` +
      `<line x1="0" y1="${H - 0.5}" x2="${W}" y2="${H - 0.5}" stroke="#94a3b8"/>` + line + '</svg>';
  }

  /* ------------------------------------------------------- lectura de datos */
  function readNumber(id) {
    const el = $(id);
    const v = el.value.trim() === '' ? NaN : Number(el.value);
    return v;
  }

  function markInvalid(ids) {
    ['mu', 'sigma', 'x1', 'x2', 'p'].forEach((id) => $(id).classList.toggle('invalid', ids.includes(id)));
  }

  function validate() {
    const mode = MODES[state.mode];
    const mu = readNumber('mu'), sigma = readNumber('sigma');
    const bad = [], msgs = [];
    if (!Number.isFinite(mu)) { bad.push('mu'); msgs.push('Ingresá una media (μ) válida.'); }
    if (!Number.isFinite(sigma) || sigma <= 0) { bad.push('sigma'); msgs.push('La desviación estándar (σ) debe ser un número mayor que 0.'); }
    const x1 = readNumber('x1'), x2 = readNumber('x2'), p = readNumber('p');
    if (mode.fields.includes('x1') && !Number.isFinite(x1)) { bad.push('x1'); msgs.push('Ingresá un valor de x válido.'); }
    if (mode.fields.includes('x2') && !Number.isFinite(x2)) { bad.push('x2'); msgs.push('Ingresá un valor superior (x₂) válido.'); }
    if (mode.fields.includes('x2') && Number.isFinite(x1) && Number.isFinite(x2) && x1 > x2) {
      bad.push('x1', 'x2'); msgs.push('El valor inferior (x₁) debe ser menor o igual que el valor superior (x₂).');
    }
    if (mode.fields.includes('p') && !(p > 0 && p < 1)) { bad.push('p'); msgs.push('La probabilidad debe estar entre 0 y 1 (sin incluirlos).'); }
    markInvalid(bad);
    return msgs.length ? { error: msgs.join(' ') } : { mu, sigma, x1, x2, p, pType: $('pType').value };
  }

  /* --------------------------------------------------------------- cálculo */
  function compute(inp) {
    const { mu, sigma, x1, x2, p } = inp;
    const d = Normal(mu, sigma);
    const N = `X ~ N(${fmt(mu)}, ${fmt(sigma)}²)`;
    const intro = `Si X sigue una distribución normal con media ${fmt(mu)} y desviación estándar ${fmt(sigma)} — ${N} — `;
    const R = { mu, sigma, regions: [], markers: [] };
    const muC = code(mu), sC = code(sigma);
    const z1 = d.z(x1), z2 = d.z(x2);

    switch (state.mode) {
      case 'left': {
        const P = d.cdf(x1);
        Object.assign(R, {
          main: `P(X ≤ ${fmt(x1)}) = ${fmt(P)}`, pct: pct(P), sub: `z = ${fmt(z1)}`,
          regions: [{ a: -Infinity, b: x1, shaded: true, p: P }, { a: x1, b: Infinity, shaded: false, p: 1 - P }],
          markers: [{ x: x1, field: 'x1' }],
          explanation: `${intro}entonces el ${pct(P)} de los valores son menores o iguales que ${fmt(x1)}.`,
          steps: [
            `Estandarizar: z = (x − μ) / σ = (${fmt(x1)} − ${fmt(mu)}) / ${fmt(sigma)} = ${fmt(z1)}`,
            `Buscar en la tabla normal estándar: P(X ≤ ${fmt(x1)}) = Φ(${fmt(z1)}) = <b>${fmt(P)}</b>`,
          ],
          r: `pnorm(${code(x1)}, mean = ${muC}, sd = ${sC})`,
          excelEs: `=DISTR.NORM.N(${code(x1)}; ${muC}; ${sC}; VERDADERO)`,
          excelEn: `=NORM.DIST(${code(x1)}, ${muC}, ${sC}, TRUE)`,
        });
        break;
      }
      case 'right': {
        const P = d.sf(x1);
        Object.assign(R, {
          main: `P(X ≥ ${fmt(x1)}) = ${fmt(P)}`, pct: pct(P), sub: `z = ${fmt(z1)}`,
          regions: [{ a: -Infinity, b: x1, shaded: false, p: 1 - P }, { a: x1, b: Infinity, shaded: true, p: P }],
          markers: [{ x: x1, field: 'x1' }],
          explanation: `${intro}entonces el ${pct(P)} de los valores son mayores o iguales que ${fmt(x1)}.`,
          steps: [
            `Estandarizar: z = (x − μ) / σ = (${fmt(x1)} − ${fmt(mu)}) / ${fmt(sigma)} = ${fmt(z1)}`,
            `Usar el complemento: P(X ≥ ${fmt(x1)}) = 1 − Φ(${fmt(z1)}) = 1 − ${fmt(1 - P)} = <b>${fmt(P)}</b>`,
          ],
          r: `pnorm(${code(x1)}, mean = ${muC}, sd = ${sC}, lower.tail = FALSE)`,
          excelEs: `=1 - DISTR.NORM.N(${code(x1)}; ${muC}; ${sC}; VERDADERO)`,
          excelEn: `=1 - NORM.DIST(${code(x1)}, ${muC}, ${sC}, TRUE)`,
        });
        break;
      }
      case 'between': {
        const P = d.between(x1, x2), L = d.cdf(x1), U = d.sf(x2);
        Object.assign(R, {
          main: `P(${fmt(x1)} ≤ X ≤ ${fmt(x2)}) = ${fmt(P)}`, pct: pct(P), sub: `z₁ = ${fmt(z1)},  z₂ = ${fmt(z2)}`,
          regions: [{ a: -Infinity, b: x1, shaded: false, p: L }, { a: x1, b: x2, shaded: true, p: P }, { a: x2, b: Infinity, shaded: false, p: U }],
          markers: [{ x: x1, field: 'x1' }, { x: x2, field: 'x2' }],
          explanation: `${intro}entonces el ${pct(P)} de los valores se encuentran entre ${fmt(x1)} y ${fmt(x2)}, mientras que el ${pct(L + U)} queda fuera de ese rango.`,
          steps: [
            `Estandarizar ambos valores: z₁ = ${fmt(z1)},  z₂ = ${fmt(z2)}`,
            `Probabilidades acumuladas: Φ(z₁) = ${fmt(L)};  Φ(z₂) = ${fmt(1 - U)}`,
            `Restar: P(${fmt(x1)} ≤ X ≤ ${fmt(x2)}) = Φ(z₂) − Φ(z₁) = ${fmt(1 - U)} − ${fmt(L)} = <b>${fmt(P)}</b>`,
          ],
          r: `pnorm(${code(x2)}, ${muC}, ${sC}) - pnorm(${code(x1)}, ${muC}, ${sC})`,
          excelEs: `=DISTR.NORM.N(${code(x2)}; ${muC}; ${sC}; VERDADERO) - DISTR.NORM.N(${code(x1)}; ${muC}; ${sC}; VERDADERO)`,
          excelEn: `=NORM.DIST(${code(x2)}, ${muC}, ${sC}, TRUE) - NORM.DIST(${code(x1)}, ${muC}, ${sC}, TRUE)`,
        });
        break;
      }
      case 'tails': {
        const L = d.cdf(x1), U = d.sf(x2), C = d.between(x1, x2), P = L + U;
        Object.assign(R, {
          main: `P(X ≤ ${fmt(x1)}) + P(X ≥ ${fmt(x2)}) = ${fmt(P)}`, pct: pct(P), sub: `z₁ = ${fmt(z1)},  z₂ = ${fmt(z2)}`,
          regions: [{ a: -Infinity, b: x1, shaded: true, p: L }, { a: x1, b: x2, shaded: false, p: C }, { a: x2, b: Infinity, shaded: true, p: U }],
          markers: [{ x: x1, field: 'x1' }, { x: x2, field: 'x2' }],
          explanation: `${intro}entonces el ${pct(P)} de los valores quedan fuera del rango ${fmt(x1)} a ${fmt(x2)} (${pct(L)} en la cola izquierda y ${pct(U)} en la cola derecha), mientras que el ${pct(C)} queda dentro.`,
          steps: [
            `Estandarizar ambos valores: z₁ = ${fmt(z1)},  z₂ = ${fmt(z2)}`,
            `Cola izquierda: P(X ≤ x₁) = Φ(z₁) = ${fmt(L)};  cola derecha: P(X ≥ x₂) = 1 − Φ(z₂) = ${fmt(U)}`,
            `Sumar las colas: ${fmt(L)} + ${fmt(U)} = <b>${fmt(P)}</b>`,
          ],
          r: `1 - (pnorm(${code(x2)}, ${muC}, ${sC}) - pnorm(${code(x1)}, ${muC}, ${sC}))`,
          excelEs: `=1 - (DISTR.NORM.N(${code(x2)}; ${muC}; ${sC}; VERDADERO) - DISTR.NORM.N(${code(x1)}; ${muC}; ${sC}; VERDADERO))`,
          excelEn: `=1 - (NORM.DIST(${code(x2)}, ${muC}, ${sC}, TRUE) - NORM.DIST(${code(x1)}, ${muC}, ${sC}, TRUE))`,
        });
        break;
      }
      case 'density': {
        const f = d.pdf(x1), F = d.cdf(x1);
        Object.assign(R, {
          main: `f(${fmt(x1)}) = ${fmt(f)}`, pct: '', sub: `z = ${fmt(z1)},  P(X ≤ ${fmt(x1)}) = ${fmt(F)}`,
          regions: [{ a: -Infinity, b: Infinity, shaded: false }],
          markers: [{ x: x1, field: 'x1', point: true }],
          explanation: `${intro}la función de densidad evaluada en x = ${fmt(x1)} vale ${fmt(f)}. Atención: la densidad no es una probabilidad; en una variable continua P(X = x) = 0.`,
          steps: [
            `Estandarizar: z = (${fmt(x1)} − ${fmt(mu)}) / ${fmt(sigma)} = ${fmt(z1)}`,
            `Fórmula: f(x) = 1 / (σ√(2π)) · e<sup>−z²/2</sup>`,
            `Reemplazar: f(${fmt(x1)}) = 1 / (${fmt(sigma)} · ${fmt(Math.sqrt(2 * Math.PI))}) · e<sup>−${fmt(z1 * z1 / 2)}</sup> = <b>${fmt(f)}</b>`,
          ],
          r: `dnorm(${code(x1)}, mean = ${muC}, sd = ${sC})`,
          excelEs: `=DISTR.NORM.N(${code(x1)}; ${muC}; ${sC}; FALSO)`,
          excelEn: `=NORM.DIST(${code(x1)}, ${muC}, ${sC}, FALSE)`,
        });
        break;
      }
      case 'invLeft': {
        const z = stdInv(p), x = d.inv(p);
        Object.assign(R, {
          main: `x = ${fmt(x)}`, pct: `P(X ≤ x) = ${fmt(p)}`, sub: `z = ${fmt(z)} · percentil ${fmt(p * 100, 4)}`,
          regions: [{ a: -Infinity, b: x, shaded: true, p }, { a: x, b: Infinity, shaded: false, p: 1 - p }],
          markers: [{ x }],
          explanation: `${intro}el ${pct(p)} de los valores son menores o iguales que ${fmt(x)}. Es decir, ${fmt(x)} es el percentil ${fmt(p * 100, 4)}.`,
          steps: [
            `Buscar z tal que Φ(z) = ${fmt(p)}:  z = Φ⁻¹(${fmt(p)}) = ${fmt(z)}`,
            `Desestandarizar: x = μ + z·σ = ${fmt(mu)} + (${fmt(z)}) · ${fmt(sigma)} = <b>${fmt(x)}</b>`,
          ],
          r: `qnorm(${code(p)}, mean = ${muC}, sd = ${sC})`,
          excelEs: `=INV.NORM(${code(p)}; ${muC}; ${sC})`,
          excelEn: `=NORM.INV(${code(p)}, ${muC}, ${sC})`,
        });
        break;
      }
      case 'invRight': {
        const z = -stdInv(p), x = d.invUpper(p);
        Object.assign(R, {
          main: `x = ${fmt(x)}`, pct: `P(X ≥ x) = ${fmt(p)}`, sub: `z = ${fmt(z)} · percentil ${fmt((1 - p) * 100, 4)}`,
          regions: [{ a: -Infinity, b: x, shaded: false, p: 1 - p }, { a: x, b: Infinity, shaded: true, p }],
          markers: [{ x }],
          explanation: `${intro}el ${pct(p)} de los valores son mayores o iguales que ${fmt(x)}.`,
          steps: [
            `Como P(X ≥ x) = ${fmt(p)}, entonces P(X ≤ x) = 1 − ${fmt(p)} = ${fmt(1 - p)}`,
            `z = Φ⁻¹(${fmt(1 - p)}) = ${fmt(z)}`,
            `Desestandarizar: x = μ + z·σ = ${fmt(mu)} + (${fmt(z)}) · ${fmt(sigma)} = <b>${fmt(x)}</b>`,
          ],
          r: `qnorm(${code(p)}, mean = ${muC}, sd = ${sC}, lower.tail = FALSE)`,
          excelEs: `=INV.NORM(1 - ${code(p)}; ${muC}; ${sC})`,
          excelEn: `=NORM.INV(1 - ${code(p)}, ${muC}, ${sC})`,
        });
        break;
      }
      case 'invTails': {
        const alpha = inp.pType === 'tails' ? p : 1 - p;
        const z = -stdInv(alpha / 2);
        const a = d.inv(alpha / 2), b = d.invUpper(alpha / 2);
        const aC = inp.pType === 'tails' ? code(p) : `(1 - ${code(p)})`;
        Object.assign(R, {
          main: `x₁ = ${fmt(a)},  x₂ = ${fmt(b)}`, pct: `α = ${fmt(alpha)} (${fmt(alpha / 2)} en cada cola)`, sub: `z = ±${fmt(z)}`,
          regions: [{ a: -Infinity, b: a, shaded: true, p: alpha / 2 }, { a, b, shaded: false, p: 1 - alpha },
            { a: b, b: Infinity, shaded: true, p: alpha / 2 }],
          markers: [{ x: a }, { x: b }],
          explanation: `${intro}el ${pct(1 - alpha)} central de los valores se encuentra entre ${fmt(a)} y ${fmt(b)}; el ${pct(alpha)} restante queda en las colas (${pct(alpha / 2)} en cada una).`,
          steps: [
            inp.pType === 'tails'
              ? `Probabilidad total en las colas: α = ${fmt(alpha)}  →  α/2 = ${fmt(alpha / 2)} en cada cola`
              : `Probabilidad central 1 − α = ${fmt(p)}  →  α = ${fmt(alpha)},  α/2 = ${fmt(alpha / 2)} en cada cola`,
            `Valor crítico: z = Φ⁻¹(1 − α/2) = Φ⁻¹(${fmt(1 - alpha / 2)}) = ${fmt(z)}`,
            `x₁ = μ − z·σ = ${fmt(mu)} − ${fmt(z)} · ${fmt(sigma)} = <b>${fmt(a)}</b>;  x₂ = μ + z·σ = <b>${fmt(b)}</b>`,
          ],
          r: `qnorm(c(${aC}/2, 1 - ${aC}/2), mean = ${muC}, sd = ${sC})`,
          excelEs: `x₁: =INV.NORM(${aC}/2; ${muC}; ${sC})\nx₂: =INV.NORM(1 - ${aC}/2; ${muC}; ${sC})`,
          excelEn: `x₁: =NORM.INV(${aC}/2, ${muC}, ${sC})\nx₂: =NORM.INV(1 - ${aC}/2, ${muC}, ${sC})`,
        });
        break;
      }
      case 'zscore': {
        const F = d.cdf(x1);
        const pos = z1 > 0 ? 'por encima' : 'por debajo';
        Object.assign(R, {
          main: `z = ${fmt(z1)}`, pct: '', sub: `Φ(z) = P(X ≤ ${fmt(x1)}) = ${fmt(F)} (${pct(F)})`,
          regions: [{ a: -Infinity, b: x1, shaded: true, p: F }, { a: x1, b: Infinity, shaded: false, p: 1 - F }],
          markers: [{ x: x1, field: 'x1' }],
          explanation: z1 === 0
            ? `${intro}el valor ${fmt(x1)} coincide con la media (z = 0).`
            : `${intro}el valor ${fmt(x1)} está ${fmt(Math.abs(z1))} desviaciones estándar ${pos} de la media.`,
          steps: [
            `Fórmula: z = (x − μ) / σ`,
            `Reemplazar: z = (${fmt(x1)} − ${fmt(mu)}) / ${fmt(sigma)} = ${fmt(x1 - mu)} / ${fmt(sigma)} = <b>${fmt(z1)}</b>`,
          ],
          r: `(${code(x1)} - ${muC}) / ${sC}`,
          excelEs: `=NORMALIZACION(${code(x1)}; ${muC}; ${sC})`,
          excelEn: `=STANDARDIZE(${code(x1)}, ${muC}, ${sC})`,
        });
        break;
      }
    }

    R.related = relatedProbs(d, R, inp);

    const q1 = d.inv(0.25), q3 = d.inv(0.75);
    R.measures = [
      ['Media', fmt(d.mean)], ['Mediana', fmt(d.median)], ['Moda', fmt(d.mode)],
      ['Desviación estándar (σ)', fmt(sigma)], ['Varianza (σ²)', fmt(d.variance)],
      ['Asimetría', '0'], ['Curtosis (exceso)', '0'],
      ['Q1 (percentil 25)', fmt(q1)], ['Q3 (percentil 75)', fmt(q3)], ['Rango intercuartílico (Q3 − Q1)', fmt(q3 - q1)],
    ];
    R.note = `La distribución normal es simétrica: mediana = moda = media = ${fmt(mu)}.`;
    return R;
  }

  /* ------------------------------------------- probabilidades relacionadas */
  function relatedProbs(d, R, inp) {
    const xs = R.markers.map((m) => m.x);
    const mu = d.mu;
    const items = [];
    const currentKey = {
      left: 'le1', right: 'ge1', between: 'btw', tails: 'out', invLeft: 'le1', invRight: 'ge1',
      invTails: inp.pType === 'center' ? 'btw' : 'out', zscore: 'le1', density: '',
    }[state.mode];

    if (xs.length === 1) {
      const x = xs[0], dist = Math.abs(x - mu), a = mu - dist, b = mu + dist;
      items.push({ key: 'le1', icon: 'left', label: `P(X ≤ ${fmt(x)})`, p: d.cdf(x) });
      items.push({ key: 'ge1', icon: 'right', label: `P(X ≥ ${fmt(x)})`, p: d.sf(x) });
      if (dist > 0) {
        items.push({ key: 'sym', icon: 'between', label: `P(${fmt(a)} ≤ X ≤ ${fmt(b)})`, p: d.between(a, b) });
        items.push({ key: 'symOut', icon: 'tails', label: `P(X ≤ ${fmt(a)}) + P(X ≥ ${fmt(b)})`, p: d.cdf(a) + d.sf(b) });
      }
      items.push({ key: 'leMu', icon: 'between', label: `P(${fmt(Math.min(mu, x))} ≤ X ≤ ${fmt(Math.max(mu, x))})`, p: d.between(Math.min(mu, x), Math.max(mu, x)), note: 'entre la media y x' });
    } else {
      const [x1, x2] = xs;
      items.push({ key: 'le1', icon: 'left', label: `P(X ≤ ${fmt(x1)})`, p: d.cdf(x1) });
      items.push({ key: 'ge1', icon: 'right', label: `P(X ≥ ${fmt(x1)})`, p: d.sf(x1) });
      items.push({ key: 'le2', icon: 'left', label: `P(X ≤ ${fmt(x2)})`, p: d.cdf(x2) });
      items.push({ key: 'ge2', icon: 'right', label: `P(X ≥ ${fmt(x2)})`, p: d.sf(x2) });
      items.push({ key: 'btw', icon: 'between', label: `P(${fmt(x1)} ≤ X ≤ ${fmt(x2)})`, p: d.between(x1, x2) });
      items.push({ key: 'out', icon: 'tails', label: `P(X ≤ ${fmt(x1)}) + P(X ≥ ${fmt(x2)})`, p: d.cdf(x1) + d.sf(x2) });
    }
    items.forEach((it) => { it.current = it.key === currentKey; });
    return items;
  }

  function renderRelated(items) {
    $('related').innerHTML = items.map((it) =>
      `<div class="rel-item${it.current ? ' current' : ''}" title="${it.current ? 'Es el resultado calculado arriba' : ''}">` +
      modeIcon(it.icon) +
      `<span class="rel-label">${it.label}${it.note ? `<br><span class="muted small">${it.note}</span>` : ''}</span>` +
      `<span><div class="rel-value">${fmt(it.p)}</div><div class="rel-pct">${pct(it.p)}</div></span>` +
      `<div class="rel-bar"><i style="width:${(Math.min(Math.max(it.p, 0), 1) * 100).toFixed(2)}%"></i></div></div>`
    ).join('');
  }

  /* ---------------------------------------------------------------- gráfico */
  function niceTicks(lo, hi, target = 8) {
    const raw = (hi - lo) / target;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const norm = raw / mag;
    const step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;
    const ticks = [];
    for (let t = Math.ceil(lo / step) * step; t <= hi + step * 1e-9; t += step) ticks.push(Math.abs(t) < step * 1e-9 ? 0 : t);
    return { ticks, step };
  }

  function computeRange(R) {
    const k = parseFloat($('range').value);
    let lo = R.mu - k * R.sigma, hi = R.mu + k * R.sigma;
    R.markers.forEach((m) => {
      if (m.x - 0.5 * R.sigma < lo) lo = Math.max(m.x - 0.5 * R.sigma, R.mu - 10 * R.sigma);
      if (m.x + 0.5 * R.sigma > hi) hi = Math.min(m.x + 0.5 * R.sigma, R.mu + 10 * R.sigma);
    });
    return { lo, hi };
  }

  function drawChart(R) {
    const svg = $('chart');
    const fs = parseFloat($('fontScale').value);
    const showLabels = $('showLabels').checked, showSigma = $('showSigma').checked;
    const d = Normal(R.mu, R.sigma);
    if (!state.drag || !state.range) state.range = computeRange(R);
    const { lo, hi } = state.range;

    const W = 800, L = 30, Rt = 30, T = 34, plotH = 270;
    const base = T + plotH;
    const axisY = base + 22 * fs;
    const sigmaY = axisY + 20 * fs;
    const badgeY = (showSigma ? sigmaY : axisY) + 26 * fs;
    const H = Math.round(badgeY + (R.markers.length ? 22 * fs : 0) + 6);
    const plotW = W - L - Rt;
    const yMax = d.pdf(R.mu) * 1.12;
    const X = (x) => L + (x - lo) / (hi - lo) * plotW;
    const Y = (y) => base - y / yMax * plotH;
    const font = `font-family="Segoe UI, Arial, sans-serif"`;
    const clampX = (x) => Math.min(Math.max(x, lo), hi);

    const area = (a, b) => {
      const ca = clampX(a), cb = clampX(b);
      if (cb - ca <= 0) return '';
      const n = Math.max(2, Math.ceil((cb - ca) / (hi - lo) * 300));
      let p = `M${X(ca).toFixed(2)},${base}`;
      for (let i = 0; i <= n; i++) { const x = ca + (cb - ca) * i / n; p += `L${X(x).toFixed(2)},${Y(d.pdf(x)).toFixed(2)}`; }
      return p + `L${X(cb).toFixed(2)},${base}Z`;
    };

    let s = `<defs><linearGradient id="gShade" x1="0" y1="0" x2="0" y2="1">` +
      `<stop offset="0" stop-color="#8b5cf6" stop-opacity="0.9"/><stop offset="1" stop-color="#c4b5fd" stop-opacity="0.25"/></linearGradient></defs>`;
    s += `<rect x="0" y="0" width="${W}" height="${H}" fill="#ffffff"/>`;

    // cuadrícula + eje
    const { ticks } = niceTicks(lo, hi);
    ticks.forEach((t) => {
      s += `<line x1="${X(t)}" y1="${T - 14}" x2="${X(t)}" y2="${base}" stroke="#eef0f3"/>`;
      s += `<line x1="${X(t)}" y1="${base}" x2="${X(t)}" y2="${base + 5}" stroke="#9ca3af"/>`;
      s += `<text x="${X(t)}" y="${axisY}" text-anchor="middle" font-size="${13 * fs}" fill="#4b5563" ${font}>${fmt(t, 6)}</text>`;
    });

    // regiones
    R.regions.forEach((r) => {
      const path = area(r.a, r.b);
      if (path) s += `<path d="${path}" fill="${r.shaded ? 'url(#gShade)' : '#e5e7eb'}" fill-opacity="${r.shaded ? 1 : 0.55}"/>`;
    });

    // curva
    let curve = '';
    for (let i = 0; i <= 400; i++) { const x = lo + (hi - lo) * i / 400; curve += `${i ? 'L' : 'M'}${X(x).toFixed(2)},${Y(d.pdf(x)).toFixed(2)}`; }
    s += `<path d="${curve}" fill="none" stroke="#0f172a" stroke-width="1.7"/>`;
    s += `<line x1="${L}" y1="${base}" x2="${W - Rt}" y2="${base}" stroke="#6b7280" stroke-width="1.2"/>`;

    // marcas σ
    if (showSigma) {
      for (let k = -4; k <= 4; k++) {
        const x = R.mu + k * R.sigma;
        if (x < lo || x > hi) continue;
        const lbl = k === 0 ? 'μ' : `μ${k > 0 ? '+' : '−'}${Math.abs(k) === 1 ? '' : Math.abs(k)}σ`;
        s += `<line x1="${X(x)}" y1="${base}" x2="${X(x)}" y2="${Y(d.pdf(x))}" stroke="#94a3b8" stroke-dasharray="2,3"/>`;
        s += `<text x="${X(x)}" y="${sigmaY}" text-anchor="middle" font-size="${12 * fs}" fill="#64748b" font-style="italic" ${font}>${lbl}</text>`;
      }
    }

    // etiquetas de porcentaje
    if (showLabels) {
      R.regions.forEach((r) => {
        if (r.p === undefined) return;
        const ca = clampX(r.a), cb = clampX(r.b);
        const wPx = X(cb) - X(ca);
        let lx;
        if (r.a === -Infinity && r.b !== Infinity) lx = Math.max((ca + cb) / 2, cb - 0.8 * R.sigma);
        else if (r.b === Infinity && r.a !== -Infinity) lx = Math.min((ca + cb) / 2, ca + 0.8 * R.sigma);
        else lx = (ca + cb) / 2;
        if (wPx <= 0) lx = r.a === -Infinity ? lo + 0.3 * R.sigma : hi - 0.3 * R.sigma;
        const yc = Y(d.pdf(lx));
        const h = base - yc;
        let ly, color;
        if (wPx < 70 || h < 42) {
          // fuera de la región: encima de la curva
          ly = (r.a <= R.mu && r.b >= R.mu) ? T - 10 : yc - 10;
          color = '#374151';
        } else {
          ly = base - h * 0.42;
          color = r.shaded ? '#6d28d9' : '#374151';
        }
        s += `<text x="${X(lx)}" y="${ly}" text-anchor="middle" font-size="${15 * fs}" font-weight="700" fill="${color}" ` +
             `stroke="#ffffff" stroke-width="3.5" paint-order="stroke" ${font}>${pct(r.p)}</text>`;
      });
    }

    // marcadores
    R.markers.forEach((m) => {
      if (m.x < lo || m.x > hi) return;
      const cx = X(m.x), cy = Y(d.pdf(m.x));
      s += `<line x1="${cx}" y1="${base}" x2="${cx}" y2="${cy}" stroke="#4b5563" stroke-dasharray="4,3"/>`;
      if (m.point) s += `<text x="${cx}" y="${cy - 22 * fs}" text-anchor="middle" font-size="${13 * fs}" font-weight="700" fill="#0f172a" stroke="#fff" stroke-width="3" paint-order="stroke" ${font}>f = ${fmt(d.pdf(m.x), 4)}</text>`;
      const drag = m.field ? ` class="drag-handle" data-field="${m.field}"` : '';
      s += `<circle cx="${cx}" cy="${cy}" r="${m.field ? 9 : 6}" fill="#ffffff" stroke="#2563eb" stroke-width="3"${drag}/>`;
      const label = fmt(m.x, Math.min(decimals(), 4));
      const bw = Math.max(34, label.length * 8.2 * fs + 16);
      s += `<rect x="${cx - bw / 2}" y="${badgeY - 15 * fs}" width="${bw}" height="${21 * fs}" rx="${10 * fs}" fill="#2563eb"/>`;
      s += `<text x="${cx}" y="${badgeY}" text-anchor="middle" font-size="${12.5 * fs}" font-weight="700" fill="#ffffff" ${font}>${label}</text>`;
    });

    // elementos de hover (se actualizan sin redibujar)
    s += `<g id="hoverG" style="display:none" pointer-events="none"><line id="hoverLine" y1="${T - 14}" y2="${base}" stroke="#7c3aed" stroke-width="1" stroke-dasharray="3,3"/>` +
         `<circle id="hoverDot" r="4.5" fill="#7c3aed" stroke="#fff" stroke-width="2"/></g>`;

    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.dataset.w = W; svg.dataset.h = H;
    svg.innerHTML = s;
    state.chart = { lo, hi, L, plotW, X, Y, d, base };
  }

  /* ------------------------------------------------------------ arrastrar */
  function setupDrag() {
    const svg = $('chart');
    svg.addEventListener('pointerdown', (e) => {
      const f = e.target.dataset && e.target.dataset.field;
      if (!f) return;
      state.drag = f;
      svg.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    const tip = document.createElement('div');
    tip.className = 'tooltip';
    tip.hidden = true;
    svg.parentNode.appendChild(tip);
    const hideHover = () => {
      tip.hidden = true;
      const g = document.getElementById('hoverG');
      if (g) g.style.display = 'none';
    };
    svg.addEventListener('pointerleave', hideHover);

    svg.addEventListener('pointermove', (e) => {
      const pt = svg.createSVGPoint();
      pt.x = e.clientX; pt.y = e.clientY;
      const p = pt.matrixTransform(svg.getScreenCTM().inverse());
      const { lo, hi, L, plotW, X, Y, d } = state.chart;

      if (!state.drag) {
        // tooltip: x, f(x) y P(X ≤ x) bajo el cursor
        const xh = lo + (p.x - L) / plotW * (hi - lo);
        if (xh < lo || xh > hi || e.target.dataset.field) { hideHover(); return; }
        const cx = X(xh), cy = Y(d.pdf(xh));
        const g = document.getElementById('hoverG');
        g.style.display = '';
        document.getElementById('hoverLine').setAttribute('x1', cx);
        document.getElementById('hoverLine').setAttribute('x2', cx);
        document.getElementById('hoverDot').setAttribute('cx', cx);
        document.getElementById('hoverDot').setAttribute('cy', cy);
        const sp = svg.createSVGPoint();
        sp.x = cx; sp.y = cy;
        const scr = sp.matrixTransform(svg.getScreenCTM());
        const box = svg.parentNode.getBoundingClientRect();
        tip.innerHTML = `<b>x</b> = ${fmt(xh, 3)}<br><b>f(x)</b> = ${fmt(d.pdf(xh), 4)}<br><b>P(X ≤ x)</b> = ${fmt(d.cdf(xh), 4)}`;
        tip.hidden = false;
        const left = Math.min(Math.max(scr.x - box.left, 70), box.width - 70);
        tip.style.left = left + 'px';
        tip.style.top = Math.max(scr.y - box.top - 8, 62) + 'px';
        return;
      }
      hideHover();
      let x = lo + (p.x - L) / plotW * (hi - lo);
      x = Math.min(Math.max(x, lo), hi);
      const sigma = readNumber('sigma');
      const e10 = Math.floor(Math.log10(sigma)) - 2;
      const step = Math.pow(10, e10);
      x = Math.round(x / step) * step;
      if (MODES[state.mode].fields.includes('x2')) {
        if (state.drag === 'x1') x = Math.min(x, readNumber('x2'));
        else x = Math.max(x, readNumber('x1'));
      }
      $(state.drag).value = x.toFixed(Math.max(0, -e10));
      run();
    });
    const end = () => { if (state.drag) { state.drag = null; run(); } };
    svg.addEventListener('pointerup', end);
    svg.addEventListener('pointercancel', end);
  }

  /* --------------------------------------------------------------- render */
  function render(R) {
    $('resultCard').hidden = false;
    $('resultMain').textContent = R.main;
    $('resultPct').textContent = R.pct;
    $('resultPct').hidden = !R.pct;
    $('resultSub').textContent = R.sub;
    $('explanation').textContent = R.explanation;
    $('measures').innerHTML = R.measures.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('');
    $('steps').innerHTML = R.steps.map((t) => `<li>${t}</li>`).join('');
    $('stepsNote').textContent = R.note;
    $('rCode').textContent = R.r;
    $('excelEs').textContent = R.excelEs;
    $('excelEn').textContent = R.excelEn;
    $('dragHint').hidden = !R.markers.some((m) => m.field);
    renderRelated(R.related);
    if (!state.drag) updateZTable(R);
    drawChart(R);
  }

  function run(showErrors = false) {
    const inp = validate();
    const err = $('error');
    if (inp.error) {
      if (showErrors) { err.textContent = inp.error; err.hidden = false; }
      return false;
    }
    err.hidden = true;
    state.last = compute(inp);
    render(state.last);
    return true;
  }

  function setMode(mode) {
    state.mode = mode;
    const cfg = MODES[mode];
    document.querySelectorAll('.mode-btn').forEach((b) => b.classList.toggle('active', b.dataset.mode === mode));
    document.querySelectorAll('[data-show]').forEach((el) => { el.hidden = !cfg.fields.includes(el.dataset.show); });
    if (cfg.x1Label) $('x1Label').textContent = cfg.x1Label;
    if (cfg.pLabel) $('pLabel').textContent = cfg.pLabel;
    state.range = null;
    $('error').hidden = true;
    run();
  }

  /* -------------------------------------------------------------- exportar */
  function svgString() {
    const svg = $('chart').cloneNode(true);
    svg.setAttribute('width', svg.getAttribute('viewBox').split(' ')[2]);
    svg.setAttribute('height', svg.getAttribute('viewBox').split(' ')[3]);
    return new XMLSerializer().serializeToString(svg);
  }

  function download(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  function savePng() {
    const svg = $('chart');
    const [, , w, h] = svg.getAttribute('viewBox').split(' ').map(Number);
    const img = new Image();
    const url = URL.createObjectURL(new Blob([svgString()], { type: 'image/svg+xml;charset=utf-8' }));
    img.onload = () => {
      const scale = 2;
      const c = document.createElement('canvas');
      c.width = w * scale; c.height = h * scale;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob((b) => download(b, 'distribucion-normal.png'), 'image/png');
    };
    img.src = url;
  }

  /* ------------------------------------------------------------- tabla Z */
  const zt = { view: null, key: '', zs: [] };

  function zTableHits(R) {
    // valores z del cálculo actual, redondeados a 2 decimales como en la tabla impresa
    return R.markers.map((m) => (m.x - R.mu) / R.sigma).filter(Number.isFinite);
  }

  function zRowCol(z) {
    const r = Math.round(Math.abs(z) * 100); // centésimos
    return { neg: z < 0 || Object.is(z, -0), row: Math.floor(r / 10) / 10, col: (r % 10) / 100, z2: (z < 0 ? -r : r) / 100 };
  }

  function renderZTable() {
    const type = $('ztType').value;
    const view = type === 'mean' ? 'pos' : zt.view;
    document.querySelectorAll('[data-zview]').forEach((b) => {
      b.classList.toggle('active', b.dataset.zview === view);
      b.disabled = type === 'mean' && b.dataset.zview !== 'pos';
    });
    const { stdCdf } = window.NormalDist;
    const val = (z) => (type === 'cdf' ? stdCdf(z) : stdCdf(Math.abs(z)) - 0.5);
    const hits = zt.zs.filter((z) => Math.abs(z) < 3.495).map(zRowCol);
    const isHit = (neg, row, col) => hits.some((h) => (type === 'mean' || h.neg === neg) && h.row === row && h.col === col);
    const rowHit = (neg, row) => hits.some((h) => (type === 'mean' || h.neg === neg) && h.row === row);
    const colHit = (col) => hits.some((h) => h.col === col);

    const cols = [...Array(10)].map((_, i) => i / 100);
    let html = '<thead><tr><th>z</th>' + cols.map((c) => `<th class="${colHit(c) ? 'cross' : ''}">${c.toFixed(2)}</th>`).join('') + '</tr></thead><tbody>';
    const rows = [];
    if (view !== 'pos') for (let r = 34; r >= 0; r--) rows.push({ neg: true, row: r / 10 });
    if (view !== 'neg') for (let r = 0; r <= 34; r++) rows.push({ neg: false, row: r / 10 });
    rows.forEach(({ neg, row }, i) => {
      const sep = view === 'all' && i > 0 && !neg && rows[i - 1].neg;
      const rh = rowHit(neg, row);
      html += `<tr class="${sep ? 'zt-sep' : ''}${rh ? ' zt-row-hit' : ''}"><th class="${rh ? 'cross' : ''}">${neg ? '−' : ''}${row.toFixed(1)}</th>`;
      cols.forEach((c) => {
        const z = (neg ? -1 : 1) * (row + c);
        const hit = isHit(neg, row, c);
        const cls = hit ? 'hit' : (rh || colHit(c) ? 'cross' : '');
        html += `<td class="${cls}" title="z = ${fmt(z, 2)}">${val(z).toFixed(4)}</td>`;
      });
      html += '</tr>';
    });
    $('ztable').innerHTML = html + '</tbody>';

    // explicación de la búsqueda
    const info = zt.zs.map((z) => {
      const h = zRowCol(z);
      if (Math.abs(z) >= 3.495) return `<span class="zt-chip">z = ${fmt(z, 4)}</span> queda fuera de la tabla (|z| ≥ 3.5): Φ(z) ≈ ${z < 0 ? '0' : '1'} (valor exacto: ${fmt(stdCdf(z))}).`;
      const tv = type === 'cdf' ? stdCdf(h.z2) : stdCdf(Math.abs(h.z2)) - 0.5;
      const label = type === 'cdf' ? `Φ(${fmt(h.z2, 2)})` : `P(0 ≤ Z ≤ ${fmt(Math.abs(h.z2), 2)})`;
      const rounded = fmt(z, 4) !== fmt(h.z2, 4) ? ` (redondeado de ${fmt(z, 4)})` : '';
      return `<span class="zt-chip">z = ${fmt(h.z2, 2)}</span>${rounded} → fila <b>${h.neg && type === 'cdf' ? '−' : ''}${h.row.toFixed(1)}</b>, columna <b>${h.col.toFixed(2)}</b> → ${label} = <b>${tv.toFixed(4)}</b>`;
    });
    $('ztInfo').innerHTML = info.join('<br>');
    scrollZTable();
  }

  function scrollZTable() {
    const wrap = $('ztWrap');
    const cell = wrap.querySelector('td.hit');
    if (!cell || !wrap.offsetParent) return;
    const row = cell.parentElement;
    wrap.scrollTop = row.offsetTop - wrap.clientHeight / 2 + row.offsetHeight / 2;
  }

  function updateZTable(R) {
    zt.zs = zTableHits(R);
    const key = zt.zs.map((z) => z.toFixed(2)).join('|');
    if (key !== zt.key || !zt.view) {
      zt.key = key;
      const anyNeg = zt.zs.some((z) => z < 0), anyPos = zt.zs.some((z) => z >= 0);
      zt.view = anyNeg && anyPos ? 'all' : anyNeg ? 'neg' : 'pos';
    }
    renderZTable();
  }

  function initZTable() {
    document.querySelectorAll('[data-zview]').forEach((b) => b.addEventListener('click', () => { zt.view = b.dataset.zview; renderZTable(); }));
    $('ztType').addEventListener('change', renderZTable);
    document.querySelector('details[data-fold="ztable"]').addEventListener('toggle', scrollZTable);
  }

  /* ------------------------------------------------- secciones desplegables */
  function initFolds() {
    const KEY = 'normal-calc-folds';
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (_) { /* sin almacenamiento */ }
    const folds = document.querySelectorAll('details[data-fold]');
    folds.forEach((f) => {
      if (saved[f.dataset.fold] !== undefined) f.open = saved[f.dataset.fold];
      f.addEventListener('toggle', () => {
        saved[f.dataset.fold] = f.open;
        try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch (_) { /* nada */ }
      });
    });
    const resultFolds = () => $('resultCard').querySelectorAll('details.fold');
    $('expandAll').addEventListener('click', () => resultFolds().forEach((f) => { f.open = true; }));
    $('collapseAll').addEventListener('click', () => resultFolds().forEach((f) => { f.open = false; }));
    // el enlace "Teoría" del menú abre la sección
    document.querySelectorAll('a[href="#theory"]').forEach((a) => a.addEventListener('click', () => { $('theory').open = true; }));
    // al imprimir se muestran todas las secciones
    let before = [];
    window.addEventListener('beforeprint', () => { before = [...resultFolds()].map((f) => f.open); resultFolds().forEach((f) => { f.open = true; }); });
    window.addEventListener('afterprint', () => resultFolds().forEach((f, i) => { f.open = before[i]; }));
  }

  /* ------------------------------------------------------------- eventos */
  function init() {
    document.querySelectorAll('.mode-btn').forEach((b) => {
      b.insertAdjacentHTML('afterbegin', modeIcon(b.dataset.mode));
      b.addEventListener('click', () => setMode(b.dataset.mode));
    });

    ['mu', 'sigma', 'x1', 'x2', 'p'].forEach((id) => {
      $(id).addEventListener('input', () => { state.range = null; run(); });
      $(id).addEventListener('keydown', (e) => { if (e.key === 'Enter') run(true); });
    });
    ['pType', 'decimals', 'range'].forEach((id) => $(id).addEventListener('change', () => { state.range = null; run(); }));
    ['showLabels', 'showSigma', 'fontScale'].forEach((id) => $(id).addEventListener('change', () => state.last && drawChart(state.last)));

    $('calcBtn').addEventListener('click', () => {
      state.range = null;
      if (run(true)) $('resultCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    $('clearBtn').addEventListener('click', () => {
      ['x1', 'x2', 'p'].forEach((id) => { $(id).value = ''; });
      markInvalid([]);
      $('error').hidden = true;
      $('resultCard').hidden = true;
    });
    $('exampleBtn').addEventListener('click', () => {
      $('mu').value = 20; $('sigma').value = 5; $('x1').value = 18; $('x2').value = 22; $('p').value = 0.95;
      state.range = null;
      run(true);
    });

    document.querySelectorAll('[data-quick]').forEach((b) => b.addEventListener('click', () => {
      const q = b.dataset.quick;
      if (q === 'std') {
        $('mu').value = 0; $('sigma').value = 1;
      } else {
        const mu = readNumber('mu'), sigma = readNumber('sigma');
        if (!Number.isFinite(mu) || !(sigma > 0)) { run(true); return; }
        const k = Number(q);
        $('x1').value = +(mu - k * sigma).toPrecision(12);
        $('x2').value = +(mu + k * sigma).toPrecision(12);
        if (state.mode !== 'between' && state.mode !== 'tails') { setMode('between'); return; }
      }
      state.range = null;
      run(true);
    }));

    $('savePng').addEventListener('click', savePng);
    $('saveSvg').addEventListener('click', () => download(new Blob([svgString()], { type: 'image/svg+xml' }), 'distribucion-normal.svg'));
    $('printBtn').addEventListener('click', () => window.print());

    document.querySelectorAll('.copy').forEach((b) => b.addEventListener('click', async () => {
      const text = $(b.dataset.copy).textContent;
      try { await navigator.clipboard.writeText(text); } catch (_) {
        const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
        document.execCommand('copy'); ta.remove();
      }
      b.textContent = '¡Copiado!'; b.classList.add('done');
      setTimeout(() => { b.textContent = 'Copiar'; b.classList.remove('done'); }, 1500);
    }));

    setupDrag();
    initFolds();
    initZTable();
    setMode('left');
  }

  document.addEventListener('DOMContentLoaded', init);
})();
