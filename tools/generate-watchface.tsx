/** @jsxImportSource ./xjsx */
// Generates app/src/main/res/raw/watchface.xml from presets.js (shared with demo.html).
//
// Usage:
//   bun tools/generate-watchface.tsx   packs every preset as a style picker
//                                      (long-press face -> customize on the watch);
//                                      also writes res/values/presets_strings.xml
//
// The design: a dial of radius `zoom` much larger than the screen. The camera
// stays upright and centers on the point at focus*zoom from the dial center
// along the hour hand, so you see a magnified arc of the dial sliding past.
// Notches mark minutes of hour-hand travel (0.5 deg per minute).
//
// The JSX below is not React: tools/xjsx/jsx-runtime.ts turns it straight into
// the node tree fast-xml-builder serializes.

import XMLBuilder from "fast-xml-builder";
import { tagsFor, type XNode } from "./xjsx/jsx-runtime";

const {
  WatchFace,
  Metadata,
  Scene,
  Group,
  Transform,
  PartDraw,
  PartText,
  PartImage,
  Rectangle,
  Ellipse,
  Fill,
  Stroke,
  Image,
  Text,
  Font,
  Template,
  Parameter,
  ComplicationSlot,
  DefaultProviderPolicy,
  BoundingOval,
  Complication,
  UserConfigurations,
  ListConfiguration,
  ListOption,
} = tagsFor(
  "WatchFace", "Metadata", "Scene", "Group", "Transform",
  "PartDraw", "PartText", "PartImage", "Rectangle", "Ellipse", "Fill", "Stroke", "Image",
  "Text", "Font", "Template", "Parameter",
  "ComplicationSlot", "DefaultProviderPolicy", "BoundingOval", "Complication",
  "UserConfigurations", "ListConfiguration", "ListOption",
);

const presetsSrc = await Bun.file("presets.js").text();
const PRESETS = JSON.parse(
  presetsSrc.slice(presetsSrc.indexOf("{"), presetsSrc.lastIndexOf("}") + 1),
);

const SCREEN = 450;
const wff = (c: string) => "#FF" + c.slice(1).toUpperCase(); // #rrggbb -> #AARRGGBB
const round = (n: number) => Math.round(n);
const ceil = (n: number) => Math.ceil(n);
const range = (n: number) => Array.from({ length: n }, (_, i) => i);

// Hand angles in degrees, smooth to the second.
const HOUR_DEG = "([HOUR_0_11] + [MINUTE_SECOND] / 60.0) * 30.0";
const MINUTE_DEG = "[MINUTE_SECOND] * 6.0";

// fontFamily token -> res/font family XML (one bundled variable font each,
// instanced at every weight so the WFF `weight` attribute resolves properly).
// The demo maps the same tokens to the same typefaces via @font-face.
const FONT_FAMILY: Record<string, string> = {
  sans: "inter_family",
  serif: "source_serif_family",
  didone: "playfair_display_family",
  mono: "jetbrains_mono_family",
  condensed: "oswald_family",
  geometric: "jost_family",
};
// WFF Font/@weight enum, keyed by the numeric weights presets use.
const FONT_WEIGHT: Record<number, string> = {
  100: "THIN",
  200: "EXTRA_LIGHT",
  300: "LIGHT",
  400: "NORMAL",
  500: "MEDIUM",
  600: "SEMI_BOLD",
  700: "BOLD",
  800: "EXTRA_BOLD",
  900: "BLACK",
};
const fontFamily = (p: any) => {
  const f = FONT_FAMILY[p.fontFamily];
  if (!f) throw new Error(`unknown fontFamily "${p.fontFamily}"`);
  return f;
};
const fontWeight = (p: any) =>
  FONT_WEIGHT[Math.min(900, Math.max(100, Math.round(p.fontWeight / 100) * 100))];

