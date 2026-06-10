# Especificación Técnica - Versión 20

## Objetivo

Generar el contorno real del radio de voladura UNACEM, incluyendo radio de personas, radio de equipos, centro UTM y ángulo de giro por voladura.

## Campos principales

- Fecha de voladura.
- Voladura 1 y Voladura 2.
- Centro UTM Norte.
- Centro UTM Este.
- Ángulo de giro.
- Radio personas.
- Radio equipos.
- Estado.

## Criterio geométrico

El contorno se genera por una plantilla de puntos locales:

- arco inferior,
- laterales a 37° referenciales,
- arco superior,
- cierre poligonal.

Luego se escala, rota y traslada al centro.

## Fórmula de rotación

```text
x' = x cos θ - y sin θ
y' = x sin θ + y cos θ
```

## Salida

- Polígono rojo: radio personas.
- Polígono verde: radio equipos.
- Línea punteada: dirección de perforación.
- Marcador azul: centro de voladura.
- GeoJSON exportable.
