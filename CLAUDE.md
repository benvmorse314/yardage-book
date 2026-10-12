# Yardage Book - project brain

Personal golf stock-yardage + ball-speed tracker for Ben. Companion app to
Ground Force (`E:\ground-force`). NOT a MikeTeeVee client job - do not register
it in the vault's 30 Projects/Projects.md (personal projects stay off the
client rails).

## Facts

- **Working folder:** E:\yardage-book
- **Live site:** https://benvmorse314.github.io/yardage-book/ (GitHub Pages, main
  branch, root folder). Repo: github.com/benvmorse314/yardage-book
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
  PREDICT (new-club calculator + model chart + Ground Force link), PRACTICE
  (session builder + drill engine + Putting Lab), TUNE (settings).
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
- Equipment model tables: `IRON_MODELS` (per-club lofts - a set apply writes BOTH
  loft and head), `WOOD_MODELS` + `WEDGE_MODELS` (head ONLY - wood loft comes off
  an adjustable hosel, wedge loft is stamped on the sole, so neither is safe to
  overwrite from a table). Bulk apply lives in TUNE > MY EQUIPMENT via
  `gearTargets(cat)` / `applyGearModel()` / `applyIronModel()`.
  **Category rule - by SLOT, never by loft.** Loft is user-editable, so a loft
  rule put a PW bent to 48 in two categories at once and a wedge bent to 47.5 in
  none. `isSetSlot(c)` = key in `CORE_IRONS` (4i-PW) = the iron set; every other
  wedge is a specialty wedge; woods+hybrids are one category. A 2i/3i driving
  iron or utility is deliberately excluded from bulk changes - set it per club.
  **Picker state:** options are selected by INDEX (`modelIdxByHead`), never by
  head text, and the user's explicit pick lives in `UI.eqPick[cat]` - matching on
  head made a re-render snap the control back to what the clubs already wore, so
  the second confirm tap would have applied the wrong model. APPLY is a two-tap
  confirm (`UI.confirm = 'eq:<cat>:<idx>'`) because the picker is pre-armed from
  the bag; the armed label shows `gearWriteCount()`, the exact number of clubs
  the chosen model will write (an iron set starting at 5i writes fewer than the
  category holds).

## Practice + Putting Lab

`DRILLS` is one flat array; each entry carries `phase` (warm / block / transfer /
pressure), a `focus` tag list, and `clubs` / `how` / `win` BUILDER FUNCTIONS that
receive `drillCtx()` so every drill quotes Ben's real numbers. `planSession()`
budgets minutes per phase and picks one drill per phase at random from the
matching pool. `FOCI` drives the segmented picker.

Three rules the pool filter enforces, all easy to break by accident:
1. `focus:['any']` means "any CLUB session" - those drills are explicitly barred
   from a putting plan, or a wedge-matrix drill turns up on the putting mat.
2. `req` is an optional predicate gating a drill on mat features. The grain and
   break drills only exist if the mat has grain / break inserts, and the speed
   translation drill only if mat stimp differs from home-green stimp.
3. New drill ids must start `pt_` for putting - `normalize()` keeps a stored
   session only if its ids resolve in `DRILLMAP`.

**Putting state is `S.putt` = `{mat:{stimp, home, len, grain, breaks}, log:[]}`.**
`mat.stimp` is the indoor mat, `mat.home` is the speed of the greens actually
played - the GAP between them is the whole point, because a fast mat grooves a
short stroke that leaves everything short outdoors. `puttCtx()` derives it
(roll-out scales roughly linearly with stimp for a given impact speed).

**The make test logs RAW made/attempted, never a percentage.** Counts are
lossless - a rate can always be derived from counts, never the reverse - so the
aggregation policy in `puttForm()` can be rewritten without touching a logged
row. `puttProto()` picks the dominant (distance, break) pair by attempts and the
trend only ever compares like with like; rows outside it render OFF PROTOCOL
rather than being silently pooled. A make rate is only comparable against itself.

## Launch targets + launch monitor import (v1.8 / v1.9)

PRACTICE view carries two cards on every non-putting focus.

**LAUNCH TARGETS** - `LM_TARGETS` holds NUMERIC `[lo, hi]` windows for DR / 7i / 52,
signed target-relative (negative = LEFT). The L/R text is generated (`lmWinStr`) so
the same table both displays and grades. Ben is a lefty: in-to-out reads L. Clubs
without their own window borrow only the loft-independent rows (`lmTargetFor`).

**LAUNCH MONITOR SESSIONS** - imports a Garmin Approach R10 range-session CSV
(Garmin Golf app > range session > share icon). `lmParseCSV` is header-driven
(`LM_COLS`), skips the optional `[mph]`-style units row, accepts `-7.0` or `7.0 L`,
and maps club labels to bag keys (`lmClubKey`; named wedges go to the nearest-loft
wedge in the bag). State is `S.lm.sessions = [{id, d, src, fed, shots}]`.

