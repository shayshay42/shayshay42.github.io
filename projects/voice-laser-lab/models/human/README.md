# Human display figure

`speaker.glb` is the unmodified **Human base mesh with editable 53-bone rig**, published by **Innerscene Corp**, built from the **MakeHuman/MPFB CC0 body, rig and skin assets**. It is an actual downloaded anatomical human mesh, not a figure built from procedural primitives.

- Primary source: https://www.innerscene.com/tools/library/3d-parts/human-base-mesh-with-editable-53-bone-rig-8e7c8ab1
- Official download: https://www.innerscene.com/api/library/human-base-mesh-with-editable-53-bone-rig-8e7c8ab1/download
- Original filename: `human-base-rigged.glb`.
- License: **CC0 1.0 Universal** — https://creativecommons.org/publicdomain/zero/1.0/
- License text: [CC0-1.0.txt](CC0-1.0.txt).
- The GLB itself contains Innerscene's explicit CC0 dedication; preserved in [source-metadata.json](source-metadata.json).
- Download date: 2026-11-07.
- SHA-256: `f3cd655e44af0a79786b1b4349c4acf1ae342fe6bd0d5fc714e68470dea1b429`.

## Runtime treatment

`src/visuals/human-model.ts` loads the local GLB through Three.js GLTFLoader. It poses the original rig with a small torso lean, two-link arm IK, inward-facing palms, and curled finger joints so both hands cup the mouth. It then bakes the posed source vertices into fresh static meshes, recomputes smooth normals, and applies one neutral matte-gray material. No body parts are generated from primitives; no skin images or animations are used.

The feet meet the room floor at y=-1.8. The measured lip-seam landmark is aligned to [0,0,-.46], leaving a visible gap before the tube at z=-.32. Model metadata reports the mouth and hand target coordinates. All runtime asset requests remain local.

CC0 requires no attribution. Courtesy credit: **Innerscene / MakeHuman / MPFB**.
