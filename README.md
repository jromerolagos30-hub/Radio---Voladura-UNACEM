# Radio de Voladura UNACEM - Versión 20

Sistema web para administrar y visualizar radios de voladura con **contorno real dinámico**, basado en la geometría hallada para UNACEM.

## Mejoras incluidas

- Contorno real de voladura mediante polígonos, no círculos simples.
- Plantilla geométrica UNACEM para radio de personas y equipos.
- Giro independiente por voladura según el ángulo de la línea de perforación.
- Soporte para 2 voladuras por día.
- Modo Administrador y modo Usuario.
- Validación GPS: dentro/fuera del radio.
- Vista satelital y vista mapa.
- Exportación GeoJSON.
- Exportación de configuración JSON.
- Interfaz visual tipo UNACEM.
- Sin necesidad de backend para uso inicial en GitHub Pages.

## Publicación en GitHub Pages

1. Crear un repositorio en GitHub.
2. Subir todos los archivos de esta carpeta.
3. Ir a `Settings > Pages`.
4. En `Branch`, seleccionar `main` y carpeta `/root`.
5. Abrir el enlace publicado.

## Archivo principal

Abrir:

```text
index.html
```

## Lógica geométrica

La figura se genera con plantillas de vértices locales en metros:

- Rojo: radio personas.
- Verde: radio equipos.

Luego se aplica:

1. escala por radio configurado,
2. rotación por ángulo de giro,
3. traslado al centro UTM,
4. conversión aproximada UTM a lat/lng,
5. dibujo como polígono Leaflet.

## Nota técnica

La plantilla está basada en la geometría referencial hallada desde la imagen de contorno real. Si luego se obtiene el DXF con vértices exactos, solo se reemplazan las plantillas en `assets/js/geometry.js`.
