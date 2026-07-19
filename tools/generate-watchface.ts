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

// Emit one preset's full scene content (background + camera group) at the given indent.
function emitPreset(
  name: string,
  p: any,
  emit: (s: string) => void,
  pad: string,
) {
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

  emit(`${pad}<PartDraw x="0" y="0" width="${SCREEN}" height="${SCREEN}">`);
  emit(
    `${pad}    <Rectangle x="0" y="0" width="${SCREEN}" height="${SCREEN}"><Fill color="${BG_COLOR}" /></Rectangle>`,
  );
  emit(`${pad}</PartDraw>`);
  // Camera: bring the focus point (at DIST along the hand) to screen center.
  // Upright: translate the dial container against the hand angle.
  // Rotate: fix the dial DIST below center and counter-rotate it about its own
  // center by the hour angle, so the hand stays pinned pointing up.
  if (ROTATE) {
    emit(
      `${pad}<Group name="camera_${name}" x="${SCREEN / 2 - CX}" y="${round(SCREEN / 2 - CX + DIST)}" width="${BOX}" height="${BOX}" pivotX="0.5" pivotY="0.5">`,
    );
    emit(
      `${pad}    <Transform target="angle" value="360.0 - (${HOUR_DEG})" />`,
    );
  } else {
    emit(
      `${pad}<Group name="camera_${name}" x="0" y="0" width="${BOX}" height="${BOX}">`,
    );
    emit(
      `${pad}    <Transform target="x" value="${SCREEN / 2 - CX} - sin(rad(${HOUR_DEG})) * ${DIST}" />`,
    );
    emit(
      `${pad}    <Transform target="y" value="${SCREEN / 2 - CX} + cos(rad(${HOUR_DEG})) * ${DIST}" />`,
    );
  }

  // A radial tick: width w, length h, outer end on the dial ring at angle deg.
  // Placed at its final position and rotated about its own center — no wrapper
  // group, so the renderer never sees dial-sized static groups (previously one
  // per tick, which made the whole watch lag). Geometry attributes are integers.
  const tick = (deg: number, w: number, h: number, alpha: number) => {
    const rad = (deg * Math.PI) / 180;
    const cx = CX + Math.sin(rad) * (R - h / 2);
    const cy = CX - Math.cos(rad) * (R - h / 2);
    emit(
      `${pad}    <PartDraw x="${round(cx - w / 2)}" y="${round(cy - h / 2)}" width="${ceil(w)}" height="${ceil(h)}" angle="${deg}" pivotX="0.5" pivotY="0.5" alpha="${alpha}">`,
    );
    emit(
      `${pad}        <Rectangle x="0" y="0" width="${ceil(w)}" height="${ceil(h)}"><Fill color="${DIAL_COLOR}" /></Rectangle>`,
    );
    emit(`${pad}    </PartDraw>`);
  };

  // Hour markers (base 6px wide, 44px long).
  for (let h = 0; h < 12; h++)
    tick(h * 30, p.hourWeight * 6, p.hourLength * 44, 255);

  // Minute notches, e.g. "10-30" = every 10 minutes with the 30 emphasized.
  const [stepStr, emphasis] = String(p.notches).split("-");
  const step = +stepStr;
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
        tick(deg, w, len, alpha);
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
    const angleAttr = glued
      ? ` angle="${degNum}" pivotX="0.5" pivotY="0.5"`
      : "";
    emit(
      `${pad}    <PartText x="${round(cx - bw / 2)}" y="${round(cy - bh / 2)}" width="${bw}" height="${bh}"${angleAttr}>`,
    );
    if (!glued && ROTATE)
      emit(`${pad}        <Transform target="angle" value="${HOUR_DEG}" />`);
    emit(`${pad}        <Text align="CENTER" ellipsis="false">`);
    emit(
      `${pad}            <Font family="SYNC_TO_DEVICE" size="${FONT_SIZE}" weight="BOLD" color="${DIAL_COLOR}">${h === 0 ? 12 : h}</Font>`,
    );
    emit(`${pad}        </Text>`);
    emit(`${pad}    </PartText>`);
  }

  // Hands: from dial center outward (plus an 8px tail), rotating with the time.
  // Minute hand (when enabled) is the demo's thin grey reference hand.
  const hand = (tag: string, w: number, angleExpr: string, color: string) => {
    const hw = ceil(w);
    emit(
      `${pad}<Group name="${tag}_${name}" x="0" y="0" width="${BOX}" height="${BOX}" pivotX="0.5" pivotY="0.5">`,
    );
    emit(`${pad}    <Transform target="angle" value="${angleExpr}" />`);
    emit(
      `${pad}    <PartDraw x="${round(CX - hw / 2)}" y="${CX - HAND_LEN}" width="${hw}" height="${HAND_LEN + 8}">`,
    );
    emit(
      `${pad}        <Rectangle x="0" y="0" width="${hw}" height="${HAND_LEN + 8}"><Fill color="${color}" /></Rectangle>`,
    );
    emit(`${pad}    </PartDraw>`);
    emit(`${pad}</Group>`);
  };
  hand("hand", p.thickness * 2, HOUR_DEG, HAND_COLOR);
  if (p.minuteHand) hand("minhand", p.thickness, MINUTE_DEG, wff("#8892a0"));

  emit(`${pad}</Group>`);
}