// One preset's full scene content: background, then the camera group.
const buildPreset = (name: string, p: any): XNode[] => {
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

  // A radial tick: width w, length h, outer end on the dial ring at angle deg.
  // Placed at its final position and rotated about its own center — no wrapper
  // group, so the renderer never sees dial-sized static groups (previously one
  // per tick, which made the whole watch lag). Geometry attributes are integers.
  const tick = (deg: number, w: number, h: number, alpha: number) => {
    const rad = (deg * Math.PI) / 180;
    const cx = CX + Math.sin(rad) * (R - h / 2);
    const cy = CX - Math.cos(rad) * (R - h / 2);
    return (
      <PartDraw
        x={round(cx - w / 2)}
        y={round(cy - h / 2)}
        width={ceil(w)}
        height={ceil(h)}
        angle={deg}
        pivotX={0.5}
        pivotY={0.5}
        alpha={alpha}
      >
        <Rectangle x={0} y={0} width={ceil(w)} height={ceil(h)}>
          <Fill color={DIAL_COLOR} />
        </Rectangle>
      </PartDraw>
    );
  };

  // Hour markers (base 6px wide, 44px long).
  const hours = range(12).map((h) =>
    tick(h * 30, p.hourWeight * 6, p.hourLength * 44, 255),
  );

  // Minute notches, e.g. "10-30" = every 10 minutes with the 30 emphasized.
  const [stepStr, emphasis] = String(p.notches).split("-");
  const step = +(stepStr ?? 0);
  const halfEmph = emphasis === "30";
  const mins: number[] = [];
  if (step > 0) for (let m = step; m < 60; m += step) mins.push(m);
  const notches = range(12).flatMap((h) =>
    mins.map((m) => {
      const five = m % 5 === 0,
        fifteen = m % 15 === 0,
        half = halfEmph && m === 30;
      return tick(
        h * 30 + m * 0.5,
        p.notchWeight * (half ? 3.5 : fifteen ? 2.5 : 1.5),
        p.notchLength * (half ? 38 : fifteen ? 30 : five ? 22 : 12),
        Math.round(255 * (half ? 0.9 : fifteen ? 0.7 : five ? 0.5 : 0.27)),
      );
    }),
  );

  // Numerals at fixed positions on the ring. Self-rotation about each numeral's
  // center: glued = static ring orientation; upright in rotate mode = spin with
  // the hour so the camera's counter-rotation cancels out; otherwise none.
  const glued = !p.numeralsUpright;
  const numerals = range(12).map((h) => {
    const degNum = h * 30;
    const rad = (degNum * Math.PI) / 180;
    const cx = CX + Math.sin(rad) * NUM_R;
    const cy = CX - Math.cos(rad) * NUM_R;
    const bw = 120;
    const bh = Math.max(48, FONT_SIZE + 16);
    return (
      <PartText
        x={round(cx - bw / 2)}
        y={round(cy - bh / 2)}
        width={bw}
        height={bh}
        angle={glued ? degNum : undefined}
        pivotX={glued ? 0.5 : undefined}
        pivotY={glued ? 0.5 : undefined}
      >
        {!glued && ROTATE && <Transform target="angle" value={HOUR_DEG} />}
        <Text align="CENTER" ellipsis="false">
          <Font
            family={fontFamily(p)}
            size={FONT_SIZE}
            weight={fontWeight(p)}
            color={DIAL_COLOR}
          >
            {h === 0 ? 12 : h}
          </Font>
        </Text>
      </PartText>
    );
  });

  // Hands: from dial center outward (plus an 8px tail), rotating with the time.
  // Minute hand (when enabled) is the demo's thin grey reference hand.
  const hand = (tag: string, w: number, angleExpr: string, color: string) => {
    const hw = ceil(w);
    return (
      <Group
        name={`${tag}_${name}`}
        x={0}
        y={0}
        width={BOX}
        height={BOX}
        pivotX={0.5}
        pivotY={0.5}
      >
        <Transform target="angle" value={angleExpr} />
        <PartDraw
          x={round(CX - hw / 2)}
          y={CX - HAND_LEN}
          width={hw}
          height={HAND_LEN + 8}
        >
          <Rectangle x={0} y={0} width={hw} height={HAND_LEN + 8}>
            <Fill color={color} />
          </Rectangle>
        </PartDraw>
      </Group>
    );
  };

  return [
    <PartDraw x={0} y={0} width={SCREEN} height={SCREEN}>
      <Rectangle x={0} y={0} width={SCREEN} height={SCREEN}>
        <Fill color={BG_COLOR} />
      </Rectangle>
    </PartDraw>,
    // Camera: bring the focus point (at DIST along the hand) to screen center.
    // Upright: translate the dial container against the hand angle.
    // Rotate: fix the dial DIST below center and counter-rotate it about its own
    // center by the hour angle, so the hand stays pinned pointing up.
    <Group
      name={`camera_${name}`}
      x={ROTATE ? SCREEN / 2 - CX : 0}
      y={ROTATE ? round(SCREEN / 2 - CX + DIST) : 0}
      width={BOX}
      height={BOX}
      pivotX={ROTATE ? 0.5 : undefined}
      pivotY={ROTATE ? 0.5 : undefined}
    >
      {ROTATE ? (
        <Transform target="angle" value={`360.0 - (${HOUR_DEG})`} />
      ) : (
        <>
          <Transform
            target="x"
            value={`${SCREEN / 2 - CX} - sin(rad(${HOUR_DEG})) * ${DIST}`}
          />
          <Transform
            target="y"
            value={`${SCREEN / 2 - CX} + cos(rad(${HOUR_DEG})) * ${DIST}`}
          />
        </>
      )}
      {hours}
      {notches}
      {numerals}
      {hand("hand", p.thickness * 2, HOUR_DEG, HAND_COLOR)}
      {p.minuteHand && hand("minhand", p.thickness, MINUTE_DEG, wff("#8892a0"))}
    </Group>,
  ];
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

  const line = (y: number, h: number, fontSize: number, expr: string) => (
    <PartText x={6} y={y} width={d - 12} height={h}>
      <Text align="CENTER" ellipsis="TRUE">
        <Font
          family={fontFamily(p)}
          size={fontSize}
          weight={fontWeight(p)}
          color={DIAL_COLOR}
        >
          <Template>
            %s
            <Parameter expression={expr} />
          </Template>
        </Font>
      </Text>
    </PartText>
  );

  return (
    <ComplicationSlot
      slotId={slotId}
      name={`date_${name}`}
      x={round(cx - d / 2)}
      y={round(cy - d / 2)}
      width={d}
      height={d}
      supportedTypes="SHORT_TEXT"
      tintColor={DIAL_COLOR}
    >
      <DefaultProviderPolicy
        defaultSystemProvider="DAY_AND_DATE"
        defaultSystemProviderType="SHORT_TEXT"
      />
      <BoundingOval x={0} y={0} width={d} height={d} />
      <Complication type="SHORT_TEXT">
        <PartDraw x={0} y={0} width={d} height={d}>
          <Ellipse x={1} y={1} width={d - 2} height={d - 2}>
            <Stroke color={OUTLINE} thickness={2} />
          </Ellipse>
        </PartDraw>
        {/* Provider icon on top (tinted via the slot's tintColor; empty if the
            provider has none), then title and text. Day+date puts the weekday
            in TITLE and the day number in TEXT. */}
        <PartImage x={d / 2 - 11} y={10} width={22} height={22}>
          <Image resource="[COMPLICATION.MONOCHROMATIC_IMAGE]" />
        </PartImage>
        {line(34, titleSize + 8, titleSize, "[COMPLICATION.TITLE]")}
        {line(52, size + 12, size, "[COMPLICATION.TEXT]")}
      </Complication>
    </ComplicationSlot>
  );
};

