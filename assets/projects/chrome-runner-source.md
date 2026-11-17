# Chromium runner pixel shapes

The Stereogram Runner card uses pixel outlines derived from Chromium's offline
runner sprite. The colors and 3D presentation belong to this site's adaptation.

- Source commit: `fdace88ecdcd6aede6a2a54e78053edfdf3da41d`
- [Original sprite](https://chromium.googlesource.com/chromium/src/+/fdace88ecdcd6aede6a2a54e78053edfdf3da41d/components/neterror/resources/images/default_100_percent/offline/100-offline-sprite.png)
- [Sprite positions](https://chromium.googlesource.com/chromium/src/+/fdace88ecdcd6aede6a2a54e78053edfdf3da41d/components/neterror/resources/dino_game/offline_sprite_definitions.ts)
- [Animation frames and size](https://chromium.googlesource.com/chromium/src/+/fdace88ecdcd6aede6a2a54e78053edfdf3da41d/components/neterror/resources/dino_game/trex.ts)
- License: [Chromium BSD license](CHROMIUM-LICENSE.txt)

The original PNG is 1233 × 100 pixels. The running dinosaur is the 44 × 47 crop
at (936, 2), using the running-frame offset 88 from the T-Rex base at (848, 2).
The small cactus is the 17 × 35 crop at (228, 2).

The masks preserve pixels with alpha greater than 127 and all RGB channels below
180. This retains the dark body and excludes the white border and eye. Rows are
top-down, with `#` for filled cells and `.` for empty cells. The exact masks and
source metadata are in [chrome-runner-mask.js](chrome-runner-mask.js).

Original PNG SHA-256:
`04d05978fdb111358073ab0524e5c1fafc0826615c206987618416b8bd8a4747`

This is an independent project, not a Google or Chromium endorsement.
