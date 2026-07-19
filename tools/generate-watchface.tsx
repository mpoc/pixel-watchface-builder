// Generates app/src/main/res/raw/watchface.xml from presets.js (shared with demo.html).
//
// Usage:
//   bun tools/generate-watchface.ts [preset]   single preset (default: classic)
//   bun tools/generate-watchface.ts --all      all presets as a style picker
//                                              (long-press face -> customize on the watch);
//                                              also writes res/values/presets_strings.xml
//
// The design: a dial of radius `zoom` much larger than the screen. The camera
// stays upright and centers on the point at focus*zoom from the dial center
// along the hour hand, so you see a magnified arc of the dial sliding past.
// Notches mark minutes of hour-hand travel (0.5 deg per minute).

import XMLBuilder from "fast-xml-builder";

const presetsSrc = await Bun.file("presets.js").text();
const PRESETS = JSON.parse(
  presetsSrc.slice(presetsSrc.indexOf("{"), presetsSrc.lastIndexOf("}") + 1),
);

const SCREEN = 450;
const wff = (c: string) => "#FF" + c.slice(1).toUpperCase(); // #rrggbb -> #AARRGGBB
const round = (n: number) => Math.round(n);
const ceil = (n: number) => Math.ceil(n);

// Hand angles in degrees, smooth to the second.
const HOUR_DEG = "([HOUR_0_11] + [MINUTE_SECOND] / 60.0) * 30.0";
const MINUTE_DEG = "[MINUTE_SECOND] * 6.0";

// Minimal XML tree node, shaped for fast-xml-parser's XMLBuilder in
// preserveOrder mode: { Tag: children[], ":@": { "@_attr": value } }.
// Children are pushed in emit order, just like the old string-based emit().
type XNode = Record<string, any>;
const el = (
  tag: string,
  attrs: Record<string, string | number> = {},
  children: XNode[] = [],
): XNode => {
  const node: XNode = { [tag]: children };
  const keys = Object.keys(attrs);
  if (keys.length) {
    const a: Record<string, string> = {};
    for (const k of keys) a[`@_${k}`] = String(attrs[k]);
    node[":@"] = a;
  }
  return node;
};
const text = (s: string | number): XNode => ({ "#text": String(s) });

