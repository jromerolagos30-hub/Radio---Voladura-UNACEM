# Piloto Radio de Voladura UNACEM - Versión 3

## Objetivo
Un solo enlace público para usuarios. El administrador actualiza la información en `data.json`.

## Archivos
- index.html: vista pública. Sin campos editables.
- admin.html: panel para preparar y descargar data.json.
- data.json: contiene coordenadas, radio, fecha/hora y plano cargado.
- style.css
- script.js

## Flujo
1. El administrador abre admin.html.
2. Actualiza coordenadas, radio, fecha/hora y carga el plano PDF o imagen.
3. Descarga `data.json`.
4. En GitHub, sube/reemplaza `data.json`.
5. Los usuarios siguen entrando al mismo link de index.html y ven lo actualizado.

## Resultado usuario
- Rojo: dentro del radio.
- Verde: fuera del radio.
