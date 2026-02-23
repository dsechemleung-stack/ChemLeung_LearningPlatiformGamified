import React, { useCallback, useMemo, useState } from 'react';
import { X, BookOpen, ChevronDown, ChevronRight, Coins, Gem, Award, CheckCircle, Circle } from 'lucide-react';
import { useChemCityStore } from '../../store/chemcityStore';
import type { CollectionDocument } from '../../lib/chemcity/types';

function needsAnonymousCrossOrigin(url?: string | null): boolean {
  if (!url) return false;
  const u = url.toLowerCase();
  return u.includes('drive.google.com') || u.includes('googleusercontent.com');
}

// ─── Progress Ring SVG ────────────────────────────────────────
const ProgressRing: React.FC<{ pct: number; size: number; completed: boolean }> = ({ pct, size, completed }) => {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * Math.min(pct / 100, 1);
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={4} />
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke={completed ? '#4ade80' : '#76A8A5'}
        strokeWidth={4} strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
    </svg>
  );
};

// ─── Rarity pill ──────────────────────────────────────────────
const RARITY_DOT: Record<string, string> = {
  common: '#94a3b8', uncommon: '#34d399', rare: '#60a5fa', epic: '#a855f7', legendary: '#fbbf24',
};

// ─── Single Collection Card ───────────────────────────────────
interface CollectionCardProps {
  collection: CollectionDocument;
  collected: number;
  total: number;
  completed: boolean;
  rewardClaimed: boolean;
  ownedItemIds: Set<string>;
  onClaim: (id: string) => void;
  isClaiming: boolean;
}

