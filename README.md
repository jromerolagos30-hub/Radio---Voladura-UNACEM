# Radio de Voladura UNACEM V20

Versión lista para subir a GitHub Pages.

## Archivos

- `index.html`: portada.
- `admin.html`: página administrativa.
- `usuario.html`: página para usuarios finales.
- `app.js`: lógica geoespacial y generación del contorno V20.
- `styles.css`: estilos.
- `assets/referencia_contorno_v20.png`: referencia visual usada para el contorno.

## Funcionalidades

- Hasta 2 voladuras por día.
- Cada voladura tiene centro, radio de personas, radio de equipos y ángulo de giro.
- Contorno rojo y verde basado en el modelo final validado.
- Generación de enlace para usuario.
- Validación GPS en página usuario.
- Vista satelital y vista mapa.

## Publicar en GitHub Pages

1. Crear repositorio.
2. Subir todos los archivos de esta carpeta.
3. Ir a `Settings > Pages`.
4. Seleccionar rama `main` y carpeta `/root`.
5. Abrir `index.html`, `admin.html` o `usuario.html`.

## Nota

El ángulo de 37° se usa internamente como referencia geométrica del contorno, pero puede ocultarse en la interfaz si se desea.
