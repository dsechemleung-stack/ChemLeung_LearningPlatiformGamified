import React, { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useChemCityStore } from '../store/chemcityStore';
import { GachaScreen } from '../components/chemcity/gacha/GachaScreen';
import ChemistryLoading from '../components/ChemistryLoading';

export default function GachaPage() {
  const { currentUser } = useAuth();

  const isLoading = useChemCityStore((s) => s.isLoading);
  const error = useChemCityStore((s) => s.error);
  const loadGachaOnly = useChemCityStore((s) => s.loadGachaOnly);
  const teardown = useChemCityStore((s) => s.teardown);

  useEffect(() => {
    if (!currentUser?.uid) return;
    loadGachaOnly(currentUser.uid);
    return () => {
      teardown();
    };
  }, [currentUser?.uid, loadGachaOnly, teardown]);

  if (!currentUser) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-950 items-center justify-center gap-4 px-8 text-white">
        <span className="text-5xl">🧪</span>
        <p className="text-slate-400 text-sm text-center">Please sign in to access Gacha.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center gap-4" style={{ background: '#f5f9f6' }}>
        <ChemistryLoading persistKey="gacha_page" className="text-center" textOverride="Loading Gacha..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-950 items-center justify-center gap-4 px-8 text-white">
        <span className="text-4xl">⚠️</span>
        <p className="text-red-400 text-sm text-center">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="bg-slate-700 hover:bg-slate-600 text-white rounded-lg px-4 py-2 text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  return <GachaScreen />;
}
