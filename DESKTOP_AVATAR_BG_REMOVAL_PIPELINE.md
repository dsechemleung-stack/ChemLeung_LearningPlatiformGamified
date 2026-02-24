---
description: Desktop avatar background removal + trimming pipeline
---

# Scope
This note documents the batch processing used for desktop avatar source images under:

- `/Users/Hugo/Desktop/Chem Image/Chem custome/Avator_<N>.png`

Goal:
- remove the background to transparency **without** deleting white details inside the costume
- trim/pad consistently for downstream use
- write outputs to a new folder (non-destructive)

# Why naive “white key” fails
A simple "turn near-white pixels transparent" approach will inevitably remove:
- white clothing
- highlights
- line-art antialiasing

So we must avoid keying by color globally.

# Chosen method: edge-connected background flood fill
Implemented in:
- `scripts/process-desktop-avatars.ts`

Algorithm:
1. Convert to RGBA (`ensureAlpha()`)
2. Sample a background reference color by averaging small boxes in the four corners
3. Flood-fill from the image borders (4-connected)
4. Only pixels that are:
   - connected to the border region
   - AND within a color tolerance (`--bg-tol`) of the corner-sampled background
   are considered background and have their alpha set to 0.

This preserves interior whites (e.g. white clothes) because they are typically not connected to the outer border.

# Optional: user-guided green mask (seeded flood fill)
Some images have backgrounds where corner sampling + border flood fill is not enough (e.g. background color too close to costume, or background has complex textures). In that case you can provide a per-avatar mask image to explicitly mark background regions.

Mask rules:
- Create a PNG mask named: `Avator_<N>_mask.png`
- The mask must have the **same pixel dimensions** as `Avator_<N>.png`
- Paint **bright green** (`#00FF00`) over areas you are sure are background
- The script uses green pixels as flood-fill **seed points** and removes the connected background region (not just the painted strokes)

Script behavior:
- If a mask exists and contains green pixels, the script uses seeded flood fill.
- If no mask exists (or no green found), it falls back to border-based flood fill.

Run example:

```bash
npx tsx scripts/process-desktop-avatars.ts \
  --from 1 --to 85 \
  --bg-tol 35 \
  --mask-dir "/Users/Hugo/Desktop/Chem Image/Chem custome_masks" \
  --green-tol 40 \
  --out "/Users/Hugo/Desktop/Chem Image/Chem custome_transparent_trimmed_floodfill_masked"
```

# Trimming / padding steps
After background removal:
- `trim({ threshold: 0 })` to remove transparent padding
- add a small transparent margin (default: 6px)
- pad back to the original canvas size `(w x h)` so output dimensions remain consistent
  - pad strategy: horizontally centered, bottom-aligned

# Default settings (current “good” baseline)
- `--bg-tol 35`
- `--margin 6`
- `trim threshold: 0`

Tuning:
- If too much background remains: increase `--bg-tol` to 45 or 55
- If edges get eaten: decrease `--bg-tol` to 25

# Batch run commands
Process all 1–85 into a new folder:

```bash
npx tsx scripts/process-desktop-avatars.ts \
  --from 1 --to 85 \
  --bg-tol 35 \
  --out "/Users/Hugo/Desktop/Chem Image/Chem custome_transparent_trimmed_floodfill_all_1-85"
```

Outputs are written as:
- `Avator_<N>_bg_removed_trimmed.png`

# Notes / risks
- If the character touches the border or the background color is similar to the costume, flood fill can remove too much. Reduce `--bg-tol`.
- Highly textured backgrounds may leave artifacts with low tolerance. Increase `--bg-tol`, or consider an ML-based background removal pipeline.
