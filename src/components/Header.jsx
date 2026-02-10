import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Beaker, Home, Trophy, User, LogOut, History, ChevronDown, Menu, X, Languages, BookOpen, MessageSquare, Zap, ShoppingBag, Clock, AlertTriangle } from 'lucide-react';
import { quizStorage } from '../utils/quizStorage';

// Icon mapping
const iconMap = {
  flask_blue: '🧪', atom_green: '⚛️', molecule: '🔬', fire: '🔥',
  lightning: '⚡', crystal: '💎', explosion: '💥', star: '⭐',
  crown: '👑', trophy: '🏆'
};

export default function Header() {
    const { currentUser, logout, userProfile } = useAuth();
    const { language, toggleLanguage, isEnglish } = useLanguage();
    const navigate = useNavigate();
    const location = useLocation();
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showMobileNav, setShowMobileNav] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);

    // Get tokens from userProfile with real-time sync
    const tokens = userProfile?.tokens || 0;
    const equipped = userProfile?.equipped || {};
    const profileColor = userProfile?.profileColor || '#2563eb'; // Default blue

    if (location.pathname === '/login' || location.pathname === '/register') {
        return null;
    }

    const isInQuiz = location.pathname === '/quiz';

    async function handleLogoutConfirm() {
        try {
            await logout();
            navigate('/login');
        } catch (error) {
            console.error('Failed to log out:', error);
        }
    }

    const handleLogoutClick = () => {
        if (isInQuiz) {
            const confirmed = window.confirm(
                "Are you sure you want to logout?\n\n⚠️ You are in the middle of a quiz. Your progress will be lost!"
            );
            if (!confirmed) return;
            quizStorage.clearQuizData();
            handleLogoutConfirm();
        } else {
            setShowLogoutModal(true);
        }
    };

    const handleNavigation = (path) => {
        if (isInQuiz && path !== '/quiz') {
            const confirmed = window.confirm(
                "Are you sure you want to leave the quiz?\n\n⚠️ Your current progress will be lost!"
            );
            if (!confirmed) {
                return;
            }
            quizStorage.clearQuizData();
        }

        navigate(path);
        setShowUserMenu(false);
        setShowMobileNav(false);
    };

    const isActive = (path) => location.pathname === path;

    // Get equipped profile pic icon
    const profileIcon = equipped.profilePic || 'flask_blue';
    const displayIcon = iconMap[profileIcon] || '🧪';

    return (
        <>
            <header className="bg-white border-b-2 border-slate-200 shadow-sm sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        {/* Logo and Brand */}
                        <div className="flex items-center gap-3 cursor-pointer" onClick={() => handleNavigation('/dashboard')}>
                            <div className="bg-lab-blue p-2 rounded-lg">
                                <Beaker className="text-white" size={24} />
                            </div>
                            <div>
                                <h1 className="text-xl font-black text-lab-blue leading-tight">
                                    ChemLeung
                                </h1>
                                <p className="text-[10px] text-slate-700 font-bold -mt-1 hidden sm:block">
                                    {isEnglish ? 'HKDSE MCQ Practice Platform' : 'HKDSE MCQ 練習平台'}
                                </p>
                            </div>
                        </div>

                        {/* Desktop Navigation Links */}
                        {currentUser && (
                            <nav className="hidden md:flex items-center gap-2">
                                <button
                                    onClick={() => handleNavigation('/dashboard')}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all ${isActive('/dashboard')
                                            ? 'bg-lab-blue text-white shadow-md'
                                            : 'text-slate-800 hover:bg-slate-100 border-2 border-transparent hover:border-slate-200'
                                        }`}
                                >
                                    <Home size={18} />
                                    <span>{isEnglish ? 'Dashboard' : '總覧'}</span>
                                </button>
                                <button
                                    onClick={() => handleNavigation('/')}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all ${isActive('/') || isActive('/quiz')
                                            ? 'bg-chemistry-green text-white shadow-md'
                                            : 'text-slate-800 hover:bg-slate-100 border-2 border-transparent hover:border-slate-200'
                                        }`}
                                >
                                    <Beaker size={18} />
                                    <span>{isEnglish ? 'Practice' : '練習'}</span>
                                </button>

                                <button
                                    onClick={() => handleNavigation('/notebook')}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all ${isActive('/notebook')
                                            ? 'bg-orange-600 text-white shadow-md'
                                            : 'text-slate-800 hover:bg-slate-100 border-2 border-transparent hover:border-slate-200'
                                        }`}
                                >
                                    <BookOpen size={18} />
                                    <span>{isEnglish ? 'Mistakes' : '錯題簿'}</span>
                                </button>

                                <button
                                    onClick={() => handleNavigation('/forum')}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all ${isActive('/forum')
                                            ? 'bg-purple-600 text-white shadow-md'
                                            : 'text-slate-800 hover:bg-slate-100 border-2 border-transparent hover:border-slate-200'
                                        }`}
                                >
                                    <MessageSquare size={18} />
                                    <span>{isEnglish ? 'Forum' : '論壇'}</span>
                                </button>

                                <button
                                    onClick={() => handleNavigation('/leaderboard')}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all ${isActive('/leaderboard')
                                            ? 'bg-amber-500 text-white shadow-md'
                                            : 'text-slate-800 hover:bg-slate-100 border-2 border-transparent hover:border-slate-200'
                                        }`}
                                >
                                    <Trophy size={18} />
                                    <span>{isEnglish ? 'Leaderboard' : '排行榜'}</span>
                                </button>
                                
                                {/* TOKEN DISPLAY */}
                                <button
                                    onClick={() => handleNavigation('/store')}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all shadow-md ${isActive('/store')
                                            ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                                            : 'bg-gradient-to-r from-amber-400 to-orange-500 text-white hover:from-amber-500 hover:to-orange-600'
                                        }`}
                                >
                                    <Zap size={18} fill="currentColor" />
                                    <span className="font-black">{tokens}</span>
                                </button>

                                <button
                                    onClick={toggleLanguage}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg font-black transition-all bg-gradient-to-r from-slate-600 to-slate-700 text-white hover:from-slate-700 hover:to-slate-800 shadow-md border-2 border-white ml-2"
                                    title={isEnglish ? 'Switch to Traditional Chinese' : '切換至英文'}
                                >
                                    <Languages size={18} strokeWidth={3} />
                                    <span className="text-sm">{isEnglish ? '繁' : 'EN'}</span>
                                </button>
                            </nav>
                        )}

                        {/* Mobile + Desktop User Menu */}
                        {currentUser && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setShowMobileNav(!showMobileNav)}
                                    className="md:hidden p-2 rounded-lg hover:bg-slate-100 transition-all"
                                >
                                    {showMobileNav ? <X size={24} /> : <Menu size={24} />}
                                </button>

                                <div className="relative">
                                    <button
                                        onClick={() => setShowUserMenu(!showUserMenu)}
                                        className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-slate-100 transition-all border-2 border-transparent hover:border-slate-200"
                                    >
                                        {/* Profile Icon - with equipped item and custom color */}
                                        <div 
                                            className="w-8 h-8 rounded-full flex items-center justify-center shadow-md text-lg"
                                            style={{ background: `linear-gradient(135deg, ${profileColor}, ${profileColor}dd)` }}
                                        >
                                            {displayIcon}
                                        </div>
                                        <div className="hidden sm:block text-left">
                                            <p className="text-sm font-bold text-slate-900">
                                                {currentUser.displayName || 'User'}
                                            </p>
                                            <p className="text-xs text-slate-600 truncate max-w-[150px]">
                                                {currentUser.email}
                                            </p>
                                        </div>
                                        <ChevronDown size={16} className="text-slate-600 hidden sm:block" />
                                    </button>

                                    {showUserMenu && (
                                        <>
                                            <div
                                                className="fixed inset-0 z-40"
                                                onClick={() => setShowUserMenu(false)}
                                            />
                                            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border-2 border-slate-200 z-50 overflow-hidden">
                                                <button
                                                    onClick={() => handleNavigation('/profile')}
                                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-all text-left"
                                                >
                                                    <User size={18} className="text-slate-700" />
                                                    <span className="font-bold text-slate-900">
                                                        {isEnglish ? 'Profile Settings' : '個人設定'}
                                                    </span>
                                                </button>
                                                <button
                                                    onClick={() => handleNavigation('/history')}
                                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-all text-left border-t border-slate-100"
                                                >
                                                    <History size={18} className="text-slate-700" />
                                                    <span className="font-bold text-slate-900">
                                                        {isEnglish ? 'My History' : '我的歷史'}
                                                    </span>
                                                </button>
                                                <button
                                                    onClick={() => handleNavigation('/token-log')}
                                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-all text-left border-t border-slate-100"
                                                >
                                                    <Clock size={18} className="text-amber-500" />
                                                    <span className="font-bold text-slate-900">
                                                        {isEnglish ? 'Token History' : '代幣歷史'}
                                                    </span>
                                                </button>
                                                <button
                                                    onClick={handleLogoutClick}
                                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 transition-all text-left border-t border-slate-100"
                                                >
                                                    <LogOut size={18} className="text-red-600" />
                                                    <span className="font-bold text-red-600">
                                                        {isEnglish ? 'Logout' : '登出'}
                                                    </span>
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Mobile Navigation Menu */}
                {showMobileNav && currentUser && (
                    <>
                        <div
                            className="fixed inset-0 bg-black bg-opacity-25 z-30"
                            onClick={() => setShowMobileNav(false)}
                        />
                        <div className="md:hidden fixed top-16 left-0 right-0 bg-white border-b-2 border-slate-200 shadow-xl z-40 animate-in slide-in-from-top duration-200">
                            <nav className="flex flex-col p-2">
                                {/* Token Display - Mobile */}
                                <div className="mb-2 p-3 bg-gradient-to-r from-amber-400 to-orange-500 rounded-lg">
                                    <div className="flex items-center justify-between text-white">
                                        <div className="flex items-center gap-2">
                                            <Zap size={20} fill="currentColor" />
                                            <span className="font-black text-lg">{tokens}</span>
                                            <span className="text-sm opacity-90">{isEnglish ? 'tokens' : '代幣'}</span>
                                        </div>
                                        <button
                                            onClick={() => handleNavigation('/store')}
                                            className="px-3 py-1 bg-white/20 rounded-lg font-bold text-sm hover:bg-white/30"
                                        >
                                            <ShoppingBag size={16} className="inline mr-1" />
                                            {isEnglish ? 'Store' : '商店'}
                                        </button>
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleNavigation('/dashboard')}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-lg font-bold transition-all ${isActive('/dashboard')
                                            ? 'bg-lab-blue text-white'
                                            : 'text-slate-900 hover:bg-slate-100'
                                        }`}
                                >
                                    <Home size={20} />
                                    <span>{isEnglish ? 'Dashboard' : '總覧'}</span>
                                </button>
                                <button
                                    onClick={() => handleNavigation('/')}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-lg font-bold transition-all ${isActive('/') || isActive('/quiz')
                                            ? 'bg-chemistry-green text-white'
                                            : 'text-slate-900 hover:bg-slate-100'
                                        }`}
                                >
                                    <Beaker size={20} />
                                    <span>{isEnglish ? 'Practice' : '練習'}</span>
                                </button>
                                
                                <button
                                    onClick={() => handleNavigation('/notebook')}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-lg font-bold transition-all ${isActive('/notebook')
                                            ? 'bg-orange-600 text-white'
                                            : 'text-slate-900 hover:bg-slate-100'
                                        }`}
                                >
                                    <BookOpen size={20} />
                                    <span>{isEnglish ? 'Mistake Notebook' : '錯題簿'}</span>
                                </button>

                                <button
                                    onClick={() => handleNavigation('/forum')}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-lg font-bold transition-all ${isActive('/forum')
                                            ? 'bg-purple-600 text-white'
                                            : 'text-slate-900 hover:bg-slate-100'
                                        }`}
                                >
                                    <MessageSquare size={20} />
                                    <span>{isEnglish ? 'Forum' : '論壇'}</span>
                                </button>

                                <button
                                    onClick={() => handleNavigation('/leaderboard')}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-lg font-bold transition-all ${isActive('/leaderboard')
                                            ? 'bg-amber-500 text-white'
                                            : 'text-slate-900 hover:bg-slate-100'
                                        }`}
                                >
                                    <Trophy size={20} />
                                    <span>{isEnglish ? 'Leaderboard' : '排行榜'}</span>
                                </button>
                                <button
                                    onClick={() => handleNavigation('/history')}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-lg font-bold transition-all ${isActive('/history')
                                            ? 'bg-purple-600 text-white'
                                            : 'text-slate-900 hover:bg-slate-100'
                                        }`}
                                >
                                    <History size={20} />
                                    <span>{isEnglish ? 'History' : '歷史'}</span>
                                </button>

                                <button
                                    onClick={() => {
                                        toggleLanguage();
                                        setShowMobileNav(false);
                                    }}
                                    className="flex items-center gap-3 px-4 py-3 rounded-lg font-bold transition-all bg-gradient-to-r from-amber-400 to-orange-500 text-white hover:from-amber-500 hover:to-orange-600 mt-2 shadow-md"
                                >
                                    <Languages size={20} strokeWidth={3} />
                                    <span>{isEnglish ? '繁體中文' : 'English'}</span>
                                </button>
                            </nav>
                        </div>
                    </>
                )}
            </header>

            {/* Logout Confirmation Modal */}
            {showLogoutModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-in zoom-in duration-200">
                        <div className="p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                                    <AlertTriangle className="text-red-600" size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-800">
                                        {isEnglish ? 'Confirm Logout' : '確認登出'}
                                    </h3>
                                    <p className="text-sm text-slate-500">
                                        {isEnglish ? 'Are you sure?' : '您確定嗎？'}
                                    </p>
                                </div>
                            </div>
                            <p className="text-slate-600 mb-6">
                                {isEnglish 
                                    ? 'You will be logged out of your account. Any unsaved progress will be lost.' 
                                    : '您將登出帳戶。任何未儲存的進度將會遺失。'}
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowLogoutModal(false)}
                                    className="flex-1 px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all"
                                >
                                    {isEnglish ? 'Cancel' : '取消'}
                                </button>
                                <button
                                    onClick={() => {
                                        setShowLogoutModal(false);
                                        handleLogoutConfirm();
                                    }}
                                    className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all flex items-center justify-center gap-2"
                                >
                                    <LogOut size={18} />
                                    {isEnglish ? 'Logout' : '登出'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}