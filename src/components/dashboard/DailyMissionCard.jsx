import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, BookOpen } from 'lucide-react';

/**
 * DailyMissionCard: Hero section with primary "Resume AI Daily Mission" action
 * This is the main call-to-action for the dashboard
 */
export default function DailyMissionCard() {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Daily Mission - Primary Action */}
      <button
        onClick={() => navigate('/')}
        className="group relative overflow-hidden rounded-2xl shadow-xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-500 via-indigo-600 to-indigo-700 p-8 text-white hover:shadow-2xl transition-all active:scale-95"
      >
        {/* Background accent */}
        <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-white rounded-full blur-3xl"></div>
        </div>

        <div className="relative z-10">
          {/* Icon */}
          <div className="inline-block p-4 bg-white/20 rounded-xl mb-4 group-hover:scale-110 transition-transform">
            <Zap size={40} className="text-white drop-shadow-lg" />
          </div>

          {/* Text */}
          <h2 className="text-3xl font-black mb-2 text-white drop-shadow-md">
            Resume AI Daily Mission
          </h2>
          <p className="text-indigo-100 font-semibold mb-1">20 interleaved questions</p>
          <p className="text-indigo-200 text-sm mb-6">
            AI-powered selection optimized for your learning curve
          </p>

          {/* Stats Pills */}
          <div className="flex flex-wrap gap-2 mb-6">
            <div className="px-3 py-1 bg-white/20 rounded-full text-sm font-bold text-white">
              ✓ Spaced Repetition
            </div>
            <div className="px-3 py-1 bg-white/20 rounded-full text-sm font-bold text-white">
              ⚡ Adaptive Difficulty
            </div>
          </div>

          {/* CTA Button */}
          <div className="flex items-center gap-3 font-black text-lg group-hover:translate-x-1 transition-transform">
            <span className="text-white drop-shadow-md">Start Now</span>
            <span>→</span>
          </div>
        </div>

        {/* Bottom accent line */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white to-transparent opacity-40 group-hover:opacity-60 transition-opacity"></div>
      </button>

      {/* Browse Forum - Secondary Action */}
      <button
        onClick={() => navigate('/forum')}
        className="group relative overflow-hidden rounded-2xl shadow-lg border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 p-8 text-slate-800 hover:shadow-xl transition-all active:scale-95"
      >
        {/* Background accent */}
        <div className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-purple-400 rounded-full blur-3xl"></div>
        </div>

        <div className="relative z-10">
          {/* Icon */}
          <div className="inline-block p-4 bg-purple-200 rounded-xl mb-4 group-hover:scale-110 transition-transform">
            <BookOpen size={40} className="text-purple-600" />
          </div>

          {/* Text */}
          <h2 className="text-3xl font-black mb-2 text-slate-800">
            Browse Community
          </h2>
          <div className="inline-block px-3 py-1 bg-red-100 rounded-full text-sm font-bold text-red-700 mb-3">
            2 New Discussions
          </div>

          <p className="text-slate-600 font-semibold mb-1">Connect with learners</p>
          <p className="text-slate-600 text-sm mb-6">
            Share insights, ask questions, and learn from peers in the community
          </p>

          {/* CTA Button */}
          <div className="flex items-center gap-3 font-black text-lg group-hover:translate-x-1 transition-transform text-purple-600">
            <span>Visit Forum</span>
            <span>→</span>
          </div>
        </div>
      </button>
    </div>
  );
}
