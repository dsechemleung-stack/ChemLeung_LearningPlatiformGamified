import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Mail, Lock, User, UserPlus, AlertCircle, Languages, ArrowLeft } from 'lucide-react';

export default function RegisterPage() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const { t, toggleLanguage, isEnglish } = useLanguage();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    if (password !== confirmPassword) return setError(t('auth.passwordsNoMatch'));
    if (password.length < 6) return setError(t('auth.passwordMinLength'));
    if (displayName.trim().length < 2) return setError(t('auth.enterFullName'));
    try {
      setError('');
      setLoading(true);
      await signup(email, password, displayName);
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') setError(t('auth.emailAlreadyInUse'));
      else if (err.code === 'auth/invalid-email') setError(t('auth.invalidEmail'));
      else if (err.code === 'auth/weak-password') setError(t('auth.weakPassword'));
      else setError(t('auth.failedCreateAccount'));
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen w-full relative overflow-hidden flex items-center justify-center p-4"
      style={{ background: '#0a1a18' }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Pacifico&family=Quicksand:wght@500;600;700;800&display=swap');
        .auth-script {
          font-family: 'Pacifico', cursive;
          background: linear-gradient(135deg, #C5D7B5 0%, #76A8A5 50%, #ffffff 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .reg-input {
          width: 100%;
          padding: 13px 16px 13px 48px;
          background: rgba(255,255,255,0.06);
          border: 1.5px solid rgba(197,215,181,0.2);
          border-radius: 14px;
          color: #fff;
          font-family: 'Quicksand', sans-serif;
          font-weight: 600;
          font-size: 14px;
          outline: none;
          transition: all 0.2s ease;
        }
        .reg-input::placeholder { color: rgba(255,255,255,0.3); }
        .reg-input:focus {
          border-color: #76A8A5;
          box-shadow: 0 0 0 3px rgba(118,168,165,0.18);
          background: rgba(255,255,255,0.09);
        }
        .reg-label {
          font-family: 'Quicksand', sans-serif;
          font-weight: 700;
          font-size: 13px;
          color: rgba(197,215,181,0.85);
          margin-bottom: 7px;
          display: block;
        }
        .reg-btn {
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, #76A8A5, #5d9190);
          color: #fff;
          border: none;
          border-radius: 14px;
          font-family: 'Quicksand', sans-serif;
          font-weight: 800;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 20px rgba(118,168,165,0.4);
          display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .reg-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 28px rgba(118,168,165,0.5);
        }
        .reg-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .lang-btn {
          font-family: 'Quicksand', sans-serif;
          font-weight: 700;
          font-size: 13px;
          display: flex; align-items: center; gap: 6px;
          padding: 8px 16px;
          background: rgba(255,255,255,0.07);
          border: 1.5px solid rgba(255,255,255,0.15);
          border-radius: 10px;
          color: rgba(255,255,255,0.8);
          cursor: pointer;
          transition: all 0.2s;
          position: fixed; top: 24px; right: 24px; z-index: 50;
        }
        .lang-btn:hover { background: rgba(118,168,165,0.15); border-color: rgba(118,168,165,0.4); color: #fff; }
        .back-btn {
          width: 46px; height: 46px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.14);
          background: rgba(255,255,255,0.06); color: #fff; display: flex; align-items: center;
          justify-content: center; cursor: pointer; transition: transform .12s ease, background .12s ease;
          position: fixed; top: 24px; left: 24px; z-index: 50; touch-action: manipulation;
          backdrop-filter: blur(10px);
        }
        .back-btn:active { transform: scale(0.98); }
        .back-btn:hover { background: rgba(255,255,255,0.10); }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* ── Background Video ── */}
      <div className="absolute inset-0 flex items-center justify-center" style={{ background: '#0a1a18' }}>
        <video className="max-w-full max-h-full w-auto h-auto object-contain" src="/ChemistreeIcon.mp4"
          autoPlay muted loop playsInline preload="auto" style={{ opacity: 0.45 }} />
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse 80% 80% at 50% 50%, rgba(10,26,24,0.2) 0%, rgba(10,26,24,0.9) 100%)',
        }} />
      </div>

      {/* Language Toggle */}
      <button className="lang-btn" onClick={toggleLanguage}>
        <Languages size={16} />
        <span>{isEnglish ? t('auth.switchToChinese') : t('auth.switchToEnglish')}</span>
      </button>

      {/* Back Button */}
      <button
        type="button"
        onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
        className="back-btn"
        title="Back"
      >
        <ArrowLeft size={18} />
      </button>

      {/* Card */}
      <div className="relative z-10 w-full max-w-md" style={{ fontFamily: "'Quicksand', sans-serif" }}>

        {/* Logo Header */}
        <div className="text-center mb-6">
          <div style={{ filter: 'drop-shadow(0 0 16px rgba(118,168,165,0.45))' }}
            className="flex justify-center mb-4">
            <div style={{
              clipPath: 'polygon(50% 0%, 95% 25%, 95% 75%, 50% 100%, 5% 75%, 5% 25%)',
              background: 'linear-gradient(135deg, #76A8A5, #C5D7B5)',
              width: 80, height: 80,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{
                clipPath: 'polygon(50% 0%, 95% 25%, 95% 75%, 50% 100%, 5% 75%, 5% 25%)',
                background: '#0d1f1e',
                width: 72, height: 72,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <img src="/ChemistreeIcon_square.png" alt="Chemistree" draggable="false"
                  style={{ width: 48, height: 48, objectFit: 'contain' }} />
              </div>
            </div>
          </div>
          <h1 className="auth-script" style={{ fontSize: 32 }}>Chemistree</h1>
          <p style={{ color: 'rgba(197,215,181,0.7)', fontSize: 14, fontWeight: 600, marginTop: 4 }}>
            {t('tagline')}
          </p>
        </div>

        {/* Glass Form Card */}
        <div style={{
          background: 'rgba(255,255,255,0.06)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(197,215,181,0.15)',
          borderRadius: 24,
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.07)',
        }}>
          {/* Card Header */}
          <div style={{
            padding: '18px 26px',
            borderBottom: '1px solid rgba(197,215,181,0.1)',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{
              background: 'rgba(118,168,165,0.2)',
              borderRadius: 10, padding: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <UserPlus size={18} color="#76A8A5" />
            </div>
            <div>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>{t('auth.register')}</div>
              <div style={{ color: 'rgba(197,215,181,0.6)', fontSize: 12, fontWeight: 600 }}>{t('auth.joinCommunity')}</div>
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{ padding: '22px 26px', display: 'flex', flexDirection: 'column', gap: 14 }}>

            {error && (
              <div style={{
                background: 'rgba(220,60,60,0.15)',
                border: '1.5px solid rgba(220,60,60,0.35)',
                borderRadius: 12, padding: '11px 14px',
                display: 'flex', alignItems: 'flex-start', gap: 10,
              }}>
                <AlertCircle size={17} color="#f87171" style={{ flexShrink: 0, marginTop: 1 }} />
                <p style={{ color: '#fca5a5', fontSize: 13, fontWeight: 600, margin: 0 }}>{error}</p>
              </div>
            )}

            {/* Display Name */}
            <div>
              <label className="reg-label">{t('auth.fullName')}</label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#76A8A5' }} />
                <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)}
                  required className="reg-input" placeholder={t('auth.fullNamePlaceholder')} />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="reg-label">{t('auth.email')}</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#76A8A5' }} />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  required className="reg-input" placeholder={t('auth.emailPlaceholder')} />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="reg-label">{t('auth.password')}</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#76A8A5' }} />
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  required className="reg-input" placeholder={t('auth.passwordPlaceholder')} />
              </div>
              <p style={{ color: 'rgba(197,215,181,0.5)', fontSize: 11, fontWeight: 600, marginTop: 6, marginLeft: 2 }}>
                {t('auth.minimumCharacters')}
              </p>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="reg-label">{t('auth.confirmPassword')}</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#76A8A5' }} />
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                  required className="reg-input" placeholder={t('auth.passwordPlaceholder')} />
              </div>
            </div>

            <button type="submit" disabled={loading} className="reg-btn" style={{ marginTop: 6 }}>
              {loading ? (
                <>
                  <div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  <span>{t('auth.creatingAccount')}</span>
                </>
              ) : (
                <>
                  <UserPlus size={18} />
                  <span>{t('auth.createAccount')}</span>
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div style={{
            padding: '14px 26px',
            borderTop: '1px solid rgba(197,215,181,0.1)',
            textAlign: 'center',
            background: 'rgba(0,0,0,0.1)',
          }}>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: 600 }}>
              {t('auth.alreadyHaveAccount')}{' '}
              <Link to="/login" style={{ color: '#76A8A5', fontWeight: 800, textDecoration: 'none' }}
                onMouseEnter={e => e.target.style.color = '#C5D7B5'}
                onMouseLeave={e => e.target.style.color = '#76A8A5'}>
                {t('auth.loginHere')}
              </Link>
            </p>
          </div>
        </div>

        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: 600, marginTop: 18 }}>
          {t('auth.secureRegistration')}
        </p>
      </div>
    </div>
  );
}