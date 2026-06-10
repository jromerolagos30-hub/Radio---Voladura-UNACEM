# Especificación Técnica - V23 UNACEM

## 1. Objetivo

Representar el radio de voladura con mayor fidelidad visual usando una plantilla de imagen georreferenciada.

## 2. Método

La versión V23 utiliza:

```text
SVG del contorno referencial
Centro UTM
Escala por radio de equipos
Rotación por ángulo de giro
Overlay sobre mapa Leaflet
```

## 3. Motivo del cambio

Las versiones anteriores generaban el contorno mediante:

- puntos,
- polígonos,
- arcos paramétricos.

Sin embargo, el resultado no coincidía visualmente con el estándar gráfico entregado.

## 4. Funcionamiento

1. El administrador ingresa centro UTM.
2. Define radio de personas y equipos.
3. Define ángulo de giro.
4. El sistema genera una plantilla SVG.
5. La plantilla se coloca sobre el centro de voladura.
6. La plantilla se escala según el radio de equipos.
7. La plantilla se rota según el ángulo de perforación.

## 5. Recomendación final

Para una versión productiva, se recomienda:

```text
- Usar PNG/SVG oficial del contorno validado.
- Calibrar ancho y alto con 300 m y 394.83 m.
- Mantener un polígono oculto para cálculo dentro/fuera.
```
