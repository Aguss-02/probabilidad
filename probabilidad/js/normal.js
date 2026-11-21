/* =========================================================================
 *  Distribución Normal — funciones matemáticas
 *  Φ(z): algoritmo de Hart (precisión doble, ~1e-15)
 *  Φ⁻¹(p): algoritmo de Acklam + un paso de refinamiento de Halley
 * ========================================================================= */
(function (global) {
  'use strict';

  const SQRT2PI = Math.sqrt(2 * Math.PI);

  /** Función de distribución acumulada de la normal estándar Φ(z). */
  function stdCdf(z) {
    if (Number.isNaN(z)) return NaN;
    if (z === Infinity) return 1;
    if (z === -Infinity) return 0;
    const a = Math.abs(z);
    let c;
    if (a > 37) {
      c = 0;
    } else {
      const e = Math.exp(-a * a / 2);
      if (a < 7.07106781186547) {
        let b = 3.52624965998911e-2 * a + 0.700383064443688;
        b = b * a + 6.37396220353165;
        b = b * a + 33.912866078383;
        b = b * a + 112.079291497871;
        b = b * a + 221.213596169931;
        b = b * a + 220.206867912376;
        c = e * b;
        b = 8.83883476483184e-2 * a + 1.75566716318264;
        b = b * a + 16.064177579207;
        b = b * a + 86.7807322029461;
        b = b * a + 296.564248779674;
        b = b * a + 637.333633378831;
        b = b * a + 793.826512519948;
        b = b * a + 440.413735824752;
        c = c / b;
      } else {
        let b = a + 0.65;
        b = a + 4 / b;
        b = a + 3 / b;
        b = a + 2 / b;
        b = a + 1 / b;
        c = e / b / SQRT2PI;
      }
    }
    return z > 0 ? 1 - c : c;
  }

  /** Función de densidad de la normal estándar φ(z). */
  function stdPdf(z) {
    return Math.exp(-z * z / 2) / SQRT2PI;
  }

  /** Inversa de Φ: devuelve z tal que Φ(z) = p. */
  function stdInv(p) {
    if (Number.isNaN(p) || p < 0 || p > 1) return NaN;
    if (p === 0) return -Infinity;
    if (p === 1) return Infinity;

    const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
      1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
    const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
      6.680131188771972e1, -1.328068155288572e1];
    const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838,
      -2.549732539343734, 4.374664141464968, 2.938163982698783];
    const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996,
      3.754408326795287];
    const pLow = 0.02425, pHigh = 1 - pLow;
    let q, r, x;

    if (p < pLow) {
      q = Math.sqrt(-2 * Math.log(p));
      x = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
          ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    } else if (p <= pHigh) {
      q = p - 0.5;
      r = q * q;
      x = (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
          (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
    } else {
      q = Math.sqrt(-2 * Math.log(1 - p));
      x = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
           ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    }

    // Refinamiento de Halley
    const e = stdCdf(x) - p;
    const u = e * SQRT2PI * Math.exp(x * x / 2);
    x = x - u / (1 + x * u / 2);
    return x;
  }

  /** Constructor de una normal N(μ, σ²). */
  function Normal(mu, sigma) {
    return {
      mu, sigma,
      z: (x) => (x - mu) / sigma,
      pdf: (x) => stdPdf((x - mu) / sigma) / sigma,
      cdf: (x) => stdCdf((x - mu) / sigma),               // P(X ≤ x)
      sf: (x) => stdCdf(-(x - mu) / sigma),               // P(X ≥ x)
      between: (x1, x2) => {
        const z1 = (x1 - mu) / sigma, z2 = (x2 - mu) / sigma;
        // usar la cola con mejor precisión
        if (z1 > 0) return stdCdf(-z1) - stdCdf(-z2);
        return stdCdf(z2) - stdCdf(z1);
      },
      inv: (p) => mu + sigma * stdInv(p),                 // x tal que P(X ≤ x) = p
      invUpper: (p) => mu - sigma * stdInv(p),            // x tal que P(X ≥ x) = p
      mean: mu, median: mu, mode: mu,
      variance: sigma * sigma, skewness: 0, exKurtosis: 0,
    };
  }

  global.NormalDist = { stdCdf, stdPdf, stdInv, Normal };
})(typeof window !== 'undefined' ? window : globalThis);
