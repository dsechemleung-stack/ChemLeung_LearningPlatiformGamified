import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type Gender = 'boy' | 'girl';
export type AvatarTunerContext = 'profile_card' | 'gacha_result' | 'inventory' | 'profile_icon';

type FaceCrop = {
  x: number;
  y: number;
  w: number;
  h: number;
};

type BodyFrame = {
  offsetXPercent?: number;
  offsetYPercent?: number;
  scale?: number;
};

export type AvatarTuning = {
  offsetXPercent?: number;
  offsetYPercent?: number;
  scale?: number;
};

type AvatarTunerEntry = {
  faceCrop?: FaceCrop;
} & Partial<Record<AvatarTunerContext, Partial<Record<Gender, AvatarTuning>>>>;

export type AvatarTunerConfig = {
  version: 1;
  noSplitAvatarNumbers?: number[];
  globalDefaults?: {
    faceCropByGender?: Partial<Record<Gender, FaceCrop>>;
    noSplitFaceCropDefault?: FaceCrop;
    bodyFrameByGender?: Partial<Record<Gender, BodyFrame>>;
    tuningByContext?: Partial<Record<AvatarTunerContext, Partial<Record<Gender, AvatarTuning>>>>;
  };
  byAvatarId?: Record<string, AvatarTunerEntry>;
};

const STORAGE_KEY = 'cc_avatar_tuner_config_v4';

const FALLBACK_FACE_CROPS: Record<Gender, FaceCrop> = {
  boy:  { x: 0.5327, y: 0.1179, w: 0.2449, h: 0.2357 },
  girl: { x: 0.1980, y: 0.1214, w: 0.2857, h: 0.2393 },
};

const FALLBACK_NO_SPLIT_NUMBERS: number[] = [31, 32];

const FALLBACK_NO_SPLIT_FACE_CROP: FaceCrop = { x: 0.30, y: 0.04, w: 0.38, h: 0.26 };

function normalizeAvatarTunerConfig(cfg: AvatarTunerConfig): { normalized: AvatarTunerConfig; changed: boolean } {
  let changed = false;

  const normalized: AvatarTunerConfig = {
    ...DEFAULT_CFG,
    ...cfg,
    globalDefaults: {
      ...(DEFAULT_CFG.globalDefaults || {}),
      ...(cfg.globalDefaults || {}),
      faceCropByGender: {
        ...(DEFAULT_CFG.globalDefaults?.faceCropByGender || {}),
        ...(cfg.globalDefaults?.faceCropByGender || {}),
      },
      bodyFrameByGender: {
        ...(DEFAULT_CFG.globalDefaults?.bodyFrameByGender || {}),
        ...(cfg.globalDefaults?.bodyFrameByGender || {}),
      },
      tuningByContext: {
        ...(DEFAULT_CFG.globalDefaults?.tuningByContext || {}),
        ...(cfg.globalDefaults?.tuningByContext || {}),
      },
    },
    byAvatarId: cfg.byAvatarId || DEFAULT_CFG.byAvatarId,
  };

  const a = JSON.stringify(cfg);
  const b = JSON.stringify(normalized);
  if (a !== b) changed = true;

  return { normalized, changed };
}

export function loadAvatarTunerConfig(): AvatarTunerConfig | null {
  try {
    // Hard cutover: stop using stale v1/v2/v3 data.
    try {
      localStorage.removeItem('cc_avatar_tuner_config_v1');
    } catch {
      // ignore
    }
    try {
      localStorage.removeItem('cc_avatar_tuner_config_v2');
    } catch {
      // ignore
    }
    try {
      localStorage.removeItem('cc_avatar_tuner_config_v3');
    } catch {
      // ignore
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const cfg = JSON.parse(raw) as AvatarTunerConfig;
    const { normalized, changed } = normalizeAvatarTunerConfig(cfg);
    if (changed) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
        window.dispatchEvent(new CustomEvent(TUNER_UPDATED_EVENT, { detail: normalized }));
      } catch {
        // ignore
      }
    }

    return normalized;
  } catch {
    return null;
  }
}

export function getGlobalFaceCrop(gender: Gender): FaceCrop | null {
  const cfg = loadAvatarTunerConfig() ?? DEFAULT_CFG;
  const crop = cfg?.globalDefaults?.faceCropByGender?.[gender] ?? FALLBACK_FACE_CROPS[gender];
  if (!crop) return null;
  const { x, y, w, h } = crop as any;
  if (![x, y, w, h].every((n) => typeof n === 'number' && Number.isFinite(n))) return null;
  return { x, y, w, h };
}

export function getGlobalBodyFrame(gender: Gender): BodyFrame | null {
  const cfg = loadAvatarTunerConfig() ?? DEFAULT_CFG;
  const raw = cfg?.globalDefaults?.bodyFrameByGender?.[gender];
  if (!raw) return null;
  const { offsetXPercent, offsetYPercent, scale } = raw as any;
  const ok = (v: any) => v === undefined || (typeof v === 'number' && Number.isFinite(v));
  if (!ok(offsetXPercent) || !ok(offsetYPercent) || !ok(scale)) return null;
  return { offsetXPercent, offsetYPercent, scale };
}

export const TUNER_UPDATED_EVENT = 'cc-avatar-tuner-updated';

export function saveAvatarTunerConfig(cfg: AvatarTunerConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
    window.dispatchEvent(new CustomEvent(TUNER_UPDATED_EVENT, { detail: cfg }));
  } catch {
    // ignore
  }
}

export function shouldForceNoSplit(avatarId: string | undefined | null): boolean {
  const n = avatarNumberFromId(avatarId);
  if (!n) return false;
  const cfg = loadAvatarTunerConfig() ?? DEFAULT_CFG;
  const list = cfg?.noSplitAvatarNumbers ?? FALLBACK_NO_SPLIT_NUMBERS;
  if (Array.isArray(list) && list.includes(n)) return true;
  return false;
}

export function getAvatarTuning(
  avatarId: string | undefined | null,
  ctx: AvatarTunerContext,
  gender: Gender,
): AvatarTuning | null {
  if (!avatarId) return null;

  const cfg = loadAvatarTunerConfig() ?? DEFAULT_CFG;

  // Single-person avatars:
  // - do NOT apply global gender defaults (they assume split halves)
  // - still allow per-avatar per-context tuning
  if (shouldForceNoSplit(avatarId)) {
    const entry =
      cfg?.byAvatarId?.[avatarId]?.[ctx]?.[gender] ??
      cfg?.byAvatarId?.[avatarId]?.[ctx]?.boy ??
      null;
    if (!entry) return { offsetXPercent: 0, offsetYPercent: 0, scale: 1 };
    return {
      offsetXPercent: 0,
      offsetYPercent: 0,
      scale: 1,
      ...(entry || {}),
    };
  }

  const defaults = DEFAULT_OFFSETS[ctx](gender);
  const globalCtx = cfg?.globalDefaults?.tuningByContext?.[ctx];
  const global = (gender === 'boy' ? globalCtx?.boy ?? globalCtx?.girl : globalCtx?.girl) ?? null;

  const entryCtx = cfg?.byAvatarId?.[avatarId]?.[ctx];
  const entry = (gender === 'boy' ? entryCtx?.boy ?? entryCtx?.girl : entryCtx?.girl) ?? null;

  // Always return context defaults for split avatars so call sites can rely on
  // a consistent tuning object (with global defaults + per-avatar overrides layered on top).
  return {
    offsetXPercent: defaults.ox,
    offsetYPercent: defaults.oy,
    scale: defaults.sc,
    ...(global || {}),
    ...(entry || {}),
  };
}

function removePerAvatarTuningOverride(
  prev: AvatarTunerConfig,
  avatarId: string,
  ctx: AvatarTunerContext,
  gender: Gender,
): AvatarTunerConfig {
  const byAvatarId = { ...(prev.byAvatarId || {}) } as any;
  const byId = { ...(byAvatarId[avatarId] || {}) } as any;
  const byCtx = { ...(byId[ctx] || {}) } as any;
  if (byCtx[gender]) delete byCtx[gender];

  const hasAnyGender = Object.keys(byCtx).some((k) => k === 'boy' || k === 'girl');
  if (!hasAnyGender) delete byId[ctx];
  else byId[ctx] = byCtx;

  if (Object.keys(byId).length === 0) delete byAvatarId[avatarId];
  else byAvatarId[avatarId] = byId;

  return {
    ...prev,
    byAvatarId,
  } as AvatarTunerConfig;
}

export function getAvatarFaceCrop(avatarId: string | undefined | null): FaceCrop | null {
  if (!avatarId) return null;
  const cfg = loadAvatarTunerConfig() ?? DEFAULT_CFG;

  const perAvatar = cfg?.byAvatarId?.[avatarId]?.faceCrop;
  if (perAvatar) {
    const { x, y, w, h } = perAvatar;
    if ([x, y, w, h].every((n) => typeof n === 'number' && Number.isFinite(n) && n > 0)) {
      return { x, y, w, h };
    }
  }

  const cfgDefault = cfg?.globalDefaults?.noSplitFaceCropDefault;
  if (cfgDefault) {
    const { x, y, w, h } = cfgDefault;
    if ([x, y, w, h].every((n) => typeof n === 'number' && Number.isFinite(n) && n > 0)) {
      return { x, y, w, h };
    }
  }

  return FALLBACK_NO_SPLIT_FACE_CROP;
}

