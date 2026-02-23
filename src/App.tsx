import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
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
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        <Header />

        {/* Bot grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {manifest.traders.map((bot, index) => (
            <BotCard
              key={bot.name}
              bot={bot}
              windows={manifest.windows}
              onClick={() => navigate(`/bot/${bot.name}`)}
              index={index}
            />
          ))}
        </motion.div>

        {/* Footer */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 pt-6 border-t border-border text-center"
        >
          <p className="text-text-muted text-xs">
            Data sourced from Polymarket CLOB. Not financial advice.
          </p>
        </motion.footer>
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

  return (
    <div className="min-h-screen p-6">
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

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/bot/:name" element={<BotPageRoute />} />
      <Route path="/bot/:name/:ts/:coin" element={<LegacyBotWindowRedirect />} />
      <Route path="/window/:ts/:coin" element={<LegacyRedirect />} />
    </Routes>
  );
}
