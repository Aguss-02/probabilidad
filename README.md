# Calculadora de Probabilidad y Estadística

Calculadora web (HTML + CSS + JavaScript puro, sin dependencias) enfocada en distribuciones de probabilidad.

## Distribución normal

Abrí `index.html` en el navegador.

**Probabilidad a partir de un valor:** P(X ≤ x), P(X ≥ x), P(x₁ ≤ X ≤ x₂), dos colas y densidad f(x).
**Inversa:** x dado P(X ≤ x), x dado P(X ≥ x), valores de cola x₁, x₂ (central o α).
**Otros:** puntaje Z.

Incluye (en secciones desplegables):
- Gráfico interactivo: tooltip con x, f(x) y P(X ≤ x) al pasar el mouse, puntos arrastrables, etiquetas de %, marcas σ, exportar PNG/SVG e imprimir.
- Probabilidades relacionadas para los mismos valores.
- Medidas de la distribución (media, mediana, moda, varianza, cuartiles, IQR…).
- Cálculo paso a paso.
- Tabla para estandarizar (normal estándar Z) que marca la fila y columna del z calculado.
- Fórmulas de Excel (español e inglés).
- Sección de teoría: fórmulas, regla empírica, Teorema Central del Límite y normal estándar.

## Estructura

```
index.html
css/styles.css
js/normal.js      # funciones matemáticas de la normal (Φ, φ, Φ⁻¹)
js/common.js      # funciones compartidas (formato, combinatoria, ejes)
js/app.js         # calculadora de distribución normal
js/ci.js          # intervalo de confianza
js/discrete.js    # distribuciones discretas
js/uniform.js     # distribución uniforme
js/regression.js  # regresión lineal
js/switcher.js    # selector de calculadora
fonts/            # fuente matemática STIX Two Math (licencia SIL OFL 1.1)
```

## Intervalo de confianza para la media (σ conocida)

Elegí "Intervalo de confianza" en el selector de arriba (o entrá con `#intervalo` al final de la URL).

- Datos: tamaño de la muestra n, media muestral x̄, desviación estándar (σ o s) y nivel de confianza.
- Resultado: intervalo x̄ ± z·σ/√n, margen de error, valor crítico z y error estándar.
- Secciones desplegables: gráfico de la distribución muestral, resumen de valores, el mismo intervalo con otros niveles de confianza, tamaño de muestra necesario para un margen de error, cálculo paso a paso y fórmulas de Excel (`INTERVALO.CONFIANZA.NORM` / `CONFIDENCE.NORM`).
- El dato de dispersión puede ser la desviación estándar o la varianza (saca la raíz sola).
- "Resolución tipificando": parte de IC(−z ; z) en la N(0;1), tipifica la media muestral y despeja μ, con los números del ejercicio.
- Si se usa la desviación muestral s con n < 30, avisa que conviene usar la t de Student.

## Distribuciones discretas (`#discreta`)

- Asistente de elección: dos preguntas sobre el problema recomiendan **binomial**, **Poisson** o **hipergeométrica**.
- Justificación con las condiciones de la distribución elegida y aviso de aproximaciones (hipergeométrica ≈ binomial, binomial ≈ Poisson).
- P(X = k), P(X ≤ k), P(X < k), P(X ≥ k), P(X > k) y P(a ≤ X ≤ b); E[X], Var(X), σ, moda.
- Gráfico de barras, tabla de probabilidades, paso a paso y fórmulas de Excel.

## Distribución uniforme (`#uniforme`)

- Uniforme continua U(a, b).
- Probabilidades, percentil (inversa), densidad, E[X], Var(X), σ, gráfico, paso a paso y Excel.

## Regresión lineal (`#regresion`)

- Datos pegados desde Excel (tabulación, punto y coma, espacio o coma; acepta coma decimal y encabezado).
- Recta de mínimos cuadrados en la forma y = ax + b (a = pendiente, b = ordenada), r, R², interpretación, predicción con aviso de extrapolación.
- Gráfico de dispersión con recta y residuos, sumas, paso a paso y Excel.

## Fórmulas

Las fórmulas se escriben en MathML (el navegador las dibuja con fracciones, números combinatorios y exponentes como en un libro) y usan la fuente **STIX Two Math**, incluida en `fonts/` bajo la licencia SIL Open Font License 1.1 (`fonts/STIXTwoMath-LICENSE.txt`).
