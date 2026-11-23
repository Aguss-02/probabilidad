/* =========================================================================
 *  Regresión lineal simple: recta de mínimos cuadrados, r, R², predicción
 * ========================================================================= */
(function () {
  'use strict';

  const { $, readNum, niceTicks, wireFoldButtons, showError } = window.Calc;
  const dec = () => parseInt($('rDecimals').value, 10);
  const fmt = (v, d = dec()) => window.Calc.fmt(v, d);
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const EXAMPLE = {
    xName: 'Horas de estudio', yName: 'Nota', x0: 7.5,
    data: [[1, 52], [2, 55], [3, 61], [4, 60], [5, 68], [6, 71], [7, 75], [8, 74], [9, 82], [10, 88]],
  };

  const state = { last: null };

  /* ---------------------------------------------------------- lectura de datos */
  function parse(text) {
    const pts = [], bad = [];
    let header = null;
    text.split(/\r?\n/).forEach((line, i) => {
      const t = line.trim();
      if (!t) return;
      let parts;
      if (t.includes('\t')) parts = t.split(/\t+/);
      else if (t.includes(';')) parts = t.split(/\s*;\s*/);
      else if (/\s/.test(t)) parts = t.split(/\s+/);
      else parts = t.split(',');
      parts = parts.map((p) => p.trim()).filter((p) => p !== '');
      const nums = parts.map((p) => Number(p.replace(',', '.')));
      if (parts.length === 2 && nums.every(Number.isFinite)) { pts.push(nums); return; }
      if (!pts.length && !bad.length && !header && parts.length === 2) { header = parts; return; } // encabezado
      bad.push(i + 1);
    });
    return { pts, bad, header };
  }

  function strength(r) {
    const a = Math.abs(r);
    if (a < 0.2) return 'muy débil';
    if (a < 0.4) return 'débil';
    if (a < 0.6) return 'moderada';
    if (a < 0.8) return 'fuerte';
    return 'muy fuerte';
  }

  /* ---------------------------------------------------------- cálculo */
  function compute(pts, x0) {
    const n = pts.length;
    let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0;
    pts.forEach(([x, y]) => { sx += x; sy += y; sxx += x * x; syy += y * y; sxy += x * y; });
    const mx = sx / n, my = sy / n;
    let Sxx = 0, Syy = 0, Sxy = 0;
    pts.forEach(([x, y]) => { Sxx += (x - mx) ** 2; Syy += (y - my) ** 2; Sxy += (x - mx) * (y - my); });
    const b1 = Sxy / Sxx, b0 = my - b1 * mx;
    const r = Syy > 0 ? Sxy / Math.sqrt(Sxx * Syy) : NaN;
    const rows = pts.map(([x, y]) => { const yh = b0 + b1 * x; return { x, y, yh, e: y - yh }; });
    const SSE = rows.reduce((s, o) => s + o.e * o.e, 0);
    const SST = Syy, SSR = Math.max(SST - SSE, 0);
    const R2 = Syy > 0 ? Math.min(Math.max(SSR / SST, 0), 1) : NaN;
    const se = n > 2 ? Math.sqrt(SSE / (n - 2)) : NaN;
    const xs = pts.map((p) => p[0]);
    const xmin = Math.min(...xs), xmax = Math.max(...xs);
    const pred = Number.isFinite(x0) ? { x0, y0: b0 + b1 * x0, extrap: x0 < xmin || x0 > xmax } : null;
    return {
      n, sx, sy, sxx, syy, sxy, mx, my, Sxx, Syy, Sxy, b0, b1, r, R2, SSE, SSR, SST, se, rows, xmin, xmax, pred,
      sdx: Math.sqrt(Sxx / (n - 1)), sdy: Math.sqrt(Syy / (n - 1)), cov: Sxy / (n - 1),
    };
  }

  /** Recta en la forma y = ax + b (a = pendiente, b = ordenada al origen). */
  function equation(b, a, xName = 'x') {
    return `y = ${fmt(a)}${xName} ${b < 0 ? '−' : '+'} ${fmt(Math.abs(b))}`;
  }
  /** a · x + b con los números reemplazados. */
  const substLine = (c, x) => `${fmt(c.b1)} · ${fmt(x)} ${c.b0 < 0 ? '−' : '+'} ${fmt(Math.abs(c.b0))}`;

  /* ---------------------------------------------------------- render */
  function render(c) {
    const xn = $('rXName').value.trim() || 'x', yn = $('rYName').value.trim() || 'y';
    const xS = esc(xn), yS = esc(yn);
    $('rResult').hidden = false;
    $('rMain').textContent = equation(c.b0, c.b1);
    $('rStats').innerHTML = [
      ['r', Number.isFinite(c.r) ? fmt(c.r) : 'indefinido'],
      ['R²', Number.isFinite(c.R2) ? fmt(c.R2) : 'indefinido'],
      ['n', c.n],
      ...(c.pred ? [[`y(${fmt(c.pred.x0)})`, fmt(c.pred.y0)]] : []),
    ].map(([k, v]) => `<span class="stat-chip"><small>${k}</small><b>${v}</b></span>`).join('');
    $('rSub').textContent = Number.isFinite(c.r)
      ? `Correlación ${c.r >= 0 ? 'positiva' : 'negativa'} ${strength(c.r)} · error estándar de la estimación = ${Number.isFinite(c.se) ? fmt(c.se) : '—'}`
      : 'Todos los valores de Y son iguales: la recta es horizontal y r no está definido.';

    // avisos
    const warns = [];
    if (c.pred && c.pred.extrap) warns.push(`⚠ x = ${fmt(c.pred.x0)} está fuera del rango observado de ${xS} (${fmt(c.xmin)} a ${fmt(c.xmax)}): es una <b>extrapolación</b> y la predicción puede no ser confiable.`);
    if (c.n < 5) warns.push(`Hay pocos datos (n = ${c.n}); los resultados pueden cambiar mucho con un punto más.`);
    if (state.bad && state.bad.length) warns.push(`Se ignoró ${state.bad.length === 1 ? 'la línea' : 'las líneas'} ${state.bad.slice(0, 10).join(', ')}${state.bad.length > 10 ? '…' : ''} porque no ${state.bad.length === 1 ? 'tiene' : 'tienen'} exactamente dos números.`);
    $('rWarn').innerHTML = warns.join('<br>');
    $('rWarn').hidden = !warns.length;

    // interpretación
    const dir = c.b1 >= 0 ? 'aumenta' : 'disminuye';
    const p = [];
    p.push(`<b>Pendiente (a = ${fmt(c.b1)}):</b> por cada unidad que aumenta ${xS}, ${yS} ${dir} en promedio ${fmt(Math.abs(c.b1))} unidades.`);
    p.push(`<b>Ordenada al origen (b = ${fmt(c.b0)}):</b> cuando ${xS} = 0, el valor estimado de ${yS} es ${fmt(c.b0)}` +
      (c.xmin > 0 || c.xmax < 0 ? ' (ojo: x = 0 está fuera del rango de los datos, así que este valor no tiene una interpretación práctica clara).' : '.'));
    if (Number.isFinite(c.r)) {
      p.push(`<b>Correlación:</b> r = ${fmt(c.r)} indica una relación lineal ${c.r >= 0 ? 'positiva' : 'negativa'} ${strength(c.r)} entre ${xS} y ${yS}.`);
      p.push(`<b>Determinación:</b> R² = ${fmt(c.R2)}, es decir, el ${fmt(c.R2 * 100, 2)} % de la variabilidad de ${yS} se explica por su relación lineal con ${xS}.`);
    }
    if (c.pred) p.push(`<b>Predicción:</b> para ${xS} = ${fmt(c.pred.x0)}, se estima ${yS} = a·x + b = ${substLine(c, c.pred.x0)} = <b>${fmt(c.pred.y0)}</b>.`);
    $('rExplanation').innerHTML = p.map((t) => `<p>${t}</p>`).join('');

    renderTable(c);
    renderMeasures(c);
    renderSteps(c);
    renderExcel(c);
    drawChart(c, xn, yn);
  }

  function renderTable(c) {
    let html = '<thead><tr><th>#</th><th>x</th><th>y</th><th>ŷ = ax + b (estimado)</th><th>Residuo e = y − ŷ</th><th>e²</th></tr></thead><tbody>';
    c.rows.forEach((o, i) => { html += `<tr><td>${i + 1}</td><td>${fmt(o.x)}</td><td>${fmt(o.y)}</td><td>${fmt(o.yh)}</td><td>${fmt(o.e)}</td><td>${fmt(o.e * o.e)}</td></tr>`; });
    html += `<tr class="current"><td>Σ</td><td>${fmt(c.sx)}</td><td>${fmt(c.sy)}</td><td>${fmt(c.rows.reduce((s, o) => s + o.yh, 0))}</td><td>${fmt(c.rows.reduce((s, o) => s + o.e, 0))}</td><td>${fmt(c.SSE)}</td></tr></tbody>`;
    $('rTable').innerHTML = html;
  }

  function renderMeasures(c) {
    $('rMeasures').innerHTML = [
      ['Cantidad de datos (n)', c.n], ['Σx', fmt(c.sx)], ['Σy', fmt(c.sy)], ['Σx²', fmt(c.sxx)], ['Σy²', fmt(c.syy)], ['Σxy', fmt(c.sxy)],
      ['Media de x (x̄)', fmt(c.mx)], ['Media de y (ȳ)', fmt(c.my)],
      ['S<sub>xx</sub> = Σ(x − x̄)²', fmt(c.Sxx)], ['S<sub>yy</sub> = Σ(y − ȳ)²', fmt(c.Syy)], ['S<sub>xy</sub> = Σ(x − x̄)(y − ȳ)', fmt(c.Sxy)],
      ['Desvío estándar de x (s<sub>x</sub>)', fmt(c.sdx)], ['Desvío estándar de y (s<sub>y</sub>)', fmt(c.sdy)], ['Covarianza muestral', fmt(c.cov)],
      ['Pendiente (a)', fmt(c.b1)], ['Ordenada al origen (b)', fmt(c.b0)],
      ['Coeficiente de correlación (r)', Number.isFinite(c.r) ? fmt(c.r) : 'indefinido'], ['Coeficiente de determinación (R²)', Number.isFinite(c.R2) ? fmt(c.R2) : 'indefinido'],
      ['Suma de cuadrados total SST', fmt(c.SST)], ['Suma de cuadrados de la regresión SSR', fmt(c.SSR)], ['Suma de cuadrados del error SSE', fmt(c.SSE)],
      ['Error estándar de la estimación s<sub>e</sub> = √(SSE/(n − 2))', Number.isFinite(c.se) ? fmt(c.se) : '—'],
    ].map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('');
  }

  function renderSteps(c) {
    const s = [
      `Sumas: n = ${c.n}, Σx = ${fmt(c.sx)}, Σy = ${fmt(c.sy)}, Σx² = ${fmt(c.sxx)}, Σy² = ${fmt(c.syy)}, Σxy = ${fmt(c.sxy)}`,
      `Medias: x̄ = Σx/n = ${fmt(c.sx)}/${c.n} = ${fmt(c.mx)};  ȳ = Σy/n = ${fmt(c.sy)}/${c.n} = ${fmt(c.my)}`,
      `S<sub>xx</sub> = Σx² − (Σx)²/n = ${fmt(c.sxx)} − ${fmt(c.sx)}²/${c.n} = ${fmt(c.Sxx)}`,
      `S<sub>yy</sub> = Σy² − (Σy)²/n = ${fmt(c.syy)} − ${fmt(c.sy)}²/${c.n} = ${fmt(c.Syy)}`,
      `S<sub>xy</sub> = Σxy − (Σx)(Σy)/n = ${fmt(c.sxy)} − ${fmt(c.sx)} · ${fmt(c.sy)}/${c.n} = ${fmt(c.Sxy)}`,
      `Pendiente: a = S<sub>xy</sub>/S<sub>xx</sub> = ${fmt(c.Sxy)}/${fmt(c.Sxx)} = <b>${fmt(c.b1)}</b>`,
      `Ordenada al origen: b = ȳ − a·x̄ = ${fmt(c.my)} − (${fmt(c.b1)}) · ${fmt(c.mx)} = <b>${fmt(c.b0)}</b>`,
      `Recta de regresión (y = ax + b): <b>${equation(c.b0, c.b1)}</b>`,
    ];
    if (Number.isFinite(c.r)) {
      s.push(`Correlación: r = S<sub>xy</sub>/√(S<sub>xx</sub>·S<sub>yy</sub>) = ${fmt(c.Sxy)}/√(${fmt(c.Sxx)} · ${fmt(c.Syy)}) = <b>${fmt(c.r)}</b>`);
      s.push(`Determinación: R² = r² = ${fmt(c.r)}² = <b>${fmt(c.R2)}</b>`);
    }
    if (c.pred) s.push(`Predicción: y = a·x + b = ${substLine(c, c.pred.x0)} = <b>${fmt(c.pred.y0)}</b>`);
    $('rSteps').innerHTML = s.map((t) => `<li>${t}</li>`).join('');
  }

  function renderExcel(c) {
    const last = c.n + 1;
    const X = `A2:A${last}`, Y = `B2:B${last}`;
    const x0 = c.pred ? String(c.pred.x0) : 'x';
    $('rExcelNote').textContent = `Suponiendo que los valores de X están en ${X} y los de Y en ${Y} (con encabezados en la fila 1).`;
    $('rExcelEs').textContent = [
      `Pendiente (a):      =PENDIENTE(${Y}; ${X})`,
      `Ordenada (b):       =INTERSECCION.EJE(${Y}; ${X})`,
      `Correlación (r):    =COEF.DE.CORREL(${X}; ${Y})`,
      `R²:                 =COEFICIENTE.R2(${Y}; ${X})`,
      `Predicción:         =PRONOSTICO.LINEAL(${x0}; ${Y}; ${X})`,
      `Error estándar:     =ERROR.TIPICO.XY(${Y}; ${X})`,
    ].join('\n');
    $('rExcelEn').textContent = [
      `Slope (a):          =SLOPE(${Y}, ${X})`,
      `Intercept (b):      =INTERCEPT(${Y}, ${X})`,
      `Correlation (r):    =CORREL(${X}, ${Y})`,
      `R²:                 =RSQ(${Y}, ${X})`,
      `Prediction:         =FORECAST.LINEAR(${x0}, ${Y}, ${X})`,
      `Standard error:     =STEYX(${Y}, ${X})`,
    ].join('\n');
  }

  /* ---------------------------------------------------------- gráfico */
  function drawChart(c, xn, yn) {
    const W = 800, H = 420, L = 70, R = 24, T = 24, base = H - 56;
    const plotW = W - L - R, plotH = base - T;
    const font = 'font-family="Segoe UI, Arial, sans-serif"';
    let xlo = c.xmin, xhi = c.xmax;
    if (c.pred) { xlo = Math.min(xlo, c.pred.x0); xhi = Math.max(xhi, c.pred.x0); }
    const xpad = (xhi - xlo) * 0.08 || 1;
    xlo -= xpad; xhi += xpad;
    const ys = c.rows.map((o) => o.y).concat([c.b0 + c.b1 * xlo, c.b0 + c.b1 * xhi]);
    if (c.pred) ys.push(c.pred.y0);
    let ylo = Math.min(...ys), yhi = Math.max(...ys);
    const ypad = (yhi - ylo) * 0.1 || 1;
    ylo -= ypad; yhi += ypad;
    const X = (x) => L + (x - xlo) / (xhi - xlo) * plotW;
    const Y = (y) => base - (y - ylo) / (yhi - ylo) * plotH;
    let s = `<rect width="${W}" height="${H}" fill="#fff"/>`;
    niceTicks(xlo, xhi, 9).forEach((t) => {
      if (t < xlo || t > xhi) return;
      s += `<line x1="${X(t)}" y1="${T}" x2="${X(t)}" y2="${base}" stroke="#f1f0f5"/><text x="${X(t)}" y="${base + 18}" text-anchor="middle" font-size="12" fill="#4b5563" ${font}>${window.Calc.fmt(t, 4)}</text>`;
    });
    niceTicks(ylo, yhi, 7).forEach((t) => {
      if (t < ylo || t > yhi) return;
      s += `<line x1="${L}" y1="${Y(t)}" x2="${W - R}" y2="${Y(t)}" stroke="#f1f0f5"/><text x="${L - 8}" y="${Y(t) + 4}" text-anchor="end" font-size="12" fill="#4b5563" ${font}>${window.Calc.fmt(t, 4)}</text>`;
    });
    s += `<rect x="${L}" y="${T}" width="${plotW}" height="${plotH}" fill="none" stroke="#d1d5db"/>`;
    s += `<text x="${L + plotW / 2}" y="${H - 12}" text-anchor="middle" font-size="13" fill="#374151" font-weight="600" ${font}>${esc(xn)}</text>`;
    s += `<text transform="translate(18 ${T + plotH / 2}) rotate(-90)" text-anchor="middle" font-size="13" fill="#374151" font-weight="600" ${font}>${esc(yn)}</text>`;

    // residuos
    if ($('rResiduals').checked) {
      c.rows.forEach((o) => { s += `<line x1="${X(o.x)}" y1="${Y(o.y)}" x2="${X(o.x)}" y2="${Y(o.yh)}" stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="3,2"/>`; });
    }
    // recta (recortada al área del gráfico)
    s += `<clipPath id="rClip"><rect x="${L}" y="${T}" width="${plotW}" height="${plotH}"/></clipPath>`;
    s += `<line clip-path="url(#rClip)" x1="${X(xlo)}" y1="${Y(c.b0 + c.b1 * xlo)}" x2="${X(xhi)}" y2="${Y(c.b0 + c.b1 * xhi)}" stroke="#1e1b4b" stroke-width="2.2"/>`;
    // puntos
    c.rows.forEach((o, i) => {
      s += `<circle cx="${X(o.x)}" cy="${Y(o.y)}" r="6" fill="#8b5cf6" fill-opacity=".85" stroke="#fff" stroke-width="1.5"><title>Punto ${i + 1}: x = ${fmt(o.x)}, y = ${fmt(o.y)}  ·  ŷ = ${fmt(o.yh)}, residuo = ${fmt(o.e)}</title></circle>`;
    });
    // centroide
    s += `<circle cx="${X(c.mx)}" cy="${Y(c.my)}" r="4" fill="#1e1b4b"><title>Centroide (x̄, ȳ) = (${fmt(c.mx)}, ${fmt(c.my)}): la recta siempre pasa por este punto</title></circle>`;
    // predicción
    if (c.pred) {
      const px = X(c.pred.x0), py = Y(c.pred.y0);
      s += `<line x1="${px}" y1="${base}" x2="${px}" y2="${py}" stroke="#2563eb" stroke-dasharray="4,3"/><line x1="${L}" y1="${py}" x2="${px}" y2="${py}" stroke="#2563eb" stroke-dasharray="4,3"/>`;
      s += `<path d="M${px},${py - 9} L${px + 9},${py} L${px},${py + 9} L${px - 9},${py} Z" fill="#2563eb" stroke="#fff" stroke-width="1.5"><title>Predicción: x = ${fmt(c.pred.x0)} → ŷ = ${fmt(c.pred.y0)}</title></path>`;
      const txt = `y(${fmt(c.pred.x0)}) = ${fmt(c.pred.y0)}`;
      const tw = txt.length * 7.4 + 16;
      const tx = Math.min(Math.max(px + 14, L + 4), W - R - tw - 4);
      s += `<rect x="${tx}" y="${py + 12}" width="${tw}" height="22" rx="11" fill="#2563eb"/><text x="${tx + tw / 2}" y="${py + 27}" text-anchor="middle" font-size="12.5" font-weight="700" fill="#fff" ${font}>${txt}</text>`;
    }
    // recuadro con la ecuación
    const eq = equation(c.b0, c.b1);
    const lines = [eq, `a = ${fmt(c.b1)}   b = ${fmt(c.b0)}`, Number.isFinite(c.r) ? `r = ${fmt(c.r)}   R² = ${fmt(c.R2)}` : 'r indefinido'];
    const bw = Math.max(...lines.map((l) => l.length)) * 7.6 + 20;
    const bx = c.b1 >= 0 ? L + 10 : W - R - bw - 10;
    s += `<rect x="${bx}" y="${T + 10}" width="${bw}" height="68" rx="8" fill="#fff" fill-opacity=".92" stroke="#d9c8fb"/>`;
    s += `<text x="${bx + 10}" y="${T + 30}" font-size="13.5" font-weight="700" fill="#5b21b6" ${font}>${lines[0]}</text><text x="${bx + 10}" y="${T + 49}" font-size="12.5" fill="#374151" ${font}>${lines[1]}</text><text x="${bx + 10}" y="${T + 67}" font-size="12.5" fill="#374151" ${font}>${lines[2]}</text>`;
    const svg = $('rChart');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.innerHTML = s;
  }

  /* ---------------------------------------------------------- control */
  /** Solo cuenta los pares cargados (no calcula la regresión). */
  function updateCount() {
    const { pts, bad, header } = parse($('rData').value);
    $('rCount').textContent = pts.length ? `${pts.length} par${pts.length === 1 ? '' : 'es'} de datos${bad.length ? ` · ${bad.length} línea(s) con errores` : ''}` : '';
    if (header) {
      if (!$('rXName').value.trim()) $('rXName').placeholder = header[0];
      if (!$('rYName').value.trim()) $('rYName').placeholder = header[1];
    }
  }

  /** Después del primer "Calcular", los cambios se recalculan al instante. */
  const liveUpdate = () => { if ($('rResult').dataset.started) run(); };

  function run(showErrors = false) {
    if (showErrors) $('rResult').dataset.started = '1'; // ya se tocó "Calcular"
    const { pts, bad, header } = parse($('rData').value);
    state.bad = bad;
    updateCount();
    let err = '';
    if (pts.length < 3) err = 'Ingresá al menos 3 pares de datos (x, y), uno por línea.';
    else if (new Set(pts.map((p) => p[0])).size < 2) err = 'Todos los valores de x son iguales: no se puede calcular la pendiente.';
    if (err) {
      if (showErrors) showError('rError', err);
      $('rResult').hidden = true;
      return false;
    }
    showError('rError', '');
    const x0 = readNum('rX0');
    state.last = compute(pts, x0);
    if (header) { // usar el encabezado como nombre si no se escribió otro
      if (!$('rXName').value.trim()) $('rXName').value = header[0];
      if (!$('rYName').value.trim()) $('rYName').value = header[1];
    }
    render(state.last);
    return true;
  }

  function init() {
    $('rData').addEventListener('input', () => { updateCount(); liveUpdate(); });
    ['rX0', 'rXName', 'rYName'].forEach((id) => $(id).addEventListener('input', liveUpdate));
    $('rX0').addEventListener('keydown', (e) => { if (e.key === 'Enter') run(true); });
    ['rDecimals', 'rResiduals'].forEach((id) => $(id).addEventListener('change', () => { liveUpdate(); }));
    $('rCalcBtn').addEventListener('click', () => { if (run(true)) $('rResult').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    $('rClearBtn').addEventListener('click', () => {
      delete $('rResult').dataset.started;
      ['rData', 'rX0', 'rXName', 'rYName'].forEach((id) => { $(id).value = ''; });
      $('rResult').hidden = true; $('rCount').textContent = ''; showError('rError', '');
    });
    $('rExampleBtn').addEventListener('click', () => {
      $('rData').value = EXAMPLE.data.map((p) => p.join('\t')).join('\n');
      $('rXName').value = EXAMPLE.xName; $('rYName').value = EXAMPLE.yName; $('rX0').value = EXAMPLE.x0;
      updateCount();
      liveUpdate();
    });
    wireFoldButtons('rExpandAll', 'rCollapseAll', 'rResult');
    // arrancar con el ejemplo cargado
    $('rData').value = EXAMPLE.data.map((p) => p.join('\t')).join('\n');
    $('rXName').value = EXAMPLE.xName; $('rYName').value = EXAMPLE.yName; $('rX0').value = EXAMPLE.x0;
    updateCount();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
