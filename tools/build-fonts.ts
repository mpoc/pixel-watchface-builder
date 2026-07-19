// Rebuilds app/src/main/res/font/ from the upstream variable fonts.
//
// Usage:
//   bun tools/build-fonts.ts   after changing fontFamily/fontWeight in presets.js
//
// WFF resolves Font/@family per draw, so pointing it at a variable font (or at a
// <font-family> XML that instances one per weight) makes the renderer re-instance
// the typeface constantly and the face crawls. So every (token, weight) pair the
// presets use is baked here into its own static single-weight TTF, subset to the
// glyphs the face can show (~2.9 MB upstream -> ~15 KB each). The generator then
// emits a plain family="inter_600" with no weight attribute — nothing to resolve
// at runtime.
//
// All six faces are SIL OFL 1.1, from https://github.com/google/fonts.

import subsetFont from "subset-font";

const GF = "https://raw.githubusercontent.com/google/fonts/main/ofl";
const OUT = "app/src/main/res/font";
const CACHE = ".font-cache";

// fontFamily token -> res file stem, upstream URL, non-weight axes to pin.
// opsz is pinned to an optical size suited to the big dial numerals.
const FONTS: Record<
  string,
  { stem: string; url: string; axes?: Record<string, number> }
> = {
  sans: { stem: "inter", url: `${GF}/inter/Inter%5Bopsz%2Cwght%5D.ttf`, axes: { opsz: 28 } },
  serif: { stem: "source_serif", url: `${GF}/sourceserif4/SourceSerif4%5Bopsz%2Cwght%5D.ttf`, axes: { opsz: 40 } },
  didone: { stem: "playfair_display", url: `${GF}/playfairdisplay/PlayfairDisplay%5Bwght%5D.ttf` },
  mono: { stem: "jetbrains_mono", url: `${GF}/jetbrainsmono/JetBrainsMono%5Bwght%5D.ttf` },
  condensed: { stem: "oswald", url: `${GF}/oswald/Oswald%5Bwght%5D.ttf` },
  geometric: { stem: "jost", url: `${GF}/jost/Jost%5Bwght%5D.ttf` },
};

// Digits for the numerals, the rest of Latin for whatever the complication shows.
const GLYPHS = Array.from({ length: 0x7f - 0x20 }, (_, i) =>
  String.fromCharCode(0x20 + i),
).join("") + "°–’";

const presetsSrc = await Bun.file("presets.js").text();
const PRESETS: Record<string, any> = JSON.parse(
  presetsSrc.slice(presetsSrc.indexOf("{"), presetsSrc.lastIndexOf("}") + 1),
);

// The static instance keeps the pinned axis value in OS/2, so Android would see
// a family whose only font is e.g. 600 while the face asks for the default 400.
// Declaring it regular keeps the platform from ever synthesizing a weight.
const setRegular = (ttf: Uint8Array) => {
  const dv = new DataView(ttf.buffer, ttf.byteOffset, ttf.byteLength);
  const numTables = dv.getUint16(4);
  for (let i = 0; i < numTables; i++) {
    const rec = 12 + i * 16;
    const tag = String.fromCharCode(...ttf.subarray(rec, rec + 4));
    if (tag === "OS/2") {
      dv.setUint16(dv.getUint32(rec + 8) + 4, 400); // usWeightClass
      return ttf;
    }
  }
  throw new Error("no OS/2 table");
};

const download = async (url: string, stem: string) => {
  const path = `${CACHE}/${stem}.ttf`;
  const cached = Bun.file(path);
  if (await cached.exists()) return Buffer.from(await cached.arrayBuffer());
  console.log(`  downloading ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} fetching ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await Bun.write(path, buf);
  return buf;
};

// Every (token, weight) pair any preset uses, weights snapped to steps of 100.
const wanted = new Set(
  Object.values(PRESETS).map((p) => {
    const w = Math.min(900, Math.max(100, Math.round(p.fontWeight / 100) * 100));
    return `${p.fontFamily} ${w}`;
  }),
);

for (const old of new Bun.Glob("*").scanSync(OUT)) await Bun.file(`${OUT}/${old}`).delete();

// Every upstream font, not just the ones in use: demo.html @font-faces the cache
// so the preview can show any token at any weight the slider reaches.
for (const f of Object.values(FONTS)) await download(f.url, f.stem);

for (const pair of [...wanted].sort()) {
  const [token, weightStr] = pair.split(" ");
  const font = FONTS[token!];
  if (!font) throw new Error(`unknown fontFamily "${token}" in presets.js`);
  const weight = +weightStr!;

  const src = await download(font.url, font.stem);
  const ttf = await subsetFont(src, GLYPHS, {
    targetFormat: "truetype",
    // No shaping happens on digits, and the closure otherwise drags in every
    // stylistic alternate (493 glyphs instead of ~100).
    noLayoutClosure: true,
    variationAxes: { wght: weight, ...font.axes },
  });

  const out = `${OUT}/${font.stem}_${weight}.ttf`;
  await Bun.write(out, setRegular(new Uint8Array(ttf)));
  console.log(`${out}  ${Math.round(ttf.length / 1024)} KB`);
}

console.log(`\nwrote ${wanted.size} fonts to ${OUT}`);
