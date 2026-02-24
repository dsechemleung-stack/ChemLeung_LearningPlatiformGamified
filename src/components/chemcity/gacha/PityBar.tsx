interface PityBarProps {
  label: string;
  current: number;
  max: number;
  color: 'purple' | 'yellow';
}

const colorMap = {
  purple: {
    track: 'bg-purple-900/40',
    fill: 'bg-purple-500',
    text: 'text-purple-300',
    glow: 'shadow-purple-500/60',
  },
  yellow: {
    track: 'bg-yellow-900/40',
    fill: 'bg-yellow-400',
    text: 'text-yellow-300',
    glow: 'shadow-yellow-500/60',
  },
};

export function PityBar({ label, current, max, color }: PityBarProps) {
  const pct = Math.min((current / max) * 100, 100);
  const c = colorMap[color];
  const isClose = pct >= 75;

  return (
    <div className="flex items-center gap-3">
      <span className={`text-xs w-28 shrink-0 ${c.text}`}>{label}</span>
      <div className={`flex-1 h-2 rounded-full ${c.track} overflow-hidden`}>
        <div
          className={`h-full rounded-full transition-all duration-500 ${c.fill} ${
            isClose ? `shadow-[0_0_6px_1px] ${c.glow}` : ''
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-xs w-14 text-right ${c.text}`}>
        {current} / {max}
      </span>
    </div>
  );
}
