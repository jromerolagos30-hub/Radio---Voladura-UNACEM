# V18 - Radio de Voladura UNACEM: Contorno real por plantilla geométrica

## Cambio principal

Esta versión ya no genera el radio de voladura como círculo ni como sector circular simple.

La geometría se genera como polígono, usando puntos referenciales en metros obtenidos de la imagen:

- Contorno rojo: radio de personas.
- Contorno verde: radio de equipos.
- Centro local: punto de voladura.
- Giro: ángulo respecto al Norte.
- Hasta 2 voladuras por día.

## Por qué se cambió la lógica

La imagen de referencia demuestra que el radio real de voladura no es un círculo uniforme. Tiene:

1. arco inferior,
2. lados laterales con inclinación aproximada de 37°,
3. arco superior,
4. puntos de intersección,
5. contorno cerrado irregular.

Por eso se reemplaza el uso de `L.circle()` o sectores simples por `L.polygon()`.

## Archivos

- `index.html`: aplicación web.
- `styles.css`: estilos visuales.
- `app.js`: lógica geométrica, rotación, GPS y validación.
- `README.md`: descripción técnica.

## Lógica geométrica

La plantilla se define en coordenadas locales:

```js
[x, y]
```

donde:

- `x` = desplazamiento Este/Oeste en metros.
- `y` = desplazamiento Norte/Sur en metros.

Luego se aplica:

1. rotación por ángulo de giro,
2. conversión de metros a latitud/longitud,
3. dibujo con `L.polygon()`.

## Datos por voladura

Cada voladura tiene:

- nombre,
- latitud centro,
- longitud centro,
- fecha,
- hora,
- ángulo de giro,
- estado activo/inactivo.

## Uso recomendado

1. Abrir `index.html`.
2. Configurar la Voladura 1 y/o Voladura 2.
3. Ingresar centro geográfico y ángulo de giro.
4. Presionar `Actualizar mapa`.
5. Presionar `Generar enlace de usuario`.
6. Compartir el enlace generado.

## Ajuste futuro

Cuando se tenga el DXF/DWG convertido a vértices reales, solo se deben reemplazar las plantillas:

```js
PLANTILLA_PERSONAS
PLANTILLA_EQUIPOS
```

por los puntos exactos del CAD.

La estructura ya está preparada para aceptar esos puntos reales.