// Builds one preset's background + camera group.
const buildPreset = (name: string, p: any): { bg: XNode; camera: XNode } => {
  const ROTATE = p.mode === "rotate";
  const R = p.zoom;
  const DIST = p.focus * R;
  // Cap at the farthest visible point (focus distance + screen half-diagonal).
  const HAND_LEN = Math.round(Math.min(p.handLength * R, DIST + 320));
  const BOX = 2 * Math.ceil(Math.max(R, HAND_LEN) + 60); // dial container, dial center at (CX, CX)
  const CX = BOX / 2;

  const HAND_COLOR = wff(p.handColor);
  const DIAL_COLOR = wff(p.dialColor);
  const BG_COLOR = wff(p.background);

  const FONT_SIZE = Math.round(p.fontScale * Math.min(56, 26 + (R - 200) / 60));
  const NUM_R =
    R + (p.numeralSide === "out" ? p.numeralInset : -p.numeralInset);

  const bg = el("PartDraw", { x: 0, y: 0, width: SCREEN, height: SCREEN }, [
    el("Rectangle", { x: 0, y: 0, width: SCREEN, height: SCREEN }, [
      el("Fill", { color: BG_COLOR }),
    ]),
  ]);

  // Camera: bring the focus point (at DIST along the hand) to screen center.
  // Upright: translate the dial container against the hand angle.
  // Rotate: fix the dial DIST below center and counter-rotate it about its own
  // center by the hour angle, so the hand stays pinned pointing up.
  const camAttrs: Record<string, string | number> = ROTATE
    ? {
        name: `camera_${name}`,
        x: SCREEN / 2 - CX,
        y: round(SCREEN / 2 - CX + DIST),
        width: BOX,
        height: BOX,
        pivotX: 0.5,
        pivotY: 0.5,
      }
    : { name: `camera_${name}`, x: 0, y: 0, width: BOX, height: BOX };
  const camChildren: XNode[] = [];
  if (ROTATE) {
    camChildren.push(
      el("Transform", { target: "angle", value: `360.0 - (${HOUR_DEG})` }),
    );
  } else {
    camChildren.push(
      el("Transform", {
        target: "x",
        value: `${SCREEN / 2 - CX} - sin(rad(${HOUR_DEG})) * ${DIST}`,
      }),
    );
    camChildren.push(
      el("Transform", {
        target: "y",
        value: `${SCREEN / 2 - CX} + cos(rad(${HOUR_DEG})) * ${DIST}`,
      }),
    );
  }

  // A radial tick: width w, length h, outer end on the dial ring at angle deg.
  // Placed at its final position and rotated about its own center — no wrapper
  // group, so the renderer never sees dial-sized static groups (previously one
  // per tick, which made the whole watch lag). Geometry attributes are integers.
  const tick = (deg: number, w: number, h: number, alpha: number): XNode => {
    const rad = (deg * Math.PI) / 180;
    const cx = CX + Math.sin(rad) * (R - h / 2);
    const cy = CX - Math.cos(rad) * (R - h / 2);
    return el(
      "PartDraw",
      {
        x: round(cx - w / 2),
        y: round(cy - h / 2),
        width: ceil(w),
        height: ceil(h),
        angle: deg,
        pivotX: 0.5,
        pivotY: 0.5,
        alpha,
      },
      [
        el("Rectangle", { x: 0, y: 0, width: ceil(w), height: ceil(h) }, [
          el("Fill", { color: DIAL_COLOR }),
        ]),
      ],
    );
  };

  // Hour markers (base 6px wide, 44px long).
  for (let h = 0; h < 12; h++)
    camChildren.push(tick(h * 30, p.hourWeight * 6, p.hourLength * 44, 255));

  // Minute notches, e.g. "10-30" = every 10 minutes with the 30 emphasized.
  const [stepStr, emphasis] = String(p.notches).split("-");
  const step = +(stepStr ?? 0);
  const halfEmph = emphasis === "30";
  if (step > 0) {
    for (let h = 0; h < 12; h++) {
      for (let m = step; m < 60; m += step) {
        const deg = h * 30 + m * 0.5;
        const five = m % 5 === 0,
          fifteen = m % 15 === 0,
          half = halfEmph && m === 30;
        const w = p.notchWeight * (half ? 3.5 : fifteen ? 2.5 : 1.5);
        const len = p.notchLength * (half ? 38 : fifteen ? 30 : five ? 22 : 12);
        const alpha = Math.round(
          255 * (half ? 0.9 : fifteen ? 0.7 : five ? 0.5 : 0.27),
        );
        camChildren.push(tick(deg, w, len, alpha));
      }
    }
  }

  // Numerals at fixed positions on the ring. Self-rotation about each numeral's
  // center: glued = static ring orientation; upright in rotate mode = spin with
  // the hour so the camera's counter-rotation cancels out; otherwise none.
  for (let h = 0; h < 12; h++) {
    const degNum = h * 30;
    const deg = (degNum * Math.PI) / 180;
    const cx = CX + Math.sin(deg) * NUM_R;
    const cy = CX - Math.cos(deg) * NUM_R;
    const bw = 120,
      bh = Math.max(48, FONT_SIZE + 16);
    const glued = !p.numeralsUpright;
    const ptAttrs: Record<string, string | number> = {
      x: round(cx - bw / 2),
      y: round(cy - bh / 2),
      width: bw,
      height: bh,
    };
    if (glued)
      Object.assign(ptAttrs, { angle: degNum, pivotX: 0.5, pivotY: 0.5 });
    const ptChildren: XNode[] = [];
    if (!glued && ROTATE)
      ptChildren.push(el("Transform", { target: "angle", value: HOUR_DEG }));
    ptChildren.push(
      el("Text", { align: "CENTER", ellipsis: "false" }, [
        el(
          "Font",
          {
            family: "SYNC_TO_DEVICE",
            size: FONT_SIZE,
            weight: "BOLD",
            color: DIAL_COLOR,
          },
          [text(h === 0 ? 12 : h)],
        ),
      ]),
    );
    camChildren.push(el("PartText", ptAttrs, ptChildren));
  }

  // Hands: from dial center outward (plus an 8px tail), rotating with the time.
  // Minute hand (when enabled) is the demo's thin grey reference hand.
  const hand = (
    tag: string,
    w: number,
    angleExpr: string,
    color: string,
  ): XNode => {
    const hw = ceil(w);
    return el(
      "Group",
      {
        name: `${tag}_${name}`,
        x: 0,
        y: 0,
        width: BOX,
        height: BOX,
        pivotX: 0.5,
        pivotY: 0.5,
      },
      [
        el("Transform", { target: "angle", value: angleExpr }),
        el(
          "PartDraw",
          {
            x: round(CX - hw / 2),
            y: CX - HAND_LEN,
            width: hw,
            height: HAND_LEN + 8,
          },
          [
            el("Rectangle", { x: 0, y: 0, width: hw, height: HAND_LEN + 8 }, [
              el("Fill", { color }),
            ]),
          ],
        ),
      ],
    );
  };
  camChildren.push(hand("hand", p.thickness * 2, HOUR_DEG, HAND_COLOR));
  if (p.minuteHand)
    camChildren.push(hand("minhand", p.thickness, MINUTE_DEG, wff("#8892a0")));

  return { bg, camera: el("Group", camAttrs, camChildren) };
};

