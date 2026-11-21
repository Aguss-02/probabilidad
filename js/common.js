/* =========================================================================
 *  Funciones compartidas por todas las calculadoras
 * ========================================================================= */
(function (global) {
  'use strict';

  const $ = (id) => document.getElementById(id);

  /** Formatea un número con d decimales, sin ceros sobrantes y con signo menos tipográfico. */
  function fmt(v, d = 4) {
    if (v === Infinity) return '∞';
    if (v === -Infinity) return '−∞';
    if (!Number.isFinite(v)) return 'NaN';
    if (v !== 0 && Math.abs(v) < Math.pow(10, -d)) return v.toExponential(Math.min(d, 4)).replace(/-/g, '−');
    const s = String(parseFloat(v.toFixed(d)));
    return (s === '-0' ? '0' : s).replace(/-/g, '−');
  }

  /** Lee un input numérico; devuelve NaN si está vacío o no es un número. */
  function readNum(id) {
    const v = $(id).value.trim().replace(',', '.');
    return v === '' ? NaN : Number(v);
  }

  /** Marcas "lindas" para un eje entre lo y hi. */
  function niceTicks(lo, hi, target = 8) {
    const raw = (hi - lo) / target;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const norm = raw / mag;
    const step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;
    const t = [];
    for (let v = Math.ceil(lo / step - 1e-9) * step; v <= hi + step * 1e-9; v += step) t.push(Math.abs(v) < step * 1e-9 ? 0 : +v.toPrecision(12));
    return t;
  }

  /** ln Γ(x) (aproximación de Lanczos, precisión ~1e-15). */
  function lnGamma(x) {
    const g = 7;
    const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
      -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
    if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - lnGamma(1 - x);
    x -= 1;
    let a = c[0];
    const t = x + g + 0.5;
    for (let i = 1; i < g + 2; i++) a += c[i] / (x + i);
    return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
  }

  const LN_FACT = [];
  /** ln(k!) para k entero ≥ 0. */
  function lnFact(k) {
    if (k < 0) return NaN;
    if (k < 256) {
      if (LN_FACT[k] === undefined) {
        let s = 0;
        for (let i = 2; i <= k; i++) s += Math.log(i);
        LN_FACT[k] = s;
      }
      return LN_FACT[k];
    }
    return lnGamma(k + 1);
  }

  /** ln C(n, k). */
  function lnChoose(n, k) {
    if (k < 0 || k > n) return -Infinity;
    return lnFact(n) - lnFact(k) - lnFact(n - k);
  }

  /** C(n, k) como número (exacto mientras quepa en un double). */
  function choose(n, k) {
    if (k < 0 || k > n) return 0;
    k = Math.min(k, n - k);
    let r = 1;
    for (let i = 1; i <= k; i++) {
      r = r * (n - k + i) / i;
      if (!Number.isFinite(r)) return Math.exp(lnChoose(n, k));
    }
    return Math.round(r) === r || r > 1e15 ? r : Math.round(r);
  }

  /** Conecta los botones "Abrir todo / Cerrar todo" de un contenedor de resultados. */
  function wireFoldButtons(expandId, collapseId, containerId) {
    const folds = () => $(containerId).querySelectorAll('details.fold');
    $(expandId).addEventListener('click', () => folds().forEach((f) => { f.open = true; }));
    $(collapseId).addEventListener('click', () => folds().forEach((f) => { f.open = false; }));
  }

  /** Muestra un mensaje de error (o lo oculta si msg es vacío). */
  function showError(id, msg) {
    const el = $(id);
    el.textContent = msg || '';
    el.hidden = !msg;
  }

  /** Descarga el gráfico SVG con id svgId como imagen PNG (2x, fondo blanco). */
  function savePng(svgId, filename) {
    const svg = $(svgId);
    const [, , w, h] = svg.getAttribute('viewBox').split(' ').map(Number);
    const clone = svg.cloneNode(true);
    clone.setAttribute('width', w);
    clone.setAttribute('height', h);
    const hover = clone.querySelector('#hoverG'); // no exportar el cursor del gráfico
    if (hover) hover.remove();
    const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml;charset=utf-8' }));
    const img = new Image();
    img.onload = () => {
      const scale = 2;
      const c = document.createElement('canvas');
      c.width = w * scale; c.height = h * scale;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob((blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
      }, 'image/png');
    };
    img.src = url;
  }

  // todos los botones "Guardar PNG": data-png = id del SVG, data-png-name = nombre del archivo
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-png]').forEach((b) => b.addEventListener('click', () => savePng(b.dataset.png, b.dataset.pngName || 'grafico.png')));
  });

  global.Calc = { $, fmt, readNum, niceTicks, lnGamma, lnFact, lnChoose, choose, wireFoldButtons, showError, savePng };
})(window);