const CollectionCard: React.FC<CollectionCardProps> = ({
  collection, collected, total, completed, rewardClaimed, ownedItemIds, onClaim, isClaiming,
}) => {
  const [expanded, setExpanded] = useState(false);
  const slimItems = useChemCityStore(s => s.slimItems);
  const pct = total > 0 ? Math.round((collected / total) * 100) : 0;

  const itemSlims = useMemo(() =>
    collection.itemIds.map(id => slimItems.find(i => i.id === id)).filter(Boolean) as typeof slimItems,
  [collection.itemIds, slimItems]);

  return (
    <div style={{
      borderRadius: 16,
      border: `1.5px solid ${completed ? 'rgba(74,222,128,0.4)' : 'rgba(197,215,181,0.12)'}`,
      background: completed
        ? 'linear-gradient(135deg, rgba(74,222,128,0.06) 0%, rgba(8,20,19,0.95) 100%)'
        : 'rgba(255,255,255,0.03)',
      overflow: 'hidden',
      transition: 'border-color 0.3s ease',
      fontFamily: "'Quicksand',sans-serif",
    }}>
      {/* Header row */}
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        style={{
          width: '100%', padding: '14px 16px', background: 'transparent',
          border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left',
        }}
      >
        {/* Progress ring */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <ProgressRing pct={pct} size={52} completed={completed} />
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
          }}>
            {completed ? (
              <CheckCircle size={16} color="#4ade80" />
            ) : (
              <span style={{ color: '#fff', fontSize: 11, fontWeight: 800 }}>{pct}%</span>
            )}
          </div>
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ color: '#fff', fontWeight: 800, fontSize: 14 }}>{collection.displayName}</span>
            {completed && <span style={{
              background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.4)',
              borderRadius: 20, padding: '1px 8px', fontSize: 9, fontWeight: 800, color: '#4ade80',
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>Complete</span>}
          </div>
          <p style={{ color: 'rgba(197,215,181,0.5)', fontSize: 11, margin: '2px 0 0', lineHeight: 1.4 }}>
            {collection.description}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 2,
                background: completed ? '#4ade80' : 'linear-gradient(90deg, #76A8A5, #C5D7B5)',
                width: `${pct}%`, transition: 'width 0.6s ease',
              }} />
            </div>
            <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
              {collected}/{total}
            </span>
          </div>
        </div>

        {/* Rewards + expand */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
          {(collection.rewardCoins || collection.rewardDiamonds) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-end' }}>
              {collection.rewardCoins && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Coins size={11} color="#fbbf24" />
                  <span style={{ color: '#fbbf24', fontWeight: 800, fontSize: 11 }}>{collection.rewardCoins.toLocaleString()}</span>
                </div>
              )}
              {collection.rewardDiamonds && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Gem size={11} color="#67e8f9" />
                  <span style={{ color: '#67e8f9', fontWeight: 800, fontSize: 11 }}>{collection.rewardDiamonds}</span>
                </div>
              )}
            </div>
          )}
          {expanded ? <ChevronDown size={14} color="#64748b" /> : <ChevronRight size={14} color="#64748b" />}
        </div>
      </button>

      {/* Claim button */}
      {completed && !rewardClaimed && (
        <div style={{ padding: '0 16px 12px' }}>
          <button onClick={() => onClaim(collection.id)} disabled={isClaiming} style={{
            width: '100%', padding: '10px',
            background: isClaiming ? 'rgba(74,222,128,0.1)' : 'linear-gradient(135deg, rgba(74,222,128,0.25), rgba(52,211,153,0.15))',
            border: '1.5px solid rgba(74,222,128,0.5)', borderRadius: 10,
            color: '#4ade80', fontWeight: 800, fontSize: 13, cursor: isClaiming ? 'not-allowed' : 'pointer',
            fontFamily: "'Quicksand',sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'all 0.2s',
          }}>
            <Award size={15} />
            {isClaiming ? 'Claiming...' : 'Claim Reward'}
          </button>
        </div>
      )}
      {rewardClaimed && (
        <div style={{ padding: '0 16px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px',
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10 }}>
            <CheckCircle size={13} color="rgba(255,255,255,0.3)" />
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: 700, fontFamily: "'Quicksand',sans-serif" }}>Reward claimed</span>
          </div>
        </div>
      )}

      {/* Expanded: card thumbnails */}
      {expanded && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', padding: '14px 16px 16px', background: 'rgba(0,0,0,0.2)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, 56px)', gap: 8 }}>
            {itemSlims.map(item => {
              const owned = ownedItemIds.has(item.id);
              return (
                <div key={item.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: 10,
                    border: `2px solid ${owned ? RARITY_DOT[item.rarity] ?? '#94a3b8' : 'rgba(255,255,255,0.1)'}`,
                    background: owned ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    overflow: 'hidden',
                    filter: owned ? 'none' : 'grayscale(1) opacity(0.35)',
                    boxShadow: owned ? `0 0 8px ${RARITY_DOT[item.rarity] ?? '#94a3b8'}44` : 'none',
                    transition: 'all 0.2s',
                  }}>
                    {!owned ? (
                      <span style={{ fontSize: 22, fontWeight: 900, color: 'rgba(255,255,255,0.25)' }}>-</span>
                    ) : item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        loading="lazy"
                        {...(needsAnonymousCrossOrigin(item.imageUrl)
                          ? { crossOrigin: 'anonymous' as const, referrerPolicy: 'no-referrer' as const }
                          : {})}
                        onError={e => { (e.target as HTMLImageElement).style.display='none'; }}
                      />
                    ) : (
                      <span style={{ fontSize: 22 }}>{item.emoji}</span>
                    )}
                  </div>
                  <span style={{
                    fontSize: 8, fontWeight: 700, color: owned ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.2)',
                    textAlign: 'center', lineHeight: 1.2, maxWidth: 52,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    fontFamily: "'Quicksand',sans-serif",
                  }}>{item.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────
type FilterState = 'all' | 'complete' | 'incomplete';

export const CollectionsAlbum: React.FC = () => {
  const user       = useChemCityStore(s => s.user);
  const progress   = useChemCityStore(s => s.progress);
  const collections = useChemCityStore(s => s.collections);
  const claimCollectionReward = useChemCityStore(s => s.claimCollectionReward);

  const [claimingId, setClaimingId]   = useState<string | null>(null);
  const [claimError, setClaimError]   = useState<string | null>(null);
  const [filter, setFilter]           = useState<FilterState>('all');

  const ownedItemIds = useMemo(() => new Set(user?.ownedItems ?? []), [user?.ownedItems]);

  const liveProgress = useMemo(() => {
    const map: Record<string, { collected: number; total: number }> = {};
    for (const col of collections) {
      map[col.id] = {
        total: col.itemIds.length,
        collected: col.itemIds.filter((id: string) => ownedItemIds.has(id)).length,
      };
    }
    return map;
  }, [collections, ownedItemIds]);

  const enriched = useMemo(() =>
    collections.map((col: CollectionDocument) => {
      const live = liveProgress[col.id] ?? { collected: 0, total: col.itemIds.length };
      const completed = live.collected === live.total && live.total > 0;
      const rewardClaimed = progress?.collections?.[col.id]?.rewardClaimed ?? false;
      return { collection: col, ...live, completed, rewardClaimed };
    }),
  [collections, liveProgress, progress]);

  const filtered = useMemo(() => {
    if (filter === 'complete') return enriched.filter(e => e.completed);
    if (filter === 'incomplete') return enriched.filter(e => !e.completed);
    return enriched;
  }, [enriched, filter]);

  const totalComplete   = enriched.filter(e => e.completed).length;
  const totalCollections = enriched.length;
  const overallPct      = totalCollections > 0 ? Math.round((totalComplete / totalCollections) * 100) : 0;

  const handleClaim = useCallback(async (collectionId: string) => {
    if (claimingId) return;
    setClaimingId(collectionId);
    setClaimError(null);
    try { await claimCollectionReward(collectionId); }
    catch (err: any) { setClaimError(err?.message ?? 'Failed to claim reward.'); }
    finally { setClaimingId(null); }
  }, [claimingId, claimCollectionReward]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Pacifico&family=Quicksand:wght@500;600;700;800&display=swap');
        @keyframes albumIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        .album-content { animation: albumIn 0.25s ease forwards; }
      `}</style>

      <div className="album-content" style={{ display: 'flex', flexDirection: 'column', paddingTop: 76, flex: 1, minHeight: 0, fontFamily: "'Quicksand',sans-serif" }}>

        {/* ── Album Header ── */}
        <div style={{
          padding: '16px 20px 14px',
          borderBottom: '1px solid rgba(197,215,181,0.1)',
          background: 'linear-gradient(135deg, rgba(118,168,165,0.1) 0%, transparent 80%)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <div style={{
              background: 'linear-gradient(135deg,rgba(118,168,165,0.3),rgba(118,168,165,0.1))',
              border: '1.5px solid rgba(118,168,165,0.5)',
              borderRadius: 12, width: 46, height: 46,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <BookOpen size={22} color="#76A8A5" />
            </div>
            <div>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: 18 }}>Collections Album</div>
              <div style={{ color: 'rgba(197,215,181,0.5)', fontSize: 12, fontWeight: 600 }}>
                {totalComplete}/{totalCollections} complete · {overallPct}%
              </div>
            </div>
          </div>

          {/* Overall progress bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 3,
                background: overallPct === 100 ? '#4ade80' : 'linear-gradient(90deg, #76A8A5, #C5D7B5)',
                width: `${overallPct}%`, transition: 'width 0.8s ease',
              }} />
            </div>
            {overallPct === 100 && <CheckCircle size={16} color="#4ade80" />}
          </div>

          {/* Filter tabs */}
          <div style={{ display: 'flex', gap: 6 }}>
            {(['all', 'complete', 'incomplete'] as FilterState[]).map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding: '6px 14px', borderRadius: 20,
                border: `1.5px solid ${filter === f ? 'rgba(118,168,165,0.5)' : 'rgba(255,255,255,0.1)'}`,
                background: filter === f ? 'rgba(118,168,165,0.18)' : 'transparent',
                color: filter === f ? '#C5D7B5' : 'rgba(255,255,255,0.4)',
                fontWeight: 800, fontSize: 11, cursor: 'pointer', fontFamily: "'Quicksand',sans-serif",
                textTransform: 'capitalize', transition: 'all 0.2s',
              }}>{f}</button>
            ))}
          </div>
        </div>

        {/* ── Collection List ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {claimError && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '10px 14px' }}>
              <p style={{ color: '#f87171', fontSize: 12, margin: 0, fontFamily: "'Quicksand',sans-serif" }}>{claimError}</p>
            </div>
          )}
          {filtered.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 12 }}>
              <BookOpen size={44} color="rgba(255,255,255,0.1)" />
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, fontWeight: 600, margin: 0 }}>No collections found</p>
            </div>
          ) : (
            filtered.map(entry => (
              <CollectionCard
                key={entry.collection.id}
                collection={entry.collection}
                collected={entry.collected}
                total={entry.total}
                completed={entry.completed}
                rewardClaimed={entry.rewardClaimed}
                ownedItemIds={ownedItemIds}
                onClaim={handleClaim}
                isClaiming={claimingId === entry.collection.id}
              />
            ))
          )}
        </div>
      </div>
    </>
  );
};