// Screen-fixed round date complication at bottom center, styled to the preset.
// The user can repoint it (battery, steps, weather...) in the on-watch editor.
// 100 units on the 450 canvas is the typical round complication size (~22% of
// screen). complicationAngle places it at a fixed safe radius from screen
// center: 0 = top, 90 = right, 180 = bottom.
const COMP = { d: 100, r: 131 };
function emitComplicationSlot(
  name: string,
  p: any,
  emit: (s: string) => void,
  pad: string,
  slotId: number,
) {
  const DIAL_COLOR = wff(p.dialColor);
  const OUTLINE = "#59" + p.dialColor.slice(1).toUpperCase(); // dial color at ~35%
  const size = Math.round(20 * p.fontScale);
  const titleSize = Math.round(13 * p.fontScale);
  const d = COMP.d;
  const aRad = ((p.complicationAngle ?? 180) * Math.PI) / 180;
  const cx = SCREEN / 2 + Math.sin(aRad) * COMP.r;
  const cy = SCREEN / 2 - Math.cos(aRad) * COMP.r;
  const line = (y: number, h: number, fontSize: number, expr: string) => {
    emit(
      `${pad}        <PartText x="6" y="${y}" width="${d - 12}" height="${h}">`,
    );
    emit(`${pad}            <Text align="CENTER" ellipsis="TRUE">`);
    emit(
      `${pad}                <Font family="SYNC_TO_DEVICE" size="${fontSize}" weight="BOLD" color="${DIAL_COLOR}">`,
    );
    emit(
      `${pad}                    <Template>%s<Parameter expression="${expr}" /></Template>`,
    );
    emit(`${pad}                </Font>`);
    emit(`${pad}            </Text>`);
    emit(`${pad}        </PartText>`);
  };
  emit(
    `${pad}<ComplicationSlot slotId="${slotId}" name="date_${name}" x="${round(cx - d / 2)}" y="${round(cy - d / 2)}" width="${d}" height="${d}" supportedTypes="SHORT_TEXT" tintColor="${DIAL_COLOR}">`,
  );
  emit(
    `${pad}    <DefaultProviderPolicy defaultSystemProvider="DAY_AND_DATE" defaultSystemProviderType="SHORT_TEXT" />`,
  );
  emit(`${pad}    <BoundingOval x="0" y="0" width="${d}" height="${d}" />`);
  emit(`${pad}    <Complication type="SHORT_TEXT">`);
  emit(`${pad}        <PartDraw x="0" y="0" width="${d}" height="${d}">`);
  emit(
    `${pad}            <Ellipse x="1" y="1" width="${d - 2}" height="${d - 2}"><Stroke color="${OUTLINE}" thickness="2" /></Ellipse>`,
  );
  emit(`${pad}        </PartDraw>`);
  // Provider icon on top (tinted via the slot's tintColor; empty if the
  // provider has none), then title and text. Day+date puts the weekday in
  // TITLE and the day number in TEXT.
  emit(
    `${pad}        <PartImage x="${d / 2 - 11}" y="10" width="22" height="22">`,
  );
  emit(
    `${pad}            <Image resource="[COMPLICATION.MONOCHROMATIC_IMAGE]" />`,
  );
  emit(`${pad}        </PartImage>`);
  line(34, titleSize + 8, titleSize, "[COMPLICATION.TITLE]");
  line(52, size + 12, size, "[COMPLICATION.TEXT]");
  emit(`${pad}    </Complication>`);
  emit(`${pad}</ComplicationSlot>`);
}

