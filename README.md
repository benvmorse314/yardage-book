# Yardage Book

Personal project - NOT a client/MikeTeeVee job. Companion app to
[Ground Force](https://benvmorse314.github.io/ground-force/).

Stock yardage + ball speed tracker. Single-file, self-contained web app
(vanilla HTML/CSS/JS, no build step, no dependencies) plus a thin PWA layer so
it installs to a phone home screen and works offline at the range.

- **Working folder:** E:\yardage-book
- **Intended live URL:** https://benvmorse314.github.io/yardage-book/

## What it does

- **BAG** - every club with its stock carry + ball speed. Log launch-monitor
  readings per club; stock = median of the last N shots (or a manual override).
- **GAPS** - carry ladder with gap flags (WIDE / STACKED) and a "fill the hole"
  suggestion for the biggest gap.
- **PREDICT** - pick a type + loft for a club you don't own; the model
  interpolates carry + ball speed with a confidence band from the clubs you do.
- **Ground Force link** - when both apps are installed from the same domain,
  the driver clubhead-speed tests from Ground Force appear in PREDICT (read-only).

## Dev

No build. Serve the folder with any static server and open index.html:

```
python -m http.server 8124
```

Deploy = push to `main` on a GitHub repo with Pages serving main/root.
All user data lives in localStorage (`yb-data-v1`) - schema changes must
migrate forward, never wipe.
