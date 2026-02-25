import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import { fetchManifest } from './api';
import type { Manifest } from './types';
import { useIsDarkMode } from './theme';
import Header from './components/Header';
import BotCard from './components/BotCard';
import BotPage from './components/BotPage';
import SuggestBot from './components/SuggestBot';
import SEOHead from './components/SEOHead';

const BotLeaderboard = lazy(() => import('./components/BotLeaderboard'));
const BlogPost = lazy(() => import('./components/BlogPost'));

/* ── Scroll-reveal wrapper ─────────────────────────────────── */
function Reveal({
  children,
  className = '',
  delay = 0,
  y = 60,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y }}
      transition={{
        duration: 0.8,
        delay,
        ease: [0.25, 0.1, 0.25, 1],
      }}
    >
      {children}
    </motion.div>
  );
}

function Landing() {
  const navigate = useNavigate();
  const isDarkMode = useIsDarkMode();
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [error, setError] = useState<string | null>(null);

  /* ── Parallax refs ── */
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });

  // Banner parallax: image moves slower than scroll, fades out
  const bannerY = useTransform(scrollYProgress, [0, 1], ['0%', '30%']);
  const bannerOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const bannerScale = useTransform(scrollYProgress, [0, 1], [1, 1.08]);

  // Scroll indicator fades out quickly
  const chevronOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);

  useEffect(() => {
    fetchManifest()
      .then(setManifest)
      .catch(e => setError(e.message));
  }, []);

  if (error) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-6xl mx-auto">
          <Header />
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-short/10 border border-short/30 rounded-xl p-6"
          >
            <p className="text-short font-medium mb-2">Failed to load data</p>
            <p className="text-text-secondary text-sm">{error}</p>
            <p className="text-text-muted text-xs mt-4">
              Data updates every 2 hours. Try again later.
            </p>
          </motion.div>
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
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-4"
            >
              <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              <span className="text-text-secondary text-sm">Loading market data...</span>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SEOHead
        description="Watch elite Polymarket trading bots compete in real-time. Compare bot strategies, P&L, entries and exits across crypto prediction market windows. The only bot performance dashboard with trade-level visualizations."
      />
      {/* ━━━━━━━━━━━━━━━ HERO — full-impact parallax banner ━━━━━━━━━━━━━━━ */}
      <div
        ref={heroRef}
        className="relative w-full overflow-hidden"
        style={{ height: 'clamp(200px, 32vw, 380px)' }}
      >
        {/* Parallax banner image */}
        <motion.div
          className="absolute inset-0 will-change-transform"
          style={{ y: bannerY, scale: bannerScale, opacity: bannerOpacity }}
        >
          <img
            src={isDarkMode
              ? '/images/banner short dark high-res-v3.png'
              : '/images/banner short light high-res-v3.jpg'
            }
            alt="Polybot Arena — Trading bots competing in a neon-lit arena"
            className="absolute inset-0 w-full h-full object-cover object-top select-none pointer-events-none"
            draggable={false}
          />
        </motion.div>

        {/* Bottom gradient — seamless blend into content */}
        <div
          className="absolute bottom-0 left-0 right-0 pointer-events-none"
          style={{
            height: '60%',
            background: 'linear-gradient(to top, var(--color-void), transparent)',
          }}
        />

        {/* Scroll indicator chevron */}
        <motion.div
          className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 pointer-events-none"
          style={{ opacity: chevronOpacity }}
        >
          <span className="text-text-muted text-xs tracking-widest uppercase">Scroll</span>
          <motion.svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            className="text-text-muted"
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <path d="M4 7l6 6 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </motion.svg>
        </motion.div>
      </div>

      {/* ━━━━━━━━━━━━━━━ CONTENT — scroll-revealed sections ━━━━━━━━━━━━━━━ */}
      <div className="relative bg-void">
        <div className="max-w-6xl mx-auto px-6">

          {/* ── Tagline ── */}
          <Reveal className="pb-10 pt-4">
            <p className="text-base md:text-lg text-text-secondary max-w-2xl leading-relaxed">
              Study the most profitable trading bots on{' '}
              <a
                href="https://polymarket.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:text-accent-glow underline underline-offset-2 transition-colors"
              >
                Polymarket
              </a>
              {' '}in real-time. See their entries, exits, and profit/loss on every market window.{' '}
              <span className="text-text-muted">Updates every 2 hours.</span>
            </p>
          </Reveal>

          {/* ── Navigation links ── */}
          <Reveal className="mb-10 flex flex-wrap gap-3" y={30}>
            <button
              onClick={() => navigate('/leaderboard')}
              className="btn-ghost text-sm flex items-center gap-2"
            >
              <span>🏆</span> Bot Leaderboard
            </button>
            <button
              onClick={() => navigate('/blog/how-polymarket-bots-trade')}
              className="btn-ghost text-sm flex items-center gap-2"
            >
              <span>📊</span> How Bots Trade
            </button>
          </Reveal>

          {/* ── Section label ── */}
          <Reveal className="mb-8" y={30}>
            <h2 className="text-xs font-mono uppercase tracking-[0.2em] text-text-dim">
              Active Bots
            </h2>
            <div className="mt-2 h-px w-16 bg-gradient-to-r from-accent to-transparent" />
          </Reveal>

          {/* ── Bot grid — each card reveals on scroll ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {manifest.traders.map((bot, index) => (
              <Reveal key={bot.name} delay={index * 0.1} y={40}>
                <BotCard
                  bot={bot}
                  windows={manifest.windows}
                  onClick={() => navigate(`/bot/${bot.name}`)}
                  index={index}
                />
              </Reveal>
            ))}
          </div>

          {/* ── Suggest a bot ── */}
          <Reveal className="mt-20" y={50}>
            <SuggestBot />
          </Reveal>

          {/* ── Footer ── */}
          <Reveal className="mt-16 pt-6 pb-8 border-t border-border text-center" y={20}>
            <p className="text-text-muted text-xs">
              Data sourced from Polymarket CLOB. Not financial advice.
            </p>
          </Reveal>
        </div>
      </div>
    </div>
  );
}