const arg = Bun.argv[2] ?? "classic";
const all = arg === "--all";
if (!all && !PRESETS[arg]) {
  console.error(
    `unknown preset "${arg}"; have: --all, ${Object.keys(PRESETS).join(", ")}`,
  );
  process.exit(1);
}

const lines: string[] = [];
const emit = (s: string) => lines.push(s);

emit(`<?xml version="1.0" encoding="utf-8"?>`);
emit(`<WatchFace width="${SCREEN}" height="${SCREEN}">`);
emit(`    <Metadata key="CLOCK_TYPE" value="ANALOG" />`);
emit(`    <Metadata key="PREVIEW_TIME" value="10:08:32" />`);
emit(``);

if (all) {
  const names = Object.keys(PRESETS);
  // WFF allows at most 8 complication slots total; each enabled preset gets its own.
  const compNames = names.filter((n) => PRESETS[n].complication);
  if (compNames.length > 8)
    console.warn(
      `warning: ${compNames.length} presets have complications; only the first 8 get a slot`,
    );
  const slotOf = new Map(compNames.slice(0, 8).map((n, i) => [n, i]));
  emit(`    <UserConfigurations>`);
  emit(
    `        <ListConfiguration id="preset" displayName="@string/preset_label" defaultValue="${names[0]}">`,
  );
  for (const n of names) {
    const slot = slotOf.get(n);
    emit(
      `            <ListOption id="${n}" displayName="@string/preset_${n}" complicationSlotIds="${slot ?? ""}" />`,
    );
  }
  emit(`        </ListConfiguration>`);
  emit(`    </UserConfigurations>`);
  emit(``);
  emit(`    <Scene backgroundColor="#FF000000">`);
  emit(`        <ListConfiguration id="preset">`);
  for (const n of names) {
    emit(`            <ListOption id="${n}">`);
    emitPreset(n, PRESETS[n], emit, "                ");
    emit(`            </ListOption>`);
  }
  emit(`        </ListConfiguration>`);
  for (const [n, slot] of slotOf)
    emitComplicationSlot(n, PRESETS[n], emit, "        ", slot);
  emit(`    </Scene>`);
  emit(`</WatchFace>`);

  // Editor labels for the style picker.
  const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
  const strings = [
    `<?xml version="1.0" encoding="utf-8"?>`,
    `<!-- Generated by tools/generate-watchface.ts (all mode). Do not edit by hand. -->`,
    `<resources>`,
    `    <string name="preset_label">Preset</string>`,
    ...names.map((n) => `    <string name="preset_${n}">${cap(n)}</string>`),
    `</resources>`,
  ];
  await Bun.write(
    "app/src/main/res/values/presets_strings.xml",
    strings.join("\n") + "\n",
  );
} else {
  const p = PRESETS[arg];
  emit(`    <Scene backgroundColor="${wff(p.background)}">`);
  emitPreset(arg, p, emit, "        ");
  if (p.complication) emitComplicationSlot(arg, p, emit, "        ", 0);
  emit(`    </Scene>`);
  emit(`</WatchFace>`);
}

const out = "app/src/main/res/raw/watchface.xml";
await Bun.write(out, lines.join("\n") + "\n");
console.log(
  `wrote ${out} ${all ? `with all ${Object.keys(PRESETS).length} presets` : `from preset "${arg}"`} (${lines.length} lines)`,
);
