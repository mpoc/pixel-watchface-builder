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
The camera centers on the point `focus x R` from the dial center along the camera ray: the hour hand's current angle plus `cameraLead` degrees.
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
| 🎲 Random              | (none)              | Rolls every field at once. Colours, weights, fonts and camera are unconstrained; `zoom`, `focus`, `numeralInset` and `numeralSide` are drawn together against the framing rule below so the numerals still land on screen. Copy the JSON box to keep a lucky roll             |
| Camera                 | `mode`              | `upright` or `rotate`                                                                                                                                                                                                                                                        |
| Minute notches         | `notches`           | Step in minutes, with optional 30-min emphasis: `1`, `1-30`, `10-30`, `5`, `15`, `30`, `0`                                                                                                                                                                                   |
| Zoom (dial radius)     | `zoom`              | Pixels; 200 shows the whole clock, larger = more zoomed. Minute notch spacing is roughly `zoom / 115` px                                                                                                                                                                     |
| Hand thickness         | `thickness`         | Half-width in px; minute hand renders at half this                                                                                                                                                                                                                           |
| Hand length (x radius) | `handLength`        | Fraction of `zoom`; 0 removes the hands entirely (the dial becomes the readout, time under screen center), 1.0 ends exactly at the notch ring, max (4) is effectively unending (end can never enter the visible window)                                                                                                                                             |
| Notch weight           | `notchWeight`       | Width multiplier for notches                                                                                                                                                                                                                                                 |
| Notch length           | `notchLength`       | Height multiplier for notches (0.4-6); hour markers stay fixed at 44px, so values below 1 increase hour-vs-notch contrast                                                                                                                                                            |
| Hour marker weight     | `hourWeight`        | Width multiplier for the 12 hour markers (base 6px)                                                                                                                                                                                                                          |
| Numeral side           | `numeralSide`       | `in` (inside the ring) or `out`                                                                                                                                                                                                                                              |
| Sharp ends             | `sharp`             | Square-cut ends on notches, markers, and hands instead of rounded                                                                                                                                                                                                            |
| Numeral inset          | `numeralInset`      | Distance in px from the notch ring to the numeral center (40-600). Large values are a deliberate way to hide the numerals: past ~600 they never enter the window                                                                                                             |
| Numerals upright       | `numeralsUpright`   | On: numerals always read upright (counter-rotated per tick, and against the camera in rotate mode). Off: numerals stay glued to the ring orientation                                                                                                                         |
| Font                   | `fontFamily`        | One of `sans` (Inter), `serif` (Source Serif), `didone` (Playfair Display), `mono` (JetBrains Mono), `condensed` (Oswald), `geometric` (Jost). The same six typefaces are bundled with the watch face, so what the demo shows is what the watch renders                                                                                                                                                                                        |
| Font weight            | `fontWeight`        | 100-900 in steps of 100, mapping onto WFF's weight enum                                                                                                                                                                                                                                                                      |
| Font size              | `fontScale`         | Multiplier on the auto size (which grows with zoom, capped at 56px)                                                                                                                                                                                                          |
| Hand colour            | `handColor`         | Hour hand fill                                                                                                                                                                                                                                                               |
| Dial colour            | `dialColor`         | One hue for the whole scale system; markers/numerals full strength, notches at fixed descending opacities (half 0.9, quarter 0.7, five 0.5, minute 0.27)                                                                                                                     |
| Background             | `background`        | Dial background fill                                                                                                                                                                                                                                                         |
| Focus point            | `focus`             | Where along the hand the camera centers, as a fraction of `zoom` (0 = dial center, 1 = notch ring, >1 = past the hand end)                                                                                                                                                   |
| Camera lead            | `cameraLead`        | Degrees the camera looks ahead of (positive) or behind (negative) the hand; 0.5 deg = 1 minute, 30 deg = a whole hour. The hand keeps pointing at the true time, so a lead slides it toward the trailing edge and puts the near future under screen center                    |
| Date complication      | `complication`      | Screen-fixed round bubble (100px, the standard complication size), styled with the dial colour and font. Demo shows today's date; on the watch it is a real WFF complication slot (default day+date) the user can repoint to battery, steps, weather, etc. in the editor     |
| Complication angle     | `complicationAngle` | Where the bubble sits, in degrees clockwise from 12 o'clock at a fixed safe radius (131px) from screen center: 0 = top, 90 = right, 180 = bottom. WFF cannot animate slot positions, so the bubble is always screen-fixed; in rotate mode 180 visually rides the hand's tail |

Simulation-only: Time (scrub, 12h cycle), Speed (multiplier when not live; touching it or the time slider disables live), Live time.

## Framing rule of thumb

The numeral's offset from screen center is `zoom x (1 - focus) +/- numeralInset` (minus for inside, plus for outside).
Keep the absolute value comfortably under 225 (the screen radius, less at horizontal extremes because the screen is round) or numerals clip.
This is what previously bit the Vernier preset.

## Presets

Presets are config bundles only; picking one sets every control, after which any slider tweak diverges from it freely.
No saving is implemented.

Every preset but Ink is on pure black: OLED black is unlit, so the face runs into the bezel instead of outlining the screen.

- **Classic**: the tuned default. Orange hand, 5-min notches with 30-min emphasis, zoom 870, focus 0.89.
- **Rotor**: rotating camera, numerals glued to the dial, chunky weights, geometric 800, thick yellow hand ending at the ring, steel grey scale.
- **Wide Angle**: zoom 300, focus 0.55, both hands, blue. Nearly a normal watch; useful as a comparison baseline.
- **Vernier**: a caliper scale. Every-minute notches, hairline cyan hand, steel-white numerals outside the ring, condensed 400, all square-cut.
- **Lume**: dive-watch green for hand and dial alike, chunky, geometric bold.
- **Brutal**: poster-sized black-and-white slabs, square-cut, red hand.
- **Horizon**: the camera leads the hand, so now trails the edge and the near future sits under center. Mint hand, geometric 500.
- **Drift**: handless. Rotating camera with no hand at all, so the dial glides under a fixed viewpoint and the time is whatever sits at screen center. Blue mono numerals glued to the ring, square-cut.
- **Ink**: the one light face — black ink on warm paper, serif, red hand.

## WFF portability notes

The sim deliberately only uses primitives that map to Watch Face Format:

- Static dial artwork (ticks, numerals) pre-rotated around a fixed center. The generator emits only the ticks that can be on screen: the scale repeats every 30 deg, so it draws one hour's worth rotated by `[HOUR_0_11] * 30` instead of all twelve. The demo has no such culling and renders the whole dial — it is the reference for what the watch should look like. Numerals are real WFF text, drawn with a bundled font cut to the preset's exact weight, so `fontFamily`/`fontWeight` carry over from the demo.
- Time-driven rotation of the hand and (in rotate mode) the dial group. Directly expressible.
- The upright camera's translation is `focus x zoom x sin/cos(hourAngle)`. WFF transform expressions support trig, so this should be expressible in XML, but it is the least-verified piece.
- Upright numerals in rotate mode need one time-driven counter-rotation per numeral (12 extra animated transforms). Verbose but expressible.
- Colors, weights, and shapes are all baked into artwork at build time.
