# Yardage Book - project brain

Personal golf stock-yardage + ball-speed tracker for Ben. Companion app to
Ground Force (`E:\ground-force`). NOT a MikeTeeVee client job - do not register
it in the vault's 30 Projects/Projects.md (personal projects stay off the
client rails).

## Facts

- **Working folder:** E:\yardage-book
- **Intended live site:** https://benvmorse314.github.io/yardage-book/ (GitHub Pages,
  main branch, root folder - repo not created yet; same account as ground-force)
- **Sibling app:** Ground Force at https://benvmorse314.github.io/ground-force/
- **Job:** track stock carry + ball speed per club; interpolate the rest of the
  bag; predict numbers for a club Ben doesn't own yet.

## Architecture

Single self-contained `index.html` (vanilla HTML/CSS/JS, no build step, no external
dependencies) + PWA sidecars (`manifest.webmanifest`, `sw.js`, `icons/`, `fonts/`).
Same skeleton, palette, and fonts as Ground Force (Big Shoulders Display, Archivo,
IBM Plex Mono - self-hosted OFL woff2 subsets). Default accent is Turf green
(#3E9B6B) vs Ground Force's Signal orange, so the two apps read as siblings, not
twins.

- Rendering: innerHTML string templates per tab; event delegation via `data-act`
  attributes on `document.body` (handleTap / handleInput).
- Views: BAG (clubs + readings), GAPS (carry ladder + gap flags + fill-the-hole),
  PREDICT (new-club calculator + model chart + Ground Force link), TUNE (settings).
- State: single object `S`, persisted to localStorage key **`yb-data-v1`**.
  Bag is an array of club objects `{id, key, name, type, loft, carry, ball, auto,
  readings:[{d,c,b,s,sw?}]}` - `c` carry, `b` ball speed, `s` club speed,
  `sw` ('chest'|'hip') tags wedge takeaway partials (absent = full swing).
  All distances stored in YARDS, speeds in MPH - units are converted only at
  the display/input boundary.
- Wedge matrix: partial (chest/hip) readings NEVER feed the interpolation model
  or stock numbers - they only build the wedge matrix (GAPS view) via
  `partialStock()` and the personal takeaway ratios in `swingRatio()`
  (defaults 80% chest / 60% hip until real partials exist).

## The model (how prediction works)

`REFC`/`REFB` are reference carry / ball-speed curves per club family
(wood, hybrid, iron+wedge) as [loft, value] pairs - the SHAPE backbone.
For every club with a stock number the app computes the player's ratio to the
reference at that loft, fits ratio-vs-loft with a slope that is damped until
~7 clubs of data exist, then predicts any (type, loft) as
`ref(type, loft) * ratio(loft)`. Confidence bands come from fit RMSE with
floors for tiny n, widened 1.5-1.6x outside the logged loft range.
Stock numbers are the MEDIAN of the last N readings (N in TUNE), manual
override per club via the AUTO toggle.

## Hard rules

1. **Never break stored data.** `yb-data-v1` must survive every change - add
   fields with defensive defaults in `normalize()`; never rename the key or wipe.
2. **`gf-data-v1` is READ ONLY.** The ENGINE LINK card (Predict view) peeks at
   it when both apps share an origin. Never write, migrate, or "fix" that key
   from here - Ben's real training logs live in it. The link is two-way:
   Ground Force's Progress view has a reciprocal READ-ONLY card over
   `yb-data-v1` (see `ybLinkCard()` in E:\ground-force\index.html) - keep the
   driver-club detection (`type==='wood' && loft < 13`) and reading shape
   compatible if the data model ever changes.
3. **ASCII-only source.** Non-ASCII glyphs go in as `\uXXXX` escapes (JS strings)
   or HTML entities. Ben's toolchain garbles raw non-ASCII through cp1252.
4. **Stay single-file + sidecars.** No frameworks, no build step, no CDN
   dependencies. The app must work offline once cached.
5. After editing `sw.js`-cached assets, bump the `VER` constant in `sw.js` or
   installed clients keep serving the old build.

## Deploy loop (PowerShell) - once the GitHub repo exists

```
git add -A; git commit -m "..."; git push
# Pages rebuilds automatically (~30s). Verify:
(Invoke-WebRequest -Uri "https://benvmorse314.github.io/yardage-book/" -Method Head -UseBasicParsing).StatusCode   # expect 200
```

## Local preview

`.claude/launch.json` defines the `yardage-book` server (`python -m http.server 8124`).
Use the preview tools against http://localhost:8124/. Note: on localhost the
Ground Force link card shows its empty state (different origin than the GF dev
server) - that is expected; the two apps only see each other's localStorage when
served from the same origin (benvmorse314.github.io).
