import { motion } from 'framer-motion';
import type { TraderConfig, ManifestEntry } from '../types';

const BASE = import.meta.env.BASE_URL;

interface Props {
  bot: TraderConfig;
  windows: ManifestEntry[];
  onClick: () => void;
  index: number;
}

// Mini performance bar
function PerformanceBar({ wins, losses }: { wins: number; losses: number }) {
  const total = wins + losses;
  const winPercent = total > 0 ? (wins / total) * 100 : 50;

  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-1.5 bg-surface rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-long to-long-glow rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${winPercent}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          style={{ boxShadow: '0 0 8px rgba(34, 197, 94, 0.5)' }}
        />
      </div>
      <span className="text-xxs font-mono text-text-muted w-10 text-right">
        {winPercent.toFixed(0)}%
      </span>
    </div>
  );
}

export default function BotCard({ bot, windows, onClick, index }: Props) {
  // Compute stats from windows
  const botWindows = windows.filter(w => w.traders.some(t => t.name === bot.name));
  const totalPnl = botWindows.reduce((sum, w) => {
    const t = w.traders.find(t => t.name === bot.name);
    return sum + (t?.netPnl ?? 0);
  }, 0);
  const totalTrades = botWindows.reduce((sum, w) => {
    const t = w.traders.find(t => t.name === bot.name);
    return sum + (t?.buyCount ?? 0) + (t?.sellCount ?? 0);
  }, 0);

  // Count winning/losing windows
  const wins = botWindows.filter(w => {
    const t = w.traders.find(t => t.name === bot.name);
    return (t?.netPnl ?? 0) > 0;
  }).length;
  const losses = botWindows.length - wins;

  return (
    <motion.button
      onClick={onClick}
      className="group relative w-full text-left"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Main card */}
      <div className="relative bg-surface border border-border rounded-xl overflow-hidden transition-all duration-300 group-hover:border-text-dim group-hover:shadow-card-hover">
        {/* Glow effect on hover */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{
            background: `radial-gradient(circle at 50% 0%, ${bot.color}15 0%, transparent 50%)`,
          }}
        />

        {/* Header */}
        <div className="relative p-5 pb-4">
          <div className="flex items-start gap-4">
            {/* Avatar with glow */}
            <motion.div
              className="relative flex-shrink-0"
              whileHover={{ scale: 1.1 }}
            >
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-bold text-white shadow-lg"
                style={{
                  background: `linear-gradient(135deg, ${bot.color}, ${bot.color}dd)`,
                  boxShadow: `0 4px 20px ${bot.color}40`,
                }}
              >
                {bot.name.charAt(0).toUpperCase()}
              </div>
              {/* Activity indicator */}
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-long rounded-full border-2 border-surface flex items-center justify-center">
                <div className="w-2 h-2 bg-long-glow rounded-full animate-pulse" />
              </div>
            </motion.div>

            {/* Name and description */}
            <div className="flex-1 min-w-0">
              <h2
                className="text-lg font-bold mb-1 truncate group-hover:text-white transition-colors"
                style={{ color: bot.color }}
              >
                {bot.name}
              </h2>
              <p className="text-xs text-text-muted line-clamp-2 leading-relaxed">
                {bot.description || 'Automated trading bot on Polymarket 15-minute crypto markets'}
              </p>
            </div>
          </div>
        </div>

        {/* Screenshot */}
        {bot.screenshot && (
          <div className="px-5">
            <div className="relative rounded-lg overflow-hidden border border-border-subtle group-hover:border-border transition-colors">
              <img
                src={`${BASE}images/${bot.screenshot}`}
                alt={`${bot.name} P&L`}
                loading="lazy"
                className="w-full h-auto transition-transform duration-300 group-hover:scale-[1.02]"
              />
              {/* Overlay gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-surface/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="p-5 pt-4">
          {/* Performance bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-xxs text-text-muted mb-1">
              <span>Win Rate</span>
              <span>{wins}W / {losses}L</span>
            </div>
            <PerformanceBar wins={wins} losses={losses} />
          </div>

          {/* Stats row */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xxs text-text-muted mb-0.5">24h P&L</div>
              <div className={`text-xl font-mono font-bold ${
                totalPnl >= 0 ? 'text-long' : 'text-short'
              }`}
              style={{
                textShadow: totalPnl >= 0
                  ? '0 0 20px rgba(34, 197, 94, 0.4)'
                  : '0 0 20px rgba(239, 68, 68, 0.4)'
              }}>
                {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}
              </div>
            </div>

            <div className="text-right">
              <div className="text-xxs text-text-muted mb-0.5">Windows</div>
              <div className="text-xl font-mono font-bold text-text-primary">
                {botWindows.length}
              </div>
            </div>

            <div className="text-right">
              <div className="text-xxs text-text-muted mb-0.5">Trades</div>
              <div className="text-xl font-mono font-bold text-text-primary">
                {totalTrades}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom accent line */}
        <div
          className="h-1 w-full opacity-0 group-hover:opacity-100 transition-opacity"
          style={{
            background: `linear-gradient(90deg, transparent, ${bot.color}, transparent)`,
          }}
        />
      </div>
    </motion.button>
  );
}
