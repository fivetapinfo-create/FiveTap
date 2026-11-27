---
name: canal-estilo
description: Estilo visual fijo del canal faceless (monigotes de cabeza blanca, tinta negra gruesa, fondos planos, títulos amarillos con borde negro, pañuelo naranja del protagonista). Úsalo SIEMPRE que haya que crear miniaturas, escenas o imágenes para un video del canal, antes de recurrir a nano-banana.
---

# Estilo del canal

Todo se genera con código: `canal/estilo/render.mjs` (escena JSON → SVG → PNG).
Gratis, sin límites y con personajes idénticos en todos los videos.

```bash
NODE_PATH=$(npm root -g) node canal/estilo/render.mjs canal/escenas/<escena>.json   # -> canal/salida/<escena>.png
```

## Reglas fijas (no romper)
- Cabeza: círculo blanco perfecto, tinta `#151515` de 6px, trazo levemente irregular ("a mano").
- Ojos: dos círculos grandes juntos, corridos hacia donde mira; pupilas negras pequeñas. Cejas = una línea.
- Cuerpo: palitos de un solo trazo, sin manos ni pies dibujados.
- Fondos planos sin degradados fuertes: `sabana`, `cueva-noche`, `oceano`, `color`, `blanco`.
- Miniatura: 1280×720, máximo 3–4 palabras, Fredoka 700 amarillo `#f7ef3c` con borde negro de 16px, pregunta con ¿?.
- Texto dentro de escenas: fuente `Mano` (Patrick Hand), negro.
- **Firma del canal**: el protagonista lleva siempre pañuelo naranja `#ff7a1a` (`"panuelo": true`). Nadie más lo usa.
- Grano de papel sutil siempre activo.

## Escena JSON
```json
{"fondo":"sabana","seed":3,"elementos":[
  {"tipo":"sol","x":640,"y":30,"r":140},
  {"tipo":"texto","x":640,"y":120,"txt":"¿DORMIR 2 VECES?","tam":118,"borde":16},
  {"tipo":"personaje","x":440,"y":560,"pose":"parado","expr":"feliz","ojos":[0.5,-0.7],
   "accesorio":"rizos","panuelo":true,"objeto":"antorcha","escala":1}
]}
```
- `pose`: parado, saluda, senala, hombros, camina, corre, sentado, manosCintura, acostado (con `rot≈-74`, `cabezaRot≈64`).
- `expr`: neutral, confundido, sospecha, presumido, feliz, asustado, enojado, triste, pensando. `cara: {"bigote": true}`.
- `accesorio`: casco, chistera, marinero, rizos, cavernario. `objeto`: llave, antorcha, lanza, microfono.
- `mira: "izq"` voltea el cuerpo. `ajustes` sobreescribe ángulos de la pose. `tipo:"svg"` inserta SVG libre.
- Utilería: fuego, sol, luna, acacia, check.

## Cuándo usar nano-banana
Solo para fondos complejos que el código no resuelve (ciudades, barcos, multitudes). Siempre con este bloque de estilo
y después pegar nuestros personajes encima con el motor:

> Flat 2D cartoon background, thick uneven black ink outlines, flat muted colors, no gradients, no text, no people,
> simple hand-drawn webcomic look, 16:9.

## Flujo por video
1. Idea con historial probado (>500k en otro idioma/canal) → título en pregunta + miniatura con 3 palabras.
2. Guion corto, gancho en los primeros 5 s.
3. Escenas JSON en `canal/escenas/`, render, revisar el PNG antes de seguir.
