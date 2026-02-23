import type { TraderConfig, ManifestEntry } from '../types';

const BASE = import.meta.env.BASE_URL;

interface Props {
  bot: TraderConfig;
  windows: ManifestEntry[];
  onClick: () => void;
}

export default function BotCard({ bot, windows, onClick }: Props) {
  // Compute 24h stats from windows
  const botWindows = windows.filter(w => w.traders.some(t => t.name === bot.name));
  const totalPnl = botWindows.reduce((sum, w) => {
    const t = w.traders.find(t => t.name === bot.name);
    return sum + (t?.netPnl ?? 0);
  }, 0);
  const totalTrades = botWindows.reduce((sum, w) => {
    const t = w.traders.find(t => t.name === bot.name);
    return sum + (t?.buyCount ?? 0) + (t?.sellCount ?? 0);
  }, 0);

  return (
    <button className="bot-card" onClick={onClick}>
      <div className="bot-card-header">
        <div className="bot-avatar" style={{ background: bot.color }}>
          {bot.name.charAt(0).toUpperCase()}
        </div>
        <div className="bot-info">
          <h2 className="bot-name" style={{ color: bot.color }}>{bot.name}</h2>
          <p className="bot-desc">{bot.description}</p>
        </div>
      </div>

      {bot.screenshot && (
        <div className="bot-screenshot">
          <img
            src={`${BASE}images/${bot.screenshot}`}
            alt={`${bot.name} P&L`}
            loading="lazy"
          />
        </div>
      )}

      <div className="bot-card-stats">
        <div className="bot-stat">
          <span className="bot-stat-label">24h P&L</span>
          <span className={`bot-stat-value ${totalPnl >= 0 ? 'positive' : 'negative'}`}>
            {totalPnl >= 0 ? '+' : ''}{totalPnl.toFixed(2)}
          </span>
        </div>
        <div className="bot-stat">
          <span className="bot-stat-label">Windows</span>
          <span className="bot-stat-value">{botWindows.length}</span>
        </div>
        <div className="bot-stat">
          <span className="bot-stat-label">Trades</span>
          <span className="bot-stat-value">{totalTrades}</span>
        </div>
      </div>
    </button>
  );
}
