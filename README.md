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
js/normal.js   # funciones matemáticas (Φ, φ, Φ⁻¹)
js/app.js      # interfaz y gráfico
```
