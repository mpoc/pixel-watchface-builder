// Single source of truth for all watch face presets.
// Loaded by demo.html via <script src> and parsed by tools/generate-watchface.tsx,
// so the object literal must stay pure JSON (double quotes, no comments inside,
// no trailing commas). Presets are fully expanded — no base/inheritance.
//
// fontFamily is one of the six tokens sans | serif | didone | mono | condensed |
// geometric; demo.html and the generator each map them to the same bundled font.
// fontWeight is a multiple of 100 (100-900) so it maps exactly onto WFF's enum.
//
// Backgrounds are pure black everywhere but ink: OLED black is unlit, so the face
// runs into the bezel instead of outlining the screen.
//
// classic    the tuned default
// rotor      rotating camera, numerals glued to dial, chunky, geometric
// wide       pulled back, both hands, close to a normal watch
// vernier    caliper scale: steel numerals outside the ring, hairline cyan hand
// lume       dive-watch green everything on black
// ink        inverted: black ink on warm paper, the only light face
// brutal     poster-sized black-and-white slabs, sharp cuts, red hand
// horizon    camera leads the hand by 24 minutes: now trails the edge, ahead is centered
// drift      handless: the dial rotates under a fixed viewpoint, time reads at screen center
globalThis.WATCH_PRESETS = {
  "classic": {
    "mode": "upright", "notches": "5-30", "notchWeight": 1.5, "notchLength": 1.2,
    "hourWeight": 0.95, "hourLength": 1, "numeralInset": 100, "numeralSide": "in", "sharp": false,
    "fontWeight": 600, "fontScale": 1.5, "fontFamily": "sans",
    "zoom": 870, "thickness": 2, "handLength": 4, "numeralsUpright": true,
    "focus": 0.89, "cameraLead": 0, "minuteHand": false, "complication": true, "complicationAngle": 180,
    "handColor": "#ff9d47", "dialColor": "#e8e8e8", "background": "#000000"
  },
  "rotor": {
    "mode": "rotate", "notches": "5", "notchWeight": 1.6, "notchLength": 1.5,
    "hourWeight": 1.7, "hourLength": 1, "numeralInset": 90, "numeralSide": "in", "sharp": false,
    "fontWeight": 800, "fontScale": 1, "fontFamily": "geometric",
    "zoom": 700, "thickness": 6, "handLength": 1.05, "numeralsUpright": false,
    "focus": 0.7, "cameraLead": 0, "minuteHand": false, "complication": false, "complicationAngle": 180,
    "handColor": "#ffd23f", "dialColor": "#9aa0a6", "background": "#000000"
  },
  "wide": {
    "mode": "upright", "notches": "5", "notchWeight": 1, "notchLength": 1,
    "hourWeight": 1.2, "hourLength": 1, "numeralInset": 70, "numeralSide": "in", "sharp": false,
    "fontWeight": 600, "fontScale": 0.9, "fontFamily": "sans",
    "zoom": 300, "thickness": 3, "handLength": 0.95, "numeralsUpright": true,
    "focus": 0.55, "cameraLead": 0, "minuteHand": true, "complication": false, "complicationAngle": 180,
    "handColor": "#7fd0ff", "dialColor": "#e8e8e8", "background": "#000000"
  },
  "vernier": {
    "mode": "upright", "notches": "1-30", "notchWeight": 0.8, "notchLength": 0.9,
    "hourWeight": 1.2, "hourLength": 1.1, "numeralInset": 60, "numeralSide": "out", "sharp": true,
    "fontWeight": 400, "fontScale": 1.1, "fontFamily": "condensed",
    "zoom": 900, "thickness": 1.5, "handLength": 1, "numeralsUpright": true,
    "focus": 0.88, "cameraLead": 0, "minuteHand": false, "complication": false, "complicationAngle": 180,
    "handColor": "#62d0ff", "dialColor": "#dfe6ec", "background": "#000000"
  },
  "lume": {
    "mode": "upright", "notches": "10-30", "notchWeight": 1.5, "notchLength": 1.1,
    "hourWeight": 1.5, "hourLength": 1, "numeralInset": 90, "numeralSide": "in", "sharp": false,
    "fontWeight": 700, "fontScale": 1, "fontFamily": "geometric",
    "zoom": 550, "thickness": 4, "handLength": 0.98, "numeralsUpright": true,
    "focus": 0.85, "cameraLead": 0, "minuteHand": false, "complication": false, "complicationAngle": 180,
    "handColor": "#b8ffc8", "dialColor": "#b8ffc8", "background": "#000000"
  },
  "ink": {
    "mode": "upright", "notches": "5-30", "notchWeight": 1, "notchLength": 1,
    "hourWeight": 0.9, "hourLength": 1.2, "numeralInset": 100, "numeralSide": "in", "sharp": false,
    "fontWeight": 400, "fontScale": 1.4, "fontFamily": "serif",
    "zoom": 800, "thickness": 2, "handLength": 4, "numeralsUpright": true,
    "focus": 0.87, "cameraLead": 0, "minuteHand": false, "complication": true, "complicationAngle": 180,
    "handColor": "#b3261e", "dialColor": "#1c1a17", "background": "#f0e7d3"
  },
  "brutal": {
    "mode": "upright", "notches": "10-30", "notchWeight": 2, "notchLength": 1.5,
    "hourWeight": 2, "hourLength": 1.2, "numeralInset": 96, "numeralSide": "in", "sharp": true,
    "fontWeight": 800, "fontScale": 1.3, "fontFamily": "sans",
    "zoom": 620, "thickness": 8, "handLength": 1, "numeralsUpright": true,
    "focus": 0.84, "cameraLead": 0, "minuteHand": false, "complication": false, "complicationAngle": 180,
    "handColor": "#ff1e00", "dialColor": "#f5f5f5", "background": "#000000"
  },
  "horizon": {
    "mode": "upright", "notches": "5-30", "notchWeight": 1.2, "notchLength": 1.1,
    "hourWeight": 1, "hourLength": 1, "numeralInset": 100, "numeralSide": "in", "sharp": false,
    "fontWeight": 500, "fontScale": 1.4, "fontFamily": "geometric",
    "zoom": 800, "thickness": 3, "handLength": 4, "numeralsUpright": true,
    "focus": 0.88, "cameraLead": 10, "minuteHand": false, "complication": false, "complicationAngle": 180,
    "handColor": "#5ad1a0", "dialColor": "#dce3e8", "background": "#000000"
  },
  "drift": {
    "mode": "rotate", "notches": "5-30", "notchWeight": 1.8, "notchLength": 1.95,
    "hourWeight": 1.3, "hourLength": 2.2, "numeralInset": 40, "numeralSide": "out", "sharp": true,
    "fontWeight": 900, "fontScale": 1.8, "fontFamily": "mono",
    "zoom": 620, "thickness": 6, "handLength": 0, "numeralsUpright": false,
    "focus": 0.94, "cameraLead": 0, "minuteHand": false, "complication": false, "complicationAngle": 150,
    "handColor": "#ed557f", "dialColor": "#85beff", "background": "#000000"
  }
};
