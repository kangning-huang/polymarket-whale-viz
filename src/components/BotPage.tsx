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
  const MIN_PRICE_POINTS = 100;
  const DURATION_LABELS: Record<number, string> = { 900: '15m', 300: '5m' };

  // Derive unique window slots (ts + duration) containing this bot with dense data
  const windowSlots = useMemo(() => {
    const seen = new Set<string>();
    return manifest.windows
      .filter(w =>
        w.traders.some(t => t.name === bot.name) &&
        (w.priceCount == null || w.priceCount >= MIN_PRICE_POINTS)
      )
      .reduce<{ ts: number; duration: number }[]>((acc, w) => {
        const dur = w.duration ?? 900;
        const key = `${w.windowTs}_${dur}`;
        if (!seen.has(key)) {
          seen.add(key);
          acc.push({ ts: w.windowTs, duration: dur });
        }
        return acc;
      }, [])
      .sort((a, b) => b.ts - a.ts);
  }, [manifest.windows, bot.name]);

  // For summary stats, use all windows with this bot (any duration)
  const botWindows = useMemo(() =>
    manifest.windows.filter(w => w.traders.some(t => t.name === bot.name)),
    [manifest.windows, bot.name]
  );

  const [selectedSlot, setSelectedSlot] = useState<string>(
    windowSlots.length > 0 ? `${windowSlots[0].ts}_${windowSlots[0].duration}` : ''
  );

  const selectedWindow = selectedSlot ? Number(selectedSlot.split('_')[0]) : null;
  const selectedDuration = selectedSlot ? Number(selectedSlot.split('_')[1]) : 900;

  // Coins available for selected window+duration (only those with dense data)
  const availableCoins = useMemo(() => {
    if (!selectedWindow) return [];
    return manifest.windows
      .filter(w =>
        w.windowTs === selectedWindow &&
        (w.duration ?? 900) === selectedDuration &&
        w.traders.some(t => t.name === bot.name) &&
        (w.priceCount == null || w.priceCount >= MIN_PRICE_POINTS)
      )
      .map(w => w.coin);
  }, [manifest.windows, selectedWindow, selectedDuration, bot.name]);

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
    fetchWindowDetail(selectedWindow, selectedCoin, selectedDuration)
      .then(d => { setDetail(d); setLoading(false); })
      .catch(e => { setFetchError(e.message); setLoading(false); });
  }, [selectedWindow, selectedCoin, selectedDuration]);

  // Rolling average toggles
  const [showRolling10, setShowRolling10] = useState(false);
  const [showRolling30, setShowRolling30] = useState(false);

  // Trade log collapsed by default
  const [tradeLogOpen, setTradeLogOpen] = useState(false);

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
            <span className="summary-value">{windowSlots.length}</span>
          </div>
        </div>
      </div>

      {/* Controls: Window + Coin dropdowns + Rolling avg toggles */}
      <div className="bot-controls">
        <div className="control-group">
          <label>Window</label>
          <select
            value={selectedSlot}
            onChange={e => setSelectedSlot(e.target.value)}
          >
            {windowSlots.map(({ ts, duration }) => {
              const durLabel = DURATION_LABELS[duration] || `${duration}s`;
              return (
                <option key={`${ts}_${duration}`} value={`${ts}_${duration}`}>
                  {formatTime(ts)} UTC — {formatDate(ts)} ({durLabel})
                </option>
              );
            })}
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
              {formatDate(detail.windowTs)} {formatTime(detail.windowTs)}&ndash;{formatTime(detail.windowTs + (detail.duration ?? selectedDuration))} UTC
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
              duration={detail.duration ?? selectedDuration}
              showRolling10={showRolling10}
              showRolling30={showRolling30}
            />
          </ErrorBoundary>

          {traderData.inventory.length > 0 && (
            <ErrorBoundary fallback="InventoryChart">
              <InventoryChart inventory={traderData.inventory} duration={detail.duration ?? selectedDuration} />
            </ErrorBoundary>
          )}

          <div className="trade-table-wrapper">
            <h3
              className="chart-title collapsible-header"
              onClick={() => setTradeLogOpen(v => !v)}
            >
              <span className={`collapse-arrow ${tradeLogOpen ? 'open' : ''}`}>&#9654;</span>
              Trade Log ({traderData.trades.length} trades)
            </h3>
            {tradeLogOpen && (
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
            )}
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
