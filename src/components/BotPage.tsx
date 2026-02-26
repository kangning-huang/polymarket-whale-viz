import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Manifest, TraderConfig, WindowDetail } from '../types';
import { fetchWindowDetail, formatTime, formatDate } from '../api';
import ErrorBoundary from './ErrorBoundary';
import PriceChart from './PriceChart';
import InventoryChart from './InventoryChart';
import StatsCards from './StatsCards';
import TimelineRibbon from './TimelineRibbon';
import Comments from './Comments';

interface Props {
  bot: TraderConfig;
  manifest: Manifest;
}

export default function BotPage({ bot, manifest }: Props) {
  const DURATION_LABELS: Record<number, string> = { 900: '15m', 300: '5m' };

  // Derive unique window slots (ts + duration) containing this bot
  // Backend already filters for adequate price data coverage
  const windowSlots = useMemo(() => {
    const seen = new Set<string>();
    return manifest.windows
      .filter(w => w.traders.some(t => t.name === bot.name))
      .reduce<{ ts: number; duration: number; coin: string; pnl: number }[]>((acc, w) => {
        const dur = w.duration ?? 900;
        const key = `${w.windowTs}_${dur}_${w.coin}`;
        if (!seen.has(key)) {
          seen.add(key);
          const trader = w.traders.find(t => t.name === bot.name);
          acc.push({ ts: w.windowTs, duration: dur, coin: w.coin, pnl: trader?.netPnl ?? 0 });
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

  // Coins available for selected window+duration
  const availableCoins = useMemo(() => {
    if (!selectedWindow) return [];
    return manifest.windows
      .filter(w =>
        w.windowTs === selectedWindow &&
        (w.duration ?? 900) === selectedDuration &&
        w.traders.some(t => t.name === bot.name)
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Bot header card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-surface border border-border rounded-xl p-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-6">
          {/* Identity */}
          <div className="flex items-start gap-4">
            <div
              className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl font-bold text-white shadow-lg flex-shrink-0"
              style={{
                background: `linear-gradient(135deg, ${bot.color}, ${bot.color}dd)`,
                boxShadow: `0 4px 24px ${bot.color}40`,
              }}
            >
              {bot.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1
                className="text-2xl font-bold mb-1"
                style={{ color: bot.color }}
              >
                {bot.name}
              </h1>
              <p className="text-sm text-text-secondary mb-2 max-w-md">
                {bot.description}
              </p>
              {bot.profileUrl && (
                <a
                  href={bot.profileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent text-sm hover:underline inline-flex items-center gap-1"
                >
                  View on Polymarket
                  <span className="text-xs">↗</span>
                </a>
              )}
            </div>
          </div>

          {/* Summary stats */}
          <div className="flex gap-8">
            <div className="text-right">
              <div className="text-xs text-text-muted mb-1">24h Net P&L</div>
              <div className={`text-2xl font-mono font-bold ${
                totalPnl >= 0 ? 'stat-glow-positive' : 'stat-glow-negative'
              }`}>
                {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-text-muted mb-1">Trades</div>
              <div className="text-2xl font-mono font-bold text-text-primary">
                {totalBuys + totalSells}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-text-muted mb-1">Windows</div>
              <div className="text-2xl font-mono font-bold text-text-primary">
                {windowSlots.length}
              </div>
            </div>
          </div>
        </div>

        {/* Extended description for SEO */}
        {bot.longDescription && (
          <p className="mt-4 text-sm text-text-secondary leading-relaxed border-t border-border-subtle pt-4">
            {bot.longDescription}
          </p>
        )}
      </motion.div>

      {/* Timeline Ribbon */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-surface border border-border rounded-xl p-4"
      >
        <TimelineRibbon
          windows={windowSlots}
          selectedSlot={selectedSlot}
          onSelect={setSelectedSlot}
        />
      </motion.div>

      {/* Controls */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="flex flex-wrap items-center gap-4 bg-surface border border-border rounded-xl p-4"
      >
        {/* Window selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-text-muted font-medium">Window</label>
          <select
            value={selectedSlot}
            onChange={e => setSelectedSlot(e.target.value)}
            className="select-terminal"
          >
            {[...new Set(windowSlots.map(w => `${w.ts}_${w.duration}`))].map(key => {
              const [ts, dur] = key.split('_').map(Number);
              const durLabel = DURATION_LABELS[dur] || `${dur}s`;
              return (
                <option key={key} value={key}>
                  {formatTime(ts)} — {formatDate(ts)} ({durLabel})
                </option>
              );
            })}
          </select>
        </div>

        {/* Coin selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-text-muted font-medium">Coin</label>
          <div className="flex gap-1">
            {availableCoins.map(c => (
              <button
                key={c}
                onClick={() => setSelectedCoin(c)}
                className={`toggle-pill ${selectedCoin === c ? 'active' : ''}`}
              >
                {c.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Rolling average toggles */}
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => setShowRolling10(v => !v)}
            className={`toggle-pill ${showRolling10 ? 'active-purple' : ''}`}
          >
            10s Avg
          </button>
          <button
            onClick={() => setShowRolling30(v => !v)}
            className={`toggle-pill ${showRolling30 ? 'active-orange' : ''}`}
          >
            30s Avg
          </button>
        </div>
      </motion.div>

      {/* Loading state */}
      <AnimatePresence mode="wait">
        {loading && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center py-20"
          >
            <div className="flex flex-col items-center gap-4">
              <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              <span className="text-text-secondary text-sm">Loading window data...</span>
            </div>
          </motion.div>
        )}

        {fetchError && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="bg-short/10 border border-short/30 rounded-xl p-6"
          >
            <p className="text-short">Failed to load window: {fetchError}</p>
          </motion.div>
        )}

        {detail && traderData && !loading && (
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* Window header */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h3 className="text-lg font-semibold text-text-primary">
                {detail.coin.toUpperCase()} — {formatDate(detail.windowTs)}{' '}
                <span className="text-text-secondary">
                  {formatTime(detail.windowTs)}–{formatTime(detail.windowTs + (detail.duration ?? selectedDuration))}
                </span>
              </h3>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`px-4 py-2 rounded-full font-mono text-sm font-semibold ${
                  detail.settlement.winner === 'Up'
                    ? 'bg-long/20 text-long border border-long/30'
                    : 'bg-short/20 text-short border border-short/30'
                }`}
                style={{
                  boxShadow: detail.settlement.winner === 'Up'
                    ? '0 0 20px rgba(34, 197, 94, 0.2)'
                    : '0 0 20px rgba(239, 68, 68, 0.2)'
                }}
              >
                {detail.settlement.winner} wins @ {(detail.settlement.upPrice * 100).toFixed(0)}c
              </motion.div>
            </div>

            {/* Stats cards */}
            <StatsCards stats={traderData.stats} winner={detail.settlement.winner} />

            {/* Price chart */}
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

            {/* Inventory chart */}
            {traderData.inventory.length > 0 && (
              <ErrorBoundary fallback="InventoryChart">
                <InventoryChart inventory={traderData.inventory} duration={detail.duration ?? selectedDuration} />
              </ErrorBoundary>
            )}

            {/* Trade log */}
            <div className="bg-surface border border-border rounded-xl overflow-hidden">
              <button
                onClick={() => setTradeLogOpen(v => !v)}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-hover transition-colors"
              >
                <h3 className="font-semibold text-text-primary flex items-center gap-2">
                  <motion.span
                    animate={{ rotate: tradeLogOpen ? 90 : 0 }}
                    className="text-text-muted text-xs"
                  >
                    ▶
                  </motion.span>
                  Trade Log
                  <span className="text-text-muted font-normal text-sm">
                    ({traderData.trades.length} trades)
                  </span>
                </h3>
              </button>

              <AnimatePresence>
                {tradeLogOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="max-h-80 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-elevated sticky top-0">
                          <tr className="text-text-muted text-xs">
                            <th className="text-left py-3 px-5 font-medium">Time</th>
                            <th className="text-left py-3 px-2 font-medium">Side</th>
                            <th className="text-left py-3 px-2 font-medium">Outcome</th>
                            <th className="text-right py-3 px-2 font-medium">Tokens</th>
                            <th className="text-right py-3 px-2 font-medium">USDC</th>
                            <th className="text-right py-3 px-5 font-medium">Price</th>
                          </tr>
                        </thead>
                        <tbody className="font-mono">
                          {traderData.trades.map((t, i) => (
                            <motion.tr
                              key={i}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.02 }}
                              className="border-t border-border-subtle hover:bg-hover/50"
                            >
                              <td className="py-2.5 px-5 text-text-secondary">
                                {Math.floor(t.sec / 60)}:{String(t.sec % 60).padStart(2, '0')}
                              </td>
                              <td className={`py-2.5 px-2 font-medium ${
                                t.side === 'BUY' ? 'text-long' : 'text-short'
                              }`}>
                                {t.side}
                              </td>
                              <td className="py-2.5 px-2 text-text-primary">{t.outcome}</td>
                              <td className="py-2.5 px-2 text-right text-text-primary">
                                {t.tokens.toFixed(1)}
                              </td>
                              <td className="py-2.5 px-2 text-right text-text-secondary">
                                ${t.usdc.toFixed(2)}
                              </td>
                              <td className="py-2.5 px-5 text-right text-text-primary">
                                {(t.price * 100).toFixed(1)}c
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {!loading && !fetchError && detail && !traderData && (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-20 text-text-secondary"
          >
            No trades for {bot.name} in this window.
          </motion.div>
        )}
      </AnimatePresence>

      {/* Comments */}
      <Comments key={bot.name} botName={bot.name} />
    </motion.div>
  );
}
