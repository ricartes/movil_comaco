# Contrato de posiciones inválidas durante la finalización

- Los campos GPS opcionales fuera de rango se normalizan antes del drenaje.
- Una posición con fecha o coordenadas esenciales inválidas se marca como terminal con `DESCARTADA_INVALIDA`.
- Una posición descartada no vuelve a `PENDIENTE` y no mantiene `POSICIONES_SIN_ACK` sobre cero.
- La guía conserva prioridad y continúa enviando todas las demás posiciones válidas.