export function avatarNumberFromId(avatarId: string | undefined | null): number | null {
  if (!avatarId) return null;
  const m = String(avatarId).match(/^avatar_(\d+)_/i);
  if (!m?.[1]) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

function shouldForceNoSplitFromConfig(cfg: AvatarTunerConfig, avatarId: string | undefined | null): boolean {
  const n = avatarNumberFromId(avatarId);
  if (!n) return false;
  const list = cfg?.noSplitAvatarNumbers ?? FALLBACK_NO_SPLIT_NUMBERS;
  return Array.isArray(list) && list.includes(n);
}

function resolveAvatarTuningFromConfig(
  cfg: AvatarTunerConfig,
  avatarId: string | undefined | null,
  ctx: AvatarTunerContext,
  gender: Gender,
): AvatarTuning | null {
  if (!avatarId) return null;

  if (shouldForceNoSplitFromConfig(cfg, avatarId)) {
    const entry =
      (cfg?.byAvatarId as any)?.[avatarId]?.[ctx]?.[gender] ??
      (cfg?.byAvatarId as any)?.[avatarId]?.[ctx]?.boy ??
      null;
    if (!entry) return { offsetXPercent: 0, offsetYPercent: 0, scale: 1 };
    return {
      offsetXPercent: 0,
      offsetYPercent: 0,
      scale: 1,
      ...(entry || {}),
    };
  }

  const defaults = DEFAULT_OFFSETS[ctx](gender);
  const globalCtx = (cfg?.globalDefaults as any)?.tuningByContext?.[ctx];
  const global = (gender === 'boy' ? globalCtx?.boy ?? globalCtx?.girl : globalCtx?.girl) ?? null;
  const entryCtx = (cfg?.byAvatarId as any)?.[avatarId]?.[ctx];
  const entry = (gender === 'boy' ? entryCtx?.boy ?? entryCtx?.girl : entryCtx?.girl) ?? null;

  return {
    offsetXPercent: defaults.ox,
    offsetYPercent: defaults.oy,
    scale: defaults.sc,
    ...(global || {}),
    ...(entry || {}),
  };
}

// ─── AI Alignment Prompt Generator ──────────────────────────────────────────

export function generateAvatarAlignmentPrompt(
  avatarId: string,
  config?: AvatarTunerConfig,
): string {
  const cfg = config ?? loadAvatarTunerConfig() ?? DEFAULT_CFG;
  const num = avatarNumberFromId(avatarId);
  const noSplit = num
    ? (Array.isArray(cfg.noSplitAvatarNumbers) && cfg.noSplitAvatarNumbers.includes(num))
    : false;

  const globalCrops = (cfg.globalDefaults?.faceCropByGender ?? {}) as Partial<Record<Gender, FaceCrop>>;
  const perAvatar = cfg.byAvatarId?.[avatarId] ?? {};
  const contexts: AvatarTunerContext[] = ['profile_card', 'gacha_result', 'inventory', 'profile_icon'];
  const genders: Gender[] = ['boy', 'girl'];

  const lines: string[] = [];

  lines.push('═══════════════════════════════════════════════════════════');
  lines.push(`AVATAR ALIGNMENT DATA  ·  avatarId: "${avatarId}"`);
  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('');
  lines.push(`Avatar number   : ${num ?? '(none — id format not avatar_N_name)'}`)
  lines.push(`No-split mode   : ${noSplit} ${noSplit ? '← entire image is ONE person, do not split' : '← split: left=boy, right=girl'}`);
  lines.push('');

  lines.push('── FACE CROP  (used for ProfileIcon round head thumbnail) ─────────');
  lines.push('   Coordinates are NORMALIZED (0–1) within the gendered half-image.');
  lines.push('   (x,y) = top-left corner of face box; (w,h) = width/height of box');
  lines.push('');

  for (const g of genders) {
    const crop = globalCrops[g];
    if (crop) {
      const { x, y, w, h } = crop;
      const cx = Math.round((x + w / 2) * 100);
      const cy = Math.round((y + h / 2) * 100);
      const scale = Math.max(1 / w, 1 / h);
      const posX = ((0.5 - (x + w / 2) * scale) / (1 - scale)) * 100;
      const posY = ((0.5 - (y + h / 2) * scale) / (1 - scale)) * 100;
      lines.push(`  ${g.toUpperCase()} face:`);
      lines.push(`    x=${x.toFixed(4)}, y=${y.toFixed(4)}, w=${w.toFixed(4)}, h=${h.toFixed(4)}`);
      lines.push(`    Face CENTER is at ~(${cx}%, ${cy}%) of the gendered image`);
      lines.push(`    Face occupies ~${Math.round(w * 100)}% width, ~${Math.round(h * 100)}% height of image`);
      lines.push(`    CSS backgroundSize: ${(scale * 100).toFixed(1)}%`);
      lines.push(`    CSS backgroundPosition: ${posX.toFixed(1)}% ${posY.toFixed(1)}%`);
    } else {
      lines.push(`  ${g.toUpperCase()} face: ⚠️  NOT SET — using fallback (x=0.3, y=0.05, w=0.4, h=0.3)`);
      lines.push(`    → Open Avatar Tuner → Global defaults → Tap-to-crop to set this.`);
    }
    lines.push('');
  }

  lines.push('── BODY FRAME TUNING  (used for full-body avatar display) ─────────');
  lines.push('   offsetXPercent: horizontal shift (negative=left, positive=right)');
  lines.push('   offsetYPercent: vertical shift (negative=up, positive=down)');
  lines.push('   scale: zoom multiplier (1.0=normal, 1.2=20% bigger)');
  lines.push('   All values are % of the container width/height.');
  lines.push('');

  for (const ctx of contexts) {
    lines.push(`  [${ctx}]`);
    const contextDescriptions: Record<AvatarTunerContext, string> = {
      profile_card:  'ProfileCard component — tall card (aspect ~1:1.4), avatar fills bottom 85%',
      gacha_result:  'GachaResultsModal — square card, avatar fills full height bottom-anchored',
      inventory:     'CosmeticsInventory face square — square tile, avatar fills full height',
      profile_icon:  'ProfileIcon circle — small round avatar icon, drag/wheel tuned transform',
    };
    lines.push(`  ${contextDescriptions[ctx]}`);
    for (const g of genders) {
      const tune = (perAvatar as any)?.[ctx]?.[g] as AvatarTuning | undefined;
      const ox = tune?.offsetXPercent ?? (g === 'girl' ? -6 : 6);
      const oy = tune?.offsetYPercent ?? 0;
      const sc = tune?.scale ?? 1;
      const isTuned = tune && (
        tune.offsetXPercent !== undefined ||
        tune.offsetYPercent !== undefined ||
        tune.scale !== undefined
      );
      lines.push(`    ${g}: offsetX=${ox}%, offsetY=${oy}%, scale=${sc}  ${isTuned ? '✓ custom' : '(default)'}`);
      lines.push(`    → CSS: translateX(calc(-50% + ${ox}%)) translateY(${oy}%) scale(${sc})`);
    }
    lines.push('');
  }

  lines.push('── HOW TO ADJUST (instructions for AI coder) ──────────────────────');
  lines.push('');
  lines.push('SPLIT LOGIC:');
  if (noSplit) {
    lines.push('  This avatar is a SINGLE person — do NOT split.');
    lines.push('  Use: imageUrl (full image), no gendered variants.');
    lines.push('  Center the image normally with translateX(-50%).');
  } else {
    lines.push('  This avatar has BOY (left half) and GIRL (right half) variants.');
    lines.push('  The seeder split the original image down the middle with sharp.');
    lines.push('  imageUrlBoy  = left half, transparent-padded, may need trimming offset.');
    lines.push('  imageUrlGirl = right half, transparent-padded, may need trimming offset.');
    lines.push('  Both halves start at translateX(-50%) and offsetX shifts them left/right.');
  }
  lines.push('');
  lines.push('COMMON FIXES:');
  lines.push('  Avatar appears too far LEFT  → increase offsetXPercent (e.g. 0 → 4)');
  lines.push('  Avatar appears too far RIGHT → decrease offsetXPercent (e.g. 6 → 2)');
  lines.push('  Avatar appears too HIGH      → increase offsetYPercent (e.g. 0 → 5)');
  lines.push('  Avatar appears too LOW       → decrease offsetYPercent (e.g. 0 → -5)');
  lines.push('  Avatar appears too SMALL     → increase scale (e.g. 1.0 → 1.15)');
  lines.push('  Avatar appears too BIG       → decrease scale (e.g. 1.0 → 0.9)');
  lines.push('');
  lines.push('FACE CROP FIXES (ProfileIcon round thumbnail):');
  lines.push('  Face too far RIGHT in circle → increase faceCrop.x');
  lines.push('  Face too far LEFT  in circle → decrease faceCrop.x');
  lines.push('  Face too far DOWN  in circle → increase faceCrop.y');
  lines.push('  Face too far UP    in circle → decrease faceCrop.y');
  lines.push('  Face too SMALL (too zoomed out) → decrease faceCrop.w and/or h');
  lines.push('  Face too BIG (too zoomed in)    → increase faceCrop.w and/or h');
  lines.push('');
  lines.push('TUNER TOOL USAGE:');
  lines.push('  • Open Avatar Tuner (Profile page, dev mode only)');
  lines.push('  • Switch to Playground tab for live drag/wheel adjustment');
  lines.push('  • Use "Tap to crop" on preview image to set face box with 2 clicks');
  lines.push('  • Adjust offsetX/Y/scale sliders per context/gender');
  lines.push('  • Export JSON → paste into AvatarTuner DEFAULT_CFG or localStorage');
  lines.push('  • localStorage key: cc_avatar_tuner_config_v4');
  lines.push('');
  lines.push('════════════════════════════════════════════════════════════════════');

  return lines.join('\n');
}

export async function copyAvatarAlignmentPrompt(avatarId: string): Promise<void> {
  const text = generateAvatarAlignmentPrompt(avatarId);
  try {
    await navigator.clipboard.writeText(text);
    console.log('[AvatarTuner] Alignment prompt copied to clipboard for:', avatarId);
    console.log(text);
  } catch {
    console.log('[AvatarTuner] Clipboard blocked. Here is the prompt:');
    console.log(text);
  }
}

export function logAllAvatarAlignmentPrompts(): void {
  const cfg = loadAvatarTunerConfig();
  const ids = Object.keys(cfg?.byAvatarId ?? {});
  if (ids.length === 0) {
    console.log('[AvatarTuner] No per-avatar tuning found. Try setting some values first.');
    console.log('[AvatarTuner] You can still generate a prompt for any avatar ID:');
    console.log('  copyAvatarAlignmentPrompt("avatar_20_yourname")');
    return;
  }
  for (const id of ids) {
    console.log(generateAvatarAlignmentPrompt(id, cfg ?? undefined));
    console.log('');
  }
}

if (typeof window !== 'undefined') {
  (window as any).copyAvatarAlignmentPrompt = copyAvatarAlignmentPrompt;
  (window as any).logAllAvatarAlignmentPrompts = logAllAvatarAlignmentPrompts;
  (window as any).generateAvatarAlignmentPrompt = generateAvatarAlignmentPrompt;
}

// ─── Default Config ───────────────────────────────────────────────────────────

const DEFAULT_CFG: AvatarTunerConfig = {
  version: 1,

  noSplitAvatarNumbers: [31, 32],

  globalDefaults: {
    faceCropByGender: {
      boy:  { x: 0.5327, y: 0.1179, w: 0.2449, h: 0.2357 },
      girl: { x: 0.1980, y: 0.1214, w: 0.2857, h: 0.2393 },
    },
    noSplitFaceCropDefault: { x: 0.30, y: 0.04, w: 0.38, h: 0.26 },
    bodyFrameByGender: {
      boy: { scale: 1 },
      girl: { scale: 1 },
    },
    tuningByContext: {
      profile_card: {
        boy: { offsetXPercent: 1, offsetYPercent: -14.1, scale: 1.16 },
        girl: { offsetXPercent: 1, offsetYPercent: -14.1, scale: 1.16 },
      },
      gacha_result: {
        boy: { offsetXPercent: 0, offsetYPercent: 0, scale: 0.88 },
        girl: { offsetXPercent: 0, offsetYPercent: 0, scale: 0.88 },
      },
      inventory: {
        boy: { offsetXPercent: 1, offsetYPercent: 45.2, scale: 3.12 },
        girl: { offsetXPercent: 1, offsetYPercent: 45.2, scale: 3.12 },
      },
      profile_icon: {
        boy: { offsetXPercent: 1, offsetYPercent: 42.1, scale: 2.42 },
        girl: { offsetXPercent: 1, offsetYPercent: 42.1, scale: 2.42 },
      },
    },
  },

  byAvatarId: {
    avatar_38_dino: {
      profile_card: {
        boy: { offsetXPercent: -3, offsetYPercent: -15.5, scale: 1 },
        girl: { offsetXPercent: 0.5, offsetYPercent: -16.4, scale: 1 },
      },
      gacha_result: {
        boy: { offsetXPercent: -3, offsetYPercent: -3, scale: 0.98 },
        girl: { offsetXPercent: 0, offsetYPercent: -4.2, scale: 0.98 },
      },
      inventory: {
        boy: { offsetXPercent: -14.5, offsetYPercent: 40.5, scale: 3.16 },
        girl: { offsetXPercent: -0.5, offsetYPercent: 39.6, scale: 3.08 },
      },
      profile_icon: {
        boy: { offsetXPercent: -15, offsetYPercent: 40.2, scale: 2.62 },
        girl: { offsetXPercent: 0.6, offsetYPercent: 38.4, scale: 2.62 },
      },
    },

    avatar_56_oil: {
      profile_card: {
        girl: { offsetXPercent: 2, offsetYPercent: -16.8, scale: 1.2 },
        boy: { offsetXPercent: 0.5, offsetYPercent: -16.5 },
      },
      inventory: {
        boy: { scale: 2.36, offsetXPercent: 3, offsetYPercent: 35.5 },
        girl: { scale: 3.12, offsetXPercent: 5.5, offsetYPercent: 45.2 },
      },
      profile_icon: {
        boy: { offsetXPercent: 3.6, offsetYPercent: 39, scale: 2.32 },
        girl: { offsetXPercent: 4.6, offsetYPercent: 42.1, scale: 2.42 },
      },
      gacha_result: {
        boy: { offsetXPercent: 1.5, offsetYPercent: -2.5 },
        girl: { offsetXPercent: 0.5, offsetYPercent: -1.5, scale: 0.88 },
      },
    },

    avatar_63_pikachu: {
      profile_card: {
        boy: { offsetXPercent: 5, offsetYPercent: -14.1, scale: 1.16 },
        girl: { offsetXPercent: 4.6, offsetYPercent: -14.1, scale: 1.16 },
      },
      gacha_result: {
        boy: { offsetXPercent: 4, offsetYPercent: 0, scale: 0.58 },
        girl: { offsetXPercent: 4.3, offsetYPercent: 0, scale: 0.88 },
      },
      inventory: {
        boy: { offsetXPercent: 13.9, offsetYPercent: 45.5, scale: 3.12 },
        girl: { offsetXPercent: 11.5, offsetYPercent: 45.2, scale: 3.12 },
      },
      profile_icon: {
        boy: { offsetXPercent: 12.4, offsetYPercent: 42.1, scale: 2.42 },
        girl: { offsetXPercent: 11.1, offsetYPercent: 42.1, scale: 2.42 },
      },
    },

    avatar_75_tempest: {
      profile_card: {
        boy: { offsetXPercent: 9, offsetYPercent: -14.1, scale: 1.16 },
        girl: { offsetXPercent: 10.8, offsetYPercent: -13.1, scale: 1.16 },
      },
      gacha_result: {
        boy: { offsetXPercent: 5.7, offsetYPercent: 0, scale: 0.88 },
        girl: { offsetXPercent: 6.9, offsetYPercent: 0, scale: 0.88 },
      },
      inventory: {
        boy: { offsetXPercent: 16.4, offsetYPercent: 45.8, scale: 3.12 },
        girl: { offsetXPercent: 23.4, offsetYPercent: 46.9, scale: 3.12 },
      },
      profile_icon: {
        boy: { offsetXPercent: 15.7, offsetYPercent: 42.1, scale: 2.42 },
        girl: { offsetXPercent: 20.9, offsetYPercent: 44.5, scale: 2.42 },
      },
    },

    avatar_62_wizard: {
      profile_card: {
        boy: { offsetXPercent: -5.3, offsetYPercent: -14.1, scale: 1.16 },
        girl: { offsetXPercent: -1.6, offsetYPercent: -14.1, scale: 1.16 },
      },
      gacha_result: {
        boy: { offsetXPercent: -5.1, offsetYPercent: 0, scale: 0.88 },
        girl: { offsetXPercent: -2.2, offsetYPercent: 0, scale: 0.88 },
      },
      inventory: {
        boy: { offsetXPercent: -11.5, offsetYPercent: 45.2, scale: 3.12 },
        girl: { offsetXPercent: -7.2, offsetYPercent: 45, scale: 3.12 },
      },
      profile_icon: {
        boy: { offsetXPercent: -10.7, offsetYPercent: 41.9, scale: 2.42 },
        girl: { offsetXPercent: -7.2, offsetYPercent: 42.1, scale: 2.42 },
      },
    },

    avatar_16_forest: {
      profile_card: {
        boy: { offsetXPercent: -5.9, offsetYPercent: -14.1, scale: 1.16 },
      },
      gacha_result: {
        boy: { offsetXPercent: -4.3, offsetYPercent: 0.2, scale: 0.88 },
      },
      inventory: {
        boy: { offsetXPercent: -14.2, offsetYPercent: 45.2, scale: 3.12 },
      },
      profile_icon: {
        boy: { offsetXPercent: -12.2, offsetYPercent: 42.1, scale: 2.42 },
      },
    },

    avatar_68_pajama: {
      profile_card: {
        boy: { offsetXPercent: -2.3, offsetYPercent: -14.1, scale: 1.16 },
      },
      gacha_result: {
        boy: { offsetXPercent: -2.7, offsetYPercent: 0, scale: 0.88 },
      },
      inventory: {
        boy: { offsetXPercent: -5.6, offsetYPercent: 45.2, scale: 3.12 },
      },
      profile_icon: {
        boy: { offsetXPercent: -5.3, offsetYPercent: 42.7, scale: 2.42 },
      },
    },

    avatar_71_stone_age: {
      profile_card: {
        boy: { offsetXPercent: -6.7, offsetYPercent: -13.9, scale: 1.16 },
        girl: { offsetXPercent: -3, offsetYPercent: -14.1, scale: 1.16 },
      },
      gacha_result: {
        boy: { offsetXPercent: -6.1, offsetYPercent: -0.2, scale: 0.88 },
        girl: { offsetXPercent: -3.1, offsetYPercent: 0, scale: 0.88 },
      },
      inventory: {
        boy: { offsetXPercent: -17.8, offsetYPercent: 45.2, scale: 3.12 },
        girl: { offsetXPercent: -10.6, offsetYPercent: 45.4, scale: 3.12 },
      },
      profile_icon: {
        boy: { offsetXPercent: -15, offsetYPercent: 42.1, scale: 2.42 },
        girl: { offsetXPercent: -8.5, offsetYPercent: 42.3, scale: 2.42 },
      },
    },

    avatar_3_cat: {
      profile_card: {
        boy: { offsetXPercent: 9.6, offsetYPercent: -14.1, scale: 1.16 },
        girl: { offsetXPercent: 9, offsetYPercent: -14.1, scale: 1.16 },
      },
      gacha_result: {
        boy: { offsetXPercent: 6.8, offsetYPercent: -0.3, scale: 0.88 },
        girl: { offsetXPercent: 6.3, offsetYPercent: 0, scale: 0.88 },
      },
      inventory: {
        boy: { offsetXPercent: 23.5, offsetYPercent: 44.7, scale: 3.12 },
        girl: { offsetXPercent: 23.3, offsetYPercent: 45.2, scale: 3.12 },
      },
      profile_icon: {
        boy: { offsetXPercent: 21, offsetYPercent: 42.1, scale: 2.42 },
        girl: { offsetXPercent: 20.1, offsetYPercent: 42.3, scale: 2.42 },
      },
    },

    avatar_47_singer: {
      profile_card: {
        boy: { offsetXPercent: 2.3, offsetYPercent: -14.1, scale: 1.16 },
      },
      gacha_result: {
        boy: { offsetXPercent: 1.2, offsetYPercent: 0, scale: 0.6 },
      },
      inventory: {
        boy: { offsetXPercent: 6.1, offsetYPercent: 45.3, scale: 3.12 },
      },
      profile_icon: {
        boy: { offsetXPercent: 5.4, offsetYPercent: 42.1, scale: 2.42 },
      },
    },

    avatar_21_robot: {
      profile_card: {
        boy: { offsetXPercent: -1, offsetYPercent: -14.1, scale: 1.16 },
      },
    },

    avatar_26_antman: {
      profile_card: {
        boy: { offsetXPercent: 5.9, offsetYPercent: 16.8, scale: 0.5 },
        girl: { offsetXPercent: 1.6, offsetYPercent: -13.8, scale: 0.5 },
      },
      gacha_result: {
        girl: { offsetXPercent: 1.8, offsetYPercent: 18.3, scale: 0.5 },
        boy: { offsetXPercent: 6.9, offsetYPercent: 15, scale: 0.5 },
      },
      inventory: {
        boy: { offsetXPercent: 16.8, offsetYPercent: 33.9, scale: 1.58 },
        girl: { offsetXPercent: 3.6, offsetYPercent: 29.3, scale: 1.36 },
      },
      profile_icon: {
        boy: { offsetXPercent: 9.8, offsetYPercent: 30, scale: 0.96 },
        girl: { offsetXPercent: 3.8, offsetYPercent: 28.5, scale: 1.4 },
      },
    },

    avatar_79_champion: {
      profile_card: {
        girl: { offsetXPercent: -7.5, offsetYPercent: -14, scale: 1.16 },
      },
      gacha_result: {
        girl: { offsetXPercent: -5.9, offsetYPercent: -0.3, scale: 0.88 },
      },
      inventory: {
        girl: { offsetXPercent: -19.9, offsetYPercent: 45.2, scale: 3.12 },
      },
      profile_icon: {
        girl: { offsetXPercent: -18, offsetYPercent: 42.1, scale: 2.42 },
      },
    },

    avatar_67_lego: {
      profile_card: {
        girl: { offsetXPercent: 3.7, offsetYPercent: -14.1, scale: 1.16 },
      },
      gacha_result: {
        girl: { offsetXPercent: 2.9, offsetYPercent: 0, scale: 0.88 },
      },
      inventory: {
        girl: { offsetXPercent: 8.6, offsetYPercent: 45.2, scale: 3.12 },
      },
      profile_icon: {
        girl: { offsetXPercent: 7.1, offsetYPercent: 42.3, scale: 2.42 },
      },
    },

    avatar_84_smurf: {
      profile_card: {
        boy: { offsetXPercent: 5.7, offsetYPercent: -14.1, scale: 1.16 },
        girl: { offsetXPercent: -5.7, offsetYPercent: -14.1, scale: 1.16 },
      },
      gacha_result: {
        boy: { offsetXPercent: 3.7, offsetYPercent: 0, scale: 0.88 },
        girl: { offsetXPercent: -5, offsetYPercent: 0.3, scale: 0.88 },
      },
      inventory: {
        boy: { offsetXPercent: 20.7, offsetYPercent: 31, scale: 3.12 },
        girl: { offsetXPercent: -14.5, offsetYPercent: 34.4, scale: 3.12 },
      },
      profile_icon: {
        boy: { offsetXPercent: 17.9, offsetYPercent: 32.4, scale: 2.42 },
        girl: { offsetXPercent: -14.1, offsetYPercent: 32, scale: 2.42 },
      },
    },
  },
};

// ─── Playground Preview Component ─────────────────────────────────────────────

const CONTEXT_META: Record<AvatarTunerContext, {
  label: string;
  aspect: string;
  shape: 'rect' | 'circle';
  avatarHeightPercent: number;
  bgColor: string;
  description: string;
}> = {
  profile_card: {
    label: 'Profile Card',
    aspect: 'aspect-[4/5.5]',
    shape: 'rect',
    avatarHeightPercent: 85,
    bgColor: 'from-indigo-900 to-gray-900',
    description: 'Tall card • avatar bottom 85%',
  },
  gacha_result: {
    label: 'Gacha Result',
    aspect: 'aspect-square',
    shape: 'rect',
    avatarHeightPercent: 100,
    bgColor: 'from-slate-800 to-slate-950',
    description: 'Square card • full height',
  },
  inventory: {
    label: 'Inventory Tile',
    aspect: 'aspect-square',
    shape: 'rect',
    avatarHeightPercent: 100,
    bgColor: 'from-teal-900 to-slate-900',
    description: 'Square tile • contain + bottom align',
  },
  profile_icon: {
    label: 'Profile Icon',
    aspect: 'aspect-square',
    shape: 'circle',
    avatarHeightPercent: 130,
    bgColor: 'from-slate-700 to-slate-900',
    description: 'Circle icon • head crop',
  },
};

const DEFAULT_OFFSETS: Record<AvatarTunerContext, (g: Gender) => { ox: number; oy: number; sc: number }> = {
  profile_card:  (_g) => ({ ox: 0, oy: 0, sc: 1.2 }),
  gacha_result:  (_g) => ({ ox: 0, oy: 0, sc: 0.88 }),
  inventory:     (_g) => ({ ox: 0, oy: 0, sc: 0.6 }),
  profile_icon:  (_g) => ({ ox: 0, oy: 0, sc: 1.8 }),
};

interface PlaygroundPreviewProps {
  ctx: AvatarTunerContext;
  gender: Gender;
  avatarId: string;
  imageUrl: string;
  noSplit: boolean;
  tuning: any;
  onDelta: (ctx: AvatarTunerContext, gender: Gender, dox: number, doy: number) => void;
  onWheel: (ctx: AvatarTunerContext, gender: Gender, delta: number) => void;
  onReset: (ctx: AvatarTunerContext, gender: Gender) => void;
}

function PlaygroundPreview({
  ctx,
  gender,
  avatarId,
  imageUrl,
  noSplit,
  tuning,
  onDelta,
  onWheel,
  onReset,
}: PlaygroundPreviewProps) {
  const meta = CONTEXT_META[ctx];
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; active: boolean }>({
    startX: 0,
    startY: 0,
    active: false,
  });

  const defaults = DEFAULT_OFFSETS[ctx](gender);
  const ox = (tuning?.offsetXPercent ?? defaults.ox);
  const oy = (tuning?.offsetYPercent ?? defaults.oy);
  const sc = (tuning?.scale ?? defaults.sc);

  const transform = ctx === 'inventory'
    ? `translate(${ox}%, ${oy}%) scale(${sc})`
    : `translateX(calc(-50% + ${ox}%)) translateY(${oy}%) scale(${sc})`;

  const cropStyle = useMemo<React.CSSProperties | null>(() => {
    if (ctx !== 'inventory') return null;
    if (!imageUrl) return null;
    return {
      backgroundImage: `url(${imageUrl})`,
      backgroundSize: 'contain',
      backgroundPosition: '50% 100%',
      backgroundRepeat: 'no-repeat',
    };
  }, [ctx, imageUrl, noSplit, avatarId, gender]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, active: true };
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current.active) return;
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const dx = ((e.clientX - dragRef.current.startX) / rect.width) * 100;
    const dy = ((e.clientY - dragRef.current.startY) / rect.height) * 100;
    dragRef.current.startX = e.clientX;
    dragRef.current.startY = e.clientY;
    onDelta(ctx, gender, dx, dy);
  }, [ctx, gender, onDelta]);

  const handlePointerUp = useCallback(() => {
    dragRef.current.active = false;
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.02 : 0.02;
    onWheel(ctx, gender, delta);
  }, [ctx, gender, onWheel]);

  const isCircle = meta.shape === 'circle';

  return (
    <div className="flex flex-col gap-2">
      {/* Label */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-bold text-slate-700">{meta.label}</div>
          <div className="text-[10px] text-slate-400">{meta.description}</div>
        </div>
        <button
          type="button"
          onClick={() => onReset(ctx, gender)}
          className="text-[10px] px-2 py-1 rounded-md border border-slate-200 text-slate-500 hover:border-slate-400 hover:text-slate-700 transition-colors"
          title="Reset to defaults"
        >
          ↺ Reset
        </button>
      </div>

      {/* Preview container */}
      <div
        ref={containerRef}
        className={`relative overflow-hidden cursor-grab active:cursor-grabbing select-none border-2 border-slate-200 hover:border-indigo-300 transition-colors ${
          isCircle ? 'rounded-full mx-auto' : 'rounded-xl w-full'
        } ${meta.aspect} bg-gradient-to-b ${meta.bgColor}`}
        style={isCircle ? { width: '80%', paddingBottom: '80%', height: 0, borderRadius: '50%' } : {}}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onWheel={handleWheel}
      >
        <div className={`absolute inset-0 bg-gradient-to-b ${meta.bgColor}`} />

        {/* Avatar image */}
        {imageUrl ? (
          ctx === 'inventory' ? (
            <div
              className="absolute"
              style={{
                inset: 0,
                transform,
                transformOrigin: 'center center',
              }}
            >
              <div className="absolute inset-0" style={cropStyle || undefined} />
            </div>
          ) : (
            <div
              className="absolute overflow-hidden"
              style={{
                bottom: 0,
                left: 0,
                right: 0,
                height: `${meta.avatarHeightPercent}%`,
                top: meta.avatarHeightPercent > 100 ? `-${meta.avatarHeightPercent - 100}%` : 'auto',
              }}
            >
              <img
                src={imageUrl}
                alt="Avatar preview"
                draggable={false}
                className="absolute bottom-0 left-1/2 h-full w-auto max-w-none pointer-events-none"
                style={{ transform }}
              />
            </div>
          )
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-3xl opacity-40">
            🧑
          </div>
        )}

        {/* Drag hint overlay — shown briefly */}
        <div className="absolute inset-0 flex items-end justify-center pb-1 pointer-events-none">
          <span className="text-[9px] text-white/40 font-semibold tracking-wide">
            drag · scroll to zoom
          </span>
        </div>
      </div>

      {/* Live numeric readout */}
      <div className="grid grid-cols-3 gap-1">
        {[
          { label: 'X%', value: ox.toFixed(1) },
          { label: 'Y%', value: oy.toFixed(1) },
          { label: 'sc', value: sc.toFixed(2) },
        ].map(({ label, value }) => (
          <div key={label} className="bg-slate-50 rounded-md px-1.5 py-1 text-center border border-slate-200">
            <div className="text-[9px] text-slate-400 font-semibold">{label}</div>
            <div className="text-xs font-mono font-bold text-slate-700">{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Tuner Button ─────────────────────────────────────────────────────────────

export function AvatarTunerButton({
  avatarId,
  avatarImageUrl,
  avatarImageUrlBoy,
  avatarImageUrlGirl,
  className = '',
  style,
}: {
  avatarId?: string;
  avatarImageUrl?: string;
  avatarImageUrlBoy?: string;
  avatarImageUrlGirl?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [open, setOpen] = useState(false);

  const enable = useMemo(() => {
    try {
      const isDev = Boolean((import.meta as any)?.env?.DEV);
      const host = (typeof window !== 'undefined' ? window.location.hostname : '') || '';
      const isLocalhost = host === 'localhost' || host === '127.0.0.1';
      return isDev || isLocalhost || localStorage.getItem('cc_enable_avatar_tuner') === '1';
    } catch {
      return false;
    }
  }, []);

  if (!enable) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className}
        style={style}
      >
        🎛 Avatar Tuner
      </button>
      {open ? (
        <AvatarTunerModal
          avatarId={avatarId}
          avatarImageUrl={avatarImageUrl}
          avatarImageUrlBoy={avatarImageUrlBoy}
          avatarImageUrlGirl={avatarImageUrlGirl}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

// ─── Tuner Modal ──────────────────────────────────────────────────────────────

function AvatarTunerModal({
  avatarId,
  avatarImageUrl,
  avatarImageUrlBoy,
  avatarImageUrlGirl,
  onClose,
}: {
  avatarId?: string;
  avatarImageUrl?: string;
  avatarImageUrlBoy?: string;
  avatarImageUrlGirl?: string;
  onClose: () => void;
}) {
  const [cfg, setCfg] = useState<AvatarTunerConfig>(() => loadAvatarTunerConfig() ?? DEFAULT_CFG);
  const [tapGender, setTapGender] = useState<Gender>('boy');
  const [tapStart, setTapStart] = useState<{ x: number; y: number } | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [importText, setImportText] = useState<string>('');
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'tuning' | 'playground' | 'prompt' | 'import'>('tuning');

  // Playground state
  const [playGender, setPlayGender] = useState<Gender>('boy');

  const didMountRef = useRef(false);

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    saveAvatarTunerConfig(cfg);
  }, [cfg]);

  const safeAvatarId = avatarId || '';

  const tuning = useMemo(() => {
    return cfg.byAvatarId?.[safeAvatarId] || {};
  }, [cfg.byAvatarId, safeAvatarId]);

  const resolvedTuningByContext = useMemo(() => {
    const out: Record<string, Record<string, AvatarTuning | null>> = {};
    const contexts: AvatarTunerContext[] = ['profile_card', 'gacha_result', 'inventory', 'profile_icon'];
    const genders: Gender[] = ['boy', 'girl'];
    for (const ctx of contexts) {
      out[ctx] = {};
      for (const g of genders) {
        out[ctx][g] = resolveAvatarTuningFromConfig(cfg, safeAvatarId, ctx, g);
      }
    }
    return out;
  }, [cfg, safeAvatarId]);

  const applyCurrentAsGlobalDefaults = useCallback(() => {
    if (!safeAvatarId) return;
    setCfg((prev) => {
      const next: AvatarTunerConfig = {
        ...prev,
        globalDefaults: {
          ...(prev.globalDefaults || {}),
          tuningByContext: { ...((prev.globalDefaults as any)?.tuningByContext || {}) },
        },
      };

      const contexts: AvatarTunerContext[] = ['profile_card', 'gacha_result', 'inventory', 'profile_icon'];
      const genders: Gender[] = ['boy', 'girl'];

      for (const ctx of contexts) {
        (next.globalDefaults as any).tuningByContext[ctx] = {
          ...(((next.globalDefaults as any).tuningByContext || {})[ctx] || {}),
        };
        for (const g of genders) {
          const resolved = resolveAvatarTuningFromConfig(prev, safeAvatarId, ctx, g) || {
            offsetXPercent: DEFAULT_OFFSETS[ctx](g).ox,
            offsetYPercent: DEFAULT_OFFSETS[ctx](g).oy,
            scale: DEFAULT_OFFSETS[ctx](g).sc,
          };
          (next.globalDefaults as any).tuningByContext[ctx][g] = {
            offsetXPercent: resolved.offsetXPercent,
            offsetYPercent: resolved.offsetYPercent,
            scale: resolved.scale,
          };
        }
      }
      return next;
    });
    setCopyStatus('✓ Applied current avatar tuning as GLOBAL defaults (all contexts, both genders).');
  }, [safeAvatarId]);

  const noSplitNum = avatarNumberFromId(safeAvatarId);
  const noSplitEnabled =
    !!noSplitNum && Array.isArray(cfg.noSplitAvatarNumbers) && cfg.noSplitAvatarNumbers.includes(noSplitNum);

  // Resolve gendered image URL for playground
  const playImageUrl = useMemo(() => {
    if (noSplitEnabled) return avatarImageUrl || '';
    if (playGender === 'boy') return avatarImageUrlBoy || avatarImageUrl || '';
    return avatarImageUrlGirl || avatarImageUrl || '';
  }, [avatarImageUrl, avatarImageUrlBoy, avatarImageUrlGirl, playGender, noSplitEnabled]);

  // ── Playground handlers ──────────────────────────────────────────────────

  const handlePlaygroundDelta = useCallback((
    ctx: AvatarTunerContext,
    gender: Gender,
    dox: number,
    doy: number,
  ) => {
    setCfg((prev) => {
      const resolved = resolveAvatarTuningFromConfig(prev, safeAvatarId, ctx, gender) || {
        offsetXPercent: DEFAULT_OFFSETS[ctx](gender).ox,
        offsetYPercent: DEFAULT_OFFSETS[ctx](gender).oy,
        scale: DEFAULT_OFFSETS[ctx](gender).sc,
      };
      const newOx = Math.round(((resolved.offsetXPercent ?? 0) + dox) * 10) / 10;
      const newOy = Math.round(((resolved.offsetYPercent ?? 0) + doy) * 10) / 10;
      return mergeTuning(prev, safeAvatarId, ctx, gender, {
        offsetXPercent: newOx,
        offsetYPercent: newOy,
        scale: resolved.scale,
      });
    });
  }, [safeAvatarId]);

  const handlePlaygroundWheel = useCallback((
    ctx: AvatarTunerContext,
    gender: Gender,
    delta: number,
  ) => {
    setCfg((prev) => {
      const resolved = resolveAvatarTuningFromConfig(prev, safeAvatarId, ctx, gender) || {
        offsetXPercent: DEFAULT_OFFSETS[ctx](gender).ox,
        offsetYPercent: DEFAULT_OFFSETS[ctx](gender).oy,
        scale: DEFAULT_OFFSETS[ctx](gender).sc,
      };

      const raw = (resolved.scale ?? 1) + delta;
      const newSc = Math.round(Math.min(5, Math.max(0.5, raw)) * 100) / 100;

      return mergeTuning(prev, safeAvatarId, ctx, gender, {
        offsetXPercent: resolved.offsetXPercent,
        offsetYPercent: resolved.offsetYPercent,
        scale: newSc,
      });
    });
  }, [safeAvatarId]);

  const handlePlaygroundReset = useCallback((ctx: AvatarTunerContext, gender: Gender) => {
    setCfg((prev) => {
      // Reset should revert to GLOBAL style (defaults + global tuning),
      // so we remove the per-avatar override for this ctx/gender.
      return removePerAvatarTuningOverride(prev, safeAvatarId, ctx, gender);
    });
  }, [safeAvatarId]);

  // ── Tuning tab helpers ───────────────────────────────────────────────────

  function setTuningValue(
    ctx: AvatarTunerContext,
    gender: Gender,
    key: keyof AvatarTuning,
    value: number,
  ) {
    setCfg((prev) => {
      const next: AvatarTunerConfig = {
        ...prev,
        byAvatarId: { ...(prev.byAvatarId || {}) },
      };
      const byId = { ...(next.byAvatarId?.[safeAvatarId] || {}) };
      const byCtx = { ...(byId[ctx] || {}) } as any;
      const byGender = { ...(byCtx[gender] || {}) };
      byGender[key] = value;
      byCtx[gender] = byGender;
      (byId as any)[ctx] = byCtx;
      next.byAvatarId![safeAvatarId] = byId as any;
      return next;
    });
  }

  function getValue(ctx: AvatarTunerContext, gender: Gender, key: keyof AvatarTuning, fallback: number) {
    const v = (resolvedTuningByContext as any)?.[ctx]?.[gender]?.[key];
    return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
  }

  function toggleNoSplit() {
    if (!noSplitNum) return;
    setCfg((prev) => {
      const list = Array.isArray(prev.noSplitAvatarNumbers) ? [...prev.noSplitAvatarNumbers] : [];
      const idx = list.indexOf(noSplitNum);
      if (idx >= 0) list.splice(idx, 1);
      else list.push(noSplitNum);
      list.sort((a, b) => a - b);
      return { ...prev, noSplitAvatarNumbers: list };
    });
  }

  const jsonText = useMemo(() => JSON.stringify(cfg, null, 2), [cfg]);

  const promptText = useMemo(
    () => generateAvatarAlignmentPrompt(safeAvatarId, cfg),
    [safeAvatarId, cfg],
  );

  function copyText(text: string, label: string) {
    try {
      navigator.clipboard
        .writeText(text)
        .then(() => setCopyStatus(`✓ ${label} copied to clipboard`))
        .catch(() => setCopyStatus('Clipboard blocked — use Select All'));
    } catch {
      setCopyStatus('Clipboard blocked — use Select All');
    }
  }

  function selectTextarea(id: string) {
    const el = document.getElementById(id) as HTMLTextAreaElement | null;
    if (!el) return;
    el.focus();
    el.select();
    try { document.execCommand('copy'); } catch { /* ignore */ }
    setCopyStatus('Selected. Press Cmd+C / Ctrl+C to copy.');
  }

  function downloadJson() {
    try {
      const blob = new Blob([jsonText], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'cc_avatar_tuner_config_v4.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setCopyStatus('Downloaded JSON file.');
    } catch {
      setCopyStatus('Download failed.');
    }
  }

  function applyImportedJson() {
    try {
      const parsed = JSON.parse(importText);
      if (!parsed || parsed.version !== 1) {
        setImportStatus('Invalid JSON: expected { version: 1, ... }.');
        return;
      }
      setCfg(parsed as AvatarTunerConfig);
      setActiveTab('tuning');
      setImportStatus('✓ Imported and applied — check the Tuning tab to verify values.');
    } catch {
      setImportStatus('Invalid JSON (parse failed). Make sure you copied the full JSON block.');
    }
  }

  function setPerAvatarFaceCrop(key: keyof FaceCrop, value: number) {
    if (!safeAvatarId) return;
    setCfg((prev) => {
      const next: AvatarTunerConfig = {
        ...prev,
        byAvatarId: { ...(prev.byAvatarId || {}) },
      };
      const byId = { ...(next.byAvatarId?.[safeAvatarId] || {}) };
      const existing: FaceCrop = (byId.faceCrop as FaceCrop | undefined) || { x: 0.3, y: 0.05, w: 0.35, h: 0.3 };
      (byId as any).faceCrop = { ...existing, [key]: value };
      next.byAvatarId![safeAvatarId] = byId as any;
      return next;
    });
  }

  function setGlobalFaceCrop(gender: Gender, key: keyof FaceCrop, value: number) {
    setCfg((prev) => {
      const next: AvatarTunerConfig = {
        ...prev,
        globalDefaults: {
          ...(prev.globalDefaults || {}),
          faceCropByGender: { ...(prev.globalDefaults?.faceCropByGender || {}) },
        },
      };
      const existing =
        (next.globalDefaults!.faceCropByGender?.[gender] || { x: 0.3, y: 0.05, w: 0.4, h: 0.3 }) as FaceCrop;
      next.globalDefaults!.faceCropByGender![gender] = { ...existing, [key]: value };
      return next;
    });
  }

  function getGlobalFaceCropValue(gender: Gender, key: keyof FaceCrop, fallback: number) {
    const v = (cfg.globalDefaults?.faceCropByGender as any)?.[gender]?.[key];
    return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
  }

  function getPerAvatarFaceCropValue(key: keyof FaceCrop, fallback: number) {
    const v = (cfg.byAvatarId?.[safeAvatarId] as any)?.faceCrop?.[key];
    return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
  }

  const previewUrl = useMemo(() => {
    if (noSplitEnabled) return avatarImageUrl || '';
    if (tapGender === 'boy') return avatarImageUrlBoy || avatarImageUrl || '';
    return avatarImageUrlGirl || avatarImageUrl || '';
  }, [avatarImageUrl, avatarImageUrlBoy, avatarImageUrlGirl, tapGender, noSplitEnabled]);

  function handlePreviewClick(e: React.MouseEvent<HTMLImageElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const nx = Math.max(0, Math.min(1, x));
    const ny = Math.max(0, Math.min(1, y));

    if (!tapStart) {
      setTapStart({ x: nx, y: ny });
      return;
    }

    const x1 = Math.min(tapStart.x, nx);
    const y1 = Math.min(tapStart.y, ny);
    const x2 = Math.max(tapStart.x, nx);
    const y2 = Math.max(tapStart.y, ny);
    const w = Math.max(0.01, x2 - x1);
    const h = Math.max(0.01, y2 - y1);

    if (noSplitEnabled) {
      setPerAvatarFaceCrop('x', Number(x1.toFixed(4)));
      setPerAvatarFaceCrop('y', Number(y1.toFixed(4)));
      setPerAvatarFaceCrop('w', Number(w.toFixed(4)));
      setPerAvatarFaceCrop('h', Number(h.toFixed(4)));
    } else {
      setGlobalFaceCrop(tapGender, 'x', Number(x1.toFixed(4)));
      setGlobalFaceCrop(tapGender, 'y', Number(y1.toFixed(4)));
      setGlobalFaceCrop(tapGender, 'w', Number(w.toFixed(4)));
      setGlobalFaceCrop(tapGender, 'h', Number(h.toFixed(4)));
    }
    setTapStart(null);
  }

  const ALL_CONTEXTS: AvatarTunerContext[] = ['profile_card', 'gacha_result', 'inventory', 'profile_icon'];

  return (
    <div className="fixed inset-0 z-[9999]">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="absolute left-1/2 top-1/2 w-[min(900px,96vw)] max-h-[90vh] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white text-slate-900 overflow-hidden shadow-2xl flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50 shrink-0 flex-wrap gap-2">
          <div className="font-bold text-slate-800">🎛 Avatar Tuner</div>
          <div className="flex items-center gap-2 flex-wrap">
            {([
              ['tuning',     '🎚 Tuning'],
              ['playground', '🕹 Playground'],
              ['prompt',     '📋 AI Prompt'],
              ['import',     '⬆ Import'],
            ] as const).map(([tab, label]) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${
                  activeTab === tab
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-400'
                }`}
              >
                {label}
              </button>
            ))}
            <button type="button" className="px-3 py-1.5 rounded-lg border text-sm" onClick={downloadJson}>
              ⬇ JSON
            </button>
            <button type="button" className="px-3 py-1.5 rounded-lg border text-sm" onClick={onClose}>
              ✕
            </button>
          </div>
        </div>

        {copyStatus && (
          <div className="bg-green-50 text-green-800 text-xs px-4 py-2 border-b border-green-200 shrink-0">
            {copyStatus}
          </div>
        )}

        <div className="overflow-auto flex-1 p-4 space-y-4">

          {/* ── PLAYGROUND TAB ── */}
          {activeTab === 'playground' && (
            <div className="space-y-4">
              {/* Avatar ID + info strip */}
              <div className="flex items-center gap-3 text-sm bg-slate-100 rounded-lg px-3 py-2">
                <span className="font-mono text-slate-600">
                  avatarId: <span className="text-slate-900 font-bold">{safeAvatarId || '(none)'}</span>
                </span>
                <span className="text-slate-400">·</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  noSplitEnabled
                    ? 'bg-amber-100 text-amber-700 border border-amber-200'
                    : 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                }`}>
                  {noSplitEnabled ? 'single-person' : 'split (boy / girl)'}
                </span>
              </div>

              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-800">
                <strong>Drag</strong> inside any preview to shift the avatar (offsetX / offsetY) ·
                <strong> Scroll</strong> over a preview to zoom (scale 0.5 – 1.8) ·
                Changes persist to localStorage in real time.
              </div>

              {/* Gender toggle — only for split avatars */}
              {!noSplitEnabled && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-600">Editing gender:</span>
                  {(['boy', 'girl'] as Gender[]).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setPlayGender(g)}
                      className={`px-3 py-1.5 rounded-lg border text-sm font-semibold capitalize transition-colors ${
                        playGender === g
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
                      }`}
                    >
                      {g === 'boy' ? '👦' : '👧'} {g}
                    </button>
                  ))}
                  <span className="text-xs text-slate-400 ml-1">
                    Switch gender to tune each half independently
                  </span>
                </div>
              )}

              {!playImageUrl && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
                  ⚠️ No avatar image URL available. Open the tuner from a profile card or inventory to see previews.
                </div>
              )}

              {/* 4-column preview grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {ALL_CONTEXTS.map((ctx) => (
                  <PlaygroundPreview
                    key={ctx}
                    ctx={ctx}
                    gender={noSplitEnabled ? 'boy' : playGender}
                    avatarId={safeAvatarId}
                    imageUrl={playImageUrl}
                    noSplit={noSplitEnabled}
                    tuning={resolvedTuningByContext[ctx]?.[noSplitEnabled ? 'boy' : playGender]}
                    onDelta={handlePlaygroundDelta}
                    onWheel={handlePlaygroundWheel}
                    onReset={handlePlaygroundReset}
                  />
                ))}
              </div>

              {/* Numeric summary table */}
              <div className="rounded-xl border overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b">
                      <th className="text-left px-3 py-2 text-slate-600 font-semibold">Context</th>
                      <th className="text-right px-3 py-2 text-slate-600 font-semibold">offsetX%</th>
                      <th className="text-right px-3 py-2 text-slate-600 font-semibold">offsetY%</th>
                      <th className="text-right px-3 py-2 text-slate-600 font-semibold">scale</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {ALL_CONTEXTS.map((ctx, i) => {
                      const g = noSplitEnabled ? 'boy' : playGender;
                      const defaults = DEFAULT_OFFSETS[ctx](g);
                      const stored = (tuning as any)?.[ctx]?.[g];
                      const ox = stored?.offsetXPercent ?? defaults.ox;
                      const oy = stored?.offsetYPercent ?? defaults.oy;
                      const sc = stored?.scale ?? defaults.sc;
                      const isCustom = !!stored && (
                        stored.offsetXPercent !== undefined ||
                        stored.offsetYPercent !== undefined ||
                        stored.scale !== undefined
                      );
                      return (
                        <tr key={ctx} className={`border-b last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                          <td className="px-3 py-2 font-mono text-slate-700">
                            {ctx}
                            {isCustom && (
                              <span className="ml-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-600">
                                custom
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-slate-800 font-semibold">{ox.toFixed(1)}</td>
                          <td className="px-3 py-2 text-right font-mono text-slate-800 font-semibold">{oy.toFixed(1)}</td>
                          <td className="px-3 py-2 text-right font-mono text-slate-800 font-semibold">{sc.toFixed(2)}</td>
                          <td className="px-3 py-2">
                            <button
                              type="button"
                              onClick={() => handlePlaygroundReset(ctx, g)}
                              className="text-[10px] text-slate-400 hover:text-red-500 transition-colors"
                            >
                              ↺
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Quick copy */}
              <div className="flex gap-2">
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-lg border text-sm font-semibold bg-indigo-600 text-white border-indigo-600"
                  onClick={() => copyText(jsonText, 'JSON')}
                >
                  Copy Config JSON
                </button>
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-lg border text-sm"
                  onClick={downloadJson}
                >
                  ⬇ Download JSON
                </button>
              </div>
            </div>
          )}

          {/* ── TUNING TAB ── */}
          {activeTab === 'tuning' && (
            <>
              <div className="text-sm font-mono text-slate-600 bg-slate-100 rounded-lg px-3 py-2">
                avatarId: <span className="text-slate-900 font-bold">{safeAvatarId || '(none)'}</span>
              </div>

              {!!safeAvatarId && !noSplitEnabled && (
                <button
                  type="button"
                  className="px-3 py-2 rounded-lg border text-sm font-semibold bg-white hover:border-slate-400"
                  onClick={applyCurrentAsGlobalDefaults}
                >
                  Apply This Avatar As Global Defaults (boy+girl · all contexts)
                </button>
              )}

              {noSplitNum ? (
                <label className="flex items-center gap-2 text-sm bg-amber-50 rounded-lg px-3 py-2 border border-amber-200">
                  <input type="checkbox" checked={noSplitEnabled} onChange={toggleNoSplit} className="w-4 h-4" />
                  <span className="font-semibold">Single-person avatar #{noSplitNum}</span>
                  <span className="text-amber-700 text-xs">(do not split into boy/girl halves)</span>
                </label>
              ) : null}

              {/* Face crop section */}
              <div className="rounded-xl border p-3">
                {noSplitEnabled ? (
                  <>
                    <div className="font-bold text-sm mb-1">Per-Avatar Face Crop</div>
                    <p className="text-xs text-slate-500 mb-1">
                      This is a single-person avatar — global gender crops don't apply.
                      Set the face box here; it is saved per-avatar in localStorage and used for
                      ProfileIcon and inventory squares.
                    </p>
                    <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1 mb-3 border border-amber-200">
                      ℹ️ Tap top-left then bottom-right of the face on the preview to set automatically.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="font-bold text-sm mb-1">Global Face Crop Defaults</div>
                    <p className="text-xs text-slate-500 mb-3">
                      Normalized (0–1) within gendered image. Used for ProfileIcon head circle AND inventory face squares.
                      Tap top-left then bottom-right of face on the preview below.
                    </p>
                  </>
                )}

                {!noSplitEnabled && (
                  <div className="flex items-center gap-2 mb-3">
                    {(['boy', 'girl'] as Gender[]).map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => { setTapGender(g); setTapStart(null); }}
                        className={`px-3 py-1.5 rounded-lg border text-sm font-semibold ${
                          tapGender === g ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-300'
                        }`}
                      >
                        Tap: {g}
                      </button>
                    ))}
                    <div className="text-xs text-slate-500">
                      {tapStart ? '→ Now click bottom-right of face' : '→ Click top-left of face, then bottom-right'}
                    </div>
                  </div>
                )}

                {noSplitEnabled && (
                  <div className="text-xs text-slate-500 mb-2">
                    {tapStart ? '→ Now click bottom-right of face' : '→ Click top-left of face, then bottom-right'}
                  </div>
                )}

                {previewUrl ? (
                  <div className="rounded-xl border bg-slate-50 p-2 mb-3">
                    <img
                      src={previewUrl}
                      alt=""
                      onClick={handlePreviewClick}
                      className="block mx-auto max-h-[280px] w-auto max-w-full cursor-crosshair select-none"
                      draggable={false}
                    />
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 mb-3 bg-slate-100 rounded-lg p-3">
                    No preview image available for this avatar.
                  </div>
                )}

                {noSplitEnabled ? (
                  <div>
                    <div className="font-semibold text-sm mb-2">Face crop (this avatar only)</div>
                    <div className="grid grid-cols-4 gap-2">
                      {(['x', 'y', 'w', 'h'] as (keyof FaceCrop)[]).map((k) => (
                        <Field
                          key={k}
                          label={`face ${k}`}
                          value={getPerAvatarFaceCropValue(k, k === 'x' ? 0.3 : k === 'y' ? 0.05 : 0.35)}
                          onChange={(v) => setPerAvatarFaceCrop(k, v)}
                          min={k === 'w' || k === 'h' ? 0.05 : 0}
                          max={1}
                          step={0.01}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {(['boy', 'girl'] as Gender[]).map((g) => (
                      <div key={g}>
                        <div className="font-semibold text-sm mb-2 capitalize">{g}</div>
                        <div className="grid grid-cols-2 gap-2">
                          {(['x', 'y', 'w', 'h'] as (keyof FaceCrop)[]).map((k) => (
                            <Field
                              key={k}
                              label={`face ${k}`}
                              value={getGlobalFaceCropValue(g, k, k === 'x' ? 0.3 : k === 'y' ? 0.05 : 0.4)}
                              onChange={(v) => setGlobalFaceCrop(g, k, v)}
                              min={k === 'w' || k === 'h' ? 0.05 : 0}
                              max={1}
                              step={0.01}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Per-context body tuning — now includes profile_icon */}
              {ALL_CONTEXTS.map((ctx) => (
                <div key={ctx} className="rounded-xl border p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="font-bold text-sm">{ctx}</div>
                    {ctx === 'profile_icon' && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-600 font-semibold border border-indigo-200">
                        new · drag/wheel in Playground
                      </span>
                    )}
                  </div>
                  {ctx === 'inventory' && (
                    <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1 mb-2 border border-amber-200">
                      ℹ️ Inventory offsets shift the face crop window within the square tile.
                    </p>
                  )}
                  {ctx === 'profile_icon' && (
                    <p className="text-xs text-indigo-700 bg-indigo-50 rounded px-2 py-1 mb-2 border border-indigo-200">
                      ℹ️ Icon transform is applied to the avatar image inside the circle.
                      Use Playground tab to drag/scroll tune visually.
                    </p>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(['boy', 'girl'] as Gender[]).map((g) => {
                      const defaults = DEFAULT_OFFSETS[ctx](g);
                      return (
                        <div key={g}>
                          <div className="text-xs font-semibold text-slate-600 mb-2 capitalize">{g}</div>
                          <div className="grid grid-cols-3 gap-2">
                            <Field
                              label="offsetX%"
                              value={getValue(ctx, g, 'offsetXPercent', defaults.ox)}
                              onChange={(v) => setTuningValue(ctx, g, 'offsetXPercent', v)}
                              min={-50} max={50} step={0.5}
                            />
                            <Field
                              label="offsetY%"
                              value={getValue(ctx, g, 'offsetYPercent', defaults.oy)}
                              onChange={(v) => setTuningValue(ctx, g, 'offsetYPercent', v)}
                              min={-50} max={50} step={0.5}
                            />
                            <Field
                              label="scale"
                              value={getValue(ctx, g, 'scale', defaults.sc)}
                              onChange={(v) => setTuningValue(ctx, g, 'scale', v)}
                              min={0.5} max={5} step={0.01}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </>
          )}

          {/* ── AI PROMPT TAB ── */}
          {activeTab === 'prompt' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="font-bold text-sm">AI Alignment Prompt</div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Copy this and paste into your AI coder context to describe how to position this avatar.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-lg border text-sm font-semibold bg-indigo-600 text-white border-indigo-600"
                    onClick={() => copyText(promptText, 'Prompt')}
                  >
                    Copy Prompt
                  </button>
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-lg border text-sm"
                    onClick={() => selectTextarea('cc-tuner-prompt')}
                  >
                    Select All
                  </button>
                </div>
              </div>
              <textarea
                id="cc-tuner-prompt"
                readOnly
                value={promptText}
                className="w-full h-[400px] font-mono text-xs rounded-lg border bg-slate-50 p-3 resize-y"
              />
              <div className="mt-2 text-xs text-slate-500">
                <strong>Config JSON</strong> (paste into import tab or save to file):
              </div>
              <textarea
                id="cc-tuner-json"
                readOnly
                value={jsonText}
                className="mt-1 w-full h-[140px] font-mono text-xs rounded-lg border bg-slate-50 p-2"
              />
              <button
                type="button"
                className="mt-2 px-3 py-1.5 rounded-lg border text-sm"
                onClick={() => copyText(jsonText, 'JSON')}
              >
                Copy JSON
              </button>
            </div>
          )}

          {/* ── IMPORT TAB ── */}
          {activeTab === 'import' && (
            <div>
              <div className="font-bold text-sm mb-1">Import JSON Config</div>
              <p className="text-xs text-slate-500 mb-3">
                Paste a full config JSON here (e.g. exported via ⬇ JSON or Copy JSON). After applying,
                the modal will switch to the Tuning tab so you can verify the values immediately.
                All open inventory squares and profile cards update live — no page reload needed.
              </p>
              {importStatus && (
                <div className={`text-sm rounded-lg px-3 py-2 mb-3 border ${
                  importStatus.startsWith('✓')
                    ? 'text-green-700 bg-green-50 border-green-200'
                    : 'text-red-700 bg-red-50 border-red-200'
                }`}>
                  {importStatus}
                </div>
              )}
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder='Paste JSON config here e.g. {"version":1,"noSplitAvatarNumbers":[31,32],...}'
                className="w-full h-[300px] font-mono text-xs rounded-lg border bg-white p-3 resize-y"
              />
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold text-sm"
                  onClick={applyImportedJson}
                >
                  Apply Import
                </button>
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg border text-sm"
                  onClick={() => { setImportText(jsonText); setImportStatus('Loaded current config into box.'); }}
                >
                  Load Current
                </button>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                Writes to localStorage key: <code>cc_avatar_tuner_config_v4</code>
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Dev console helpers available:{' '}
                <code>copyAvatarAlignmentPrompt("avatar_20_name")</code>,{' '}
                <code>logAllAvatarAlignmentPrompts()</code>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Shared immutable merge helper ───────────────────────────────────────────

function mergeTuning(
  prev: AvatarTunerConfig,
  avatarId: string,
  ctx: AvatarTunerContext,
  gender: Gender,
  patch: AvatarTuning,
): AvatarTunerConfig {
  const next: AvatarTunerConfig = {
    ...prev,
    byAvatarId: { ...(prev.byAvatarId || {}) },
  };
  const byId = { ...(next.byAvatarId?.[avatarId] || {}) };
  const byCtx = { ...(byId[ctx] || {}) } as any;
  byCtx[gender] = { ...(byCtx[gender] || {}), ...patch };
  (byId as any)[ctx] = byCtx;
  next.byAvatarId![avatarId] = byId as any;
  return next;
}

// ─── Field Component ──────────────────────────────────────────────────────────

function Field({
  label,
  value,
  onChange,
  min,
  max,
  step,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-slate-500">{label}</span>
      <input
        type="number"
        className="px-2 py-1 rounded-lg border text-sm bg-white"
        value={String(value)}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}