---
description: Avatar image trimming / centering notes
---

# Why trimming is needed
Some avatar PNGs contain large transparent padding. Even if the character *looks* centered, the image’s true pixel bounds can be off-center. If we render with a fixed CSS anchor (e.g. `left: 50%` + `translateX(-50%)`), that hidden padding makes different avatars appear misaligned.

# The correct pipeline (authoritative)
Implemented in `scripts/seed-firestore.ts`.

For **split avatars** (boy/girl halves), the production pipeline is:

1. **Process the FULL avatar image first** (single bounding box)
   - `trim({ threshold: 0 })`
   - add a small transparent margin back (currently 6px)
   - pad back to the original full canvas `(w x h)` with transparent background
   - padding strategy: horizontally centered, bottom-aligned

2. **Split into halves**
   - `boy` = left half
   - `girl` = right half

3. **Re-center EACH half** (this is what actually fixed “boy right / girl left”)
   - on each half buffer:
     - `trim({ threshold: 0 })`
     - add transparent margin (6px)
     - pad back to the fixed half canvas `(halfW x h)` with transparent background
     - padding strategy: horizontally centered, bottom-aligned

Notes:
- Step (1) prevents weird overall padding differences across avatar files.
- Step (3) ensures each gendered PNG is visually centered inside its own canvas, so identical tuning values produce the same placement.

# Risks / gotchas
- **Accessory clipping**
  - If trim is too aggressive it can cut small details (e.g. hair pins, fishball-on-head).
  - Mitigation:
    - use low trim threshold (`0`)
    - add transparent margin after trim (currently 6px)
    - if still clipped, increase margin.

- **Re-seeding required**
  - UI changes alone will not fix existing Storage images.
  - After changing the pipeline, you must re-run cosmetics upload:
    - `npx tsx scripts/seed-firestore.ts --upload-cosmetics`
  - This regenerates and re-uploads `imageUrlBoy` / `imageUrlGirl`.

- **Immutable Storage caching (CRITICAL)**
  - Uploaded images are served with long-lived caching (`cacheControl: ... immutable`).
  - If you upload to the same object path, clients may keep showing old images.
  - Fix: upload to a versioned folder so URLs change.
    - Example: `avatars_gendered_v2/` → `avatars_gendered_v3/`

- **Centering assumptions in UI**
  - Once images are trimmed + padded correctly, UI should use a consistent base centering:
    - `translateX(-50%)` base for boy/girl/noSplit
  - Avoid hard-coded gender base offsets like `+6/-6`.

- **Config tuning vs preprocessing**
  - Tuning (`offsetXPercent/offsetYPercent/scale`) should be used for small artistic adjustments.
  - If many avatars require big offsets to “look centered”, the underlying images likely need reprocessing.

# Quick validation checklist
After running `--upload-cosmetics`:
- Compare the same avatar in:
  - ProfileCard
  - Gacha result
  - Inventory tile
  - Profile icon
- Boy and girl should respond similarly to the same tuning values.
- Single-person avatars (noSplit) should also match the same centering base.
