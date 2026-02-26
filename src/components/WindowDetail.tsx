import { useState } from 'react';
import type { WindowDetail, TraderConfig } from '../types';
import { formatTime, formatDate } from '../api';
import ErrorBoundary from './ErrorBoundary';
import PriceChart from './PriceChart';
import InventoryChart from './InventoryChart';
import StatsCards from './StatsCards';

interface Props {
  detail: WindowDetail;
  traders: TraderConfig[];
}

export default function WindowDetailView({ detail, traders }: Props) {
  const traderNames = Object.keys(detail.traders);
  const [activeTrader, setActiveTrader] = useState(traderNames[0] ?? '');
  const traderData = detail.traders[activeTrader];
  const traderConfig = traders.find(t => t.name === activeTrader);

  const windowEnd = detail.windowTs + 900;

  return (
    <div className="window-detail">
      <div className="detail-header">
        <h2>
          {detail.coin.toUpperCase()} &mdash;{' '}
          {formatDate(detail.windowTs)} {formatTime(detail.windowTs)}&ndash;{formatTime(windowEnd)}
        </h2>
        <div className="settlement-badge" style={{
          color: detail.settlement.winner === 'Up' ? 'var(--green)' : 'var(--red)'
        }}>
          {detail.settlement.winner} wins ({(detail.settlement.upPrice * 100).toFixed(0)}c / {(detail.settlement.downPrice * 100).toFixed(0)}c)
        </div>
      </div>

      {traderNames.length > 1 && (
        <div className="pill-group" style={{ marginBottom: 16 }}>
          {traderNames.map(name => (
            <button
              key={name}
              className={`pill ${activeTrader === name ? 'active' : ''}`}
              style={activeTrader === name ? { borderColor: traderConfig?.color ?? '#58a6ff' } : {}}
              onClick={() => setActiveTrader(name)}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      {traderData && (
        <>
          <StatsCards stats={traderData.stats} winner={detail.settlement.winner} />
          <ErrorBoundary fallback="PriceChart">
            <PriceChart
              prices={detail.prices}
              trades={traderData.trades}
              settlement={detail.settlement}
              coin={detail.coin}
            />
          </ErrorBoundary>
          {traderData.inventory.length > 0 && (
            <ErrorBoundary fallback="InventoryChart">
              <InventoryChart inventory={traderData.inventory} />
            </ErrorBoundary>
          )}

          <div className="trade-table-wrapper">
            <h3 className="chart-title">Trade Log</h3>
            <div className="trade-list">
              <table>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Side</th>
                    <th>Outcome</th>
                    <th>Tokens</th>
                    <th>USDC</th>
                    <th>Price</th>
                  </tr>
                </thead>
                <tbody>
                  {traderData.trades.map((t, i) => (
                    <tr key={i}>
                      <td>{Math.floor(t.sec / 60)}:{String(t.sec % 60).padStart(2, '0')}</td>
                      <td className={t.side === 'BUY' ? 'buy' : 'sell'}>{t.side}</td>
                      <td>{t.outcome}</td>
                      <td>{t.tokens.toFixed(1)}</td>
                      <td>${t.usdc.toFixed(2)}</td>
                      <td>${t.price.toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
