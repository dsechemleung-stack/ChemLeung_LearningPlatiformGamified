import React, { useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useChemCityStore } from '../../store/chemcityStore';
import { CurrencyBar } from './CurrencyBar';
import { ChemCityMap } from './ChemCityMap';
import { PlaceView } from './PlaceView';
import { CardPicker } from './CardPicker';
import { CardDetail } from './CardDetail';
import { DailyLoginModal } from './DailyLoginModal';
import { QuizRewardModal } from './QuizRewardModal';
import { PurchaseConfirmModal } from './PurchaseConfirmModal';
import { PlaceUnlockModal } from './PlaceUnlockModal';
import { GasStationDistributor } from './GasStationDistributor';
import { CollectionsAlbum } from './CollectionsAlbum';
import { OnboardingOverlay } from './OnboardingOverlay';
import ChemistryLoading from '../ChemistryLoading';

export const ChemCityRoot: React.FC = () => {
  const { currentUser } = useAuth() as any;

  const view = useChemCityStore((s) => s.view);
  const isLoading = useChemCityStore((s) => s.isLoading);
  const error = useChemCityStore((s) => s.error);
  const loadAll = useChemCityStore((s) => s.loadAll);
  const teardown = useChemCityStore((s) => s.teardown);
  const dailyLoginOpen = useChemCityStore((s) => s.dailyLogin.showModal);
  const showOnboarding = useChemCityStore((s) => s.showOnboarding);

  useEffect(() => {
    if (!currentUser?.uid) return;
    loadAll(currentUser.uid);
    return () => {
      teardown();
    };
  }, [currentUser?.uid, loadAll, teardown]);

  if (!currentUser) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-950 items-center justify-center gap-4 px-8">
        <span className="text-5xl">🧪</span>
        <p className="text-slate-400 text-sm text-center">Please sign in to access ChemCity.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center gap-4" style={{ background: '#f5f9f6' }}>
        <ChemistryLoading persistKey="chemcity" className="text-center" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-950 items-center justify-center gap-4 px-8">
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

  return (
    <div className="relative flex flex-col min-h-screen bg-slate-950 text-white overflow-hidden">
      <CurrencyBar />

      <main className="flex-1 overflow-hidden flex flex-col">
        {view === 'map' && <ChemCityMap />}
        {view === 'place' && <PlaceView />}
        {view === 'gas_station_distributor' && <GasStationDistributor />}
        {view === 'collections' && <CollectionsAlbum />}
      </main>

      <CardPicker />
      <CardDetail />

      <DailyLoginModal />
      {!dailyLoginOpen && <QuizRewardModal />}

      <PlaceUnlockModal />
      <PurchaseConfirmModal />

      {showOnboarding && <OnboardingOverlay />}
    </div>
  );
};
