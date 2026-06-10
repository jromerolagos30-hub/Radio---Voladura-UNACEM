# Radio de Voladura UNACEM - V22

Versión con la misma estructura simple de la V18:

```text
index.html
app.js
styles.css
README.md
ESPECIFICACION_TECNICA.md
```

## Mejora principal

La V22 cambia el método de generación del contorno:

Antes:
```text
Polígono recto por pocos vértices.
```

Ahora:
```text
Contorno curvo paramétrico por arcos + líneas + rotación.
```

## Nuevos campos de configuración

Por cada voladura:

- Centro UTM Norte.
- Centro UTM Este.
- Ángulo de giro / línea de perforación.
- Radio personas.
- Radio equipos.
- Ángulo lateral izquierdo.
- Ángulo lateral derecho.
- Factor de arco superior.
- Longitud lateral referencial.
- Resolución de curva.
- Estado.
- Activo / inactivo.

## Uso

1. Abrir `index.html`.
2. Configurar Voladura 1 y/o Voladura 2.
3. Presionar `Actualizar contornos`.
4. Activar GPS para validar ubicación.
5. Exportar GeoJSON o configuración JSON.

## GitHub Pages

Subir estos 5 archivos a la raíz del repositorio y activar Pages desde `Settings > Pages`.