// Screen-fixed round date complication at bottom center, styled to the preset.
// The user can repoint it (battery, steps, weather...) in the on-watch editor.
// 100 units on the 450 canvas is the typical round complication size (~22% of
// screen). complicationAngle places it at a fixed safe radius from screen
// center: 0 = top, 90 = right, 180 = bottom.
const COMP = { d: 100, r: 131 };
const buildComplicationSlot = (name: string, p: any, slotId: number): XNode => {
  const DIAL_COLOR = wff(p.dialColor);
  const OUTLINE = "#59" + p.dialColor.slice(1).toUpperCase(); // dial color at ~35%
  const size = Math.round(20 * p.fontScale);
  const titleSize = Math.round(13 * p.fontScale);
  const d = COMP.d;
  const aRad = ((p.complicationAngle ?? 180) * Math.PI) / 180;
  const cx = SCREEN / 2 + Math.sin(aRad) * COMP.r;
  const cy = SCREEN / 2 - Math.cos(aRad) * COMP.r;

  const line = (y: number, h: number, fontSize: number, expr: string): XNode =>
    el("PartText", { x: 6, y, width: d - 12, height: h }, [
      el("Text", { align: "CENTER", ellipsis: "TRUE" }, [
        el(
          "Font",
          {
            family: "SYNC_TO_DEVICE",
            size: fontSize,
            weight: "BOLD",
            color: DIAL_COLOR,
          },
          [
            el("Template", {}, [
              text("%s"),
              el("Parameter", { expression: expr }),
            ]),
          ],
        ),
      ]),
    ]);

  return el(
    "ComplicationSlot",
    {
      slotId,
      name: `date_${name}`,
      x: round(cx - d / 2),
      y: round(cy - d / 2),
      width: d,
      height: d,
      supportedTypes: "SHORT_TEXT",
      tintColor: DIAL_COLOR,
    },
    [
      el("DefaultProviderPolicy", {
        defaultSystemProvider: "DAY_AND_DATE",
        defaultSystemProviderType: "SHORT_TEXT",
      }),
      el("BoundingOval", { x: 0, y: 0, width: d, height: d }),
      // Provider icon on top (tinted via the slot's tintColor; empty if the
      // provider has none), then title and text. Day+date puts the weekday in
      // TITLE and the day number in TEXT.
      el("Complication", { type: "SHORT_TEXT" }, [
        el("PartDraw", { x: 0, y: 0, width: d, height: d }, [
          el("Ellipse", { x: 1, y: 1, width: d - 2, height: d - 2 }, [
            el("Stroke", { color: OUTLINE, thickness: 2 }),
          ]),
        ]),
        el("PartImage", { x: d / 2 - 11, y: 10, width: 22, height: 22 }, [
          el("Image", { resource: "[COMPLICATION.MONOCHROMATIC_IMAGE]" }),
        ]),
        line(34, titleSize + 8, titleSize, "[COMPLICATION.TITLE]"),
        line(52, size + 12, size, "[COMPLICATION.TEXT]"),
      ]),
    ],
  );
};

