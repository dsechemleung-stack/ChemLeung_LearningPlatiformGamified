import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { updateProfile } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import {
  User, GraduationCap, Mail, Calendar, Save, ArrowLeft,
  Trophy, Target, BookOpen, Lock, Unlock, Palette, Shirt,
  ChevronRight, Check,
} from 'lucide-react';
import { useQuizData } from '../hooks/useQuizData';
import { ProfileCard } from '../components/chemcity/gacha/ProfileCard';
import { getCosmeticsMap } from '../lib/chemcity/gachaStaticCache';
import { useChemCityStore } from '../store/chemcityStore';
import { callChemCityEquipCosmetics } from '../lib/chemcity/cloudFunctions';

const SHEET_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vTK36yaUN-NMCkQNT-DAHgc6FMZPjUc0Yv3nYEK4TA9W2qE9V1TqVD10Tq98-wXQoAvKOZlwGWRSDkU/pub?gid=1182550140&single=true&output=csv';

// ── Palette ──────────────────────────────────────────────────────────────────
const P = {
  bg: '#f5f9f6',
  cardBg: '#ffffff',
  sage: '#C5D7B5',
  sageDark: '#a8c494',
  teal: '#76A8A5',
  tealDark: '#5d9794',
  tealLight: 'rgba(118,168,165,0.12)',
  border: 'rgba(118,168,165,0.25)',
  text: '#2d4a3e',
  textMuted: '#7a9e96',
  accent: '#76A8A5',
};

// ── Rarity colours ────────────────────────────────────────────────────────────
const RARITY_BORDER = {
  legendary: '#fbbf24',
  epic: '#a855f7',
  rare: '#60a5fa',
  uncommon: '#34d399',
  common: '#94a3b8',
};

// ── Mini Avatar Square ────────────────────────────────────────────────────────
function MiniAvatarSquare({ cosmetic, gender, isEquipped, onClick }) {
  const key = gender === 'girl' ? 'imageUrlGirl' : 'imageUrlBoy';
  const src = cosmetic?.[key] || cosmetic?.imageUrl;

  return (
    <button
      onClick={onClick}
      style={{
        position: 'relative',
        width: '100%',
        paddingBottom: '100%',
        borderRadius: 10,
        border: `2px solid ${isEquipped ? P.teal : P.border}`,
        background: isEquipped ? P.tealLight : 'rgba(245,249,246,0.8)',
        cursor: 'pointer',
        overflow: 'hidden',
        transition: 'all 0.15s ease',
        boxShadow: isEquipped ? `0 0 0 2px rgba(118,168,165,0.3)` : 'none',
      }}
    >
      <div style={{ position: 'absolute', inset: 0 }}>
        {src ? (
          <img
            src={src}
            alt={cosmetic?.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
            draggable={false}
          />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, color: P.teal, opacity: 0.5,
          }}>👤</div>
        )}
        {isEquipped && (
          <div style={{
            position: 'absolute', top: 3, right: 3,
            width: 14, height: 14, borderRadius: '50%',
            background: P.teal,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Check size={8} color="#fff" />
          </div>
        )}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 3,
          background: RARITY_BORDER[cosmetic?.rarity] || P.border,
        }} />
      </div>
    </button>
  );
}

// ── Mini Background Square ────────────────────────────────────────────────────
function MiniBgSquare({ cosmetic, isEquipped, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        position: 'relative',
        width: '100%',
        paddingBottom: '62%',
        borderRadius: 10,
        border: `2px solid ${isEquipped ? P.teal : P.border}`,
        background: '#e8f0eb',
        cursor: 'pointer',
        overflow: 'hidden',
        transition: 'all 0.15s ease',
        boxShadow: isEquipped ? `0 0 0 2px rgba(118,168,165,0.3)` : 'none',
      }}
    >
      <div style={{ position: 'absolute', inset: 0 }}>
        {cosmetic?.imageUrl ? (
          <img
            src={cosmetic.imageUrl}
            alt={cosmetic.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            draggable={false}
          />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, opacity: 0.4,
          }}>🖼</div>
        )}
        {isEquipped && (
          <div style={{
            position: 'absolute', top: 3, right: 3,
            width: 14, height: 14, borderRadius: '50%',
            background: P.teal,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Check size={8} color="#fff" />
          </div>
        )}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 3,
          background: RARITY_BORDER[cosmetic?.rarity] || P.border,
        }} />
      </div>
    </button>
  );
}

