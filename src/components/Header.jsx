import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Home, Trophy, User, LogOut, History, ChevronDown, Menu, X, Languages, BookOpen, MessageSquare, Gem, ShoppingBag, Clock, AlertTriangle, Pencil, Bell, BellDot, Trash2, AlertCircle, Building2 } from 'lucide-react';
import { quizStorage } from '../utils/quizStorage';
import { forumService } from '../services/forumService';

import ChemCityUserProfileIcon from './ChemCityUserProfileIcon';

export default function Header() {
    const { currentUser, logout, userProfile, profileError } = useAuth();
    const { language, toggleLanguage, isEnglish, t, tf } = useLanguage();
    const navigate = useNavigate();
    const location = useLocation();
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showMobileNav, setShowMobileNav] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [showNotifPanel, setShowNotifPanel] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [notifs, setNotifs] = useState([]);
    const [notifLimit, setNotifLimit] = useState(10);
    const [showDeleteAllNotifsConfirm, setShowDeleteAllNotifsConfirm] = useState(false);

    useEffect(() => {
        if (!currentUser || !showNotifPanel) return;
        const unsub = forumService.subscribeToNotifications(currentUser.uid, (data) => {
            setNotifs(data);
            setUnreadCount(data.filter(n => !n.read).length);
        }, notifLimit);
        return () => unsub && unsub();
    }, [currentUser, showNotifPanel, notifLimit]);

    useEffect(() => {
        if (!showNotifPanel) {
            setNotifLimit(10);
        }
    }, [showNotifPanel]);

    const handleMarkNotifRead = async (id) => {
        try {
            await forumService.markNotificationRead(id);
        } catch { /* ignore */ }
    };

    const handleMarkAllNotifsRead = async () => {
        if (!currentUser) return;
        try {
            await forumService.markAllNotificationsRead(currentUser.uid);
        } catch { /* ignore */ }
    };

    const handleDeleteNotif = async (id) => {
        try {
            await forumService.deleteNotification(id);
        } catch { /* ignore */ }
    };

    const handleDeleteAllNotifs = async () => {
        if (!currentUser) return;
        setShowDeleteAllNotifsConfirm(true);
    };

    const confirmDeleteAllNotifs = async () => {
        if (!currentUser) return;
        try {
            await forumService.deleteAllNotifications(currentUser.uid, 200);
            setShowDeleteAllNotifsConfirm(false);
        } catch { /* ignore */ }
    };

    const formatAgo = (iso) => {
        const diffMs = Date.now() - new Date(iso).getTime();
        const mins = Math.floor(diffMs / 60000);
        if (mins < 1) return t('forum.justNow');
        if (mins < 60) return tf('forum.timeAgoMinutesShort', { count: mins });
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return tf('forum.timeAgoHoursShort', { count: hrs });
        return tf('forum.timeAgoDaysShort', { count: Math.floor(hrs / 24) });
    };

    const typeLabel = (n) => {
        switch (n.type) {
            case 'like': return t('forum.likedYourComment');
            case 'reply': return t('forum.repliedToPost');
            case 'post_like': return t('forum.likedYourPost');
            case 'reply_like': return t('forum.likedYourReply');
            case 'comment_reply': return t('forum.repliedToComment');
            case 'comment_reply_like': return t('forum.likedYourReply');
            default: return t('forum.interactedWithContent');
        }
    };

    // Get tokens from userProfile with real-time sync
    const tokens = userProfile?.tokens;
    const tokensDisplay =
        profileError && (tokens === undefined || tokens === null)
            ? '—'
            : (tokens ?? 0);

    if (location.pathname === '/login' || location.pathname === '/register') {
        return null;
    }

    const isInQuiz = location.pathname === '/quiz';

    async function handleLogoutConfirm() {
        try {
            await logout();
            navigate('/');
        } catch (error) {
            console.error('Failed to log out:', error);
        }
    }

    const handleLogoutClick = () => {
        if (isInQuiz) {
            const confirmed = window.confirm(
                t('header.confirmLogoutInQuiz')
            );
            if (!confirmed) return;
            quizStorage.clearQuizData();
            handleLogoutConfirm();
        } else {
            setShowLogoutModal(true);
        }
    };

    const handleNavigation = (path, options = {}) => {
        if (isInQuiz && path !== '/quiz') {
            const confirmed = window.confirm(
                t('header.confirmLeaveQuiz')
            );
            if (!confirmed) {
                return;
            }
            quizStorage.clearQuizData();
        }

        navigate(path, options);
        setShowUserMenu(false);
        setShowMobileNav(false);
    };

    const handleNotebookHome = () => {
        // Force Mistake Notebook to reset to the 3-button home screen even if we're already on /notebook.
        // We do this by pushing a unique navigation state nonce that MistakeNotebookPage listens for.
        handleNavigation('/notebook', { state: { forceNotebookHome: Date.now() } });
    };

    const isActive = (path) => location.pathname === path;

    return (
        <>
            <header className="fixed top-0 left-0 right-0 z-50 py-1">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="floating-island island-amber w-full md:mx-auto px-3 sm:px-3 py-0.5">
                        <div className="floating-island-content flex justify-between items-center h-14 gap-4 min-w-0">
                        {/* Logo and Brand */}
                        <div className="flex-shrink min-w-0">
                            <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleNavigation('/dashboard')}>
                                <div className="transition-transform active:scale-95">
                                    <img
                                        src="/ChemistreeIcon_square.png"
                                        alt="Chemistree"
                                        className="w-10 h-10"
                                        draggable="false"
                                    />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h1 className="text-xl font-black leading-tight whitespace-nowrap chem-sans" style={{ color: '#76A8A5' }}>
                                        Chemistree
                                    </h1>
                                    <p className="text-[10px] text-slate-500 font-bold -mt-1 hidden sm:block whitespace-nowrap overflow-hidden text-ellipsis chem-sans">
                                        by ChemLeung
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Desktop Navigation Links */}
                        {currentUser && (
                            <div className="hidden md:flex flex-1 justify-center">
                                <nav className="flex items-center gap-4">
                                <button
                                    onClick={() => handleNavigation('/dashboard')}
                                    className={`nav-orb ${isActive('/dashboard') ? 'bg-lab-blue text-white' : 'bg-white/70 text-slate-800 hover:bg-white/80'}`}
                                    aria-label={t('nav.dashboard')}
                                    title={t('nav.dashboard')}
                                >
                                    <Home size={20} />
                                    <span className="nav-orb-label font-extrabold text-slate-900">{t('nav.dashboard')}</span>
                                </button>

                                <button
                                    onClick={() => handleNavigation('/practice')}
                                    className={`nav-orb ${isActive('/practice') || isActive('/quiz') ? 'bg-chemistry-green text-white' : 'bg-white/70 text-slate-800 hover:bg-white/80'}`}
                                    aria-label={t('nav.practice')}
                                    title={t('nav.practice')}
                                >
                                    <Pencil size={20} />
                                    <span className="nav-orb-label font-extrabold text-slate-900">{t('nav.practice')}</span>
                                </button>

                                <button
                                    onClick={handleNotebookHome}
                                    className={`nav-orb ${isActive('/notebook') ? 'bg-orange-600 text-white' : 'bg-white/70 text-slate-800 hover:bg-white/80'}`}
                                    aria-label={t('dashboard.mistakeNotebook')}
                                    title={t('dashboard.mistakeNotebook')}
                                >
                                    <BookOpen size={20} />
                                    <span className="nav-orb-label font-extrabold text-slate-900">{t('dashboard.mistakeNotebook')}</span>
                                </button>

                                <button
                                    onClick={() => handleNavigation('/forum')}
                                    className={`nav-orb ${isActive('/forum') ? 'bg-purple-600 text-white' : 'bg-white/70 text-slate-800 hover:bg-white/80'}`}
                                    aria-label={t('forum.title')}
                                    title={t('forum.title')}
                                >
                                    <MessageSquare size={20} />
                                    <span className="nav-orb-label font-extrabold text-slate-900">{t('forum.title')}</span>
                                </button>

                                <button
                                    onClick={() => handleNavigation('/leaderboard')}
                                    className={`nav-orb ${isActive('/leaderboard') ? 'bg-amber-500 text-white' : 'bg-white/70 text-slate-800 hover:bg-white/80'}`}
                                    aria-label={t('leaderboard.title')}
                                    title={t('leaderboard.title')}
                                >
                                    <Trophy size={20} />
                                    <span className="nav-orb-label font-extrabold text-slate-900">{t('leaderboard.title')}</span>
                                </button>

                                <button
                                    onClick={() => handleNavigation('/chemcity')}
                                    className={`nav-orb ${isActive('/chemcity') ? 'bg-sky-600 text-white' : 'bg-white/70 text-slate-800 hover:bg-white/80'}`}
                                    aria-label="ChemCity"
                                    title="ChemCity"
                                >
                                    <Building2 size={20} />
                                    <span className="nav-orb-label font-extrabold text-slate-900">ChemCity</span>
                                </button>

                                {/* TOKENS */}
                                <button
                                    onClick={() => handleNavigation('/store')}
                                    className={`nav-orb ${isActive('/store') ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white' : 'bg-gradient-to-r from-amber-400 to-orange-500 text-white'}`}
                                    aria-label={t('store.title')}
                                    title={t('store.title')}
                                >
                                    <Gem size={20} fill="currentColor" />
                                    <span className="nav-orb-badge bg-slate-900/90">{tokensDisplay}</span>
                                    <span className="nav-orb-label font-extrabold text-slate-900">{t('store.title')}</span>
                                </button>

                                <button
                                    onClick={toggleLanguage}
                                    className="nav-orb bg-gradient-to-r from-slate-600 to-slate-700 text-white"
                                    aria-label={isEnglish ? t('auth.switchToChinese') : t('auth.switchToEnglish')}
                                    title={isEnglish ? t('auth.switchToChinese') : t('auth.switchToEnglish')}
                                >
                                    <Languages size={20} strokeWidth={3} />
                                    <span className="nav-orb-label font-extrabold text-slate-900">{isEnglish ? t('auth.languageNameChinese') : t('auth.languageNameEnglish')}</span>
                                </button>
                                </nav>
                            </div>
                        )}

                        {/* Mobile + Desktop User Menu */}
                        {currentUser && (
                            <div className="flex items-center gap-2 flex-shrink min-w-0 justify-end">
                                <button
                                    onClick={() => setShowMobileNav(!showMobileNav)}
                                    className="md:hidden p-2 rounded-lg hover:bg-slate-100 transition-all active:scale-95"
                                >
                                    {showMobileNav ? <X size={24} /> : <Menu size={24} />}
                                </button>

                                {/* Notifications (right side) */}
                                <div className="relative">
                                    <button
                                        onClick={() => setShowNotifPanel(v => !v)}
                                        className="relative p-2 rounded-lg hover:bg-white/60 transition-all active:scale-[0.99]"
                                        aria-label={t('forum.notifications')}
                                        title={t('forum.notifications')}
                                    >
                                        {unreadCount > 0 ? <BellDot size={22} className="text-purple-700" /> : <Bell size={22} className="text-slate-700" />}
                                        {unreadCount > 0 && (
                                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full w-5 h-5 flex items-center justify-center font-black">
                                                {unreadCount > 9 ? t('common.ninePlus') : unreadCount}
                                            </span>
                                        )}
                                    </button>

                                    {showNotifPanel && (
                                        <>
                                            <div className="fixed inset-0 z-40" onClick={() => setShowNotifPanel(false)} />
                                            <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border-2 border-slate-200 z-50 overflow-hidden max-h-[480px] flex flex-col">
                                                <div className="p-4 border-b flex items-center justify-between bg-slate-50">
                                                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                                        <Bell size={18} />
                                                        {t('forum.notifications')}
                                                        {unreadCount > 0 && <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5">{unreadCount}</span>}
                                                    </h3>
                                                    <div className="flex items-center gap-2">
                                                        {unreadCount > 0 && (
                                                            <button onClick={handleMarkAllNotifsRead} className="text-xs text-lab-blue hover:underline font-semibold">
                                                                {t('forum.markAllRead')}
                                                            </button>
                                                        )}
                                                        {notifs.length > 0 && (
                                                            <button
                                                                type="button"
                                                                onClick={handleDeleteAllNotifs}
                                                                className="p-1 hover:bg-rose-50 rounded text-rose-600"
                                                                aria-label={t('forum.deleteAll')}
                                                                title={t('forum.deleteAll')}
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        )}
                                                        <button onClick={() => setShowNotifPanel(false)} className="p-1 hover:bg-slate-200 rounded"><X size={16} /></button>
                                                    </div>
                                                </div>

                                                <div className="overflow-y-auto flex-1">
                                                    {notifs.length === 0 ? (
                                                        <div className="text-center py-10 text-slate-400 text-sm">{t('forum.noNotificationsYet')}</div>
                                                    ) : (
                                                        <>
                                                            {notifs.map(n => (
                                                                <div
                                                                    key={n.id}
                                                                    onClick={() => handleMarkNotifRead(n.id)}
                                                                    className={`p-4 border-b cursor-pointer hover:bg-slate-50 transition-all ${!n.read ? 'bg-blue-50' : ''}`}
                                                                >
                                                                    <div className="flex items-start gap-3">
                                                                        <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${!n.read ? 'bg-lab-blue' : 'bg-transparent'}`} />
                                                                        <ChemCityUserProfileIcon userId={n.senderId} displayName={n.senderDisplayName || t('common.someone')} size={28} />
                                                                        <div className="flex-1 min-w-0">
                                                                            <p className="text-sm text-slate-800 font-medium leading-snug">
                                                                                <span className="font-bold">{n.senderDisplayName || t('common.someone')}</span> {typeLabel(n)}
                                                                            </p>
                                                                            {n.previewText && (
                                                                                <p className="text-xs text-slate-500 mt-1 truncate">"{n.previewText}"</p>
                                                                            )}
                                                                            {n.postTitle && (
                                                                                <p className="text-xs text-lab-blue mt-0.5 truncate">→ {n.postTitle}</p>
                                                                            )}
                                                                            <p className="text-xs text-slate-400 mt-1">{formatAgo(n.createdAt)}</p>
                                                                        </div>
                                                                        <button
                                                                            onClick={(e) => { e.stopPropagation(); handleDeleteNotif(n.id); }}
                                                                            className="p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-rose-600"
                                                                            title={t('forum.delete') || 'Delete'}
                                                                        >
                                                                            <X size={16} />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                            {notifs.length >= notifLimit && (
                                                                <div className="p-3 flex justify-center">
                                                                    <button
                                                                        onClick={() => setNotifLimit((n) => n + 10)}
                                                                        className="px-4 py-2 rounded-lg font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all"
                                                                    >
                                                                        {t('forum.viewMore')}
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>

                                <div className="relative">
                                    <button
                                        onClick={() => setShowUserMenu(!showUserMenu)}
                                        className="flex items-center gap-3 px-3 py-1.5 rounded-xl hover:bg-white/60 transition-all active:scale-[0.99] border-2 border-transparent hover:border-white/60 max-w-[240px] sm:max-w-[280px]"
                                        title={currentUser.displayName || currentUser.email || t('common.anonymous')}
                                    >
                                        <ChemCityUserProfileIcon
                                            userId={currentUser?.uid}
                                            displayName={currentUser?.displayName || currentUser?.email || t('common.anonymous')}
                                            size={32}
                                            className="shadow-md flex-shrink-0"
                                        />
                                        <div className="hidden sm:block text-left min-w-0">
                                            <p
                                                className="text-sm font-bold text-slate-900 truncate max-w-[140px] lg:max-w-[180px]"
                                                title={currentUser.displayName || t('common.anonymous')}
                                            >
                                                {currentUser.displayName || t('common.anonymous')}
                                            </p>
                                            <p
                                                className="text-xs text-slate-700 truncate max-w-[140px] lg:max-w-[180px]"
                                                title={currentUser.email || ''}
                                            >
                                                {currentUser.email}
                                            </p>
                                        </div>
                                        <ChevronDown size={16} className="text-slate-600 hidden sm:block flex-shrink-0" />
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
                                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-all text-left active:scale-[0.99]"
                                                >
                                                    <User size={18} className="text-slate-700" />
                                                    <span className="font-bold text-slate-900">
                                                        {t('profile.profileSettings')}
                                                    </span>
                                                </button>
                                                <button
                                                    onClick={() => handleNavigation('/history')}
                                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-all text-left border-t border-slate-100 active:scale-[0.99]"
                                                >
                                                    <History size={18} className="text-slate-700" />
                                                    <span className="font-bold text-slate-900">
                                                        {t('header.myHistory')}
                                                    </span>
                                                </button>
                                                <button
                                                    onClick={() => handleNavigation('/token-log')}
                                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-all text-left border-t border-slate-100 active:scale-[0.99]"
                                                >
                                                    <Clock size={18} className="text-amber-500" />
                                                    <span className="font-bold text-slate-900">
                                                        {t('header.tokenHistory')}
                                                    </span>
                                                </button>
                                                <button
                                                    onClick={handleLogoutClick}
                                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 transition-all text-left border-t border-slate-100 active:scale-[0.99]"
                                                >
                                                    <LogOut size={18} className="text-red-600" />
                                                    <span className="font-bold text-red-600">
                                                        {t('nav.logout')}
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
                </div>

                {/* Mobile Navigation Menu */}
                {showMobileNav && currentUser && (
                    <>
                        <div
                            className="fixed inset-0 bg-black bg-opacity-25 z-30"
                            onClick={() => setShowMobileNav(false)}
                        />
                        <div className="md:hidden fixed top-[64px] left-0 right-0 bg-white border-b-2 border-slate-200 shadow-xl z-40 animate-in slide-in-from-top duration-200">
                            <nav className="flex flex-col p-2">
                                {/* Token Display - Mobile */}
                                <div className="mb-2 p-3 bg-gradient-to-r from-amber-400 to-orange-500 rounded-lg">
                                    <div className="flex items-center justify-between text-white">
                                        <div className="flex items-center gap-2">
                                        <Gem size={20} fill="currentColor" />
                                        <span className="font-black text-lg">{tokensDisplay}</span>
                                        <span className="text-sm opacity-90">{t('header.tokens')}</span>
                                    </div>
                                    <button
                                        onClick={() => handleNavigation('/store')}
                                        className="px-3 py-1 bg-white/20 rounded-lg font-bold text-sm hover:bg-white/30 transition-all active:scale-[0.98]"
                                    >
                                        <ShoppingBag size={16} className="inline mr-1" />
                                        {t('store.title')}
                                    </button>
                                </div>
                            </div>

                                <button
                                    onClick={() => handleNavigation('/dashboard')}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-lg font-bold transition-all active:scale-[0.99] ${isActive('/dashboard')
                                            ? 'bg-lab-blue text-white'
                                            : 'text-slate-900 hover:bg-slate-100'
                                        }`}
                                >
                                    <Home size={20} />
                                    <span>{t('nav.dashboard')}</span>
                                </button>
                                <button
                                    onClick={() => handleNavigation('/practice')}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-lg font-bold transition-all active:scale-[0.99] ${isActive('/practice') || isActive('/quiz')
                                            ? 'bg-chemistry-green text-white'
                                            : 'text-slate-900 hover:bg-slate-100'
                                        }`}
                                >
                                    <img
                                        src="/ChemistreeIcon_square.png"
                                        alt="Chemistree"
                                        className="w-8 h-8"
                                        draggable="false"
                                    />
                                    <span>{t('nav.practice')}</span>
                                </button>
                                
                                <button
                                    onClick={handleNotebookHome}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-lg font-bold transition-all active:scale-[0.99] ${isActive('/notebook')
                                            ? 'bg-orange-600 text-white'
                                            : 'text-slate-900 hover:bg-slate-100'
                                        }`}
                                >
                                    <BookOpen size={20} />
                                    <span>{t('dashboard.mistakeNotebook')}</span>
                                </button>

                                <button
                                    onClick={() => handleNavigation('/forum')}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-lg font-bold transition-all active:scale-[0.99] ${isActive('/forum')
                                            ? 'bg-purple-600 text-white'
                                            : 'text-slate-900 hover:bg-slate-100'
                                        }`}
                                >
                                    <MessageSquare size={20} />
                                    <span>{t('forum.title')}</span>
                                </button>

                                <button
                                    onClick={() => handleNavigation('/leaderboard')}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-lg font-bold transition-all active:scale-[0.99] ${isActive('/leaderboard')
                                            ? 'bg-amber-500 text-white'
                                            : 'text-slate-900 hover:bg-slate-100'
                                        }`}
                                >
                                    <Trophy size={20} />
                                    <span>{t('leaderboard.title')}</span>
                                </button>

                                <button
                                    onClick={() => handleNavigation('/chemcity')}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-lg font-bold transition-all active:scale-[0.99] ${isActive('/chemcity')
                                            ? 'bg-sky-600 text-white'
                                            : 'text-slate-900 hover:bg-slate-100'
                                        }`}
                                >
                                    <Building2 size={20} />
                                    <span>ChemCity</span>
                                </button>
                                <button
                                    onClick={() => handleNavigation('/history')}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-lg font-bold transition-all active:scale-[0.99] ${isActive('/history')
                                            ? 'bg-purple-600 text-white'
                                            : 'text-slate-900 hover:bg-slate-100'
                                        }`}
                                >
                                    <History size={20} />
                                    <span>{t('history.title')}</span>
                                </button>

                                <button
                                    onClick={() => {
                                        toggleLanguage();
                                        setShowMobileNav(false);
                                    }}
                                    className="flex items-center gap-3 px-4 py-3 rounded-lg font-bold transition-all active:scale-[0.99] bg-gradient-to-r from-amber-400 to-orange-500 text-white hover:from-amber-500 hover:to-orange-600 mt-2 shadow-md"
                                >
                                    <Languages size={20} strokeWidth={3} />
                                    <span>{isEnglish ? t('auth.languageNameChinese') : t('auth.languageNameEnglish')}</span>
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
                                        {t('dashboard.confirmLogout')}
                                    </h3>
                                    <p className="text-sm text-slate-500">
                                        {t('dashboard.areYouSureLogout')}
                                    </p>
                                </div>
                            </div>
                            <p className="text-slate-600 mb-6">
                                {t('header.logoutWarning')}
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowLogoutModal(false)}
                                    className="flex-1 px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all"
                                >
                                    {t('common.cancel')}
                                </button>
                                <button
                                    onClick={() => {
                                        setShowLogoutModal(false);
                                        handleLogoutConfirm();
                                    }}
                                    className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all flex items-center justify-center gap-2"
                                >
                                    <LogOut size={18} />
                                    {t('nav.logout')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showDeleteAllNotifsConfirm && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" onClick={() => setShowDeleteAllNotifsConfirm(false)}>
                    <div className="absolute inset-0 bg-black/40" />
                    <div
                        className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border-2 border-slate-200 overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-4 border-b bg-slate-50 flex items-center gap-3">
                            <AlertCircle className="text-rose-600" size={18} />
                            <h4 className="font-black text-slate-800">{t('forum.deleteAllNotificationsTitle')}</h4>
                        </div>
                        <div className="p-4 text-sm text-slate-700">
                            {t('forum.deleteAllNotificationsBody')}
                        </div>
                        <div className="p-4 border-t bg-white flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setShowDeleteAllNotifsConfirm(false)}
                                className="px-4 py-2 rounded-lg font-bold bg-slate-200 text-slate-700 hover:bg-slate-300 transition-all"
                            >
                                {t('common.cancel')}
                            </button>
                            <button
                                type="button"
                                onClick={confirmDeleteAllNotifs}
                                className="px-4 py-2 rounded-lg font-bold bg-rose-600 text-white hover:bg-rose-700 transition-all"
                            >
                                {t('common.delete')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}