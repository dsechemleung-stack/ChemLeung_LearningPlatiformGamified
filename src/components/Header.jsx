import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Beaker, Home, Trophy, User, LogOut, History, ChevronDown, Menu, X } from 'lucide-react';
import { quizStorage } from '../utils/quizStorage';

export default function Header() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);

  // Don't show header on login/register pages
  if (location.pathname === '/login' || location.pathname === '/register') {
    return null;
  }

  // Check if user is currently in a quiz
  const isInQuiz = location.pathname === '/quiz';

  async function handleLogout() {
    // Warn if in quiz
    if (isInQuiz) {
      const confirmed = window.confirm(
        "Are you sure you want to logout?\n\n⚠️ You are in the middle of a quiz. Your progress will be lost!"
      );
      if (!confirmed) return;
    }

    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  }

  const handleNavigation = (path) => {
    // If currently in quiz and trying to navigate away, show warning
    if (isInQuiz && path !== '/quiz') {
      const confirmed = window.confirm(
        "Are you sure you want to leave the quiz?\n\n⚠️ Your current progress will be lost!"
      );
      if (!confirmed) {
        return;
      }
      // Clear quiz data if user confirms
      quizStorage.clearQuizData();
    }

    navigate(path);
    setShowUserMenu(false);
    setShowMobileNav(false);
  };

  const isActive = (path) => location.pathname === path;

  return (
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
              <p className="text-[10px] text-slate-500 font-semibold -mt-1 hidden sm:block">
                HKDSE MCQ Practice Platform
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          {currentUser && (
            <nav className="hidden md:flex items-center gap-2">
              <button
                onClick={() => handleNavigation('/dashboard')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
                  isActive('/dashboard')
                    ? 'bg-lab-blue text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Home size={18} />
                <span>Dashboard</span>
              </button>
              <button
                onClick={() => handleNavigation('/')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
                  isActive('/') || isActive('/quiz')
                    ? 'bg-chemistry-green text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Beaker size={18} />
                <span>Practice</span>
              </button>
              <button
                onClick={() => handleNavigation('/leaderboard')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
                  isActive('/leaderboard')
                    ? 'bg-amber-500 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Trophy size={18} />
                <span>Leaderboard</span>
              </button>
              <button
                onClick={() => handleNavigation('/history')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
                  isActive('/history')
                    ? 'bg-purple-500 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <History size={18} />
                <span>History</span>
              </button>
            </nav>
          )}

          {/* Mobile + Desktop User Menu */}
          {currentUser && (
            <div className="flex items-center gap-2">
              {/* Mobile Menu Button */}
              <button
                onClick={() => setShowMobileNav(!showMobileNav)}
                className="md:hidden p-2 rounded-lg hover:bg-slate-100 transition-all"
              >
                {showMobileNav ? <X size={24} /> : <Menu size={24} />}
              </button>

              {/* User Menu Button */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-slate-100 transition-all"
                >
                  <div className="w-8 h-8 bg-lab-blue rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm">
                      {currentUser.displayName?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-bold text-slate-800">
                      {currentUser.displayName || 'User'}
                    </p>
                    <p className="text-xs text-slate-500 truncate max-w-[150px]">
                      {currentUser.email}
                    </p>
                  </div>
                  <ChevronDown size={16} className="text-slate-400 hidden sm:block" />
                </button>

                {/* User Dropdown Menu */}
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
                        <User size={18} className="text-slate-600" />
                        <span className="font-semibold text-slate-700">Profile Settings</span>
                      </button>
                      <button
                        onClick={() => handleNavigation('/history')}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-all text-left border-t border-slate-100"
                      >
                        <History size={18} className="text-slate-600" />
                        <span className="font-semibold text-slate-700">My History</span>
                      </button>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 transition-all text-left border-t border-slate-100"
                      >
                        <LogOut size={18} className="text-red-600" />
                        <span className="font-semibold text-red-600">Logout</span>
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
              <button
                onClick={() => handleNavigation('/dashboard')}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg font-semibold transition-all ${
                  isActive('/dashboard')
                    ? 'bg-lab-blue text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Home size={20} />
                <span>Dashboard</span>
              </button>
              <button
                onClick={() => handleNavigation('/')}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg font-semibold transition-all ${
                  isActive('/') || isActive('/quiz')
                    ? 'bg-chemistry-green text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Beaker size={20} />
                <span>Practice</span>
              </button>
              <button
                onClick={() => handleNavigation('/leaderboard')}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg font-semibold transition-all ${
                  isActive('/leaderboard')
                    ? 'bg-amber-500 text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Trophy size={20} />
                <span>Leaderboard</span>
              </button>
              <button
                onClick={() => handleNavigation('/history')}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg font-semibold transition-all ${
                  isActive('/history')
                    ? 'bg-purple-500 text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <History size={20} />
                <span>History</span>
              </button>
            </nav>
          </div>
        </>
      )}
    </header>
  );
}