// ── Wardrobe Panel ────────────────────────────────────────────────────────────
function WardrobePanel({ cosmeticsMap, userProfile, gender, displayName, equippedAvatarId, equippedBackgroundId, navigate }) {
  const [equipping, setEquipping] = useState(null);
  const [activeTab, setActiveTab] = useState('avatars');
  const [preview, setPreview] = useState({ avatarId: null, backgroundId: null });

  const ownedCosmetics = Array.isArray(userProfile?.chemcity?.ownedCosmetics)
    ? userProfile.chemcity.ownedCosmetics.map(String)
    : [];
  const ownedSet = new Set(ownedCosmetics);

  const allCosmetics = cosmeticsMap ? Array.from(cosmeticsMap.values()) : [];

  const ownedAvatars = useMemo(() =>
    allCosmetics.filter(c => c?.type === 'avatar' && !c?.deprecated && ownedSet.has(c.id)),
    [allCosmetics, ownedSet.size],
  );

  const ownedBgs = useMemo(() =>
    allCosmetics.filter(c => c?.type === 'background' && !c?.deprecated && ownedSet.has(c.id)),
    [allCosmetics, ownedSet.size],
  );

  const effectiveAvatarId = preview.avatarId || equippedAvatarId;
  const effectiveBackgroundId = preview.backgroundId || equippedBackgroundId;
  const hasPending = (preview.avatarId && preview.avatarId !== equippedAvatarId)
    || (preview.backgroundId && preview.backgroundId !== equippedBackgroundId);

  async function handleConfirm() {
    if (equipping || !hasPending) return;
    setEquipping('confirm');
    try {
      const patch = {};
      if (preview.avatarId && preview.avatarId !== equippedAvatarId) patch.avatarId = preview.avatarId;
      if (preview.backgroundId && preview.backgroundId !== equippedBackgroundId) patch.backgroundId = preview.backgroundId;
      await callChemCityEquipCosmetics(patch);
      setPreview({ avatarId: null, backgroundId: null });
    } finally {
      setEquipping(null);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Preview Card */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
        <ProfileCard
          size="md"
          displayName={displayName}
          gender={gender}
          cosmeticsMap={cosmeticsMap || undefined}
          avatarId={effectiveAvatarId}
          backgroundId={effectiveBackgroundId}
          style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(118,168,165,0.2)' }}
        />
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          onClick={() => setPreview({ avatarId: null, backgroundId: null })}
          disabled={!!equipping}
          style={{
            flex: 1,
            padding: '9px 10px',
            borderRadius: 10,
            border: `1.5px solid ${P.border}`,
            background: 'rgba(245,249,246,0.8)',
            color: P.text,
            fontFamily: "'Quicksand',sans-serif",
            fontWeight: 800,
            fontSize: 12,
            cursor: equipping ? 'not-allowed' : 'pointer',
          }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!hasPending || !!equipping}
          style={{
            flex: 1,
            padding: '9px 10px',
            borderRadius: 10,
            border: !hasPending || equipping ? `1.5px solid ${P.border}` : 'none',
            background: !hasPending || equipping ? 'rgba(15,23,42,0.08)' : `linear-gradient(135deg, ${P.teal}, #5d9794)`,
            color: !hasPending || equipping ? P.text : '#fff',
            fontFamily: "'Quicksand',sans-serif",
            fontWeight: 900,
            fontSize: 12,
            cursor: !hasPending || equipping ? 'not-allowed' : 'pointer',
          }}
        >
          Confirm
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, padding: '0 2px' }}>
        {[
          { key: 'avatars', label: `👤 Avatars (${ownedAvatars.length})` },
          { key: 'bgs', label: `🖼 Scenes (${ownedBgs.length})` },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              flex: 1, padding: '7px 8px',
              borderRadius: 10, border: 'none',
              background: activeTab === tab.key ? P.teal : 'rgba(118,168,165,0.1)',
              color: activeTab === tab.key ? '#fff' : P.teal,
              fontFamily: "'Quicksand',sans-serif",
              fontWeight: 700, fontSize: 11,
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div style={{
        maxHeight: 200, overflowY: 'auto',
        paddingRight: 2,
      }}>
        {activeTab === 'avatars' ? (
          ownedAvatars.length === 0 ? (
            <p style={{ textAlign: 'center', color: P.textMuted, fontSize: 12, padding: '16px 0' }}>
              No avatars yet — visit the Gacha!
            </p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
              {ownedAvatars.map(c => (
                <div key={c.id} style={{ position: 'relative' }}>
                  <MiniAvatarSquare
                    cosmetic={c}
                    gender={gender}
                    isEquipped={effectiveAvatarId === c.id}
                    onClick={() => setPreview((p) => ({ ...p, avatarId: c.id }))}
                  />
                  {equipping === c.id && (
                    <div style={{
                      position: 'absolute', inset: 0, borderRadius: 10,
                      background: 'rgba(255,255,255,0.6)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14,
                    }}>⟳</div>
                  )}
                </div>
              ))}
            </div>
          )
        ) : (
          ownedBgs.length === 0 ? (
            <p style={{ textAlign: 'center', color: P.textMuted, fontSize: 12, padding: '16px 0' }}>
              No backgrounds yet — visit the Gacha!
            </p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
              {ownedBgs.map(c => (
                <div key={c.id} style={{ position: 'relative' }}>
                  <MiniBgSquare
                    cosmetic={c}
                    isEquipped={effectiveBackgroundId === c.id}
                    onClick={() => setPreview((p) => ({ ...p, backgroundId: c.id }))}
                  />
                  {equipping === c.id && (
                    <div style={{
                      position: 'absolute', inset: 0, borderRadius: 10,
                      background: 'rgba(255,255,255,0.6)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14,
                    }}>⟳</div>
                  )}
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* Open Full Wardrobe */}
      <button
        onClick={() => navigate('/inventory', { state: { tab: 'wardrobe' } })}
        style={{
          width: '100%', padding: '10px 0',
          borderRadius: 12,
          border: `1.5px solid ${P.teal}`,
          background: P.tealLight,
          color: P.teal,
          fontFamily: "'Quicksand',sans-serif",
          fontWeight: 700, fontSize: 13,
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          transition: 'all 0.15s',
        }}
      >
        <Shirt size={14} />
        Open Full Wardrobe
        <ChevronRight size={14} />
      </button>
    </div>

  );
}

export default function ProfilePage() {
  const { currentUser, userProfile, loadUserProfile } = useAuth();
  const { t, isEnglish } = useLanguage();
  const navigate = useNavigate();
  const { questions, loading: questionsLoading } = useQuizData(SHEET_URL);

  const equippedAvatarId = userProfile?.chemcity?.avatarId || userProfile?.chemcity?.equippedCosmetics?.avatarId || null;
  const equippedBackgroundId = userProfile?.chemcity?.backgroundId || userProfile?.chemcity?.equippedCosmetics?.backgroundId || null;

  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  const [gender, setGender] = useState(userProfile?.gender || 'boy');
  const [level, setLevel] = useState(userProfile?.level || 'S4');
  const [learnedUpTo, setLearnedUpTo] = useState(userProfile?.learnedUpTo || '');
  const [topicExceptions, setTopicExceptions] = useState(Array.isArray(userProfile?.topicExceptions) ? userProfile.topicExceptions : []);

  const [rightTab, setRightTab] = useState('info');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [saving, setSaving] = useState(false);
  const [cosmeticsMap, setCosmeticsMap] = useState(null);
  const [showAllTopicExceptions, setShowAllTopicExceptions] = useState(false);

  useEffect(() => {
    setDisplayName(currentUser?.displayName || '');
  }, [currentUser?.displayName]);

  useEffect(() => {
    setGender(userProfile?.gender || 'boy');
    setLevel(userProfile?.level || 'S4');
    setLearnedUpTo(userProfile?.learnedUpTo || '');
    setTopicExceptions(Array.isArray(userProfile?.topicExceptions) ? userProfile.topicExceptions : []);
  }, [userProfile]);

  const fallbackIds = useMemo(() => {
    if (!cosmeticsMap) return { avatarId: undefined, backgroundId: undefined };
    const all = Array.from(cosmeticsMap.values());
    return {
      avatarId: equippedAvatarId || all.find(c => c?.type === 'avatar')?.id,
      backgroundId: equippedBackgroundId || all.find(c => c?.type === 'background')?.id,
    };
  }, [cosmeticsMap, equippedAvatarId, equippedBackgroundId]);

  const previewAvatar = useMemo(() => {
    if (!cosmeticsMap || !fallbackIds.avatarId) return null;
    return cosmeticsMap.get(fallbackIds.avatarId) || null;
  }, [cosmeticsMap, fallbackIds.avatarId]);

  useEffect(() => { setGender(userProfile?.gender || 'boy'); }, [userProfile]);

  useEffect(() => {
    let mounted = true;
    getCosmeticsMap().then(m => { if (mounted) setCosmeticsMap(m); }).catch(() => { if (mounted) setCosmeticsMap(new Map()); });
    return () => { mounted = false; };
  }, []);

  const allTopics = useMemo(() => {
    if (!questions?.length) return [];
    return [...new Set(questions.map(q => q.Topic))].filter(t => t && t !== 'Uncategorized')
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  }, [questions]);

  const availableTopics = useMemo(() => {
    if (!learnedUpTo) return [];
    return allTopics.filter(topic => {
      const n = topic.match(/^\d+/)?.[0];
      return n && n <= learnedUpTo && !topicExceptions.includes(topic);
    });
  }, [allTopics, learnedUpTo, topicExceptions]);

  const learnedRangeTopics = useMemo(() =>
    allTopics.filter(topic => { const n = topic.match(/^\d+/)?.[0]; return n && n <= learnedUpTo; }),
    [allTopics, learnedUpTo],
  );

  const toggleTopicException = (topic) =>
    setTopicExceptions(prev => prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      await updateProfile(currentUser, { displayName });
      await updateDoc(doc(db, 'users', currentUser.uid), {
        displayName, gender, level, learnedUpTo, topicExceptions,
        updatedAt: new Date().toISOString(),
      });
      await loadUserProfile(currentUser.uid);
      setMessage({ type: 'success', text: t('profile.profileUpdated') });
    } catch (err) {
      setMessage({ type: 'error', text: t('profile.failedUpdate') });
    }
    setSaving(false);
  }

  const formatDate = (iso) => {
    if (!iso) return t('common.notAvailable');
    return new Date(iso).toLocaleDateString(isEnglish ? 'en-GB' : 'zh-HK', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  };

  const overallAccuracy = userProfile?.totalQuestions > 0
    ? Math.round((userProfile.totalCorrect / userProfile.totalQuestions) * 100) : 0;

  return (
    <div style={{ minHeight: '100vh', background: P.bg, fontFamily: "'Quicksand',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Quicksand:wght@500;600;700;800&display=swap');
        .profile-card-shadow { box-shadow: 0 2px 16px rgba(118,168,165,0.12); }
        .soft-input { 
          width: 100%; padding: 10px 14px;
          border: 1.5px solid rgba(118,168,165,0.3); border-radius: 10px;
          background: #fafcfa; font-family: 'Quicksand',sans-serif;
          font-size: 14px; font-weight: 600; color: ${P.text};
          outline: none; transition: border 0.2s;
          box-sizing: border-box;
        }
        .soft-input:focus { border-color: ${P.teal}; background: #fff; }
        .soft-input:disabled { background: rgba(245,249,246,0.8); color: ${P.textMuted}; cursor: not-allowed; }
        .toggle-btn {
          flex: 1; padding: 8px 0;
          border-radius: 10px; border: none;
          font-family: 'Quicksand',sans-serif; font-weight: 700; font-size: 13px;
          cursor: pointer; transition: all 0.2s;
        }
        .section-label {
          font-size: 11px; font-weight: 800; letter-spacing: 0.08em;
          text-transform: uppercase; color: ${P.textMuted}; margin-bottom: 6px;
          display: block;
        }
      `}</style>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              padding: '10px', borderRadius: 12,
              border: `1.5px solid ${P.border}`, background: P.cardBg,
              cursor: 'pointer', display: 'flex', alignItems: 'center',
              color: P.text, transition: 'border 0.2s',
            }}
          >
            <ArrowLeft size={20} />
          </button>
          <div style={{
            flex: 1, background: P.cardBg, borderRadius: 16,
            border: `1.5px solid ${P.border}`, padding: '14px 20px',
          }} className="profile-card-shadow">
            <h1 style={{ fontSize: 22, fontWeight: 800, color: P.text, display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
              <User size={22} color={P.teal} />
              {t('profile.profileSettings')}
            </h1>
            <p style={{ color: P.textMuted, fontSize: 13, fontWeight: 600, margin: '2px 0 0' }}>
              {t('profile.manageAccount')}
            </p>
          </div>
        </div>

        {/* Stats Row */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12,
        }}>
          {[
            { icon: <Trophy size={18} color={P.teal} />, label: t('profile.totalAttempts'), value: userProfile?.totalAttempts || 0, color: 'rgba(118,168,165,0.1)' },
            { icon: <Target size={18} color="#86a874" />, label: t('profile.overallAccuracy'), value: `${overallAccuracy}%`, color: 'rgba(134,168,116,0.1)' },
            { icon: <GraduationCap size={18} color="#9b82c4" />, label: t('profile.questionsSolved'), value: userProfile?.totalQuestions || 0, color: 'rgba(155,130,196,0.1)' },
          ].map((stat, i) => (
            <div key={i} style={{
              background: P.cardBg, borderRadius: 14, padding: '14px 16px',
              border: `1.5px solid ${P.border}`,
            }} className="profile-card-shadow">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <div style={{ padding: 6, borderRadius: 8, background: stat.color }}>
                  {stat.icon}
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: P.textMuted }}>{stat.label}</span>
              </div>
              <div style={{ fontSize: 26, fontWeight: 900, color: P.text }}>{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Two-column layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 16, alignItems: 'start' }}>

          {/* LEFT: Profile Card + Info/Wardrobe toggle */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {/* Profile Card preview */}
            <div style={{
              background: P.cardBg, borderRadius: '16px 16px 0 0',
              border: `1.5px solid ${P.border}`,
              borderBottom: 'none',
              padding: '20px 20px 16px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
            }} className="profile-card-shadow">
              <ProfileCard
                size="xl"
                displayName={displayName}
                gender={gender}
                cosmeticsMap={cosmeticsMap || undefined}
                avatarId={fallbackIds.avatarId}
                backgroundId={fallbackIds.backgroundId}
                style={{ borderRadius: 18, boxShadow: '0 6px 28px rgba(118,168,165,0.25)', width: '100%', height: 'auto', aspectRatio: '4/5.5', maxWidth: 220 }}
              />
            </div>

            {/* Info/Wardrobe card */}
            <div style={{
              background: P.cardBg, borderRadius: '0 0 16px 16px',
              border: `1.5px solid ${P.border}`, borderTop: `1px solid ${P.border}`,
              overflow: 'hidden',
            }} className="profile-card-shadow">
              {/* Toggle tabs */}
              <div style={{
                display: 'flex', padding: '10px 12px 0',
                gap: 6, background: 'rgba(197,215,181,0.08)',
              }}>
                <button className="toggle-btn" onClick={() => setRightTab('info')} style={{
                  background: rightTab === 'info' ? P.sage : 'transparent',
                  color: rightTab === 'info' ? '#2d4a3e' : P.textMuted,
                }}>
                  <User size={13} style={{ display: 'inline', marginRight: 4 }} />
                  Info
                </button>
                <button className="toggle-btn" onClick={() => setRightTab('wardrobe')} style={{
                  background: rightTab === 'wardrobe' ? P.sage : 'transparent',
                  color: rightTab === 'wardrobe' ? '#2d4a3e' : P.textMuted,
                }}>
                  <Shirt size={13} style={{ display: 'inline', marginRight: 4 }} />
                  Wardrobe
                </button>
              </div>

              <div style={{ padding: '14px 16px 16px' }}>
                {rightTab === 'info' ? (
                  /* INFO MODE */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[
                      { label: 'Display Name', value: currentUser?.displayName || '—' },
                      { label: 'Gender', value: gender === 'boy' ? '👦 Boy' : '👧 Girl' },
                      { label: 'Email', value: currentUser?.email || '—' },
                      { label: 'Member Since', value: formatDate(userProfile?.createdAt) },
                    ].map(row => (
                      <div key={row.label} style={{
                        padding: '8px 12px', borderRadius: 10,
                        background: 'rgba(197,215,181,0.1)',
                        border: `1px solid ${P.border}`,
                      }}>
                        <div style={{ fontSize: 10, fontWeight: 800, color: P.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 2 }}>
                          {row.label}
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: P.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {row.value}
                        </div>
                      </div>
                    ))}

                    {/* Equipped info */}
                    <div style={{ marginTop: 4, paddingTop: 10, borderTop: `1px solid ${P.border}` }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: P.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
                        Equipped Cosmetics
                      </div>
                      {[
                        { slot: 'Avatar', id: equippedAvatarId },
                        { slot: 'Background', id: equippedBackgroundId },
                      ].map(row => (
                        <div key={row.slot} style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '5px 10px', borderRadius: 8, marginBottom: 4,
                          background: 'rgba(245,249,246,0.8)',
                          border: `1px solid ${P.border}`,
                        }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: P.textMuted, minWidth: 70 }}>{row.slot}</span>
                          <span style={{ fontSize: 11, fontWeight: 600, color: P.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {row.id ? (cosmeticsMap?.get(row.id)?.name ?? row.id) : 'None'}
                          </span>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => setRightTab('wardrobe')}
                      style={{
                        width: '100%', padding: '9px', marginTop: 4,
                        borderRadius: 10, border: `1.5px solid ${P.sage}`,
                        background: 'rgba(197,215,181,0.15)',
                        color: '#4a7c4e',
                        fontFamily: "'Quicksand',sans-serif", fontWeight: 700, fontSize: 12,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      }}
                    >
                      <Shirt size={13} />
                      Change Appearance
                    </button>
                  </div>
                ) : (
                  /* WARDROBE MODE */
                  <WardrobePanel
                    cosmeticsMap={cosmeticsMap}
                    userProfile={userProfile}
                    gender={gender}
                    displayName={displayName}
                    equippedAvatarId={equippedAvatarId}
                    equippedBackgroundId={equippedBackgroundId}
                    navigate={navigate}
                  />
                )}
              </div>
            </div>
          </div>

          {/* RIGHT: Form */}
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <div style={{
              background: P.cardBg, borderRadius: 16, border: `1.5px solid ${P.border}`,
              overflow: 'hidden',
            }} className="profile-card-shadow">
              {/* Form header */}
              <div style={{ padding: '14px 20px 10px', borderBottom: `1px solid ${P.border}`, background: 'rgba(197,215,181,0.08)' }}>
                <h2 style={{ fontSize: 15, fontWeight: 800, color: P.text, margin: 0 }}>
                  {t('profile.accountInformation')}
                </h2>
              </div>

              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 18 }}>
                {/* Message */}
                {message.text && (
                  <div style={{
                    padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                    background: message.type === 'success' ? 'rgba(134,168,116,0.12)' : 'rgba(239,68,68,0.08)',
                    border: `1.5px solid ${message.type === 'success' ? 'rgba(134,168,116,0.4)' : 'rgba(239,68,68,0.3)'}`,
                    color: message.type === 'success' ? '#4a7c4e' : '#dc2626',
                  }}>
                    {message.text}
                  </div>
                )}

                {/* Display Name */}
                <div>
                  <label className="section-label">
                    <User size={11} style={{ display: 'inline', marginRight: 4 }} />
                    {t('profile.displayName')}
                  </label>
                  <input className="soft-input" type="text" value={displayName}
                    onChange={e => setDisplayName(e.target.value)} required
                    placeholder={t('profile.enterYourName')} />
                </div>

                {/* Gender */}
                <div>
                  <label className="section-label">Gender</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {['boy', 'girl'].map(g => (
                      <button key={g} type="button" onClick={() => setGender(g)} style={{
                        padding: '9px', borderRadius: 10, border: `1.5px solid`,
                        borderColor: gender === g ? P.teal : P.border,
                        background: gender === g ? P.tealLight : 'transparent',
                        color: gender === g ? P.teal : P.textMuted,
                        fontFamily: "'Quicksand',sans-serif", fontWeight: 700, fontSize: 13,
                        cursor: 'pointer', textTransform: 'capitalize', transition: 'all 0.15s',
                      }}>{g}</button>
                    ))}
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="section-label">
                    <Mail size={11} style={{ display: 'inline', marginRight: 4 }} />
                    {t('profile.email')}
                  </label>
                  <input className="soft-input" type="email" value={currentUser?.email || ''} disabled />
                  <p style={{ fontSize: 11, color: P.textMuted, margin: '4px 0 0' }}>{t('profile.emailCannotChange')}</p>
                </div>

                {/* School Level */}
                <div>
                  <label className="section-label">
                    <GraduationCap size={11} style={{ display: 'inline', marginRight: 4 }} />
                    {t('profile.schoolLevel')}
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    {['S4', 'S5', 'S6'].map(lvl => (
                      <button key={lvl} type="button" onClick={() => setLevel(lvl)} style={{
                        padding: '9px', borderRadius: 10, border: `1.5px solid`,
                        borderColor: level === lvl ? P.teal : P.border,
                        background: level === lvl ? P.tealLight : 'transparent',
                        color: level === lvl ? P.teal : P.textMuted,
                        fontFamily: "'Quicksand',sans-serif", fontWeight: 700, fontSize: 13,
                        cursor: 'pointer', transition: 'all 0.15s',
                      }}>{lvl}</button>
                    ))}
                  </div>
                </div>

                {/* Topics learned up to */}
                <div>
                  <label className="section-label">
                    <BookOpen size={11} style={{ display: 'inline', marginRight: 4 }} />
                    {t('profile.topicsLearnedUpTo')}
                  </label>
                  <p style={{ fontSize: 11, color: P.textMuted, margin: '0 0 8px' }}>{t('profile.selectHighestTopic')}</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {allTopics.map(topic => {
                      const n = topic.match(/^\d+/)?.[0];
                      return (
                        <button key={topic} type="button" onClick={() => setLearnedUpTo(n)} style={{
                          padding: '5px 10px', borderRadius: 8, border: `1.5px solid`,
                          borderColor: learnedUpTo === n ? '#86a874' : P.border,
                          background: learnedUpTo === n ? 'rgba(134,168,116,0.12)' : 'transparent',
                          color: learnedUpTo === n ? '#4a7c4e' : P.textMuted,
                          fontFamily: "'Quicksand',sans-serif", fontWeight: 700, fontSize: 12,
                          cursor: 'pointer', transition: 'all 0.15s',
                        }} title={topic}>{n}</button>
                      );
                    })}
                  </div>
                </div>

                {/* Topic Exceptions */}
                {learnedUpTo && learnedRangeTopics.length > 0 && (
                  <div style={{ borderTop: `1px solid ${P.border}`, paddingTop: 16 }}>
                    <label className="section-label">
                      <Lock size={11} style={{ display: 'inline', marginRight: 4 }} />
                      {t('profile.topicExceptionsLabel')}
                    </label>
                    <p style={{ fontSize: 11, color: P.textMuted, margin: '0 0 8px' }}>{t('profile.clickToExclude')}</p>
                    {learnedRangeTopics.length > 8 && (
                      <button
                        type="button"
                        onClick={() => setShowAllTopicExceptions((v) => !v)}
                        style={{
                          padding: '5px 10px',
                          borderRadius: 9,
                          border: `1.5px solid ${P.border}`,
                          background: 'rgba(245,249,246,0.8)',
                          color: P.text,
                          fontFamily: "'Quicksand',sans-serif",
                          fontWeight: 700,
                          fontSize: 11,
                          cursor: 'pointer',
                          marginBottom: 8,
                        }}
                      >
                        {showAllTopicExceptions ? 'Show less' : `Show all (${learnedRangeTopics.length})`}
                      </button>
                    )}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                      gap: 6,
                      maxHeight: showAllTopicExceptions ? 220 : 188,
                      overflowY: 'auto',
                      paddingRight: 2,
                    }}>
                      {(showAllTopicExceptions ? learnedRangeTopics : learnedRangeTopics.slice(0, 8)).map(topic => {
                        const isExc = topicExceptions.includes(topic);
                        return (
                          <button key={topic} type="button" onClick={() => toggleTopicException(topic)} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '6px 10px', borderRadius: 9, border: `1.5px solid`,
                            borderColor: isExc ? 'rgba(239,68,68,0.35)' : 'rgba(134,168,116,0.35)',
                            background: isExc ? 'rgba(239,68,68,0.05)' : 'rgba(134,168,116,0.06)',
                            color: isExc ? '#dc2626' : '#4a7c4e',
                            fontFamily: "'Quicksand',sans-serif", fontWeight: 700, fontSize: 11,
                            cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left',
                          }}>
                            <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{topic}</span>
                            {isExc ? <Lock size={12} /> : <Unlock size={12} />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Available Topics Preview */}
                {availableTopics.length > 0 && (
                  <div style={{
                    background: 'rgba(118,168,165,0.08)', borderRadius: 12,
                    border: `1.5px solid rgba(118,168,165,0.2)`, padding: '12px 14px',
                  }}>
                    <h3 style={{ fontSize: 12, fontWeight: 800, color: P.teal, margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <BookOpen size={13} />
                      {t('profile.yourAvailableTopicsCount')} ({availableTopics.length})
                    </h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {availableTopics.map(topic => (
                        <span key={topic} style={{
                          padding: '3px 8px', borderRadius: 999,
                          background: 'rgba(118,168,165,0.15)', color: P.teal,
                          fontSize: 11, fontWeight: 700,
                        }}>{topic}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Member Since */}
                <div>
                  <label className="section-label">
                    <Calendar size={11} style={{ display: 'inline', marginRight: 4 }} />
                    {t('profile.memberSince')}
                  </label>
                  <div className="soft-input" style={{ display: 'flex', alignItems: 'center', cursor: 'default', background: 'rgba(245,249,246,0.8)' }}>
                    {formatDate(userProfile?.createdAt)}
                  </div>
                </div>

                {/* Save Button */}
                <button
                  type="submit"
                  disabled={saving || questionsLoading}
                  style={{
                    width: '100%', padding: '12px', borderRadius: 12, border: 'none',
                    background: saving ? 'rgba(118,168,165,0.5)' : `linear-gradient(135deg, ${P.teal}, ${P.tealDark})`,
                    color: '#fff', fontFamily: "'Quicksand',sans-serif",
                    fontWeight: 800, fontSize: 15,
                    cursor: saving ? 'not-allowed' : 'pointer',
                    boxShadow: saving ? 'none' : '0 4px 16px rgba(118,168,165,0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    transition: 'all 0.2s',
                  }}
                >
                  {saving ? (
                    <><div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />{t('profile.saving')}</>
                  ) : (
                    <><Save size={17} />{t('profile.saveChanges')}</>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}