# Zoomed hour-hand watch face simulator

A single-file HTML/SVG prototype (`demo.html`) for a Pixel Watch face concept.
It exists to tune the design's geometry and styling in the browser before building the real thing in Google's Watch Face Format (WFF) XML.

## The concept

A single hour hand tells the whole time.
The view is zoomed far into the dial edge, and the space between two hour numerals (30° of arc) is subdivided into 60 minute notches (0.5° each).
Because the zoom magnifies the hour hand's slow movement, its exact position against the notch scale reads as minutes.
The camera follows the hour hand around the dial, so the relevant slice of the scale is always on screen.

## Geometry model

Everything is built as a normal analog clock centered at the SVG midpoint with dial radius `R` (the zoom value).
A camera group then transforms the whole scene.
The visible "screen" is a 450x450 circle (Pixel Watch resolution), enforced with a clip path.
The camera centers on the point `focus x R` from the dial center along the hour hand's current angle.
This mirrors how the WFF version would work: static dial artwork plus time-driven rotations/translations, no dynamic drawing.

## Camera modes

- **Follow hour hand, camera upright**: the scene keeps world orientation and the camera pans along the hand tip. The view orbits the dial over 12 hours.
- **Follow hour hand, camera rotates**: the scene counter-rotates by the hour angle so the hand stays pinned pointing up and the dial glides underneath.

## Controls and config fields

Every design control writes to a live JSON box at the bottom of the settings column (Copy button included).
Pasting that JSON back into a conversation is the intended way to promote a look to new defaults.
Simulation-only controls (time, speed, live) are not part of the JSON.

| Control                | JSON field          | Notes                                                                                                                                                                                                                                                                        |
| ---------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Preset                 | (none)              | Applies a bundle of all fields below                                                                                                                                                                                                                                         |
| Camera                 | `mode`              | `upright` or `rotate`                                                                                                                                                                                                                                                        |
| Minute notches         | `notches`           | Step in minutes, with optional 30-min emphasis: `1`, `1-30`, `10-30`, `5`, `15`, `30`, `0`                                                                                                                                                                                   |
| Zoom (dial radius)     | `zoom`              | Pixels; 200 shows the whole clock, larger = more zoomed. Minute notch spacing is roughly `zoom / 115` px                                                                                                                                                                     |
| Hand thickness         | `thickness`         | Half-width in px; minute hand renders at half this                                                                                                                                                                                                                           |
| Hand length (x radius) | `handLength`        | Fraction of `zoom`; 1.0 ends exactly at the notch ring, max (4) is effectively unending (end can never enter the visible window)                                                                                                                                             |
| Notch weight           | `notchWeight`       | Width multiplier for notches                                                                                                                                                                                                                                                 |
| Notch length           | `notchLength`       | Height multiplier for notches; hour markers stay fixed at 44px, so values below 1 increase hour-vs-notch contrast                                                                                                                                                            |
| Hour marker weight     | `hourWeight`        | Width multiplier for the 12 hour markers (base 6px)                                                                                                                                                                                                                          |
| Numeral side           | `numeralSide`       | `in` (inside the ring) or `out`                                                                                                                                                                                                                                              |
| Sharp ends             | `sharp`             | Square-cut ends on notches, markers, and hands instead of rounded                                                                                                                                                                                                            |
| Numeral inset          | `numeralInset`      | Distance in px from the notch ring to the numeral center                                                                                                                                                                                                                     |
| Numerals upright       | `numeralsUpright`   | On: numerals always read upright (counter-rotated per tick, and against the camera in rotate mode). Off: numerals stay glued to the ring orientation                                                                                                                         |
| Font                   | `fontFamily`        | One of `sans` (Inter), `serif` (Source Serif), `didone` (Playfair Display), `mono` (JetBrains Mono), `condensed` (Oswald), `geometric` (Jost). The same six variable fonts are bundled in `app/src/main/res/font/` and used by both the demo and the watch face                                                                                                                                                                                        |
| Font weight            | `fontWeight`        | 100-900 in steps of 100, mapping onto WFF's weight enum                                                                                                                                                                                                                                                                      |
| Font size              | `fontScale`         | Multiplier on the auto size (which grows with zoom, capped at 56px)                                                                                                                                                                                                          |
| Hand colour            | `handColor`         | Hour hand fill                                                                                                                                                                                                                                                               |
| Dial colour            | `dialColor`         | One hue for the whole scale system; markers/numerals full strength, notches at fixed descending opacities (half 0.9, quarter 0.7, five 0.5, minute 0.27)                                                                                                                     |
| Background             | `background`        | Dial background fill                                                                                                                                                                                                                                                         |
| Focus point            | `focus`             | Where along the hand the camera centers, as a fraction of `zoom` (0 = dial center, 1 = notch ring, >1 = past the hand end)                                                                                                                                                   |
| Date complication      | `complication`      | Screen-fixed round bubble (100px, the standard complication size), styled with the dial colour and font. Demo shows today's date; on the watch it is a real WFF complication slot (default day+date) the user can repoint to battery, steps, weather, etc. in the editor     |
| Complication angle     | `complicationAngle` | Where the bubble sits, in degrees clockwise from 12 o'clock at a fixed safe radius (131px) from screen center: 0 = top, 90 = right, 180 = bottom. WFF cannot animate slot positions, so the bubble is always screen-fixed; in rotate mode 180 visually rides the hand's tail |

Simulation-only: Time (scrub, 12h cycle), Speed (multiplier when not live; touching it or the time slider disables live), Live time.

## Framing rule of thumb

The numeral's offset from screen center is `zoom x (1 - focus) +/- numeralInset` (minus for inside, plus for outside).
Keep the absolute value comfortably under 225 (the screen radius, less at horizontal extremes because the screen is round) or numerals clip.
This is what previously bit the Vernier and Blueprint presets.

## Presets

Presets are config bundles only; picking one sets every control, after which any slider tweak diverges from it freely.
No saving is implemented.

- **Classic**: the tuned default. Orange hand, 10-min notches with 30-min emphasis, zoom 550, focus 0.81.
- **Rotor**: rotating camera, numerals glued to the dial, chunky weights, geometric 800, thick yellow hand ending at the ring.
- **Ember**: warm near-black background, red-orange hand, rose dial tint, serif at weight 200. The quiet one.
- **Wide Angle**: zoom 300, focus 0.55, both hands, blue. Nearly a normal watch; useful as a comparison baseline.
- **Blueprint**: sharp square ends, numerals outside the ring, condensed font, cyan on ink blue.
- **Lume**: dive-watch green for hand and dial alike on near-black, chunky, geometric bold.

## WFF portability notes

The sim deliberately only uses primitives that map to Watch Face Format:

- Static dial artwork (ticks, numerals) pre-rotated around a fixed center. Numerals are real WFF text: the six fonts are bundled as subset variable TTFs in `res/font/`, each with a `<font-family>` XML that instances the `wght` axis per weight, so `fontFamily`/`fontWeight` carry over from the demo exactly.
- Time-driven rotation of the hand and (in rotate mode) the dial group. Directly expressible.
- The upright camera's translation is `focus x zoom x sin/cos(hourAngle)`. WFF transform expressions support trig, so this should be expressible in XML, but it is the least-verified piece.
- Upright numerals in rotate mode need one time-driven counter-rotation per numeral (12 extra animated transforms). Verbose but expressible.
- Colors, weights, and shapes are all baked into artwork at build time.
