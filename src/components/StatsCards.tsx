import type { TraderStats } from '../types';

interface Props {
  stats: TraderStats;
  winner: string;
}

export default function StatsCards({ stats, winner }: Props) {
  const pnlClass = (v: number) => v > 0 ? 'positive' : v < 0 ? 'negative' : '';

  return (
    <div className="stats-grid">
      <div className="stat-card">
        <div className="stat-label">Buys</div>
        <div className="stat-value">{stats.buyCount}</div>
        <div className="stat-sub">${stats.buyUsdc.toFixed(2)}</div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Sells</div>
        <div className="stat-value">{stats.sellCount}</div>
        <div className="stat-sub">${stats.sellUsdc.toFixed(2)}</div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Avg Buy</div>
        <div className="stat-value">${stats.avgBuy.toFixed(3)}</div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Avg Sell</div>
        <div className="stat-value">${stats.avgSell.toFixed(3)}</div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Spread P&L</div>
        <div className={`stat-value ${pnlClass(stats.spreadPnl)}`}>
          {stats.spreadPnl >= 0 ? '+' : ''}${stats.spreadPnl.toFixed(2)}
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Settlement P&L</div>
        <div className={`stat-value ${pnlClass(stats.settlementPnl)}`}>
          {stats.settlementPnl >= 0 ? '+' : ''}${stats.settlementPnl.toFixed(2)}
        </div>
      </div>
      <div className="stat-card highlight">
        <div className="stat-label">Net P&L</div>
        <div className={`stat-value ${pnlClass(stats.netPnl)}`}>
          {stats.netPnl >= 0 ? '+' : ''}${stats.netPnl.toFixed(2)}
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Winner</div>
        <div className="stat-value" style={{ color: winner === 'Up' ? '#3fb950' : '#f85149' }}>
          {winner}
        </div>
      </div>
    </div>
  );
}
