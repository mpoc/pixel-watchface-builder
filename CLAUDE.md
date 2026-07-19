# CLAUDE.md

Zoomed hour-hand watch face for Pixel Watch 2 (Watch Face Format XML, no code).
Concept: a single hour hand, zoomed far into the dial edge; 60 minute notches fill the 30° between hour numerals (0.5°/min), so the hand's position against the scale reads as minutes.
The camera follows the hand around the dial.
Full explanation in `demo.md`.

## Files

- `presets.js` — all presets, single source of truth. Loaded by `demo.html` via `<script src>` AND parsed as JSON by the generator, so the object literal must stay pure JSON (double quotes, no comments inside, no trailing commas). Each preset is fully expanded; a one-line description per preset lives in the header comment.
- `demo.html` — browser simulator for tuning. The preset `<select>` options are hardcoded — keep them in sync with `presets.js`.
- `tools/generate-watchface.tsx` — `bun tools/generate-watchface.tsx` (no args) packs every preset into `app/src/main/res/raw/watchface.xml` as a WFF `ListConfiguration` style picker (long-press face → customize on the watch) and also generates `res/values/presets_strings.xml` (editor labels, do not hand-edit). All preset fields are ported except `sharp` (WFF version renders square ends always). Each preset with `complication: true` gets its own preset-styled round WFF `ComplicationSlot` (default day+date, user-repointable; WFF caps slots at 8 total) activated via `complicationSlotIds` on its `ListOption`. The scene is written as JSX — see below.
- `tools/xjsx/jsx-runtime.ts` — the generator's JSX runtime. **Not React.** `@jsxImportSource ./xjsx` at the top of the generator points the compiler here, so `<PartDraw x={0}>` becomes a `fast-xml-builder` preserveOrder node (`{ Tag: [...children], ":@": { "@_attr": "value" } }`), which is serialized to XML in one pass. Notes: WFF tag names are capitalized, so JSX reads them as variables — they are minted by `tagsFor(...)` at the top of the generator, where new tags must be added to both the destructuring and the argument list (mismatches are a compile error). Attributes that are `undefined`/`null`/`false` are dropped, so conditional attributes can be inlined. `key` is reserved by the JSX transform and hoisted into `jsx()`'s 3rd argument, so the runtime re-adds it as an attribute (`<Metadata key=... />` depends on this). `jsx-dev-runtime.ts` re-exports it because Bun reaches for the dev runtime outside production.
- `demo.md` — concept, geometry model, and a table documenting every preset field.

## Key constraint

Framing rule: numeral offset from screen center is `zoom × (1 − focus) ± numeralInset` (− for `numeralSide: "in"`, + for `"out"`).
Keep |offset| well under 225 or numerals clip.
Setting a huge `numeralInset` (e.g. 600) deliberately hides numerals entirely.

## Build & deploy

```sh
bun tools/generate-watchface.tsx            # all presets as an on-watch style picker
./gradlew assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

Then long-press the watch face on the watch to re-select it.
Wireless adb setup is in `README.md`.