const names = Object.keys(PRESETS);
// WFF allows at most 8 complication slots total; each enabled preset gets its own.
const compNames = names.filter((n) => PRESETS[n].complication);
if (compNames.length > 8)
  console.warn(
    `warning: ${compNames.length} presets have complications; only the first 8 get a slot`,
  );
const slotOf = new Map(compNames.slice(0, 8).map((n, i) => [n, i]));

const doc = [
  <WatchFace width={SCREEN} height={SCREEN}>
    <Metadata key="CLOCK_TYPE" value="ANALOG" />
    <Metadata key="PREVIEW_TIME" value="10:08:32" />
    <UserConfigurations>
      <ListConfiguration
        id="preset"
        displayName="@string/preset_label"
        defaultValue={names[0]}
      >
        {names.map((n) => (
          <ListOption
            id={n}
            displayName={`@string/preset_${n}`}
            complicationSlotIds={String(slotOf.get(n) ?? "")}
          />
        ))}
      </ListConfiguration>
    </UserConfigurations>
    <Scene backgroundColor="#FF000000">
      <ListConfiguration id="preset">
        {names.map((n) => (
          <ListOption id={n}>{buildPreset(n, PRESETS[n])}</ListOption>
        ))}
      </ListConfiguration>
      {[...slotOf].map(([n, slot]) =>
        buildComplicationSlot(n, PRESETS[n], slot),
      )}
    </Scene>
  </WatchFace>,
];

const builder = new XMLBuilder({
  preserveOrder: true,
  format: true,
  indentBy: "    ",
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  suppressEmptyNode: true,
});

const out = "app/src/main/res/raw/watchface.xml";
await Bun.write(
  out,
  `<?xml version="1.0" encoding="utf-8"?>\n${builder.build(doc)}`,
);

// Editor labels for the style picker.
const cap = (s: string) => s[0]!.toUpperCase() + s.slice(1);
await Bun.write(
  "app/src/main/res/values/presets_strings.xml",
  [
    `<?xml version="1.0" encoding="utf-8"?>`,
    `<!-- Generated by tools/generate-watchface.tsx. Do not edit by hand. -->`,
    `<resources>`,
    `    <string name="preset_label">Preset</string>`,
    ...names.map((n) => `    <string name="preset_${n}">${cap(n)}</string>`),
    `</resources>`,
  ].join("\n") + "\n",
);

console.log(`wrote ${out} with all ${names.length} presets`);
