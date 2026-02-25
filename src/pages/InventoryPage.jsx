import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Archive, Shirt, Image as ImageIcon, Search, Check, X, BookOpen, LayoutGrid, Sparkles, ShoppingBag } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useChemCityStore } from '../store/chemcityStore';
import ChemistryLoading from '../components/ChemistryLoading';
import { callChemCityEquipCosmetics } from '../lib/chemcity/cloudFunctions';
import { ProfileCard } from '../components/chemcity/gacha/ProfileCard';

const BG = '#f5f9f6';

const TABS = [
  { id: 'chemcards', label: 'ChemCards', Icon: Archive },
  { id: 'wardrobe', label: 'Wardrobe', Icon: Shirt },
  { id: 'background', label: 'Background', Icon: ImageIcon },
];

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-xl font-black transition-all active:scale-[0.99] ${active
        ? 'bg-lab-blue text-white'
        : 'bg-white border-2 border-slate-200 text-slate-800 hover:bg-slate-50'
        }`}
    >
      {children}
    </button>
  );
}

function RarityPill({ rarity }) {
  const cfg = {
    legendary: 'bg-amber-100 text-amber-800 border-amber-200',
    epic: 'bg-purple-100 text-purple-800 border-purple-200',
    rare: 'bg-blue-100 text-blue-800 border-blue-200',
    uncommon: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    common: 'bg-slate-100 text-slate-700 border-slate-200',
  }[rarity] || 'bg-slate-100 text-slate-700 border-slate-200';

  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-black border ${cfg}`}>{rarity}</span>
  );
}

