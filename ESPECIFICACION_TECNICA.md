# Especificación Técnica - V24 UNACEM

## Objetivo

Usar la imagen real del contorno de voladura como plantilla georreferenciada.

## Método

1. Se genera un PNG transparente del contorno real.
2. El PNG se posiciona sobre el centro UTM.
3. El centro del pin se usa como punto de anclaje.
4. La imagen se escala según el radio de equipos.
5. La imagen se rota según el ángulo de giro.

## Ventaja

La forma visual coincide con el contorno validado, evitando errores por reconstrucción matemática.

## Nota

La validación GPS es visual. Para una validación matemática exacta se debe agregar un polígono oculto calibrado.
