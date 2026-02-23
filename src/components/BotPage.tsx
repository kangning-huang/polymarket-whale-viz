import { useState, useCallback } from 'react';
import type { Manifest, TraderConfig } from '../types';
import CoinFilter from './CoinFilter';
import WindowGrid from './WindowGrid';
import Comments from './Comments';

interface Props {
  bot: TraderConfig;
  manifest: Manifest;
  onSelectWindow: (ts: number, coin: string) => void;
}

export default function BotPage({ bot, manifest, onSelectWindow }: Props) {
  const [selectedCoins, setSelectedCoins] = useState<Set<string>>(new Set(['btc', 'eth', 'sol', 'xrp']));

  const toggleCoin = useCallback((coin: string) => {
    setSelectedCoins(prev => {
      const next = new Set(prev);
      if (next.has(coin)) {
        if (next.size > 1) next.delete(coin);
      } else {
        next.add(coin);
      }
      return next;
    });
  }, []);

  const filteredWindows = manifest.windows.filter(w =>
    selectedCoins.has(w.coin) &&
    w.traders.some(t => t.name === bot.name)
  );

  // Compute summary stats
  const totalPnl = filteredWindows.reduce((sum, w) => {
    const t = w.traders.find(t => t.name === bot.name);
    return sum + (t?.netPnl ?? 0);
  }, 0);
  const totalBuys = filteredWindows.reduce((sum, w) => {
    const t = w.traders.find(t => t.name === bot.name);
    return sum + (t?.buyCount ?? 0);
  }, 0);
  const totalSells = filteredWindows.reduce((sum, w) => {
    const t = w.traders.find(t => t.name === bot.name);
    return sum + (t?.sellCount ?? 0);
  }, 0);

  return (
    <div className="bot-page">
      <div className="bot-page-header">
        <div className="bot-page-identity">
          <div className="bot-avatar large" style={{ background: bot.color }}>
            {bot.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 style={{ color: bot.color }}>{bot.name}</h2>
            <p className="bot-desc">{bot.description}</p>
            {bot.profileUrl && (
              <a
                href={bot.profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="profile-link"
              >
                View on Polymarket
              </a>
            )}
          </div>
        </div>
        <div className="bot-page-summary">
          <div className="summary-stat">
            <span className="summary-label">24h Net P&L</span>
            <span className={`summary-value ${totalPnl >= 0 ? 'positive' : 'negative'}`}>
              ${totalPnl >= 0 ? '+' : ''}{totalPnl.toFixed(2)}
            </span>
          </div>
          <div className="summary-stat">
            <span className="summary-label">Trades</span>
            <span className="summary-value">{totalBuys + totalSells}</span>
          </div>
          <div className="summary-stat">
            <span className="summary-label">Windows</span>
            <span className="summary-value">{filteredWindows.length}</span>
          </div>
        </div>
      </div>

      <div className="filters">
        <CoinFilter selected={selectedCoins} onToggle={toggleCoin} />
      </div>

      <WindowGrid
        windows={filteredWindows}
        trader={bot.name}
        onSelect={onSelectWindow}
      />

      <Comments botName={bot.name} />
    </div>
  );
}
