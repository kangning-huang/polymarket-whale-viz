import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Header from './Header';
import SEOHead from './SEOHead';

export default function BlogPost() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen p-6">
      <SEOHead
        title="How Polymarket Bots Actually Trade: Real Data Analysis"
        description="Deep dive into how automated trading bots operate on Polymarket crypto prediction markets. Real trade data, strategy analysis, and performance breakdowns across 5-minute, 15-minute, and 1-hour binary outcome windows."
        path="/blog/how-polymarket-bots-trade"
        type="article"
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
          className="prose-custom space-y-8"
        >
          <header>
            <h1 className="text-3xl md:text-4xl font-bold text-text-primary leading-tight mb-4">
              How Polymarket Bots Actually Trade: Real Data from the Arena
            </h1>
            <p className="text-text-muted text-sm">
              Published on Polybot Arena &middot; Updated regularly with live bot data
            </p>
          </header>

          <p className="text-lg text-text-secondary leading-relaxed">
            Everyone writes about Polymarket bot strategies. Medium posts theorize about arbitrage.
            YouTube videos promise "how to make $10K with prediction market bots." But nobody actually
            shows you what bot trading looks like at the trade level — until now.
          </p>

          <p className="text-text-secondary leading-relaxed">
            At{' '}
            <button onClick={() => navigate('/')} className="text-accent hover:underline">
              Polybot Arena
            </button>
            , we track the most profitable automated traders on Polymarket's crypto prediction markets.
            Every trade, every entry, every exit — visualized on price charts with FIFO inventory
            tracking and real P&L accounting. Here's what the data actually reveals about how these
            bots operate.
          </p>

          <Section title="What Are Polymarket Crypto Prediction Markets?">
            <p>
              Polymarket runs binary outcome markets on short-term crypto price movements. A typical
              market asks: "Will BTC go up or down in the next 15 minutes?" Traders buy shares of "Up"
              or "Down" at prices between $0.01 and $0.99. When the window closes, the winning side
              settles at $1.00 — the losing side at $0.00.
            </p>
            <p>
              These markets run continuously in fixed windows: 5 minutes, 15 minutes, and 1 hour.
              The rapid pace and binary structure make them a natural habitat for automated trading bots,
              which can react faster than humans to price movements and manage positions across
              multiple coins (BTC, ETH, SOL, XRP) simultaneously.
            </p>
          </Section>

          <Section title="The Bots We Track">
            <p>
              Polybot Arena currently profiles five active trading bots, each with a distinct strategy
              and market focus:
            </p>
            <ul className="list-disc list-inside space-y-2 text-text-secondary">
              <li>
                <button onClick={() => navigate('/bot/distinct-baguette')} className="text-accent hover:underline font-semibold">
                  distinct-baguette
                </button>
                {' '} — The top 15-minute trader. Mean-reversion strategy with 142-second median hold times.
              </li>
              <li>
                <button onClick={() => navigate('/bot/abrak25')} className="text-accent hover:underline font-semibold">
                  abrak25
                </button>
                {' '} — High-frequency 5-minute scalper. $13K+ daily P&L through dozens of rapid-fire trades per window.
              </li>
              <li>
                <button onClick={() => navigate('/bot/0x8dxd')} className="text-accent hover:underline font-semibold">
                  0x8dxd
                </button>
                {' '} — Patient 1-hour trader. Builds positions deliberately across the full hour window.
              </li>
              <li>
                <button onClick={() => navigate('/bot/vague-sourdough')} className="text-accent hover:underline font-semibold">
                  vague-sourdough
                </button>
                {' '} — 5-minute competitor with a different risk profile than abrak25.
              </li>
              <li>
                <button onClick={() => navigate('/bot/vidarx')} className="text-accent hover:underline font-semibold">
                  vidarx
                </button>
                {' '} — Another 5-minute bot, enabling head-to-head strategy comparison.
              </li>
            </ul>
          </Section>

          <Section title="What Makes These Bots Different from Whale Trackers">
            <p>
              Existing tools like Polywhaler, PolyTrack, and Unusual Whales alert you when large
              trades happen. They're useful, but they're a blunt instrument — showing you <em>that</em> a
              big trade happened, not <em>how</em> a strategy plays out trade by trade.
            </p>
            <p>
              Polybot Arena is different. We show you the full trading session: every buy and sell
              plotted on a price chart, the bot's inventory building and unwinding in real-time, and
              the final P&L breakdown. This lets you study <em>strategy patterns</em> rather than just
              individual signals.
            </p>
          </Section>

          <Section title="Key Bot Strategy Patterns We've Observed">
            <h3 className="text-lg font-semibold text-text-primary mt-6 mb-2">
              1. Mean-Reversion Trading
            </h3>
            <p>
              The most common pattern among profitable bots: buying when the price dips below fair value
              and selling when it overshoots. In 15-minute windows, distinct-baguette executes this
              with precision — entering positions during temporary mispricings and exiting within
              2-3 minutes, well before the settlement outcome is decided.
            </p>

            <h3 className="text-lg font-semibold text-text-primary mt-6 mb-2">
              2. High-Frequency Scalping
            </h3>
            <p>
              Bots like abrak25 take a different approach: placing many small trades per window,
              capturing tiny spreads on each one. The win-per-trade is small, but the volume adds up.
              This strategy requires minimal directional conviction — instead relying on execution speed
              and spread capture.
            </p>

            <h3 className="text-lg font-semibold text-text-primary mt-6 mb-2">
              3. Duration-Based Strategy Selection
            </h3>
            <p>
              One of the clearest insights from comparing bots: different market durations reward
              different strategies. The 5-minute markets are dominated by speed — bots that can enter
              and exit in seconds. The 15-minute window allows for more deliberate position building.
              And the 1-hour window rewards patience and larger position sizes.
            </p>
          </Section>

          <Section title="How We Calculate Bot Performance">
            <p>
              Unlike leaderboards that just show aggregate P&L, Polybot Arena uses FIFO (First In,
              First Out) inventory accounting to track each bot's positions precisely. When a bot buys
              100 "Up" shares at $0.45 and later sells 50 at $0.52, we calculate the exact spread P&L
              on those matched shares. At settlement, any remaining inventory is valued at $1.00
              (winner) or $0.00 (loser).
            </p>
            <p>
              This gives you two distinct P&L components for each bot:
            </p>
            <ul className="list-disc list-inside space-y-2 text-text-secondary">
              <li><strong>Spread P&L</strong> — profit from buying low and selling high during the window</li>
              <li><strong>Settlement P&L</strong> — profit or loss from shares held to settlement</li>
            </ul>
            <p>
              Together, these reveal whether a bot is primarily a spread-capturing market maker or a
              directional trader betting on the outcome.
            </p>
          </Section>

          <Section title="Explore the Data Yourself">
            <p>
              The best way to understand bot strategies is to see them in action. Head to the{' '}
              <button onClick={() => navigate('/')} className="text-accent hover:underline font-semibold">
                Polybot Arena dashboard
              </button>
              {' '}to browse live bot profiles, or check the{' '}
              <button onClick={() => navigate('/leaderboard')} className="text-accent hover:underline font-semibold">
                Bot Leaderboard
              </button>
              {' '}to see how they rank against each other. Data updates every 2 hours from the
              Polymarket CLOB.
            </p>
          </Section>

          {/* Footer */}
          <footer className="mt-16 pt-6 border-t border-border text-center">
            <p className="text-text-muted text-xs">
              Data sourced from Polymarket CLOB. Not financial advice.
            </p>
          </footer>
        </motion.article>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-2xl font-bold text-text-primary mb-4">{title}</h2>
      <div className="space-y-4 text-text-secondary leading-relaxed">{children}</div>
    </section>
  );
}
