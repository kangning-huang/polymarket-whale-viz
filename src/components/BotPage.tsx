import { useState, useEffect, useMemo } from 'react';
import type { Manifest, TraderConfig, WindowDetail } from '../types';
import { fetchWindowDetail, formatTime, formatDate } from '../api';
import ErrorBoundary from './ErrorBoundary';
import PriceChart from './PriceChart';
import InventoryChart from './InventoryChart';
import StatsCards from './StatsCards';
import Comments from './Comments';

interface Props {
  bot: TraderConfig;
  manifest: Manifest;
}

export default function BotPage({ bot, manifest }: Props) {
  // Derive windows containing this bot, sorted newest first
  const botWindows = useMemo(() => {
    const seen = new Set<number>();
    return manifest.windows
      .filter(w => w.traders.some(t => t.name === bot.name))
      .filter(w => {
        if (seen.has(w.windowTs)) return false;
        seen.add(w.windowTs);
        return true;
      })
      .sort((a, b) => b.windowTs - a.windowTs);
  }, [manifest.windows, bot.name]);

  // All unique window timestamps
  const windowTimestamps = useMemo(
    () => [...new Set(botWindows.map(w => w.windowTs))].sort((a, b) => b - a),
    [botWindows]
  );

  const [selectedWindow, setSelectedWindow] = useState<number | null>(
    windowTimestamps[0] ?? null
  );

  // Coins available for selected window
  const availableCoins = useMemo(() => {
    if (!selectedWindow) return [];
    return manifest.windows
      .filter(w => w.windowTs === selectedWindow && w.traders.some(t => t.name === bot.name))
      .map(w => w.coin);
  }, [manifest.windows, selectedWindow, bot.name]);

  const [selectedCoin, setSelectedCoin] = useState<string>(availableCoins[0] ?? 'btc');

  // When window changes, reset coin to first available
  useEffect(() => {
    if (availableCoins.length > 0 && !availableCoins.includes(selectedCoin)) {
      setSelectedCoin(availableCoins[0]);
    }
  }, [availableCoins, selectedCoin]);

  // Fetch window detail
  const [detail, setDetail] = useState<WindowDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedWindow || !selectedCoin) return;
    setLoading(true);
    setFetchError(null);
    fetchWindowDetail(selectedWindow, selectedCoin)
      .then(d => { setDetail(d); setLoading(false); })
      .catch(e => { setFetchError(e.message); setLoading(false); });
  }, [selectedWindow, selectedCoin]);

  // Rolling average toggles
  const [showRolling10, setShowRolling10] = useState(false);
  const [showRolling30, setShowRolling30] = useState(false);

  // Compute summary stats across all windows
  const totalPnl = botWindows.reduce((sum, w) => {
    const t = w.traders.find(t => t.name === bot.name);
    return sum + (t?.netPnl ?? 0);
  }, 0);
  const totalBuys = botWindows.reduce((sum, w) => {
    const t = w.traders.find(t => t.name === bot.name);
    return sum + (t?.buyCount ?? 0);
  }, 0);
  const totalSells = botWindows.reduce((sum, w) => {
    const t = w.traders.find(t => t.name === bot.name);
    return sum + (t?.sellCount ?? 0);
  }, 0);

  const traderData = detail?.traders[bot.name];

  return (
    <div className="bot-page">
      {/* Header */}
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
            <span className="summary-value">{windowTimestamps.length}</span>
          </div>
        </div>
      </div>

      {/* Controls: Window + Coin dropdowns + Rolling avg toggles */}
      <div className="bot-controls">
        <div className="control-group">
          <label>Window</label>
          <select
            value={selectedWindow ?? ''}
            onChange={e => setSelectedWindow(Number(e.target.value))}
          >
            {windowTimestamps.map(ts => (
              <option key={ts} value={ts}>
                {formatTime(ts)} UTC — {formatDate(ts)}
              </option>
            ))}
          </select>
        </div>

        <div className="control-group">
          <label>Coin</label>
          <select
            value={selectedCoin}
            onChange={e => setSelectedCoin(e.target.value)}
          >
            {availableCoins.map(c => (
              <option key={c} value={c}>{c.toUpperCase()}</option>
            ))}
          </select>
        </div>

        <button
          className={`toggle-btn ${showRolling10 ? 'active-purple' : ''}`}
          onClick={() => setShowRolling10(v => !v)}
        >
          10s Avg
        </button>
        <button
          className={`toggle-btn ${showRolling30 ? 'active-orange' : ''}`}
          onClick={() => setShowRolling30(v => !v)}
        >
          30s Avg
        </button>
      </div>

      {/* Detail content */}
      {loading && <div className="loading">Loading window data...</div>}
      {fetchError && <div className="error-box">Failed to load window: {fetchError}</div>}

      {detail && traderData && (
        <>
          {/* Settlement + window info header */}
          <div className="detail-header">
            <h2>
              {detail.coin.toUpperCase()} &mdash;{' '}
              {formatDate(detail.windowTs)} {formatTime(detail.windowTs)}&ndash;{formatTime(detail.windowTs + 900)} UTC
            </h2>
            <div className="settlement-badge" style={{
              color: detail.settlement.winner === 'Up' ? 'var(--green)' : 'var(--red)'
            }}>
              {detail.settlement.winner} wins ({(detail.settlement.upPrice * 100).toFixed(0)}c / {(detail.settlement.downPrice * 100).toFixed(0)}c)
            </div>
          </div>

          <StatsCards stats={traderData.stats} winner={detail.settlement.winner} />

          <ErrorBoundary fallback="PriceChart">
            <PriceChart
              prices={detail.prices}
              trades={traderData.trades}
              settlement={detail.settlement}
              coin={detail.coin}
              showRolling10={showRolling10}
              showRolling30={showRolling30}
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

      {!loading && !fetchError && detail && !traderData && (
        <div className="empty-state">No trades for {bot.name} in this window.</div>
      )}

      <Comments botName={bot.name} />
    </div>
  );
}
