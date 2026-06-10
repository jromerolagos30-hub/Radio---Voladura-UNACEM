# Especificación Técnica - V21 FINAL UNACEM

## Objetivo

Generar el contorno real del radio de voladura UNACEM utilizando plantilla geométrica, rotación y georreferenciación referencial.

## Datos por voladura

- Nombre
- Centro UTM Norte
- Centro UTM Este
- Ángulo de giro
- Radio personas
- Radio equipos
- Estado

## Plantilla personas R=150

[-90,120], [-240,320], [-155,410], [0,450], [155,410], [240,320], [90,120], [150,-150], [0,-300], [-150,-150]

## Plantilla equipos R=300

[-180,240], [-420,560], [-260,700], [0,730], [260,700], [420,560], [180,240], [300,-300], [0,-600], [-300,-300]

## Fórmula de rotación

x’ = x cos θ - y sin θ
y’ = x sin θ + y cos θ

## Algoritmo

1. Leer datos de voladura.
2. Escalar plantilla según radio.
3. Rotar por ángulo.
4. Trasladar al centro UTM.
5. Convertir a Lat/Lng.
6. Dibujar con L.polygon.
7. Validar GPS con punto-en-polígono.
