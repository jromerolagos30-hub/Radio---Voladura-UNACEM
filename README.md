# Piloto Radio de Voladura UNACEM - Versión 2

## Archivos
- index.html: vista pública de consulta. No permite modificar coordenadas.
- admin.html: panel del responsable para generar el enlace con coordenadas y radios.
- style.css
- script.js
- plano-voladura.png

## Flujo
1. El responsable abre `admin.html`.
2. Ingresa coordenadas UTM, radios, fecha y hora.
3. Genera el enlace de consulta.
4. Comparte el enlace o QR.
5. El usuario abre `index.html`, activa GPS y ve si está dentro o fuera del radio.

## Nota
Para producción se recomienda proteger `admin.html` con autenticación o alojarlo en un entorno interno.
