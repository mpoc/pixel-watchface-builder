// Single source of truth for all watch face presets.
// Loaded by demo.html via <script src> and parsed by tools/generate-watchface.ts,
// so the object literal must stay pure JSON (double quotes, no comments inside,
// no trailing commas). Presets are fully expanded — no base/inheritance.
//
// classic    the tuned default
// rotor      rotating camera, numerals glued to dial, chunky, Futura
// ember      warm, dim, quiet; Georgia at weight 200
// wide       pulled back, both hands, close to a normal watch
// blueprint  sharp square ends, numerals outside, cyan on ink blue
// lume       dive-watch green everything on near-black
// ink        inverted: black ink on warm paper, the only light face
// abyss      no numerals at all — pure scale, faint deep-sea blue, hairline hand
// brutal     poster-sized black-and-white slabs, sharp cuts, red hand
globalThis.WATCH_PRESETS = {
  "classic": {
    "mode": "upright", "notches": "5-30", "notchWeight": 1.5, "notchLength": 1.2,
    "hourWeight": 0.95, "hourLength": 1, "numeralInset": 100, "numeralSide": "in", "sharp": false,
    "fontWeight": 600, "fontScale": 1.5, "fontFamily": "system-ui",
    "zoom": 870, "thickness": 2, "handLength": 4, "numeralsUpright": true,
    "focus": 0.89, "minuteHand": false, "complication": true, "complicationAngle": 180,
    "handColor": "#ff9d47", "dialColor": "#e8e8e8", "background": "#000000"
  },
  "rotor": {
    "mode": "rotate", "notches": "5", "notchWeight": 1.6, "notchLength": 1.5,
    "hourWeight": 1.7, "hourLength": 1, "numeralInset": 90, "numeralSide": "in", "sharp": false,
    "fontWeight": 800, "fontScale": 1, "fontFamily": "Futura, 'Century Gothic', sans-serif",
    "zoom": 700, "thickness": 6, "handLength": 1.05, "numeralsUpright": false,
    "focus": 0.7, "minuteHand": false, "complication": false, "complicationAngle": 180,
    "handColor": "#ffd23f", "dialColor": "#e8e8e8", "background": "#101418"
  },
  "ember": {
    "mode": "upright", "notches": "10-30", "notchWeight": 0.6, "notchLength": 0.5,
    "hourWeight": 0.7, "hourLength": 1, "numeralInset": 105, "numeralSide": "in", "sharp": false,
    "fontWeight": 200, "fontScale": 1.2, "fontFamily": "Georgia, serif",
    "zoom": 800, "thickness": 2, "handLength": 1, "numeralsUpright": true,
    "focus": 0.85, "minuteHand": false, "complication": false, "complicationAngle": 180,
    "handColor": "#ff4d2e", "dialColor": "#d8a08c", "background": "#180a07"
  },
  "wide": {
    "mode": "upright", "notches": "5", "notchWeight": 1, "notchLength": 1,
    "hourWeight": 1.2, "hourLength": 1, "numeralInset": 70, "numeralSide": "in", "sharp": false,
    "fontWeight": 600, "fontScale": 0.9, "fontFamily": "system-ui",
    "zoom": 300, "thickness": 3, "handLength": 0.95, "numeralsUpright": true,
    "focus": 0.55, "minuteHand": true, "complication": false, "complicationAngle": 180,
    "handColor": "#7fd0ff", "dialColor": "#e8e8e8", "background": "#000000"
  },
  "blueprint": {
    "mode": "upright", "notches": "5", "notchWeight": 1, "notchLength": 1.1,
    "hourWeight": 1.1, "hourLength": 1, "numeralInset": 60, "numeralSide": "out", "sharp": true,
    "fontWeight": 400, "fontScale": 1.1, "fontFamily": "'Avenir Next Condensed', 'Arial Narrow', sans-serif",
    "zoom": 900, "thickness": 1.5, "handLength": 1, "numeralsUpright": true,
    "focus": 0.88, "minuteHand": false, "complication": false, "complicationAngle": 180,
    "handColor": "#62d0ff", "dialColor": "#a8c8e0", "background": "#0a1420"
  },
  "lume": {
    "mode": "upright", "notches": "10-30", "notchWeight": 1.5, "notchLength": 1.1,
    "hourWeight": 1.5, "hourLength": 1, "numeralInset": 90, "numeralSide": "in", "sharp": false,
    "fontWeight": 700, "fontScale": 1, "fontFamily": "Futura, 'Century Gothic', sans-serif",
    "zoom": 550, "thickness": 4, "handLength": 0.98, "numeralsUpright": true,
    "focus": 0.85, "minuteHand": false, "complication": false, "complicationAngle": 180,
    "handColor": "#b8ffc8", "dialColor": "#b8ffc8", "background": "#050805"
  },
  "ink": {
    "mode": "upright", "notches": "5-30", "notchWeight": 1, "notchLength": 1,
    "hourWeight": 0.9, "hourLength": 1.2, "numeralInset": 100, "numeralSide": "in", "sharp": false,
    "fontWeight": 400, "fontScale": 1.4, "fontFamily": "Georgia, serif",
    "zoom": 800, "thickness": 2, "handLength": 4, "numeralsUpright": true,
    "focus": 0.87, "minuteHand": false, "complication": true, "complicationAngle": 180,
    "handColor": "#b3261e", "dialColor": "#1c1a17", "background": "#f0e7d3"
  },
  "abyss": {
    "mode": "upright", "notches": "30", "notchWeight": 0.8, "notchLength": 2,
    "hourWeight": 0.8, "hourLength": 2.2, "numeralInset": 600, "numeralSide": "in", "sharp": false,
    "fontWeight": 200, "fontScale": 1, "fontFamily": "system-ui",
    "zoom": 1400, "thickness": 1, "handLength": 4, "numeralsUpright": true,
    "focus": 0.9, "minuteHand": false, "complication": false, "complicationAngle": 180,
    "handColor": "#dff3ff", "dialColor": "#3d6d8a", "background": "#010409"
  },
  "brutal": {
    "mode": "upright", "notches": "5", "notchWeight": 3, "notchLength": 1.5,
    "hourWeight": 2.5, "hourLength": 1.2, "numeralInset": 95, "numeralSide": "in", "sharp": true,
    "fontWeight": 800, "fontScale": 1.3, "fontFamily": "system-ui",
    "zoom": 480, "thickness": 8, "handLength": 1, "numeralsUpright": true,
    "focus": 0.75, "minuteHand": false, "complication": false, "complicationAngle": 180,
    "handColor": "#ff1e00", "dialColor": "#f5f5f5", "background": "#000000"
  }
};
