import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { fetchManifest } from './api';
import type { Manifest } from './types';
import Header from './components/Header';
import BotCard from './components/BotCard';
import BotPage from './components/BotPage';

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
      <BotPage bot={bot} manifest={manifest} />
    </div>
  );
}

function LegacyRedirect() {
  const { ts, coin } = useParams<{ ts: string; coin: string }>();
  const navigate = useNavigate();
  useEffect(() => {
    navigate(`/bot/distinct-baguette`, { replace: true });
  }, [ts, coin, navigate]);
  return null;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/bot/:name" element={<BotPageRoute />} />
      {/* Legacy: old window routes redirect to bot page */}
      <Route path="/bot/:name/:ts/:coin" element={<LegacyBotWindowRedirect />} />
      <Route path="/window/:ts/:coin" element={<LegacyRedirect />} />
    </Routes>
  );
}

function LegacyBotWindowRedirect() {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  useEffect(() => {
    navigate(`/bot/${name}`, { replace: true });
  }, [name, navigate]);
  return null;
}
