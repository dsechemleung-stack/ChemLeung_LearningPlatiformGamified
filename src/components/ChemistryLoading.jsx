import React, { useMemo } from 'react';

const LOADERS = [
  { id: 1, text: 'Combusting hydrocarbons...', variant: 'flame' },
  { id: 2, text: 'Titrating to equivalence point...', variant: 'titration' },
  { id: 3, text: 'Distilling knowledge...', variant: 'distillation' },
  { id: 4, text: 'Crystallizing results...', variant: 'crystal' },
  { id: 5, text: 'Balancing equations...', variant: 'balance' },
  { id: 6, text: 'Increasing reaction rate...', variant: 'graph' },
  { id: 7, text: 'Ionizing particles...', variant: 'ionize' },
  { id: 8, text: 'Polymerizing monomers...', variant: 'polymer' },
  { id: 9, text: 'Precipitating insights...', variant: 'precipitate' },
  { id: 10, text: 'Reaching equilibrium...', variant: 'equilibrium' },
  { id: 11, text: 'Oxidizing metals...', variant: 'oxidize' },
];

export default function ChemistryLoading({ className = '', persistKey = '', showText = true, textOverride = '' }) {
  const loader = useMemo(() => {
    if (!persistKey) {
      const idx = Math.floor(Math.random() * LOADERS.length);
      return LOADERS[idx];
    }

    const storageKey = `chemistry_loading_variant:${persistKey}`;

    try {
      const stored = sessionStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        const found = LOADERS.find(l => l.id === parsed?.id);
        if (found) return found;
      }

      const idx = Math.floor(Math.random() * LOADERS.length);
      const selected = LOADERS[idx];
      sessionStorage.setItem(storageKey, JSON.stringify({ id: selected.id }));
      return selected;
    } catch {
      const idx = Math.floor(Math.random() * LOADERS.length);
      return LOADERS[idx];
    }
  }, [persistKey]);

  const displayText = (textOverride || loader.text);

  return (
    <div className={`chem-loading chem-loading--brand ${className}`.trim()}>
      <div className="chem-loading-logo" aria-hidden="true">
        <div className="chem-loading-logo-ring" />
        <img
          src="/ChemistreeIcon_square.png"
          alt=""
          className="chem-loading-logo-img"
          draggable="false"
        />
      </div>
      <div className="chem-loading-visual" aria-hidden="true">
        {loader.variant === 'flame' && (
          <div className="chem-flame-track">
            <div className="chem-flame-progress" />
            <div className="chem-flame-embers" />
          </div>
        )}

        {loader.variant === 'titration' && (
          <div className="chem-titration">
            <div className="chem-burette">
              <div className="chem-drop" />
            </div>
            <div className="chem-flask">
              <div className="chem-solution" />
            </div>
          </div>
        )}

        {loader.variant === 'distillation' && (
          <div className="chem-distill">
            <div className="chem-column">
              <div className="chem-vapor" />
            </div>
            <div className="chem-receiver">
              <div className="chem-condensed" />
            </div>
          </div>
        )}

        {loader.variant === 'crystal' && (
          <div className="chem-crystal">
            <div className="chem-crystal-string" />
            <div className="chem-crystal-grow" />
          </div>
        )}

        {loader.variant === 'balance' && (
          <div className="chem-balance">
            <div className="chem-eq">H₂ + O₂ → H₂O</div>
            <div className="chem-coeff">2</div>
            <div className="chem-check" />
          </div>
        )}

        {loader.variant === 'graph' && (
          <div className="chem-graph">
            <div className="chem-axes" />
            <div className="chem-line" />
          </div>
        )}

        {loader.variant === 'ionize' && (
          <div className="chem-ionize">
            <div className="chem-atom" />
            <div className="chem-electron" />
            <div className="chem-plasma" />
          </div>
        )}

        {loader.variant === 'polymer' && (
          <div className="chem-polymer">
            <div className="chem-monomer" />
            <div className="chem-chain" />
          </div>
        )}

        {loader.variant === 'precipitate' && (
          <div className="chem-precip">
            <div className="chem-mix" />
            <div className="chem-rain" />
          </div>
        )}

        {loader.variant === 'equilibrium' && (
          <div className="chem-eqbm">
            <div className="chem-arrows" />
            <div className="chem-steady" />
          </div>
        )}

        {loader.variant === 'oxidize' && (
          <div className="chem-oxidize">
            <div className="chem-metal" />
            <div className="chem-rust" />
          </div>
        )}
      </div>

      {showText && <p className="chem-loading-text">{displayText}</p>}
    </div>
  );
}