- Shots are stored RAW (speeds mph, distances yd, apex ft, angles signed). Every
  average, grade and plot is derived at render time in `sheetLm()`.
- A session feeds the bag only through the explicit ADD SESSION MEDIANS button,
  as ONE reading per club (`lmSessionStock`), and only once (`fed`). Never push
  per-shot rows into `readings` - 60 shots would flood the stock median window.
- The CSV column names and the sign convention (negative = left) were built from
  the documented export format and a synthetic file, NOT yet a real export. Check
  the first real file against `LM_COLS` before trusting directional grades.

## Strike focus + equipment swaps (v1.10)

**STRIKE** is a session focus for low point + pressure shift. Unlike every other
focus it is a fixed PROGRESSION, not a shuffle: `planStrike()` walks `STRIKE_SEQ`
in order and only the depth scales with the clock (each step removes one
constraint from the step before). Its drills are `s_*` entries in `STRIKE_DRILLS`.
The coaching premise is written at the top of that block - attack angle and club
path are geared together, so a low-point drill with no turn in it makes an
in-to-out path worse. Wording is lefty: lead = RIGHT foot.
`launchCeil(c)` is the pass line for "compressed" (max launch angle that scores).
It is marked YOURS TO TUNE - Ben owns that number, do not re-derive it.
The club the blocks and the test use is `settings.strike` (default `8i`), set from
the STRIKE CLUB row in the builder. `strikeClub()` reads it at RENDER time, so a
change re-labels a session in progress - never bake the club into `practice.cur`.
`boot()` restores tab / focus / minutes once from sessionStorage `yb-ui` (written on
`pagehide`), because the worker reloads the window when a new build lands.

**Equipment swaps.** Clubs carry `grip` and `since` (ISO date the current head
went in the bag). `setHead(c, label)` is the only way a model pick writes a head:
it stamps `since` when a NAMED head is replaced by a different one, and does not
stamp when a blank head is first labelled (that is labelling, not a swap).

`staleInStock(c)` counts carries inside the stock window that predate `since`.
It only REPORTS (RE-LOG chip on the bag row, a line in the club sheet) -
**`stockOf()` must never filter by date.** The vault ingester
(`~/.claude/skills/metrics-pull/scripts/_golf.py` `stock_of`) mirrors `stockOf()`
line for line; change one without the other and every golf metric drifts.
Fresh readings push stale ones out of the window on their own.

**One-time migrations** live at the end of `normalize()` behind a `meta` flag
(`meta.t100` for the 2026-10-12 Takomo -> T100 swap). Pattern: guard on the flag
AND on the club still wearing the old head, never touch `readings`, set
`BOOT_NOTE` so `boot()` saves once and toasts what was changed on the owner's
behalf. A club re-headed by hand since is left alone.

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
5. **Every deploy bumps TWO numbers together:** `VER` in `sw.js` (`yb-vX.Y.Z`) and
   `APP_VER` in `index.html` (`X.Y.Z`). `APP_VER` is printed in the BAG and TUNE
   footers and is the only way to tell from the phone which build is running.
   A byte-changed `sw.js` is also what TRIGGERS the update on installed phones
   (see below), so a deploy that forgets the bump never reaches them.
6. **How a new build reaches an installed iPhone (v1.10.1 - do not weaken):**
   - `install` fetches the shell with `cache: 'reload'`. GitHub Pages serves
     `max-age=600`; a plain `addAll()` once stored a ten-minute-stale
     `index.html` as the offline shell, and a flaky connection kept falling back
     to it.
   - Navigations are answered with `fetch(url, {cache: 'no-store'})`, falling
     back to the cached shell only when offline.
   - On `activate`, if an older `yb-` cache existed (an UPDATE), the worker calls
     `client.navigate(client.url)` on every open window. A home-screen app has no
     reload button; without this the new build waits for a force-quit. The page
     flushes its pending save on `pagehide`, so the reload is data-safe.
   - The page asks `registration.update()` on every return to the foreground
     (max once a minute) because iOS RESUMES a home-screen app without navigating.
   - TUNE > APP > CHECK FOR UPDATE is the manual escape hatch.
7. **Cache Storage is per ORIGIN, and this origin is shared with Ground Force.**
   The worker only ever deletes caches starting `yb-`. (Until v1.10.1 it deleted
   every cache that was not its own, wiping Ground Force's offline shell on each
   Yardage Book deploy.)
8. **Testing the worker:** the built-in Browser pane cannot register a service
   worker at all (hidden pane). Use Claude in Chrome on localhost:8124. To test
   an upgrade: `git stash` (serve the old build), load it, `git stash pop`, then
   call `registration.update()` from the OLD page and confirm it reloads itself.

## Deploy loop (PowerShell)

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
