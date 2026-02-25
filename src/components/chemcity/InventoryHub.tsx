import React from 'react';
import { Archive, Shirt } from 'lucide-react';
import { useChemCityStore } from '../../store/chemcityStore';

export const InventoryHub: React.FC = () => {
  const navigateToInventory = useChemCityStore((s) => s.navigateToInventory);
  const navigateToCosmetics = useChemCityStore((s) => (s as any).navigateToCosmetics as (() => void) | undefined);

  return (
    <div className="flex flex-col min-h-screen items-center justify-center gap-4 px-6" style={{ background: '#f5f9f6' }}>
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border-2 border-slate-200 overflow-hidden">
        <div className="p-4 border-b bg-slate-50">
          <h2 className="text-lg font-black text-slate-800">Inventory</h2>
          <p className="text-xs font-bold text-slate-500 mt-1">ChemCards · Wardrobe · Backgrounds</p>
        </div>
        <div className="p-4 flex flex-col gap-3">
          <button
            onClick={navigateToInventory}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl font-black bg-white border-2 border-slate-200 hover:bg-slate-50 transition-all active:scale-[0.99]"
          >
            <span className="flex items-center gap-3 text-slate-900">
              <Archive size={18} className="text-slate-700" />
              ChemCard Inventory
            </span>
            <span className="text-slate-400 font-black">→</span>
          </button>

          <button
            onClick={() => navigateToCosmetics && navigateToCosmetics()}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl font-black bg-white border-2 border-slate-200 hover:bg-slate-50 transition-all active:scale-[0.99]"
          >
            <span className="flex items-center gap-3 text-slate-900">
              <Shirt size={18} className="text-slate-700" />
              Wardrobe & Backgrounds
            </span>
            <span className="text-slate-400 font-black">→</span>
          </button>
        </div>
      </div>
    </div>
  );
};
