# Especificación Técnica - V22 UNACEM

## 1. Objetivo

Aproximar el contorno real del radio de voladura de UNACEM usando generación paramétrica de curvas.

## 2. Diferencia respecto a versiones previas

La V21 utilizaba una plantilla por vértices. Esto generaba lados rectos y pérdida de forma.

La V22 utiliza:

- arco inferior,
- dos líneas laterales a ±37°,
- arco superior,
- resolución configurable,
- rotación por ángulo,
- traslado al centro UTM.

## 3. Campos nuevos

```text
Ángulo lateral izquierdo
Ángulo lateral derecho
Factor arco superior
Longitud lateral referencial
Resolución del contorno
```

## 4. Algoritmo

1. Leer centro UTM y parámetros.
2. Crear arco inferior con múltiples puntos.
3. Crear línea lateral izquierda.
4. Crear arco superior con múltiples puntos.
5. Crear línea lateral derecha.
6. Unir puntos.
7. Rotar todo por el ángulo de giro.
8. Convertir a Lat/Lng.
9. Dibujar con Leaflet `L.polygon()`.

## 5. Recomendación de ajuste

Para suavizar más el contorno:

```text
Resolución = 120 o 150
```

Para ampliar o reducir el arco superior:

```text
Factor arco superior = 1.40 a 1.70
```

Para mantener el estándar referencial:

```text
Ángulo lateral = 37°
Longitud lateral = 394.83 m
```
