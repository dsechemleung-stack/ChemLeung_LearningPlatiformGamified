import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const BRAND = {
  teal: '#76A8A5',
  tealDark: '#5d9190',
  sage: '#C5D7B5',
  brown: '#B69A84',
};

export default function LandingPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  useEffect(() => {
    if (currentUser) navigate('/dashboard', { replace: true });
  }, [currentUser, navigate]);

  return (
    <div className="min-h-screen w-full relative overflow-hidden" style={{ background: '#081413' }}>

      {/* ── Google Font (add to index.html for production) ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Pacifico&family=Quicksand:wght@500;600;700;800&display=swap');

        .brand-script {
          font-family: 'Pacifico', cursive;
          background: linear-gradient(135deg, #C5D7B5 0%, #76A8A5 50%, #ffffff 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          -webkit-text-stroke: 2px rgba(255,255,255,0.98);
          text-shadow:
            1px 0 0 rgba(255,255,255,0.95),
            -1px 0 0 rgba(255,255,255,0.95),
            0 1px 0 rgba(255,255,255,0.95),
            0 -1px 0 rgba(255,255,255,0.95),
            1px 1px 0 rgba(255,255,255,0.9),
            -1px 1px 0 rgba(255,255,255,0.9),
            1px -1px 0 rgba(255,255,255,0.9),
            -1px -1px 0 rgba(255,255,255,0.9);
        }
        .btn-ghost-nav {
          font-family: 'Quicksand', sans-serif;
          font-weight: 700;
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
          font-weight: 800;
          color: #fff;
          padding: 11px 26px;
          border-radius: 14px;
          border: none;
          background: linear-gradient(135deg, #76A8A5, #5d9190);
          box-shadow: 0 4px 20px rgba(118,168,165,0.45);
          transition: all 0.2s ease;
          cursor: pointer;
          font-size: 15px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .btn-primary-nav:hover {
          transform: translateY(-2px) scale(1.03);
          box-shadow: 0 8px 28px rgba(118,168,165,0.55);
          background: linear-gradient(135deg, #82b8b5, #6aa09d);
        }
        .hero-tagline {
          font-family: 'Quicksand', sans-serif;
        }
        .pill-badge {
          font-family: 'Quicksand', sans-serif;
          font-weight: 700;
          font-size: 12px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #fff;
          background: rgba(118,168,165,0.55);
          border: 1.5px solid rgba(197,215,181,0.7);
          border-radius: 999px;
          padding: 6px 16px;
          display: inline-block;
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          box-shadow: 0 2px 16px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.1);
          text-shadow: 0 1px 4px rgba(255,255,255,0.3);
        }
      `}</style>

      {/* ── Background Video ── */}
      <div className="absolute inset-0">
        <video
          className="w-full h-full object-cover"
          src="/ChemistreeIcon.mp4"
          autoPlay muted loop playsInline preload="auto"
          style={{ opacity: 0.75 }}
        />
        {/* Subtle vignette — keeps edges dark, center open */}
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse 80% 70% at 50% 50%, transparent 40%, rgba(8,20,19,0.6) 100%)',
        }} />
        {/* Bottom fade for footer legibility */}
        <div className="absolute bottom-0 left-0 right-0 h-32" style={{
          background: 'linear-gradient(to top, rgba(8,20,19,0.9), transparent)',
        }} />
      </div>

      {/* ══════════════════════════════════════════
          TOP NAVIGATION BAR
      ══════════════════════════════════════════ */}
      <nav className="relative z-20 flex items-center justify-between px-6 sm:px-10 pt-6 sm:pt-8">

        {/* Left: Logo + Wordmark */}
        <div className="flex items-center gap-3">
          {/* Hex logo glow */}
          <div style={{ filter: 'drop-shadow(0 0 10px rgba(118,168,165,0.5))' }}>
            <div style={{
              clipPath: 'polygon(50% 0%, 95% 25%, 95% 75%, 50% 100%, 5% 75%, 5% 25%)',
              background: 'linear-gradient(135deg, #76A8A5, #C5D7B5)',
              width: 56, height: 56,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{
                clipPath: 'polygon(50% 0%, 95% 25%, 95% 75%, 50% 100%, 5% 75%, 5% 25%)',
                background: '#0d1f1e',
                width: 50, height: 50,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <img src="/ChemistreeIcon_square.png" alt="Chemistree" draggable="false"
                  style={{ width: 36, height: 36, objectFit: 'contain' }} />
              </div>
            </div>
          </div>
          <span style={{
            fontFamily: "'Quicksand', sans-serif",
            fontWeight: 800,
            fontSize: 20,
            color: '#fff',
            letterSpacing: '-0.01em',
          }}>Chemistree</span>
        </div>

        {/* Right: Login + Get Started */}
        <div className="flex items-center gap-3">
          <button className="btn-ghost-nav" onClick={() => navigate('/vision')}>
            Vision
          </button>
          <button className="btn-ghost-nav" onClick={() => navigate('/login')}>
            Login
          </button>
          <button className="btn-primary-nav" onClick={() => navigate('/register')}>
            Get Started
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </nav>

      {/* ══════════════════════════════════════════
          HERO CONTENT — Truly centered on full viewport
      ══════════════════════════════════════════ */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center px-6 pointer-events-none">

        {/* Eyebrow pill */}
        <div className="pill-badge mb-7" style={{ pointerEvents: 'auto' }}>
          Chemistry Learning Platform
        </div>

        {/* Script wordmark */}
        <h1 className="brand-script" style={{ fontSize: 'clamp(3rem, 10vw, 6rem)', lineHeight: 1.1, marginBottom: 20 }}>
          Chemistree
        </h1>

        {/* Tagline */}
        <p className="hero-tagline" style={{
          fontSize: 'clamp(1rem, 2.5vw, 1.2rem)',
          color: 'rgba(230,245,230,0.97)',
          fontWeight: 600,
          maxWidth: 480,
          lineHeight: 1.7,
          marginBottom: 8,
          textShadow: '0 1px 4px rgba(255,255,255,0.25), 0 2px 16px rgba(255,255,255,0.15), 0 4px 32px rgba(0,0,0,0.6)',
        }}>
          Master chemistry through interactive lessons,<br/>
          challenges, and a growing knowledge tree.
        </p>

        <p className="hero-tagline" style={{
          fontSize: 12,
          color: 'rgba(255,255,255,0.7)',
          fontWeight: 700,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          marginTop: 36,
          textShadow: '0 1px 6px rgba(255,255,255,0.3), 0 2px 12px rgba(0,0,0,0.5)',
        }}>
          By ChemLeung
        </p>
      </div>
    </div>
  );
}