function ProgressRing({ pct, size = 36 }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * Math.min(Math.max(Number(pct) || 0, 0) / 100, 1);
  return (
    <div className="relative" style={{ width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(148,163,184,0.35)" strokeWidth={4} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#76A8A5"
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
      </svg>

      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-[10px] font-black text-slate-700 tabular-nums">{pct}%</div>
      </div>
    </div>
  );
}

function ChemCardsPanel({ showAlbum }) {
  const user = useChemCityStore((s) => s.user);
  const slimItems = useChemCityStore((s) => s.slimItems);
  const places = useChemCityStore((s) => s.places);
  const collections = useChemCityStore((s) => s.collections);

  const [query, setQuery] = useState('');
  const [placeId, setPlaceId] = useState('all');
  const [expandedAlbum, setExpandedAlbum] = useState(() => new Set());

  const collectionsById = useMemo(() => new Map((collections || []).map((c) => [c.id, c])), [collections]);

  const owned = useMemo(() => {
    if (!user) return [];
    const ownedIds = new Set(user.ownedItems || []);
    return (slimItems || []).filter((it) => !it?.deprecated && ownedIds.has(it.id));
  }, [slimItems, user]);

  const ownedIds = useMemo(() => new Set(user?.ownedItems || []), [user?.ownedItems]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return owned.filter((it) => {
      if (placeId !== 'all' && it.placeId !== placeId) return false;
      if (!q) return true;
      const name = String(it.name || '').toLowerCase();
      const formula = String(it.chemicalFormula || '').toLowerCase();
      return name.includes(q) || formula.includes(q);
    });
  }, [owned, query, placeId]);

  const getPrimaryCollectionLabel = (item) => {
    const ids = Array.isArray(item?.collections) ? item.collections : [];
    const first = ids.find(Boolean);
    if (!first) return '';
    const doc = collectionsById.get(first);
    return String(doc?.displayName || first);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl shadow-xl border-2 border-slate-200 p-4">
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search size={16} className="text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search cards by name or formula..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border-2 border-slate-200 font-bold text-slate-800 focus:outline-none focus:border-lab-blue"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto">
            <button
              onClick={() => setPlaceId('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-black border-2 transition-all ${placeId === 'all' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
            >
              All
            </button>
            {(places || []).map((p) => (
              <button
                key={p.id}
                onClick={() => setPlaceId(p.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-black border-2 transition-all whitespace-nowrap ${placeId === p.id ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
              >
                {p.displayName}
              </button>
            ))}
          </div>
        </div>
      </div>

      {showAlbum ? (
        <div className="space-y-3">
          {(() => {
            const q = query.trim().toLowerCase();
            const matchesFilters = (it) => {
              if (!it || it.deprecated) return false;
              if (placeId !== 'all' && it.placeId !== placeId) return false;
              if (!q) return true;
              const name = String(it.name || '').toLowerCase();
              const formula = String(it.chemicalFormula || '').toLowerCase();
              return name.includes(q) || formula.includes(q);
            };

            const colEntries = (collections || []).map((col) => {
              const itemSlims = (Array.isArray(col?.itemIds) ? col.itemIds : [])
                .map((id) => (slimItems || []).find((x) => x?.id === id))
                .filter((x) => x && !x.deprecated);

              const items = itemSlims.filter(matchesFilters);
              const total = items.length;
              const collected = items.filter((it) => ownedIds.has(it.id)).length;
              const pct = total > 0 ? collected / total : 0;

              return {
                id: col?.id || col?.displayName || '',
                label: String(col?.displayName || col?.id || 'Collection'),
                items,
                collected,
                total,
                pct,
              };
            }).filter((e) => e.items.length > 0);

            const entries = colEntries
              .sort((a, b) => (b.pct - a.pct) || String(a.label).localeCompare(String(b.label)))
              .map((e) => [e.label, e]);

            if (entries.length === 0) {
              return <div className="text-center text-slate-500 font-bold py-10">No cards found.</div>;
            }

            return entries.map(([label, entry]) => {
              const expanded = expandedAlbum.has(label);
              const pct = entry.total > 0 ? Math.round((entry.collected / entry.total) * 100) : 0;
              return (
                <div key={label} className="bg-white rounded-2xl shadow-xl border-2 border-slate-200 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => {
                      setExpandedAlbum((prev) => {
                        const next = new Set(prev);
                        if (next.has(label)) next.delete(label);
                        else next.add(label);
                        return next;
                      });
                    }}
                    className="w-full px-4 py-3 text-left"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className="w-11 flex-shrink-0">
                          <ProgressRing pct={pct} size={36} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="font-black text-slate-900 truncate">{label}</div>
                          <div className="text-xs font-bold text-slate-500">{entry.collected}/{entry.total} collected</div>
                        </div>
                      </div>

                      <div className="text-slate-400 font-black flex-shrink-0">{expanded ? '−' : '+'}</div>
                    </div>

                    <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-lab-blue to-emerald-400"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </button>
                  {expanded && (
                    <div className="p-3 pt-0">
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mt-3">
                        {entry.items.map((it) => {
                          const isOwned = ownedIds.has(it.id);
                          return (
                            <div
                              key={it.id}
                              className="bg-white rounded-2xl shadow-lg border-2 border-slate-200 overflow-hidden"
                            >
                              <div className="aspect-square bg-slate-50 flex items-center justify-center overflow-hidden">
                                {!isOwned ? (
                                  <div className="w-full h-full flex items-center justify-center bg-slate-200">
                                    <div className="text-4xl font-black text-slate-500">?</div>
                                  </div>
                                ) : it.imageUrl ? (
                                  <img src={it.imageUrl} alt={it.name} className="w-full h-full object-cover" draggable={false} />
                                ) : (
                                  <div className="text-4xl">🧪</div>
                                )}
                              </div>
                              <div className="p-3">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <div className="font-black text-slate-900 text-sm truncate" title={it.name}>{it.name}</div>
                                    <div className="text-[11px] text-slate-500 font-bold truncate">{it.chemicalFormula}</div>
                                  </div>
                                  <RarityPill rarity={it.rarity} />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            });
          })()}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {filtered.map((it) => (
              <div key={it.id} className="bg-white rounded-2xl shadow-lg border-2 border-slate-200 overflow-hidden">
                <div className="aspect-square bg-slate-50 flex items-center justify-center overflow-hidden">
                  {it.imageUrl ? (
                    <img src={it.imageUrl} alt={it.name} className="w-full h-full object-cover" draggable={false} />
                  ) : (
                    <div className="text-4xl">🧪</div>
                  )}
                </div>
                <div className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-black text-slate-900 text-sm truncate" title={it.name}>{it.name}</div>
                      <div className="text-[11px] text-slate-500 font-bold truncate">{it.chemicalFormula}</div>
                    </div>
                    <RarityPill rarity={it.rarity} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center text-slate-500 font-bold py-10">No cards found.</div>
          )}
        </>
      )}
    </div>
  );
}

function CosmeticsGrid({ type, showAlbum }) {
  const cosmeticsMap = useChemCityStore((s) => (s).cosmeticsMap);
  const user = useChemCityStore((s) => s.user);
  const { currentUser, userProfile } = useAuth();

  const [equippingId, setEquippingId] = useState(null);
  const [previewId, setPreviewId] = useState(null);
  const [rarity, setRarity] = useState('all');
  const [expandedAlbum, setExpandedAlbum] = useState(() => new Set());

  const ownedSet = useMemo(() => new Set((user && user.ownedCosmetics) ? user.ownedCosmetics : []), [user]);
  const equipped = (user && user.equippedCosmetics) ? user.equippedCosmetics : {};

  const normalizedType = type === 'wardrobe' ? 'avatar' : type;

  const allOfType = useMemo(() => {
    const all = Array.from((cosmeticsMap && cosmeticsMap.values) ? cosmeticsMap.values() : []);
    return all
      .filter((c) => c && c.type === normalizedType)
      .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
  }, [cosmeticsMap, normalizedType]);

  const listRaw = useMemo(() => {
    return allOfType;
  }, [allOfType]);

  const rarityOptions = useMemo(() => {
    const order = ['legendary', 'epic', 'rare', 'uncommon', 'common'];
    const set = new Set(listRaw.map((c) => String(c?.rarity || '').toLowerCase()).filter(Boolean));
    return order.filter((r) => set.has(r));
  }, [listRaw]);

  const list = useMemo(() => {
    const base = rarity === 'all'
      ? listRaw
      : listRaw.filter((c) => String(c?.rarity || '').toLowerCase() === rarity);
    if (showAlbum && type === 'wardrobe') return base;
    return base.filter((c) => ownedSet.has(c.id));
  }, [listRaw, rarity, showAlbum, type, ownedSet]);

  useEffect(() => {
    setRarity('all');
  }, [type]);

  useEffect(() => {
    setExpandedAlbum(new Set());
  }, [type, showAlbum]);

  const rarityFx = (r) => {
    const key = String(r || '').toLowerCase();
    const cfg = {
      legendary: { border: '#f59e0b', glow: 'rgba(245,158,11,0.35)' },
      epic: { border: '#a855f7', glow: 'rgba(168,85,247,0.32)' },
      rare: { border: '#3b82f6', glow: 'rgba(59,130,246,0.30)' },
      uncommon: { border: '#10b981', glow: 'rgba(16,185,129,0.28)' },
      common: { border: '#94a3b8', glow: 'rgba(148,163,184,0.24)' },
    };
    return cfg[key] || { border: '#e2e8f0', glow: 'rgba(148,163,184,0.18)' };
  };

  const getCollectionLabel = (c) => {
    if (!c) return '';
    const anyC = c;
    const raw =
      anyC.collectionName ||
      anyC.collection ||
      anyC.setName ||
      anyC.set ||
      anyC.availability?.eventKey ||
      (Array.isArray(anyC.tags) ? anyC.tags[0] : '') ||
      '';
    return String(raw || '').trim();
  };

  const equippedId = type === 'wardrobe' ? equipped.avatarId : equipped.backgroundId;
  const effectivePreviewId = previewId || equippedId;

  const effectiveAvatarId = type === 'wardrobe' ? effectivePreviewId : equipped.avatarId;
  const effectiveBackgroundId = type === 'background' ? effectivePreviewId : equipped.backgroundId;

  const handleConfirm = async () => {
    if (!effectivePreviewId || equippingId || effectivePreviewId === equippedId) return;
    setEquippingId(effectivePreviewId);
    try {
      const patch = type === 'wardrobe' ? { avatarId: effectivePreviewId } : { backgroundId: effectivePreviewId };
      await callChemCityEquipCosmetics(patch);
      setPreviewId(null);
    } finally {
      setEquippingId(null);
    }
  };

  const previewItem = useMemo(() => {
    if (!effectivePreviewId) return null;
    const all = Array.from((cosmeticsMap && cosmeticsMap.values) ? cosmeticsMap.values() : []);
    return all.find((c) => c?.id === effectivePreviewId) || null;
  }, [cosmeticsMap, effectivePreviewId]);

  return (
      <div className="flex flex-col md:flex-row gap-4 h-[calc(100vh-200px)] md:h-[calc(100vh-140px)]">
        <div className="w-full md:w-[280px] flex-shrink-0 overflow-y-auto pr-2">
          <div className="bg-white rounded-2xl shadow-xl border-2 border-slate-200 overflow-hidden p-4 space-y-3">
            <div className="flex items-center justify-center">
              <ProfileCard
                size="xl"
                displayName={userProfile?.displayName || currentUser?.displayName || ''}
                gender={userProfile?.gender || 'boy'}
                cosmeticsMap={cosmeticsMap || undefined}
                avatarId={effectiveAvatarId}
                backgroundId={effectiveBackgroundId}
                style={{ borderRadius: 18, boxShadow: '0 6px 28px rgba(118,168,165,0.25)', width: '100%', height: 'auto', aspectRatio: '4/5.5', maxWidth: 220 }}
              />
            </div>
            <div className="font-black text-slate-900 truncate">
              {previewItem?.name || 'Select an item to preview'}
            </div>
            <div className="text-[11px] font-bold text-slate-500 capitalize">
              {previewItem
                ? (getCollectionLabel(previewItem) || (type === 'wardrobe' ? 'Wardrobe' : 'Background'))
                : 'Tap an item on the right'}
            </div>
            {previewId && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewId(null)}
                  className="px-3 py-2 rounded-xl font-black border-2 border-slate-200 text-slate-700 bg-white hover:bg-slate-50"
                  disabled={!!equippingId}
                  title="Cancel preview"
                >
                  <span className="inline-flex items-center justify-center gap-2">
                    <X size={16} />
                    Cancel
                  </span>
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="px-3 py-2 rounded-xl font-black bg-lab-blue text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!previewItem || effectivePreviewId === equippedId || !!equippingId}
                  title="Confirm equip"
                >
                  <span className="inline-flex items-center justify-center gap-2">
                    <Check size={16} />
                    Confirm
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>

      <div className="flex-1 overflow-y-auto pl-2">
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setRarity('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-black border-2 transition-all ${rarity === 'all' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
          >
            All
          </button>
          {rarityOptions.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRarity(r)}
              className={`px-3 py-1.5 rounded-full text-xs font-black border-2 transition-all capitalize ${rarity === r ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
            >
              {r}
            </button>
          ))}
        </div>

        {showAlbum && type === 'wardrobe' ? (
          <div className="space-y-3 mt-3">
            {(() => {
              const groups = new Map();
              for (const c of list) {
                const k = getCollectionLabel(c) || 'Collection';
                if (!groups.has(k)) groups.set(k, []);
                groups.get(k).push(c);
              }
              const entries = Array.from(groups.entries())
                .map(([label, items]) => {
                  const total = items.length;
                  const collected = items.filter((x) => ownedSet.has(x.id)).length;
                  const pct = total > 0 ? collected / total : 0;
                  return { label, items, collected, total, pct };
                })
                .sort((a, b) => (b.pct - a.pct) || String(a.label).localeCompare(String(b.label)));
              if (entries.length === 0) {
                return <div className="text-center text-slate-500 font-bold py-10">No items yet.</div>;
              }

              return entries.map(({ label, items, collected, total, pct }) => {
                const expanded = expandedAlbum.has(label);
                const pctDisplay = total > 0 ? Math.round((collected / total) * 100) : 0;
                return (
                  <div key={label} className="bg-white rounded-2xl shadow-lg border-2 border-slate-200 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => {
                        setExpandedAlbum((prev) => {
                          const next = new Set(prev);
                          if (next.has(label)) next.delete(label);
                          else next.add(label);
                          return next;
                        });
                      }}
                      className="w-full px-4 py-3 text-left"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <div className="w-11 flex-shrink-0">
                            <ProgressRing pct={pctDisplay} size={36} />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="font-black text-slate-900 truncate">{label}</div>
                            <div className="text-xs font-bold text-slate-500">{collected}/{total} collected</div>
                          </div>
                        </div>

                        <div className="text-slate-400 font-black flex-shrink-0">{expanded ? '−' : '+'}</div>
                      </div>

                      <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-lab-blue to-emerald-400"
                          style={{ width: `${pctDisplay}%` }}
                        />
                      </div>
                    </button>
                    {expanded && (
                      <div className="p-3 pt-0">
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mt-3">
                          {items.map((c) => {
                            const isEquipped = equippedId === c.id;
                            const isPreview = effectivePreviewId === c.id;
                            const isOwned = ownedSet.has(c.id);
                            const src = type === 'wardrobe'
                              ? (c.imageUrl || c.imageUrlBoy || c.imageUrlGirl)
                              : (c.imageUrl);
                            const fx = rarityFx(c.rarity);
                            return (
                              <button
                                key={c.id}
                                onClick={() => { if (isOwned) setPreviewId(c.id); }}
                                className={`relative bg-white rounded-2xl shadow-lg border-2 overflow-hidden text-left transition-all active:scale-[0.99] ${isPreview ? 'border-slate-900' : isEquipped ? 'border-lab-blue' : 'hover:bg-slate-50'}`}
                                style={{
                                  borderColor: isPreview ? '#0f172a' : isEquipped ? undefined : fx.border,
                                  boxShadow: isEquipped
                                    ? undefined
                                    : `0 10px 24px -16px ${fx.glow}`,
                                }}
                                disabled={!!equippingId || !isOwned}
                              >
                                <div className="aspect-square bg-slate-50 overflow-hidden flex items-center justify-center">
                                  {!isOwned ? (
                                    <div className="w-full h-full flex items-center justify-center bg-slate-200">
                                      <div className="text-4xl font-black text-slate-500">?</div>
                                    </div>
                                  ) : src ? (
                                    <img src={src} alt={c.name} className="w-full h-full object-cover" draggable={false} />
                                  ) : (
                                    <div className="text-3xl">🎁</div>
                                  )}
                                </div>
                                <div className="p-3">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <div className="font-black text-slate-900 text-sm truncate" title={c.name}>{c.name}</div>
                                      <div className="text-[11px] text-slate-500 font-bold capitalize">{getCollectionLabel(c) || (type === 'wardrobe' ? 'Wardrobe' : 'Background')}</div>
                                    </div>
                                  </div>
                                </div>
                                {isEquipped && (
                                  <div className="absolute top-2 left-2 bg-lab-blue text-white text-[10px] font-black px-2 py-1 rounded-full">Equipped</div>
                                )}
                                <div className="absolute top-2 right-2">
                                  <RarityPill rarity={String(c.rarity || '').toLowerCase()} />
                                </div>
                                {equippingId === c.id && (
                                  <div className="absolute inset-0 bg-white/65 flex items-center justify-center font-black text-slate-700">Loading…</div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mt-3">
          {list.map((c) => {
            const isEquipped = equippedId === c.id;
            const isPreview = effectivePreviewId === c.id;
            const src = type === 'wardrobe'
              ? (c.imageUrl || c.imageUrlBoy || c.imageUrlGirl)
              : (c.imageUrl);
            const fx = rarityFx(c.rarity);

            return (
              <button
                key={c.id}
                onClick={() => setPreviewId(c.id)}
                className={`relative bg-white rounded-2xl shadow-lg border-2 overflow-hidden text-left transition-all active:scale-[0.99] ${isPreview ? 'border-slate-900' : isEquipped ? 'border-lab-blue' : 'hover:bg-slate-50'}`}
                style={{
                  borderColor: isPreview ? '#0f172a' : isEquipped ? undefined : fx.border,
                  boxShadow: isEquipped
                    ? undefined
                    : `0 10px 24px -16px ${fx.glow}`,
                }}
                disabled={!!equippingId}
              >
                <div className="aspect-square bg-slate-50 overflow-hidden flex items-center justify-center">
                  {src ? (
                    <img src={src} alt={c.name} className="w-full h-full object-cover" draggable={false} />
                  ) : (
                    <div className="text-3xl">🎁</div>
                  )}
                </div>
                <div className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-black text-slate-900 text-sm truncate" title={c.name}>{c.name}</div>
                      <div className="text-[11px] text-slate-500 font-bold capitalize">{getCollectionLabel(c) || (type === 'wardrobe' ? 'Wardrobe' : 'Background')}</div>
                    </div>
                  </div>
                </div>
                {isEquipped && (
                  <div className="absolute top-2 left-2 bg-lab-blue text-white text-[10px] font-black px-2 py-1 rounded-full">Equipped</div>
                )}
                <div className="absolute top-2 right-2">
                  <RarityPill rarity={String(c.rarity || '').toLowerCase()} />
                </div>
                {equippingId === c.id && (
                  <div className="absolute inset-0 bg-white/65 flex items-center justify-center font-black text-slate-700">Loading…</div>
                )}
              </button>
            );
          })}

          {list.length === 0 && (
            <div className="col-span-full text-center text-slate-500 font-bold py-10">No items yet.</div>
          )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function InventoryPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isLoading = useChemCityStore((s) => s.isLoading);
  const error = useChemCityStore((s) => s.error);
  const user = useChemCityStore((s) => s.user);
  const loadAll = useChemCityStore((s) => s.loadAll);
  const teardown = useChemCityStore((s) => s.teardown);
  const loadGachaStatic = useChemCityStore((s) => s.loadGachaStatic);

  const initialTab = useMemo(() => {
    const st = location?.state;
    const t = st?.tab;
    if (t === 'avatar') return 'wardrobe';
    if (t === 'wardrobe' || t === 'background' || t === 'chemcards') return t;
    return 'chemcards';
  }, [location?.state]);

  const [tab, setTab] = useState(initialTab);
  const [albumByTab, setAlbumByTab] = useState(() => ({ chemcards: false, wardrobe: false }));

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  const isAlbumSupported = tab === 'chemcards' || tab === 'wardrobe';
  const showAlbum = tab === 'chemcards'
    ? albumByTab.chemcards
    : tab === 'wardrobe'
      ? albumByTab.wardrobe
      : false;

  const showGachaButton = tab === 'wardrobe' || tab === 'background';
  const showChemStoreButton = tab === 'chemcards';

  const toggleAlbum = () => {
    if (!isAlbumSupported) return;
    setAlbumByTab((prev) => {
      const next = { ...prev };
      if (tab === 'chemcards') next.chemcards = !prev.chemcards;
      if (tab === 'wardrobe') next.wardrobe = !prev.wardrobe;
      return next;
    });
  };

  useEffect(() => {
    if (!currentUser?.uid) return;
    loadAll(currentUser.uid);
    loadGachaStatic();
    return () => {
      teardown();
    };
  }, [currentUser?.uid, loadAll, loadGachaStatic, teardown]);

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: BG }}>
        <div className="bg-white rounded-2xl shadow-2xl border-2 border-slate-200 p-6 text-center">
          <div className="font-black text-slate-900">Please sign in</div>
        </div>
      </div>
    );
  }

  if (isLoading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: BG }}>
        <ChemistryLoading persistKey="inventory" className="text-center" textOverride="Loading Inventory..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: BG }}>
        <div className="bg-white rounded-2xl shadow-2xl border-2 border-red-200 p-6 text-center max-w-md w-full">
          <div className="font-black text-red-600">{error}</div>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 rounded-xl font-black bg-slate-900 text-white"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: BG }}>
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-3 bg-white rounded-xl border-2 border-slate-200 hover:bg-slate-50 transition-all active:scale-[0.99]"
            aria-label="Back"
            title="Back"
          >
            <ArrowLeft size={18} className="text-slate-700" />
          </button>
          <div className="flex-1 bg-white rounded-2xl shadow-xl border-2 border-slate-200 p-4">
            <div className="font-black text-slate-900 text-xl">Inventory</div>
            <div className="text-xs font-bold text-slate-500">ChemCards · Wardrobe · Background</div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex gap-2 flex-wrap">
            {TABS.map((x) => (
              <TabButton key={x.id} active={tab === x.id} onClick={() => setTab(x.id)}>
                <span className="inline-flex items-center gap-2">
                  <x.Icon size={16} />
                  {x.label}
                </span>
              </TabButton>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {showChemStoreButton && (
              <button
                type="button"
                onClick={() => navigate('/store')}
                className="px-4 py-2 rounded-xl font-black transition-all active:scale-[0.99] bg-white border-2 border-slate-200 text-slate-800 hover:bg-slate-50"
                title="Open ChemStore"
              >
                <span className="inline-flex items-center gap-2">
                  <ShoppingBag size={16} />
                  ChemStore
                </span>
              </button>
            )}

            {showGachaButton && (
              <button
                type="button"
                onClick={() => navigate('/gacha')}
                className="px-4 py-2 rounded-xl font-black transition-all active:scale-[0.99] bg-white border-2 border-slate-200 text-slate-800 hover:bg-slate-50"
                title="Open Gacha"
              >
                <span className="inline-flex items-center gap-2">
                  <Sparkles size={16} />
                  Gacha
                </span>
              </button>
            )}

            {isAlbumSupported && (
              <button
                type="button"
                onClick={toggleAlbum}
                className="px-4 py-2 rounded-xl font-black transition-all active:scale-[0.99] bg-white border-2 border-slate-200 text-slate-800 hover:bg-slate-50"
                title={showAlbum ? 'Show grid' : 'Show collection album'}
              >
                <span className="inline-flex items-center gap-2">
                  {showAlbum ? <LayoutGrid size={16} /> : <BookOpen size={16} />}
                  {showAlbum ? 'Grid View' : 'Collection Album'}
                </span>
              </button>
            )}
          </div>
        </div>

        {tab === 'chemcards' && <ChemCardsPanel showAlbum={showAlbum} />}
        {tab === 'wardrobe' && <CosmeticsGrid type="wardrobe" showAlbum={showAlbum} />}
        {tab === 'background' && <CosmeticsGrid type="background" showAlbum={false} />}
      </div>
    </div>
  );
}
