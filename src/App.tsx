import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { fetchManifest, fetchWindowDetail } from './api';
import type { Manifest, WindowDetail, TraderConfig } from './types';
import Header from './components/Header';
import BotCard from './components/BotCard';
import BotPage from './components/BotPage';
import WindowDetailView from './components/WindowDetail';

function Landing() {
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
      <div className="container">
        <Header />
        <div className="error-box">
          <p>Failed to load data: {error}</p>
          <p className="error-hint">Data updates every 2 hours. Try again later.</p>
        </div>
      </div>
    );
  }

  if (!manifest) {
    return (
      <div className="container">
        <Header />
        <div className="loading">Loading market data...</div>
      </div>
    );
  }

  return (
    <div className="container">
      <Header />
      <p className="landing-intro">
        These are the most profitable bots on Polymarket's 15-minute crypto prediction markets.
        Pick one to study their trades.
      </p>
      <div className="bot-grid">
        {manifest.traders.map(bot => (
          <BotCard
            key={bot.name}
            bot={bot}
            windows={manifest.windows}
            onClick={() => navigate(`/bot/${bot.name}`)}
          />
        ))}
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
      <div className="container">
        <Header />
        <div className="error-box">Failed to load data: {error}</div>
        <button className="back-btn" onClick={() => navigate('/')}>Back</button>
      </div>
    );
  }

  if (!manifest) {
    return (
      <div className="container">
        <Header />
        <div className="loading">Loading market data...</div>
      </div>
    );
  }

  const bot = manifest.traders.find(t => t.name === name);
  if (!bot) {
    return (
      <div className="container">
        <Header />
        <div className="error-box">Bot "{name}" not found.</div>
        <button className="back-btn" onClick={() => navigate('/')}>Back</button>
      </div>
    );
  }

  return (
    <div className="container">
      <Header />
      <button className="back-btn" onClick={() => navigate('/')}>← Back to all bots</button>
      <BotPage
        bot={bot}
        manifest={manifest}
        onSelectWindow={(ts, coin) => navigate(`/bot/${name}/${ts}/${coin}`)}
      />
    </div>
  );
}

function WindowPage() {
  const { name, ts, coin } = useParams<{ name: string; ts: string; coin: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<WindowDetail | null>(null);
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ts || !coin) return;
    fetchWindowDetail(Number(ts), coin)
      .then(setDetail)
      .catch(e => setError(e.message));
    fetchManifest().then(setManifest).catch(() => {});
  }, [ts, coin]);

  if (error) {
    return (
      <div className="container">
        <Header />
        <div className="error-box">Failed to load window: {error}</div>
        <button className="back-btn" onClick={() => navigate(`/bot/${name}`)}>Back</button>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="container">
        <Header />
        <div className="loading">Loading window data...</div>
      </div>
    );
  }

  const traders: TraderConfig[] = manifest?.traders ?? [
    { address: '', name: Object.keys(detail.traders)[0] ?? '', color: '#58a6ff' }
  ];

  return (
    <div className="container">
      <Header />
      <button className="back-btn" onClick={() => navigate(`/bot/${name}`)}>
        ← Back to {name}
      </button>
      <WindowDetailView detail={detail} traders={traders} />
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/bot/:name" element={<BotPageRoute />} />
      <Route path="/bot/:name/:ts/:coin" element={<WindowPage />} />
      {/* Legacy route redirect */}
      <Route path="/window/:ts/:coin" element={<LegacyRedirect />} />
    </Routes>
  );
}

function LegacyRedirect() {
  const { ts, coin } = useParams<{ ts: string; coin: string }>();
  const navigate = useNavigate();
  useEffect(() => {
    // Redirect old /window/:ts/:coin to first bot
    navigate(`/bot/distinct-baguette/${ts}/${coin}`, { replace: true });
  }, [ts, coin, navigate]);
  return null;
}
