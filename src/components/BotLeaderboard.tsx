import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { fetchManifest } from '../api';
import type { Manifest } from '../types';
import Header from './Header';
import SEOHead from './SEOHead';

const DURATION_LABELS: Record<number, string> = { 300: '5m', 900: '15m', 3600: '1h' };

export default function BotLeaderboard() {
  const navigate = useNavigate();
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'pnl' | 'winRate' | 'trades'>('pnl');

  useEffect(() => {
    fetchManifest().then(setManifest).catch(e => setError(e.message));
  }, []);

  const rankings = useMemo(() => {
    if (!manifest) return [];

    return manifest.traders.map(bot => {
      const botWindows = manifest.windows.filter(w =>
        w.traders.some(t => t.name === bot.name)
      );
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
      const wins = botWindows.filter(w => {
        const t = w.traders.find(t => t.name === bot.name);
        return (t?.netPnl ?? 0) > 0;
      }).length;
      const winRate = botWindows.length > 0 ? (wins / botWindows.length) * 100 : 0;

      return {
        ...bot,
        totalPnl,
        totalTrades: totalBuys + totalSells,
        totalWindows: botWindows.length,
        wins,
        losses: botWindows.length - wins,
        winRate,
      };
    }).sort((a, b) => {
      if (sortBy === 'pnl') return b.totalPnl - a.totalPnl;
      if (sortBy === 'winRate') return b.winRate - a.winRate;
      return b.totalTrades - a.totalTrades;
    });
  }, [manifest, sortBy]);

  if (error) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-6xl mx-auto">
          <Header />
          <p className="text-short">Failed to load data: {error}</p>
        </div>
      </div>
    );
  }

  if (!manifest) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-6xl mx-auto">
          <Header />
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <SEOHead
        title="Polymarket Bot Leaderboard — Rankings & Performance"
        description="Compare the top Polymarket trading bots ranked by P&L, win rate, and trade volume. The only bot-specific leaderboard for crypto prediction market automated traders."
        path="/leaderboard"
      />
      <div className="max-w-6xl mx-auto">
        <Header />
        <motion.button
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate('/')}
          className="btn-ghost mb-6 flex items-center gap-2"
        >
          <span>&larr;</span>
          <span>Back to all bots</span>
        </motion.button>

        {/* Page heading */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-text-primary mb-3">
            Polymarket Bot Leaderboard
          </h1>
          <p className="text-text-secondary max-w-3xl leading-relaxed">
            Compare the top automated trading bots competing on Polymarket's crypto prediction markets.
            Rankings are based on real-time trade data from the last 24 hours across BTC, ETH, SOL, and XRP
            binary outcome markets. Unlike generic trader leaderboards, this ranks only verified bots —
            showing how algorithmic strategies perform head-to-head in 5-minute, 15-minute, and 1-hour market windows.
          </p>
        </motion.div>

        {/* Sort controls */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-center gap-3 mb-6"
        >
          <span className="text-xs text-text-muted font-medium">Sort by</span>
          {(['pnl', 'winRate', 'trades'] as const).map(key => (
            <button
              key={key}
              onClick={() => setSortBy(key)}
              className={`toggle-pill ${sortBy === key ? 'active' : ''}`}
            >
              {key === 'pnl' ? 'P&L' : key === 'winRate' ? 'Win Rate' : 'Trades'}
            </button>
          ))}
        </motion.div>

        {/* Leaderboard table */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-surface border border-border rounded-xl overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-elevated">
                <tr className="text-text-muted text-xs">
                  <th className="text-left py-4 px-5 font-medium w-12">Rank</th>
                  <th className="text-left py-4 px-4 font-medium">Bot</th>
                  <th className="text-left py-4 px-4 font-medium">Markets</th>
                  <th className="text-right py-4 px-4 font-medium">24h P&L</th>
                  <th className="text-right py-4 px-4 font-medium">Win Rate</th>
                  <th className="text-right py-4 px-4 font-medium">W/L</th>
                  <th className="text-right py-4 px-4 font-medium">Trades</th>
                  <th className="text-right py-4 px-5 font-medium">Windows</th>
                </tr>
              </thead>
              <tbody>
                {rankings.map((bot, index) => (
                  <motion.tr
                    key={bot.name}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => navigate(`/bot/${bot.name}`)}
                    className="border-t border-border-subtle hover:bg-hover/50 cursor-pointer transition-colors"
                  >
                    <td className="py-4 px-5">
                      <span className={`text-lg font-bold ${
                        index === 0 ? 'text-gold' : index === 1 ? 'text-text-muted' : index === 2 ? 'text-orange' : 'text-text-dim'
                      }`}>
                        #{index + 1}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold text-white flex-shrink-0"
                          style={{
                            background: `linear-gradient(135deg, ${bot.color}, ${bot.color}dd)`,
                            boxShadow: `0 2px 12px ${bot.color}30`,
                          }}
                        >
                          {bot.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold" style={{ color: bot.color }}>
                            {bot.name}
                          </div>
                          <div className="text-xs text-text-muted line-clamp-1">
                            {bot.description}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex gap-1">
                        {(bot.durations || [900]).map(d => (
                          <span key={d} className="px-2 py-0.5 bg-elevated border border-border-subtle rounded text-xs text-text-muted">
                            {DURATION_LABELS[d] || `${d}s`}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className={`font-mono font-bold ${
                        bot.totalPnl >= 0 ? 'text-long' : 'text-short'
                      }`}>
                        {bot.totalPnl >= 0 ? '+' : ''}${bot.totalPnl.toFixed(2)}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className={`font-mono font-semibold ${
                        bot.winRate >= 60 ? 'text-long' : bot.winRate >= 45 ? 'text-text-primary' : 'text-short'
                      }`}>
                        {bot.winRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right font-mono text-text-secondary">
                      <span className="text-long">{bot.wins}</span>
                      <span className="text-text-dim">/</span>
                      <span className="text-short">{bot.losses}</span>
                    </td>
                    <td className="py-4 px-4 text-right font-mono text-text-primary">
                      {bot.totalTrades}
                    </td>
                    <td className="py-4 px-5 text-right font-mono text-text-primary">
                      {bot.totalWindows}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* SEO content section */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-12 space-y-8"
        >
          <div>
            <h2 className="text-xl font-bold text-text-primary mb-3">
              About the Polymarket Bot Leaderboard
            </h2>
            <p className="text-text-secondary leading-relaxed">
              This is the only bot-specific leaderboard for Polymarket's crypto prediction markets.
              While other leaderboards track all traders — including manual traders and whales — Polybot Arena
              focuses exclusively on automated trading bots competing in crypto binary outcome markets.
              Each bot's performance is tracked at the individual trade level, with full P&L accounting
              using FIFO inventory methods.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-text-primary mb-3">
              How Bot Rankings Work
            </h2>
            <p className="text-text-secondary leading-relaxed">
              Bots are ranked by their 24-hour net P&L across all crypto prediction market windows they
              participate in. Data updates every 2 hours from the Polymarket CLOB (Central Limit Order Book).
              You can sort by P&L, win rate, or total trade count to compare bots from different angles.
              Click any bot to see its full trade history with interactive price charts showing every entry and exit.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-text-primary mb-3">
              Market Windows Explained
            </h2>
            <p className="text-text-secondary leading-relaxed">
              Polymarket's crypto prediction markets operate in fixed-duration windows. A 5-minute window
              asks: "Will BTC price go up or down in the next 5 minutes?" Bots buy and sell binary outcome
              shares (Up/Down) during the window, and at settlement, the winning side pays $1.00 per share.
              Different bots specialize in different durations — some trade the rapid 5-minute markets,
              others the more strategic 15-minute or 1-hour windows.
            </p>
          </div>
        </motion.section>

        {/* Footer */}
        <div className="mt-16 pt-6 pb-8 border-t border-border text-center">
          <p className="text-text-muted text-xs">
            Data sourced from Polymarket CLOB. Not financial advice.
          </p>
        </div>
      </div>
    </div>
  );
}
