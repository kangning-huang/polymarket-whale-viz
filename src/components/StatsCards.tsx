import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { TraderStats } from '../types';

interface Props {
  stats: TraderStats;
  winner: 'Up' | 'Down' | string;
}

// Mini sparkline component
function Sparkline({ data, color, height = 24 }: { data: number[]; color: string; height?: number }) {
  if (data.length < 2) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width="100%" height={height} className="overflow-visible">
      <defs>
        <linearGradient id={`spark-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        points={points}
        style={{ filter: `drop-shadow(0 0 3px ${color})` }}
      />
    </svg>
  );
}

// Win rate ring component
function WinRateRing({ winRate, size = 48 }: { winRate: number; size?: number }) {
  const circumference = 2 * Math.PI * (size / 2 - 4);
  const strokeDasharray = `${(winRate / 100) * circumference} ${circumference}`;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - 4}
          fill="none"
          stroke="#262a2e"
          strokeWidth="4"
        />
        {/* Progress ring */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - 4}
          fill="none"
          stroke={winRate >= 50 ? '#22c55e' : '#ef4444'}
          strokeWidth="4"
          strokeLinecap="round"
          initial={{ strokeDasharray: `0 ${circumference}` }}
          animate={{ strokeDasharray }}
          transition={{ duration: 1, ease: "easeOut" }}
          style={{
            filter: winRate >= 50
              ? 'drop-shadow(0 0 4px rgba(34, 197, 94, 0.6))'
              : 'drop-shadow(0 0 4px rgba(239, 68, 68, 0.6))'
          }}
        />
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-sm font-mono font-bold ${winRate >= 50 ? 'text-long' : 'text-short'}`}>
          {winRate.toFixed(0)}%
        </span>
      </div>
    </div>
  );
}

export default function StatsCards({ stats, winner }: Props) {
  const {
    buyCount,
    sellCount,
    buyUsdc,
    sellUsdc,
    avgBuy,
    avgSell,
    spreadPnl,
    settlementPnl,
    netPnl,
  } = stats;

  // Calculate derived metrics
  const totalTrades = buyCount + sellCount;
  const sellWinRate = totalTrades > 0 ? (sellCount / totalTrades) * 100 : 0;

  // Generate fake sparkline data for visual effect (based on actual values)
  const pnlSparkData = useMemo(() => {
    const points = [];
    let cumulative = 0;
    // Simulate cumulative P&L progression
    for (let i = 0; i < 10; i++) {
      const progress = i / 9;
      const spread = spreadPnl * progress;
      const settlement = i === 9 ? settlementPnl : settlementPnl * Math.pow(progress, 2);
      cumulative = spread + settlement;
      points.push(cumulative);
    }
    return points;
  }, [spreadPnl, settlementPnl]);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-6"
    >
      {/* Net P&L - Highlight card */}
      <motion.div variants={item} className="col-span-2 stats-card border-border relative overflow-hidden">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs text-text-muted mb-1">Net P&L</div>
            <div className={`text-2xl font-mono font-bold ${
              netPnl >= 0 ? 'stat-glow-positive' : 'stat-glow-negative'
            }`}>
              {netPnl >= 0 ? '+' : ''}${netPnl.toFixed(2)}
            </div>
          </div>
          <div className="w-24">
            <Sparkline
              data={pnlSparkData}
              color={netPnl >= 0 ? '#22c55e' : '#ef4444'}
            />
          </div>
        </div>
        {/* Glow effect */}
        <div
          className="absolute -bottom-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-20"
          style={{ background: netPnl >= 0 ? '#22c55e' : '#ef4444' }}
        />
      </motion.div>

      {/* Win Rate Ring */}
      <motion.div variants={item} className="stats-card flex items-center gap-3">
        <WinRateRing winRate={sellWinRate} size={44} />
        <div>
          <div className="text-xs text-text-muted">Sell Rate</div>
          <div className="text-sm font-mono text-text-primary">
            {sellCount}/{totalTrades}
          </div>
        </div>
      </motion.div>

      {/* Spread P&L */}
      <motion.div variants={item} className="stats-card">
        <div className="text-xs text-text-muted mb-1">Spread P&L</div>
        <div className={`text-lg font-mono font-semibold ${
          spreadPnl >= 0 ? 'text-long' : 'text-short'
        }`}>
          {spreadPnl >= 0 ? '+' : ''}${spreadPnl.toFixed(2)}
        </div>
        <div className="text-xs text-text-dim">from trading</div>
      </motion.div>

      {/* Settlement P&L */}
      <motion.div variants={item} className="stats-card">
        <div className="text-xs text-text-muted mb-1">Settlement</div>
        <div className={`text-lg font-mono font-semibold ${
          settlementPnl >= 0 ? 'text-long' : 'text-short'
        }`}>
          {settlementPnl >= 0 ? '+' : ''}${settlementPnl.toFixed(2)}
        </div>
        <div className="text-xs text-text-dim flex items-center gap-1">
          <span className={`w-1.5 h-1.5 rounded-full ${winner === 'Up' ? 'bg-long' : 'bg-short'}`} />
          {winner} won
        </div>
      </motion.div>

      {/* Buy Stats */}
      <motion.div variants={item} className="stats-card">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="w-2 h-2 rounded-full bg-long" />
          <span className="text-xs text-text-muted">Buys</span>
        </div>
        <div className="text-lg font-mono text-text-primary">{buyCount}</div>
        <div className="text-xs text-text-dim">
          ${buyUsdc.toFixed(0)} @ {(avgBuy * 100).toFixed(1)}c
        </div>
      </motion.div>

      {/* Sell Stats */}
      <motion.div variants={item} className="stats-card">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="w-2 h-2 rounded-full bg-short" />
          <span className="text-xs text-text-muted">Sells</span>
        </div>
        <div className="text-lg font-mono text-text-primary">{sellCount}</div>
        <div className="text-xs text-text-dim">
          ${sellUsdc.toFixed(0)} @ {(avgSell * 100).toFixed(1)}c
        </div>
      </motion.div>

      {/* Avg Spread */}
      <motion.div variants={item} className="stats-card">
        <div className="text-xs text-text-muted mb-1">Avg Spread</div>
        <div className={`text-lg font-mono font-semibold ${
          avgSell > avgBuy ? 'text-long' : 'text-short'
        }`}>
          {((avgSell - avgBuy) * 100).toFixed(1)}c
        </div>
        <div className="text-xs text-text-dim">sell - buy</div>
      </motion.div>
    </motion.div>
  );
}
