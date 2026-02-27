import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronDown,
  FlaskConical,
  BookOpen,
  Timer,
  MessageSquare,
  Trophy,
  Building2,
  Sparkles,
} from 'lucide-react';

const BRAND = {
  teal: '#76A8A5',
  tealDark: '#5d9190',
  sage: '#C5D7B5',
  brown: '#B69A84',
  ink: '#0a1a18',
};

export default function FeaturePage() {
  const navigate = useNavigate();
  const scrollerRef = useRef(null);

  const features = useMemo(
    () => [
      {
        id: 'mcq',
        title: 'MCQ Practice',
        subtitle: 'Different modes to match your goals',
        body:
          'Practice HKDSE-style MCQs with fast feedback, clean explanations, and powerful progress tracking.',
        bullets: ['Normal practice', 'Topical practice', 'Timed / Exam-style runs'],
        icon: FlaskConical,
        visuals: [
          { src: '/feature/Quiz.png', caption: 'Solve HKDSE-style MCQs with a clean, focused interface.' },
          { src: '/feature/Mode selection.png', caption: 'Pick a mode that matches your goal — normal, topical, or timed.' },
        ],
        accent: BRAND.teal,
      },
      {
        id: 'srs',
        title: 'SRS Review System',
        subtitle: 'Spaced repetition that actually sticks',
        body:
          'Review mistakes using spaced repetition so you remember the right concept at the right time.',
        bullets: ['Smart intervals', 'Graduation / mastery archive', 'Priority review'],
        icon: BookOpen,
        visuals: [
          { src: '/feature/Mistake notebook.png', caption: 'Capture mistakes and learn the “why” behind every wrong answer.' },
          { src: '/feature/SRS custom review.png', caption: 'Run a custom SRS session based on what you actually need today.' },
          { src: '/feature/Mistake and SRS statistics.png', caption: 'See your progress and patterns — what improved, and what needs attention.' },
        ],
        accent: BRAND.sage,
      },
      {
        id: 'pace',
        title: 'Learning Pace',
        subtitle: 'Study consistently, not intensely',
        body:
          'Build habits with streaks, pacing, and bite-sized sessions that fit your schedule.',
        bullets: ['Daily momentum', 'Track time spent', 'Build your streak'],
        icon: Timer,
        visuals: [{ src: '/feature/smart_calendar.png', caption: 'Plan your learning pace and stay consistent with a simple calendar view.' }],
        accent: '#a8d4a0',
      },
      {
        id: 'forum',
        title: 'Forum',
        subtitle: 'Ask, explain, and learn together',
        body:
          'Discuss questions, share reasoning, and learn from other students in a supportive community.',
        bullets: ['Threads & replies', 'Notifications', 'Explain your thinking'],
        icon: MessageSquare,
        visuals: [{ src: '/feature/Forum.png', caption: 'Ask questions, share reasoning, and learn together with the community.' }],
        accent: '#7fb3b0',
      },
      {
        id: 'leaderboard',
        title: 'Leaderboard',
        subtitle: 'Friendly competition that motivates',
        body:
          'See how you rank and stay motivated with transparent ranking metrics.',
        bullets: ['Rank by accuracy', 'Recent performance windows', 'Track progress over time'],
        icon: Trophy,
        visuals: [{ src: '/feature/Leaderboard.png', caption: 'Stay motivated with friendly competition and transparent ranking.' }],
        accent: '#f59e0b',
      },
      {
        id: 'chemcity',
        title: 'ChemCity',
        subtitle: 'A gamified world of ChemCards',
        body:
          'Earn, collect, and equip ChemCards to build your own chemistry city and collection journey.',
        bullets: ['Daily shop', 'Inventory & collection album', 'Map exploration'],
        icon: Building2,
        visuals: [
          { src: '/feature/ChemCity.png', caption: 'Explore ChemCity — your gamified world of ChemCards.' },
          { src: '/feature/ChemStore.png', caption: 'Visit the ChemStore for daily items and upgrades.' },
          { src: '/feature/ChemCard detail.png', caption: 'Inspect ChemCards in detail and build your collection.' },
        ],
        accent: BRAND.teal,
      },
      {
        id: 'cosmetics',
        title: 'Cosmetics',
        subtitle: 'Personalize your experience',
        body:
          'Unlock cosmetics through the gacha and express your style across the platform.',
        bullets: ['Gacha machine', 'Tickets', 'Wardrobe collection'],
        icon: Sparkles,
        visuals: [{ src: '/feature/Cosmetics.png', caption: 'Unlock cosmetics and personalize your experience.' }],
        accent: '#22c55e',
      },
    ],
    []
  );

  const slides = useMemo(() => {
    const out = [];
    features.forEach((feature) => {
      const visuals = Array.isArray(feature.visuals) ? feature.visuals : [];
      visuals.forEach((v, idx) => {
        out.push({
          key: `${feature.id}-${idx}`,
          featureId: feature.id,
          title: feature.title,
          subtitle: feature.subtitle,
          body: feature.body,
          accent: feature.accent,
          icon: feature.icon,
          src: v?.src,
          caption: v?.caption,
        });
      });
    });

    out.push({
      key: 'cta',
      featureId: 'cta',
      title: 'Chemistree',
      subtitle: 'Ready to start?',
      body: '',
      accent: BRAND.teal,
      icon: Sparkles,
      src: '/ChemistreeIcon.mp4',
      caption: 'Are you ready to grow your Chemistree?',
    });
    return out;
  }, [features]);

  const firstSlideIndexByFeatureId = useMemo(() => {
    const map = {};
    slides.forEach((s, idx) => {
      if (map[s.featureId] === undefined) map[s.featureId] = idx;
    });
    return map;
  }, [slides]);

  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const activeFeatureId = slides[activeSlideIndex]?.featureId;

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const onScroll = () => {
      const h = window.innerHeight || 1;
      const idx = Math.round(el.scrollTop / h);
      setActiveSlideIndex(Math.max(0, Math.min(slides.length - 1, idx)));
    };

    onScroll();
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [slides.length]);

  const scrollToSlide = useCallback((i) => {
    const el = scrollerRef.current;
    if (!el) return;
    const h = window.innerHeight || 1;
    el.scrollTo({ top: i * h, behavior: 'smooth' });
  }, []);

  return (
    <div className="min-h-screen w-full relative overflow-hidden" style={{ background: BRAND.ink, fontFamily: "'Quicksand',sans-serif", color: '#fff' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Quicksand:wght@500;600;700;800;900&display=swap');
        @keyframes floaty { 0%, 100% { transform: translate3d(0, 0, 0); } 50% { transform: translate3d(0, -10px, 0); } }
        @keyframes cueDown { 0%, 100% { transform: translateY(0); opacity: 0.55; } 50% { transform: translateY(8px); opacity: 0.9; } }
        .nav-btn { width:46px; height:46px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.14); background: rgba(255,255,255,0.06); color: #fff; display:flex; align-items:center; justify-content:center; cursor:pointer; transition: transform .12s ease, background .12s ease; }
        .nav-btn:active { transform: scale(0.98); }
        .nav-btn:hover { background: rgba(255,255,255,0.10); }
        .scroll-cue { margin-top: 14px; display: flex; justify-content: center; }
        .scroll-cue svg { animation: cueDown 1.35s ease-in-out infinite; }
        .btn-ghost-nav {
          font-family: 'Quicksand', sans-serif;
          font-weight: 800;
          color: rgba(255,255,255,0.85);
          padding: 10px 22px;
          border-radius: 12px;
          border: 2px solid rgba(197,215,181,0.3);
          background: transparent;
          transition: all 0.2s ease;
          cursor: pointer;
          font-size: 15px;
        }
        .btn-ghost-nav:hover {
          background: rgba(197,215,181,0.1);
          border-color: rgba(197,215,181,0.6);
          color: #fff;
          transform: translateY(-1px);
        }
        .btn-primary-nav {
          font-family: 'Quicksand', sans-serif;
          font-weight: 900;
          color: #fff;
          padding: 11px 26px;
          border-radius: 14px;
          border: none;
          background: linear-gradient(135deg, #76A8A5, #5d9190);
          box-shadow: 0 4px 20px rgba(118,168,165,0.45);
          transition: all 0.2s ease;
          cursor: pointer;
          font-size: 15px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .btn-primary-nav:hover {
          transform: translateY(-2px) scale(1.03);
          box-shadow: 0 8px 28px rgba(118,168,165,0.55);
          background: linear-gradient(135deg, #82b8b5, #6aa09d);
        }
        .side-item { border-radius:16px; border:1px solid rgba(255,255,255,0.12); background: rgba(0,0,0,0.18); color:#fff; display:flex; align-items:center; justify-content:center; cursor:pointer; transition: transform .12s ease, background .12s ease, border-color .12s ease; }
        .side-item:hover { background: rgba(255,255,255,0.08); }
        .side-item.active { border-color: rgba(255,255,255,0.32); background: rgba(255,255,255,0.12); transform: scale(1.03); }
        .left-panel { width: 168px; }
        .left-btn { width: 100%; height: 44px; padding: 0 12px; justify-content: flex-start; gap: 10px; }
        @media (min-width: 640px) {
          .left-panel { width: 204px; }
          .left-btn { width: 100%; height: 44px; padding: 0 12px; justify-content: flex-start; gap: 10px; }
        }
        .scroller { padding-left: 196px; }
        @media (min-width: 640px) { .scroller { padding-left: 240px; } }
      `}</style>

      <div className="absolute inset-0" style={{ pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 60% at 50% 30%, rgba(118,168,165,0.22) 0%, rgba(10,26,24,0.95) 55%)' }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(118,168,165,0.08) 1px, transparent 1px)', backgroundSize: '30px 30px', opacity: 0.35 }} />
      </div>

      {/* Back button */}
      <button
        type="button"
        onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
        className="nav-btn"
        title="Back"
        style={{ position: 'fixed', top: 18, left: 18, zIndex: 50, touchAction: 'manipulation', backdropFilter: 'blur(10px)' }}
      >
        <ArrowLeft size={18} />
      </button>

      {/* Chemistree Logo */}
      <div
        style={{
          position: 'fixed',
          top: 18,
          left: 76,
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          pointerEvents: 'none',
        }}
      >
        <div style={{ filter: 'drop-shadow(0 0 10px rgba(118,168,165,0.5))' }}>
          <div
            style={{
              clipPath: 'polygon(50% 0%, 95% 25%, 95% 75%, 50% 100%, 5% 75%, 5% 25%)',
              background: 'linear-gradient(135deg, #76A8A5, #C5D7B5)',
              width: 44,
              height: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                clipPath: 'polygon(50% 0%, 95% 25%, 95% 75%, 50% 100%, 5% 75%, 5% 25%)',
                background: '#0d1f1e',
                width: 39,
                height: 39,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <img
                src="/ChemistreeIcon_square.png"
                alt="Chemistree"
                draggable="false"
                style={{ width: 28, height: 28, objectFit: 'contain' }}
              />
            </div>
          </div>
        </div>
        <span
          style={{
            fontFamily: "'Quicksand', sans-serif",
            fontWeight: 800,
            fontSize: 18,
            color: '#fff',
            letterSpacing: '-0.01em',
            textShadow: '0 10px 24px rgba(0,0,0,0.45)',
          }}
        >
          Chemistree
        </span>
      </div>

      {/* Left Feature Panel */}
      <div
        className="left-panel"
        style={{
          position: 'fixed',
          left: 16,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          padding: 10,
          borderRadius: 18,
          border: '1px solid rgba(255,255,255,0.10)',
          background: 'rgba(0,0,0,0.18)',
          backdropFilter: 'blur(10px)',
        }}
      >
        {features.map((f) => {
          const Icon = f.icon;
          const isActive = f.id === activeFeatureId;
          return (
            <button
              key={f.id}
              type="button"
              className={`side-item left-btn${isActive ? ' active' : ''}`}
              onClick={() => {
                const idx = firstSlideIndexByFeatureId[f.id];
                if (idx !== undefined) scrollToSlide(idx);
              }}
              title={f.title}
              aria-label={`Go to ${f.title}`}
              style={{
                touchAction: 'manipulation',
                borderColor: isActive ? `${f.accent}66` : 'rgba(255,255,255,0.12)',
                background: isActive ? `${f.accent}22` : 'rgba(0,0,0,0.18)',
              }}
            >
              <Icon size={18} color={f.accent} />
              <span
                className="block"
                style={{
                  fontWeight: 900,
                  fontSize: 12,
                  color: isActive ? '#fff' : 'rgba(255,255,255,0.72)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {f.title}
              </span>
            </button>
          );
        })}
      </div>

      {/* Dots */}
      <div
        style={{
          position: 'fixed',
          right: 16,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {slides.map((s, i) => (
          <button
            key={s.key}
            type="button"
            onClick={() => scrollToSlide(i)}
            aria-label={`Go to ${s.title}`}
            style={{
              width: 10,
              height: 10,
              borderRadius: 999,
              border: 'none',
              background: i === activeSlideIndex ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.22)',
              boxShadow: i === activeSlideIndex ? `0 0 0 4px rgba(255,255,255,0.10)` : 'none',
              cursor: 'pointer',
              padding: 0,
            }}
          />
        ))}
      </div>

      {/* Scroll-snap preview */}
      <div
        ref={scrollerRef}
        className="scroller"
        style={{
          height: '100vh',
          overflowY: 'auto',
          scrollSnapType: 'y mandatory',
          scrollBehavior: 'smooth',
          position: 'relative',
          zIndex: 2,
        }}
      >
        {slides.map((slide) => {
          const Icon = slide.icon;
          const isVideo = typeof slide.src === 'string' && slide.src.toLowerCase().endsWith('.mp4');
          if (slide.featureId === 'cta') {
            return (
              <section
                key={slide.key}
                style={{
                  height: '100vh',
                  scrollSnapAlign: 'start',
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '24px 18px',
                  maxWidth: 980,
                  margin: '0 auto',
                }}
              >
                <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '62vh' }}>
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: 22,
                      border: '1px solid rgba(255,255,255,0.12)',
                      background: 'radial-gradient(ellipse 80% 60% at 50% 35%, rgba(118,168,165,0.22) 0%, rgba(10,26,24,0.96) 58%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 16,
                      overflow: 'hidden',
                      boxShadow: '0 24px 80px rgba(0,0,0,0.55)',
                      position: 'relative',
                    }}
                  >
                    <video
                      className="max-w-full max-h-full w-auto h-auto object-contain"
                      src="/ChemistreeIcon.mp4"
                      autoPlay
                      muted
                      loop
                      playsInline
                      preload="auto"
                      style={{ opacity: 0.9, pointerEvents: 'none', borderRadius: 18 }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'radial-gradient(ellipse 80% 80% at 50% 50%, rgba(10,26,24,0.05) 0%, rgba(10,26,24,0.55) 100%)',
                        pointerEvents: 'none',
                      }}
                    />
                  </div>
                </div>

                <div style={{ flex: '1 1 auto', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 18 }}>
                  <div style={{ width: '100%', maxWidth: 760 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <span
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 14,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'rgba(255,255,255,0.06)',
                          border: `1px solid ${BRAND.teal}55`,
                          color: BRAND.teal,
                        }}
                      >
                        <Icon size={18} />
                      </span>
                      <div style={{ color: 'rgba(255,255,255,0.92)', fontWeight: 900, fontSize: 18, lineHeight: 1.2 }}>
                        {slide.caption}
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 14 }}>
                      <button
                        type="button"
                        className="btn-ghost-nav"
                        onClick={() => navigate('/login')}
                        style={{ touchAction: 'manipulation' }}
                      >
                        Login
                      </button>
                      <button
                        type="button"
                        className="btn-primary-nav"
                        onClick={() => navigate('/register')}
                        style={{ touchAction: 'manipulation' }}
                      >
                        Get Started
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            );
          }
          return (
            <section
              key={slide.key}
              style={{
                height: '100vh',
                scrollSnapAlign: 'start',
                display: 'flex',
                flexDirection: 'column',
                padding: '24px 18px',
                maxWidth: 980,
                margin: '0 auto',
              }}
            >
              <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '62vh' }}>
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: 22,
                    border: '1px solid rgba(255,255,255,0.12)',
                    background: `radial-gradient(ellipse 80% 60% at 50% 35%, ${slide.accent}22 0%, rgba(10,26,24,0.96) 58%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 16,
                    overflow: 'hidden',
                    boxShadow: '0 24px 80px rgba(0,0,0,0.55)',
                  }}
                >
                  {slide.src ? (
                    isVideo ? (
                      <video
                        src={slide.src}
                        autoPlay
                        muted
                        loop
                        playsInline
                        preload="auto"
                        style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto', objectFit: 'contain', opacity: 0.98, borderRadius: 18, animation: 'floaty 7s ease-in-out infinite' }}
                      />
                    ) : (
                      <img
                        src={slide.src}
                        alt={slide.title}
                        draggable="false"
                        style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto', objectFit: 'contain', display: 'block', borderRadius: 18, animation: 'floaty 7s ease-in-out infinite' }}
                      />
                    )
                  ) : (
                    <Icon size={72} color={slide.accent} />
                  )}
                </div>
              </div>

              <div style={{ flex: '1 1 auto', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 18 }}>
                <div style={{ width: '100%', maxWidth: 760 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <span
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 14,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(255,255,255,0.06)',
                        border: `1px solid ${slide.accent}55`,
                        color: slide.accent,
                      }}
                    >
                      <Icon size={18} />
                    </span>
                    <div style={{ color: 'rgba(255,255,255,0.92)', fontWeight: 900, fontSize: 18, lineHeight: 1.2 }}>
                      {slide.title}
                    </div>
                  </div>

                  <div style={{ color: 'rgba(255,255,255,0.65)', fontWeight: 800, fontSize: 13, lineHeight: 1.65 }}>
                    {slide.caption || slide.subtitle}
                  </div>

                  <div className="scroll-cue" aria-hidden="true">
                    <ChevronDown size={18} color="rgba(255,255,255,0.55)" />
                  </div>
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
