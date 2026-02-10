import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Beaker, Mail, Lock, LogIn, AlertCircle, Sparkles, Languages } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { t, toggleLanguage } = useLanguage();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      setError('');
      setLoading(true);
      await login(email, password);
      navigate('/');
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/user-not-found') {
        setError(t('auth.noAccountFound'));
      } else if (err.code === 'auth/wrong-password') {
        setError(t('auth.incorrectPassword'));
      } else if (err.code === 'auth/invalid-email') {
        setError(t('auth.invalidEmail'));
      } else {
        setError(t('auth.failedLogin'));
      }
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4">
      {/* Language Toggle - Top Right */}
      <button
        onClick={toggleLanguage}
        className="fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md border-2 border-white/20 rounded-xl font-bold text-white hover:bg-white/20 transition-all shadow-lg"
        title={t('auth.switchToChinese')}
      >
        <Languages size={20} strokeWidth={3} />
        <span className="text-sm">{t('auth.switchToEnglish')}</span>
      </button>

      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Floating Chemistry Icons */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 text-6xl opacity-10 animate-float">⚛️</div>
        <div className="absolute top-1/3 right-1/4 text-5xl opacity-10 animate-float animation-delay-1000">🧪</div>
        <div className="absolute bottom-1/4 left-1/3 text-7xl opacity-10 animate-float animation-delay-2000">🔬</div>
        <div className="absolute top-1/2 right-1/3 text-4xl opacity-10 animate-float animation-delay-3000">⚗️</div>
      </div>

      <div className="max-w-md w-full relative z-10">
        {/* Logo Header */}
        <div className="text-center mb-8 animate-in fade-in slide-in-from-top duration-700">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur-xl opacity-75 animate-pulse"></div>
              <div className="relative bg-gradient-to-r from-blue-500 to-purple-600 p-5 rounded-2xl shadow-2xl transform hover:scale-110 transition-transform duration-300">
                <Beaker className="text-white" size={56} strokeWidth={2.5} />
              </div>
            </div>
          </div>
          <h1 className="text-4xl font-black text-white mb-2 tracking-tight">
            ChemLeung
          </h1>
          <p className="text-blue-200 text-lg font-medium">
            {t('tagline')}
          </p>
          <div className="flex items-center justify-center gap-2 mt-3 text-blue-300 text-sm">
            <Sparkles size={16} />
            <span>{t('auth.signInToContinue')}</span>
          </div>
        </div>

        {/* Login Form */}
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden animate-in fade-in slide-in-from-bottom duration-700">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-center">
            <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
              <LogIn size={24} />
              {t('auth.welcomeBack')}
            </h2>
            <p className="text-blue-100 text-sm mt-1">
              {t('auth.enterCredentials')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {error && (
              <div className="bg-red-500/20 backdrop-blur border-2 border-red-400/50 rounded-xl p-4 flex items-start gap-3 animate-in shake">
                <AlertCircle className="text-red-300 flex-shrink-0 mt-0.5" size={20} />
                <p className="text-red-100 text-sm font-medium">{error}</p>
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-white/90 ml-1">
                {t('auth.email')}
              </label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-blue-300 group-focus-within:text-blue-400 transition-colors" size={20} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-12 pr-4 py-4 bg-white/10 backdrop-blur border-2 border-white/20 rounded-xl focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all text-white placeholder-white/50 font-medium"
                  placeholder="your.email@example.com"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-white/90 ml-1">
                {t('auth.password')}
              </label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-blue-300 group-focus-within:text-blue-400 transition-colors" size={20} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-12 pr-4 py-4 bg-white/10 backdrop-blur border-2 border-white/20 rounded-xl focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all text-white placeholder-white/50 font-medium"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="relative w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg shadow-2xl hover:shadow-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all overflow-hidden group"
            >
              <div className="relative flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>{t('auth.signingIn')}</span>
                  </>
                ) : (
                  <>
                    <LogIn size={20} />
                    <span>{t('auth.signIn')}</span>
                  </>
                )}
              </div>
            </button>
          </form>

          {/* Register Link */}
          <div className="bg-white/5 px-8 py-6 border-t border-white/10 text-center">
            <p className="text-white/70 text-sm">
              {t('auth.dontHaveAccount')} {' '}
              <Link 
                to="/register" 
                className="text-blue-300 font-bold hover:text-blue-200 transition-colors hover:underline"
              >
                {t('auth.createAccountNow')}
              </Link>
            </p>
          </div>
        </div>

        {/* Footer Note */}
        <p className="text-center text-white/50 text-xs mt-6 animate-in fade-in duration-1000">
          {t('auth.secureLogin')}
        </p>
      </div>

      {/* Custom CSS for animations */}
      <style jsx>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        .animation-delay-1000 {
          animation-delay: 1s;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-3000 {
          animation-delay: 3s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        .animate-in {
          animation: fadeIn 0.5s ease-out;
        }
        .shake {
          animation: shake 0.5s;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}