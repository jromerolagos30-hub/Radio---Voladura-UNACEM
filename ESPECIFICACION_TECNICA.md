# Especificación técnica - V18

## Requerimiento implementado

La aplicación debe reproducir el contorno real del radio de voladura de la imagen de referencia, usando coordenadas referenciales.

## Método

Se usa una plantilla geométrica local. La plantilla se rota y traslada al centro de cada voladura.

### Fórmula de rotación

Para cada punto local `(x,y)`:

```text
xr = x*cos(a) - y*sin(a)
yr = x*sin(a) + y*cos(a)
```

donde `a` es el ángulo de giro en grados convertido a radianes.

### Conversión aproximada a geografía

```text
lat = lat0 + (dy / R) * 180/pi
lng = lng0 + (dx / (R*cos(lat0))) * 180/pi
```

donde:

- `R = 6378137 m`
- `lat0/lng0` = centro de voladura.

## Control de usuario

La ubicación del usuario se obtiene con GPS del navegador y se valida con algoritmo punto-en-polígono.

## Limitación

Las coordenadas son referenciales por imagen. Para precisión final, se recomienda reemplazar los puntos por coordenadas obtenidas del CAD/DXF.