function BotPageRoute() {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchManifest()
      .then(setManifest)
      .catch(e => setError(e.message));
  }, []);

  if (error) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-6xl mx-auto">
          <Header />
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-short/10 border border-short/30 rounded-xl p-6"
          >
            <p className="text-short font-medium">Failed to load data: {error}</p>
          </motion.div>
          <button
            onClick={() => navigate('/')}
            className="mt-4 btn-ghost"
          >
            Back
          </button>
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
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-4"
            >
              <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              <span className="text-text-secondary text-sm">Loading market data...</span>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  const bot = manifest.traders.find(t => t.name === name);
  if (!bot) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-6xl mx-auto">
          <Header />
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-surface border border-border rounded-xl p-6"
          >
            <p className="text-text-primary">Bot "{name}" not found.</p>
          </motion.div>
          <button
            onClick={() => navigate('/')}
            className="mt-4 btn-ghost"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  const durationLabel = bot.durations?.map(d =>
    d === 300 ? '5-minute' : d === 900 ? '15-minute' : d === 3600 ? '1-hour' : `${d}s`
  ).join(', ') || 'crypto';

  return (
    <div className="min-h-screen p-6">
      <SEOHead
        title={`${bot.name} — Polymarket Trading Bot Performance`}
        description={`Live trade data and P&L for ${bot.name}, a ${durationLabel} crypto prediction market bot on Polymarket. See entries, exits, strategy patterns, and profit/loss on every market window.`}
        path={`/bot/${bot.name}`}
        type="profile"
      />
      <div className="max-w-6xl mx-auto">
        <Header />
        <motion.button
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate('/')}
          className="btn-ghost mb-6 flex items-center gap-2"
        >
          <span>←</span>
          <span>Back to all bots</span>
        </motion.button>
        <BotPage bot={bot} manifest={manifest} />
      </div>
    </div>
  );
}

function LegacyRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate(`/bot/distinct-baguette`, { replace: true });
  }, [navigate]);
  return null;
}

function LegacyBotWindowRedirect() {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  useEffect(() => {
    navigate(`/bot/${name}`, { replace: true });
  }, [name, navigate]);
  return null;
}

function SuspenseWrapper({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/bot/:name" element={<BotPageRoute />} />
      <Route path="/leaderboard" element={<SuspenseWrapper><BotLeaderboard /></SuspenseWrapper>} />
      <Route path="/blog/how-polymarket-bots-trade" element={<SuspenseWrapper><BlogPost /></SuspenseWrapper>} />
      <Route path="/bot/:name/:ts/:coin" element={<LegacyBotWindowRedirect />} />
      <Route path="/window/:ts/:coin" element={<LegacyRedirect />} />
    </Routes>
  );
}
