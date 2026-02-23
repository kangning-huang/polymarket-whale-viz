import type { ManifestEntry } from '../types';
import { formatTime, formatDate, pnlColor } from '../api';

const COIN_COLORS: Record<string, string> = {
  btc: '#f7931a',
  eth: '#627eea',
  sol: '#14f195',
  xrp: '#00aae4',
};

interface Props {
  windows: ManifestEntry[];
  trader: string;
  onSelect: (ts: number, coin: string) => void;
}

export default function WindowGrid({ windows, trader, onSelect }: Props) {
  if (windows.length === 0) {
    return <div className="empty-state">No windows found for the selected filters.</div>;
  }

  // Sort newest first
  const sorted = [...windows].sort((a, b) => b.windowTs - a.windowTs);

  return (
    <div className="window-grid">
      {sorted.map(w => {
        const traderData = w.traders.find(t => t.name === trader);
        const pnl = traderData?.netPnl ?? 0;
        const buys = traderData?.buyCount ?? 0;
        const sells = traderData?.sellCount ?? 0;

        return (
          <button
            key={`${w.windowTs}_${w.coin}`}
            className="window-card"
            onClick={() => onSelect(w.windowTs, w.coin)}
          >
            <div className="card-header">
              <span
                className="coin-badge"
                style={{ color: COIN_COLORS[w.coin] ?? '#8b949e' }}
              >
                {w.coin.toUpperCase()}
              </span>
              <span className="card-time">
                {formatDate(w.windowTs)} {formatTime(w.windowTs)}
              </span>
            </div>
            <div className="card-body">
              <div className="card-pnl" style={{ color: pnlColor(pnl) }}>
                {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}
              </div>
              <div className="card-trades">
                <span className="buy-count">{buys}B</span>
                {' / '}
                <span className="sell-count">{sells}S</span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
