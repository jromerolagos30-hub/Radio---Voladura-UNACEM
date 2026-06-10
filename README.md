# Radio de Voladura UNACEM - V23

Versión con estructura simple igual a la V18:

```text
index.html
app.js
styles.css
README.md
ESPECIFICACION_TECNICA.md
```

## Cambio principal

La V23 deja de intentar reconstruir el contorno mediante polígonos o arcos matemáticos.

Ahora usa una **imagen SVG plantilla** del contorno referencial y la coloca sobre el mapa como:

```text
Imagen georreferenciada + escala + rotación
```

## Ventaja

Visualmente se aproxima mucho más al contorno aprobado, porque se controla la forma como imagen y no como cálculo geométrico imperfecto.

## Campos por voladura

- Nombre.
- Centro UTM Norte.
- Centro UTM Este.
- Ángulo de giro / línea de perforación.
- Radio personas.
- Radio equipos.
- Dimensión lateral referencial 394.83 m.
- Opacidad de plantilla.
- Estado.
- Activo / inactivo.

## Uso en GitHub Pages

1. Subir los 5 archivos a la raíz del repositorio.
2. Activar GitHub Pages.
3. Abrir `index.html`.

## Nota

La validación GPS en esta versión es principalmente visual. Para validación matemática exacta dentro/fuera se recomienda complementar la plantilla imagen con un polígono oculto calibrado.
