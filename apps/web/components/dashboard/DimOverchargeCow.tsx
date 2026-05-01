'use client';

// Signature visual: cow inflates with overcharge %.
// 0% = svelte. 25%+ = severely puffed.
// Pure SVG — no Lottie needed.

interface Props {
  overchargePct: number;  // 0 to 1
  overchargeUsd: number;
  totalSpend: number;
}

export function DimOverchargeCow({ overchargePct, overchargeUsd, totalSpend }: Props) {
  const pct = Math.min(0.4, Math.max(0, overchargePct));
  // Body width grows with pct: base 100, +120 at 40%
  const bodyWidth = 100 + (pct / 0.4) * 120;
  // Body color: green → amber → red
  const fillColor = pct < 0.05 ? '#2F855A' : pct < 0.15 ? '#D97706' : '#C53030';
  const severity = pct < 0.05 ? 'In great shape' : pct < 0.10 ? 'Manageable' : pct < 0.20 ? 'Concerning' : 'Bleeding cash';
  const pctLabel = `${(pct * 100).toFixed(1)}%`;
  const spendLabel = totalSpend > 0
    ? `$${overchargeUsd.toFixed(0)} of $${totalSpend.toFixed(0)} lost to dim weight`
    : 'No shipments yet';

  return (
    <div className="border-2 rounded-xl p-6 bg-white" style={{ borderColor: '#1A202C' }}>
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-lg font-bold uppercase tracking-wide">Dim Overcharge</h2>
        <span className="text-xs font-mono text-gray-500 uppercase">{severity}</span>
      </div>

      <svg viewBox="0 0 320 200" className="w-full h-48" preserveAspectRatio="xMidYMid meet">
        {/* Body — width-animated */}
        <ellipse
          cx={160}
          cy={120}
          rx={bodyWidth / 2}
          ry={50 + pct * 30}
          fill={fillColor}
          stroke="#1A202C"
          strokeWidth={3}
          style={{ transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}
        />
        {/* Spots — drift with body */}
        <ellipse cx={160 - bodyWidth / 4} cy={110} rx={12} ry={8} fill="#1A202C" opacity={0.6} />
        <ellipse cx={160 + bodyWidth / 4} cy={130} rx={10} ry={7} fill="#1A202C" opacity={0.6} />
        <ellipse cx={160} cy={100} rx={8} ry={6} fill="#1A202C" opacity={0.6} />

        {/* Head */}
        <ellipse cx={160 - bodyWidth / 2 - 18} cy={95} rx={28} ry={22} fill={fillColor} stroke="#1A202C" strokeWidth={3} style={{ transition: 'all 0.6s' }} />
        <circle cx={160 - bodyWidth / 2 - 25} cy={88} r={3} fill="#1A202C" />
        <circle cx={160 - bodyWidth / 2 - 13} cy={88} r={3} fill="#1A202C" />
        <ellipse cx={160 - bodyWidth / 2 - 19} cy={102} rx={6} ry={4} fill="#FEB81B" />
        {/* Horns */}
        <path d={`M${160 - bodyWidth / 2 - 32} 78 L${160 - bodyWidth / 2 - 36} 70`} stroke="#1A202C" strokeWidth={2} fill="none" />
        <path d={`M${160 - bodyWidth / 2 - 6} 78 L${160 - bodyWidth / 2 - 2} 70`} stroke="#1A202C" strokeWidth={2} fill="none" />

        {/* Legs */}
        {[0.3, 0.6].map((p) => (
          <rect key={p} x={160 - bodyWidth / 2 + bodyWidth * p - 4} y={165} width={8} height={20 + pct * 5} fill="#1A202C" style={{ transition: 'all 0.6s' }} />
        ))}
        {/* Tail */}
        <path d={`M${160 + bodyWidth / 2} 100 Q${160 + bodyWidth / 2 + 20} 90 ${160 + bodyWidth / 2 + 25} 110`} stroke="#1A202C" strokeWidth={2} fill="none" />
      </svg>

      <div className="mt-4 text-center">
        <div className="text-4xl font-bold" style={{ color: fillColor }}>{pctLabel}</div>
        <div className="text-sm text-gray-700 mt-1">{spendLabel}</div>
      </div>
    </div>
  );
}
