/* =========================================================================
 *  Intervalo de confianza para la media (σ conocida)
 * ========================================================================= */
(function () {
  'use strict';

  const { stdInv, stdPdf } = window.NormalDist;
  const $ = (id) => document.getElementById(id);

  /* -------------------------------------------------------------- formatos */
  const decimals = () => parseInt($('ciDecimals').value, 10);
  function fmt(v, d = decimals()) {
    if (!Number.isFinite(v)) return 'NaN';
    const s = String(parseFloat(v.toFixed(d)));
    return (s === '-0' ? '0' : s).replace('-', '−');
  }
  const code = (v) => String(v);

  /* ------------------------------------------------------------- cálculo */
  function readNum(id) {
    const v = $(id).value.trim();
    return v === '' ? NaN : Number(v);
  }

  function ciValidate() {
    const n = readNum('ciN'), mean = readNum('ciMean'), raw = readNum('ciSd'), conf = readNum('ciConf');
    const isVar = $('ciDisp').value === 'var';
    const sd = isVar ? Math.sqrt(raw) : raw; // si el dato es la varianza, el desvío es su raíz
    const bad = [], msgs = [];
    if (!(Number.isInteger(n) && n >= 1)) { bad.push('ciN'); msgs.push('El tamaño de la muestra (n) debe ser un número entero mayor o igual a 1.'); }
    if (!Number.isFinite(mean)) { bad.push('ciMean'); msgs.push('Ingresá una media muestral (x̄) válida.'); }
    if (!(raw > 0)) { bad.push('ciSd'); msgs.push(isVar ? 'La varianza debe ser mayor que 0.' : 'La desviación estándar debe ser mayor que 0.'); }
    if (!(conf > 0 && conf < 100)) { bad.push('ciConf'); msgs.push('El nivel de confianza debe estar entre 0 y 100 %.'); }
    ['ciN', 'ciMean', 'ciSd', 'ciConf'].forEach((id) => $(id).classList.toggle('invalid', bad.includes(id)));
    return msgs.length ? { error: msgs.join(' ') } : { n, mean, sd, conf, raw, isVar };
  }

  function ciCompute({ n, mean, sd, conf }) {
    const c = conf / 100, alpha = 1 - c;
    const z = stdInv(1 - alpha / 2);
    const se = sd / Math.sqrt(n);
    const E = z * se;
    return { n, mean, sd, conf, c, alpha, z, se, E, lo: mean - E, hi: mean + E };
  }

  /* ------------------------------------------------------------ render */
  function ciRender(r) {
    const sdName = $('ciSdType').value === 'pop' ? 'σ' : 's';
    const varStep = r.isVar ? `Desvío a partir de la varianza: ${sdName} = √${sdName}² = √${fmt(r.raw)} = <b>${fmt(r.sd)}</b>` : null;
    $('ciResult').hidden = false;
    $('ciMain').textContent = `IC ${fmt(r.conf, 4)} %: [${fmt(r.lo)} ; ${fmt(r.hi)}]`;
    $('ciPm').textContent = `x̄ ± E = ${fmt(r.mean)} ± ${fmt(r.E)}`;
    $('ciSub').textContent = `z = ${fmt(r.z)},  error estándar = ${fmt(r.se)},  ancho = ${fmt(2 * r.E)}`;

    const warn = $('ciWarn');
    if ($('ciSdType').value === 'sample' && r.n < 30) {
      warn.innerHTML = `⚠ Con la desviación <b>muestral</b> s y una muestra chica (n = ${r.n} &lt; 30), lo recomendable es usar la distribución <b>t de Student</b> con ${r.n - 1} grados de libertad. El resultado con z es solo una aproximación.`;
      warn.hidden = false;
    } else if ($('ciSdType').value === 'sample') {
      warn.innerHTML = `Usás la desviación muestral s con n = ${r.n} ≥ 30: la aproximación con z es razonable.`;
      warn.hidden = false;
    } else {
      warn.hidden = true;
    }

    $('ciExplanation').textContent =
      `Con un ${fmt(r.conf, 4)} % de confianza, la media poblacional μ se encuentra entre ${fmt(r.lo)} y ${fmt(r.hi)}. ` +
      `El intervalo se centra en la media muestral (${fmt(r.mean)}) y se extiende ${fmt(r.E)} hacia cada lado (margen de error).`;

    $('ciMeasures').innerHTML = [
      ['Tamaño de la muestra (n)', r.n], ['Media muestral (x̄)', fmt(r.mean)],
      [`Varianza (${sdName}²)`, fmt(r.sd * r.sd)], [`Desviación estándar (${sdName} = √${sdName}²)`, fmt(r.sd)],
      ['Nivel de confianza (1 − α)', `${fmt(r.conf, 4)} %`], ['α', fmt(r.alpha, 6)], ['Valor crítico z<sub>α/2</sub>', fmt(r.z)],
      [`Error estándar (${sdName}/√n)`, fmt(r.se)], ['Margen de error (E)', fmt(r.E)],
      ['Límite inferior', fmt(r.lo)], ['Límite superior', fmt(r.hi)], ['Ancho del intervalo (2E)', fmt(2 * r.E)],
    ].map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('');

    // otros niveles
    const levels = [80, 85, 90, 95, 98, 99, 99.5, 99.9];
    if (!levels.includes(r.conf)) levels.push(r.conf);
    levels.sort((a, b) => a - b);
    $('ciLevels').innerHTML = '<thead><tr><th>Confianza</th><th>z<sub>α/2</sub></th><th>Margen E</th><th>Intervalo</th></tr></thead><tbody>' +
      levels.map((lv) => {
        const o = ciCompute({ n: r.n, mean: r.mean, sd: r.sd, conf: lv });
        return `<tr class="${lv === r.conf ? 'current' : ''}"><td>${fmt(lv, 4)} %</td><td>${fmt(o.z)}</td><td>${fmt(o.E)}</td><td>[${fmt(o.lo)} ; ${fmt(o.hi)}]</td></tr>`;
      }).join('') + '</tbody>';

    // tamaño de muestra
    if ($('ciE').value === '' || ciState.autoE) {
      $('ciE').value = +(r.E / 2).toPrecision(4);
      ciState.autoE = true;
    }
    ciSize(r);

    // paso a paso
    const a2 = r.alpha / 2;
    $('ciSteps').innerHTML = [
      varStep,
      `Nivel de confianza: 1 − α = ${fmt(r.c, 6)}  →  α = ${fmt(r.alpha, 6)}  →  α/2 = ${fmt(a2, 6)}`,
      `Valor crítico: z<sub>α/2</sub> = Φ⁻¹(1 − α/2) = Φ⁻¹(${fmt(1 - a2, 6)}) = <b>${fmt(r.z)}</b>`,
      `Error estándar: ${sdName}/√n = ${fmt(r.sd)} / √${r.n} = ${fmt(r.sd)} / ${fmt(Math.sqrt(r.n))} = <b>${fmt(r.se)}</b>`,
      `Margen de error: E = z<sub>α/2</sub> · ${sdName}/√n = ${fmt(r.z)} × ${fmt(r.se)} = <b>${fmt(r.E)}</b>`,
      `Límites: x̄ − E = ${fmt(r.mean)} − ${fmt(r.E)} = <b>${fmt(r.lo)}</b>;  x̄ + E = ${fmt(r.mean)} + ${fmt(r.E)} = <b>${fmt(r.hi)}</b>`,
    ].filter(Boolean).map((t) => `<li>${t}</li>`).join('');

    // resolución tipificando (como en clase)
    const zf = fmt(r.z), se = fmt(r.se), m = fmt(r.mean);
    $('ciStdSteps').innerHTML = [
      varStep,
      `En la normal estándar N(0 ; 1), el ${fmt(r.conf, 4)} % central está entre −z y z: P(−z ≤ Z ≤ z) = ${fmt(r.c, 6)}  →  z = ${zf}  →  <b>IC(−${zf} ; ${zf})</b>`,
      `La media muestral se distribuye x̄ ~ N(μ ; ${sdName}²/n), con ${sdName}²/n = ${fmt(r.sd * r.sd)}/${r.n} = ${fmt(r.se * r.se)}, es decir, un desvío de ${sdName}/√n = ${fmt(r.sd)}/√${r.n} = <b>${se}</b>`,
      `Tipificamos: Z = (x̄ − μ) / (${sdName}/√n) = (${m} − μ) / ${se}`,
      `Planteamos el intervalo: −${zf} ≤ (${m} − μ) / ${se} ≤ ${zf}`,
      `Multiplicamos todo por ${se}: −${zf} × ${se} ≤ ${m} − μ ≤ ${zf} × ${se}  →  −${fmt(r.E)} ≤ ${m} − μ ≤ ${fmt(r.E)}`,
      `Despejamos μ: ${m} − ${fmt(r.E)} ≤ μ ≤ ${m} + ${fmt(r.E)}`,
      `<b>IC = (${fmt(r.lo)} ; ${fmt(r.hi)})</b>`,
    ].filter(Boolean).map((t) => `<li>${t}</li>`).join('');

    // Excel
    const A = code(+r.alpha.toPrecision(12)), N = code(r.n), M = code(r.mean);
    let S = code(r.sd);
    const Sen = r.isVar ? `SQRT(${code(r.raw)})` : S;
    if (r.isVar) S = `RAIZ(${code(r.raw)})`;
    $('ciExcelEs').textContent =
      `Margen de error:   =INTERVALO.CONFIANZA.NORM(${A}; ${S}; ${N})\n` +
      `Límite inferior:   =${M} - INTERVALO.CONFIANZA.NORM(${A}; ${S}; ${N})\n` +
      `Límite superior:   =${M} + INTERVALO.CONFIANZA.NORM(${A}; ${S}; ${N})\n` +
      `Valor crítico z:   =INV.NORM.ESTAND(1 - ${A}/2)`;
    $('ciExcelEn').textContent =
      `Margin of error:   =CONFIDENCE.NORM(${A}, ${Sen}, ${N})\n` +
      `Lower limit:       =${M} - CONFIDENCE.NORM(${A}, ${Sen}, ${N})\n` +
      `Upper limit:       =${M} + CONFIDENCE.NORM(${A}, ${Sen}, ${N})\n` +
      `Critical z:        =NORM.S.INV(1 - ${A}/2)`;

    ciChart(r);
  }

  const ciState = { last: null, autoE: true };

  function ciSize(r) {
    const E = readNum('ciE');
    const out = $('ciSizeOut');
    if (!(E > 0)) { out.innerHTML = 'Ingresá un margen de error mayor que 0.'; return; }
    const raw = Math.pow(r.z * r.sd / E, 2);
    const n = Math.ceil(raw - 1e-9);
    out.innerHTML = `n = (${fmt(r.z)} × ${fmt(r.sd)} / ${fmt(E)})² = ${fmt(raw)}  →  <b>n = ${n}</b> observaciones` +
      (n > r.n ? ` (${n - r.n} más que tu muestra actual).` : ' (tu muestra actual ya alcanza).');
  }

  /* ------------------------------------------------------------- gráfico */
  function niceTicks(lo, hi, target = 8) {
    const raw = (hi - lo) / target;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const norm = raw / mag;
    const step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;
    const t = [];
    for (let v = Math.ceil(lo / step) * step; v <= hi + step * 1e-9; v += step) t.push(Math.abs(v) < step * 1e-9 ? 0 : v);
    return t;
  }

  function ciChart(r) {
    const W = 800, L = 30, Rt = 30, T = 36, plotH = 250, base = T + plotH, H = base + 72;
    const lo = r.mean - 4 * r.se, hi = r.mean + 4 * r.se;
    const pdf = (x) => stdPdf((x - r.mean) / r.se);
    const X = (x) => L + (x - lo) / (hi - lo) * (W - L - Rt);
    const Y = (y) => base - y / (stdPdf(0) * 1.12) * plotH;
    const font = 'font-family="Segoe UI, Arial, sans-serif"';
    const area = (a, b) => {
      a = Math.max(a, lo); b = Math.min(b, hi);
      if (b <= a) return '';
      let d = `M${X(a)},${base}`;
      for (let i = 0; i <= 160; i++) { const x = a + (b - a) * i / 160; d += `L${X(x).toFixed(2)},${Y(pdf(x)).toFixed(2)}`; }
      return d + `L${X(b)},${base}Z`;
    };
    const pctTxt = (p) => `${fmt(p * 100, 2)} %`;
    let s = `<defs><linearGradient id="ciShade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8b5cf6" stop-opacity=".9"/><stop offset="1" stop-color="#c4b5fd" stop-opacity=".3"/></linearGradient></defs>`;
    s += `<rect width="${W}" height="${H}" fill="#fff"/>`;
    niceTicks(lo, hi).forEach((t) => {
      s += `<line x1="${X(t)}" y1="${T - 14}" x2="${X(t)}" y2="${base}" stroke="#eef0f3"/>`;
      s += `<text x="${X(t)}" y="${base + 20}" text-anchor="middle" font-size="13" fill="#4b5563" ${font}>${fmt(t, 6)}</text>`;
    });
    s += `<path d="${area(lo, r.lo)}" fill="#e5e7eb" fill-opacity=".7"/><path d="${area(r.hi, hi)}" fill="#e5e7eb" fill-opacity=".7"/>`;
    s += `<path d="${area(r.lo, r.hi)}" fill="url(#ciShade)"/>`;
    let curve = '';
    for (let i = 0; i <= 400; i++) { const x = lo + (hi - lo) * i / 400; curve += `${i ? 'L' : 'M'}${X(x).toFixed(2)},${Y(pdf(x)).toFixed(2)}`; }
    s += `<path d="${curve}" fill="none" stroke="#0f172a" stroke-width="1.7"/>`;
    s += `<line x1="${L}" y1="${base}" x2="${W - Rt}" y2="${base}" stroke="#6b7280" stroke-width="1.2"/>`;

    // etiquetas
    const label = (x, y, t, color) => `<text x="${X(x)}" y="${y}" text-anchor="middle" font-size="15" font-weight="700" fill="${color}" stroke="#fff" stroke-width="3.5" paint-order="stroke" ${font}>${t}</text>`;
    const tailX = Math.max(r.lo - 0.9 * r.se, lo + 0.5 * r.se);
    s += label(tailX, Y(pdf(tailX)) - 12, `α/2 = ${pctTxt(r.alpha / 2)}`, '#374151');
    const tailX2 = Math.min(r.hi + 0.9 * r.se, hi - 0.5 * r.se);
    s += label(tailX2, Y(pdf(tailX2)) - 12, `α/2 = ${pctTxt(r.alpha / 2)}`, '#374151');

    // líneas y marcadores
    [[r.lo, '#2563eb', 'LI'], [r.mean, '#7c3aed', 'x̄'], [r.hi, '#2563eb', 'LS']].forEach(([x, color, tag]) => {
      if (x < lo || x > hi) return;
      s += `<line x1="${X(x)}" y1="${base}" x2="${X(x)}" y2="${Y(pdf(x))}" stroke="${color}" stroke-width="1.5" stroke-dasharray="${tag === 'x̄' ? '' : '5,3'}"/>`;
      s += `<circle cx="${X(x)}" cy="${Y(pdf(x))}" r="6" fill="#fff" stroke="${color}" stroke-width="3"/>`;
      const txt = `${tag} = ${fmt(x)}`;
      const bw = txt.length * 7.6 + 16;
      s += `<rect x="${X(x) - bw / 2}" y="${base + 32}" width="${bw}" height="22" rx="11" fill="${color}"/>`;
      s += `<text x="${X(x)}" y="${base + 47}" text-anchor="middle" font-size="12.5" font-weight="700" fill="#fff" ${font}>${txt}</text>`;
    });
    s += label(r.mean, base - plotH * 0.38, pctTxt(r.c), '#5b21b6');
    // corchete del margen de error
    const by = T - 6;
    s += `<path d="M${X(r.lo)},${by + 6} V${by} H${X(r.hi)} V${by + 6}" fill="none" stroke="#7c3aed" stroke-width="1.5"/>`;
    s += `<text x="${X(r.mean)}" y="${by - 6}" text-anchor="middle" font-size="12.5" fill="#5b21b6" ${font}>x̄ ± E  (E = ${fmt(r.E)})</text>`;

    const svg = $('ciChart');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.innerHTML = s;
  }

  /** El rótulo del campo cambia según el dato sea el desvío o la varianza. */
  function syncSdLabel() {
    const n = $('ciSdType').value === 'pop' ? 'σ' : 's';
    $('ciSdLabel').textContent = $('ciDisp').value === 'var' ? `Varianza (${n}²)` : `Desviación estándar (${n})`;
    $('ciDisp').options[0].text = `Desviación estándar (${n})`;
    $('ciDisp').options[1].text = `Varianza (${n}²)`;
  }

  /* ------------------------------------------------------------- control */
  function ciRun(showErrors = false) {
    if (showErrors) $('ciResult').dataset.started = '1'; // ya se tocó "Calcular"
    const inp = ciValidate();
    if (inp.error) {
      if (showErrors) { $('ciError').textContent = inp.error; $('ciError').hidden = false; }
      return false;
    }
    $('ciError').hidden = true;
    ciState.last = Object.assign(ciCompute(inp), { isVar: inp.isVar, raw: inp.raw });
    ciRender(ciState.last);
    return true;
  }

  /** Después del primer "Calcular", los cambios se recalculan al instante. */
  const liveUpdate = () => { if ($('ciResult').dataset.started) ciRun(); };

  function init() {
    ['ciN', 'ciMean', 'ciSd', 'ciConf'].forEach((id) => {
      $(id).addEventListener('input', liveUpdate);
      $(id).addEventListener('keydown', (e) => { if (e.key === 'Enter') ciRun(true); });
    });
    $('ciSdType').addEventListener('change', () => { syncSdLabel(); liveUpdate(); });
    $('ciDisp').addEventListener('change', () => { syncSdLabel(); liveUpdate(); });
    syncSdLabel();
    $('ciDecimals').addEventListener('change', () => { liveUpdate(); });
    $('ciE').addEventListener('input', () => { ciState.autoE = false; if (ciState.last) ciSize(ciState.last); });
    document.querySelectorAll('[data-ci-conf]').forEach((b) => b.addEventListener('click', () => { $('ciConf').value = b.dataset.ciConf; liveUpdate(); }));
    $('ciCalcBtn').addEventListener('click', () => { if (ciRun(true)) $('ciResult').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    $('ciClearBtn').addEventListener('click', () => {
      delete $('ciResult').dataset.started;
      ['ciN', 'ciMean', 'ciSd'].forEach((id) => { $(id).value = ''; $(id).classList.remove('invalid'); });
      $('ciError').hidden = true; $('ciResult').hidden = true; ciState.autoE = true; $('ciE').value = '';
    });
    $('ciExampleBtn').addEventListener('click', () => {
      $('ciN').value = 60; $('ciMean').value = 998.6; $('ciSd').value = 3.2; $('ciConf').value = 95; $('ciDisp').value = 'sd'; syncSdLabel();
      ciState.autoE = true; $('ciE').value = '';
      ['ciN', 'ciMean', 'ciSd', 'ciConf'].forEach((id) => $(id).classList.remove('invalid'));
      liveUpdate();
    });
    const folds = () => $('ciResult').querySelectorAll('details.fold');
    $('ciExpandAll').addEventListener('click', () => folds().forEach((f) => { f.open = true; }));
    $('ciCollapseAll').addEventListener('click', () => folds().forEach((f) => { f.open = false; }));
  }

  document.addEventListener('DOMContentLoaded', init);
})();
