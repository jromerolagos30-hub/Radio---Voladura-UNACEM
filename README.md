# Radio de Voladura UNACEM - V24

Versión con la imagen verdadera del contorno referencial.

## Estructura

```text
index.html
app.js
styles.css
README.md
ESPECIFICACION_TECNICA.md
contorno_unacem_real.png
```

## Cambio principal

La V24 usa el contorno real como PNG transparente. No intenta reconstruir la forma con polígonos ni arcos.

El sistema aplica:

```text
Centro UTM + escala + rotación
```

## Uso

1. Subir todos los archivos al repositorio GitHub.
2. Activar GitHub Pages.
3. Abrir `index.html`.
4. Configurar centro UTM y ángulo de giro.
5. Presionar `Actualizar plantilla`.

## Ajuste visual

Los campos:

```text
Ancho visual relativo
Alto visual relativo
```

permiten calibrar la escala del PNG sobre el mapa.
