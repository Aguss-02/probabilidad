/* =========================================================================
 *  Selector de calculadora (se carga al final, después de todos los módulos)
 * ========================================================================= */
(function () {
  'use strict';

  const CALCS = {
    normal: { hash: '#normal', subtitle: 'Distribución normal · X ~ N(μ, σ²)' },
    ci: { hash: '#intervalo', subtitle: 'Intervalo de confianza para la media · x̄ ± z·σ/√n' },
    disc: { hash: '#discreta', subtitle: 'Distribuciones discretas · binomial, Poisson e hipergeométrica' },
    unif: { hash: '#uniforme', subtitle: 'Distribución uniforme · X ~ U(a, b)' },
    reg: { hash: '#regresion', subtitle: 'Regresión lineal simple · y = ax + b' },
  };

  function calcFromHash() {
    return Object.keys(CALCS).find((k) => CALCS[k].hash === location.hash);
  }

  function showCalc(name, updateHash = true) {
    if (!CALCS[name]) name = 'normal';
    document.querySelectorAll('[data-calc-tab]').forEach((b) => {
      const on = b.dataset.calcTab === name;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', on);
    });
    document.querySelectorAll('[data-calc]').forEach((el) => { el.hidden = el.dataset.calc !== name; });
    document.getElementById('calcSubtitle').textContent = CALCS[name].subtitle;
    try { localStorage.setItem('calc-activa', name); } catch (_) { /* sin almacenamiento */ }
    if (updateHash && location.hash !== CALCS[name].hash) history.replaceState(null, '', CALCS[name].hash);
    document.dispatchEvent(new CustomEvent('calc:show', { detail: name }));
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-calc-tab]').forEach((b) => b.addEventListener('click', () => showCalc(b.dataset.calcTab)));
    window.addEventListener('hashchange', () => { const c = calcFromHash(); if (c) showCalc(c, false); });
    let start = calcFromHash();
    if (!start) { try { start = localStorage.getItem('calc-activa'); } catch (_) { /* nada */ } }
    showCalc(start || 'normal', !!calcFromHash());
  });
})();