const arg = Bun.argv[2] ?? "classic";
const all = arg === "--all";
if (!all && !PRESETS[arg]) {
  console.error(
    `unknown preset "${arg}"; have: --all, ${Object.keys(PRESETS).join(", ")}`,
  );
  process.exit(1);
}

const watchFaceChildren: XNode[] = [
  el("Metadata", { key: "CLOCK_TYPE", value: "ANALOG" }),
  el("Metadata", { key: "PREVIEW_TIME", value: "10:08:32" }),
];

let stringsOut: string[] | null = null;

if (all) {
  const names = Object.keys(PRESETS);
  // WFF allows at most 8 complication slots total; each enabled preset gets its own.
  const compNames = names.filter((n) => PRESETS[n].complication);
  if (compNames.length > 8)
    console.warn(
      `warning: ${compNames.length} presets have complications; only the first 8 get a slot`,
    );
  const slotOf = new Map(compNames.slice(0, 8).map((n, i) => [n, i]));

  const listOptions = names.map((n) =>
    el("ListOption", {
      id: n,
      displayName: `@string/preset_${n}`,
      complicationSlotIds: slotOf.get(n) ?? "",
    }),
  );
  watchFaceChildren.push(
    el("UserConfigurations", {}, [
      el(
        "ListConfiguration",
        {
          id: "preset",
          displayName: "@string/preset_label",
          defaultValue: names[0]!,
        },
        listOptions,
      ),
    ]),
  );

  const presetListOptions = names.map((n) => {
    const { bg, camera } = buildPreset(n, PRESETS[n]);
    return el("ListOption", { id: n }, [bg, camera]);
  });
  const sceneChildren: XNode[] = [
    el("ListConfiguration", { id: "preset" }, presetListOptions),
  ];
  for (const [n, slot] of slotOf)
    sceneChildren.push(buildComplicationSlot(n, PRESETS[n], slot));
  watchFaceChildren.push(
    el("Scene", { backgroundColor: "#FF000000" }, sceneChildren),
  );

  // Editor labels for the style picker.
  const cap = (s: string) => s[0]!.toUpperCase() + s.slice(1);
  stringsOut = [
    `<?xml version="1.0" encoding="utf-8"?>`,
    `<!-- Generated by tools/generate-watchface.ts (all mode). Do not edit by hand. -->`,
    `<resources>`,
    `    <string name="preset_label">Preset</string>`,
    ...names.map((n) => `    <string name="preset_${n}">${cap(n)}</string>`),
    `</resources>`,
  ];
} else {
  const p = PRESETS[arg];
  const { bg, camera } = buildPreset(arg, p);
  const sceneChildren: XNode[] = [bg, camera];
  if (p.complication) sceneChildren.push(buildComplicationSlot(arg, p, 0));
  watchFaceChildren.push(
    el("Scene", { backgroundColor: wff(p.background) }, sceneChildren),
  );
}

const doc: XNode[] = [
  el("WatchFace", { width: SCREEN, height: SCREEN }, watchFaceChildren),
];

const builder = new XMLBuilder({
  preserveOrder: true,
  format: true,
  indentBy: "    ",
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  suppressEmptyNode: true,
});

const xml = `<?xml version="1.0" encoding="utf-8"?>\n${builder.build(doc)}`;

const out = "app/src/main/res/raw/watchface.xml";
await Bun.write(out, xml);
if (stringsOut)
  await Bun.write(
    "app/src/main/res/values/presets_strings.xml",
    stringsOut.join("\n") + "\n",
  );
console.log(
  `wrote ${out} ${all ? `with all ${Object.keys(PRESETS).length} presets` : `from preset "${arg}"`}`,
);
