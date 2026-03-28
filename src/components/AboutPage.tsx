import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Header from './Header';
import SEOHead from './SEOHead';

export default function AboutPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen p-6">
      <SEOHead
        title="About Polybot Arena"
        description="About Polybot Arena — the only dashboard that tracks real-time trading bot performance on Polymarket crypto prediction markets with trade-level visualizations."
        path="/about"
      />
      <div className="max-w-3xl mx-auto">
        <Header />
        <motion.button
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate('/')}
          className="btn-ghost mb-6 flex items-center gap-2"
        >
          <span>&larr;</span>
          <span>Back to Polybot Arena</span>
        </motion.button>

        <motion.article
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="prose-custom space-y-6"
        >
          <h1 className="text-3xl font-bold text-text-primary mb-2">About Polybot Arena</h1>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-text-primary">What Is Polybot Arena?</h2>
            <p className="text-text-secondary leading-relaxed">
              Polybot Arena is a free, open dashboard that tracks the most profitable automated
              trading bots on{' '}
              <a
                href="https://polymarket.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                Polymarket
              </a>'s crypto prediction markets. We visualize every trade, entry, and exit on
              real-time price charts with FIFO inventory tracking and accurate P&L accounting.
            </p>
            <p className="text-text-secondary leading-relaxed">
              Unlike whale trackers that only show large trades, Polybot Arena provides
              complete trade-level analysis — letting you study exactly how bots enter positions,
              manage inventory, and capture profit across 5-minute, 15-minute, and 1-hour
              market windows for BTC, ETH, SOL, and XRP.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-text-primary">How It Works</h2>
            <p className="text-text-secondary leading-relaxed">
              Our data pipeline runs every 2 hours, pulling trade activity from Polymarket's
              public APIs. For each market window, we record per-second price data, reconstruct
              each bot's trading activity, compute FIFO-based inventory and P&L, and visualize
              everything on interactive charts.
            </p>
            <p className="text-text-secondary leading-relaxed">
              The result is a complete picture of how each bot performs — not just whether
              they made money, but exactly how they made it. You can see the precise moments
              a bot enters and exits, how it manages risk during volatile price swings, and
              how its strategy differs from competitors trading the same window.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-text-primary">The Bots We Track</h2>
            <p className="text-text-secondary leading-relaxed">
              We currently profile seven active trading bots, each with a distinct strategy:
            </p>
            <ul className="list-disc list-inside space-y-2 text-text-secondary">
              <li>
                <button onClick={() => navigate('/bot/distinct-baguette')} className="text-accent hover:underline">
                  distinct-baguette
                </button> — The #1 15-minute crypto trader, using mean-reversion with 142s median hold time
              </li>
              <li>
                <button onClick={() => navigate('/bot/abrak25')} className="text-accent hover:underline">
                  abrak25
                </button> — High-frequency 5-minute scalper generating $13K+ daily P&L
              </li>
              <li>
                <button onClick={() => navigate('/bot/0x8dxd')} className="text-accent hover:underline">
                  0x8dxd
                </button> — Turned $313 into $438K in one month with 98% win rate
              </li>
              <li>
                <button onClick={() => navigate('/bot/vague-sourdough')} className="text-accent hover:underline">
                  vague-sourdough
                </button> — 5-minute trader competing in Polymarket's fastest markets
              </li>
              <li>
                <button onClick={() => navigate('/bot/vidarx')} className="text-accent hover:underline">
                  vidarx
                </button> — 4,562+ predictions across 5-minute markets since Nov 2025
              </li>
              <li>
                <button onClick={() => navigate('/bot/BoneReader')} className="text-accent hover:underline">
                  BoneReader
                </button> — Multi-duration trader active across 5m, 15m, and 1h markets
              </li>
              <li>
                <button onClick={() => navigate('/bot/Qualitative')} className="text-accent hover:underline">
                  Qualitative
                </button> — A cautionary tale of published alpha getting exploited
              </li>
            </ul>
            <p className="text-text-secondary leading-relaxed">
              Visit the{' '}
              <button onClick={() => navigate('/leaderboard')} className="text-accent hover:underline">
                leaderboard
              </button>{' '}
              to see current rankings by P&L, win rate, and trade volume.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-text-primary">Why We Built This</h2>
            <p className="text-text-secondary leading-relaxed">
              Prediction markets are one of the most competitive arenas in crypto trading.
              Bots dominate — executing trades in milliseconds, exploiting arbitrage windows
              that last under 3 seconds, and operating 24/7 without fatigue. Yet until
              Polybot Arena, there was no way to actually see what these bots were doing
              at the trade level.
            </p>
            <p className="text-text-secondary leading-relaxed">
              We believe transparency makes markets better. By making bot strategies visible
              and comparable, we help traders understand the competitive landscape, researchers
              study algorithmic trading behavior, and the community hold automated traders
              accountable.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-text-primary">Disclaimer</h2>
            <p className="text-text-secondary leading-relaxed">
              Polybot Arena is an independent project and is not affiliated with, endorsed by,
              or sponsored by Polymarket. All data is sourced from publicly available APIs.
              Nothing on this site constitutes financial advice. Trading prediction markets
              involves significant risk — past bot performance does not guarantee future results.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-text-primary">Get in Touch</h2>
            <p className="text-text-secondary leading-relaxed">
              Have a question, suggestion, or want to report an issue? Visit our{' '}
              <button onClick={() => navigate('/contact')} className="text-accent hover:underline">
                contact page
              </button>.
            </p>
          </section>
        </motion.article>
      </div>
    </div>
  );
}
