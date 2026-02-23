import { useState, useEffect, useCallback } from 'react';
import { Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { fetchManifest, fetchWindowDetail } from './api';
import type { Manifest, WindowDetail, TraderConfig } from './types';
import Header from './components/Header';
import TraderFilter from './components/TraderFilter';
import CoinFilter from './components/CoinFilter';
import WindowGrid from './components/WindowGrid';
import WindowDetailView from './components/WindowDetail';

function Landing() {
  const navigate = useNavigate();
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedCoins, setSelectedCoins] = useState<Set<string>>(new Set(['btc', 'eth', 'sol', 'xrp']));
  const [selectedTrader, setSelectedTrader] = useState<string>('');

  useEffect(() => {
    fetchManifest()
      .then(m => {
        setManifest(m);
        if (m.traders.length > 0) setSelectedTrader(m.traders[0].name);
      })
      .catch(e => setError(e.message));
  }, []);

  const toggleCoin = useCallback((coin: string) => {
    setSelectedCoins(prev => {
      const next = new Set(prev);
      if (next.has(coin)) {
        if (next.size > 1) next.delete(coin);
      } else {
        next.add(coin);
      }
      return next;
    });
  }, []);

  if (error) {
    return (
      <div className="container">
        <Header />
        <div className="error-box">
          <p>Failed to load data: {error}</p>
          <p className="error-hint">Run <code>npm run fetch-data</code> to populate data, or wait for the next GitHub Actions build.</p>
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

  const filteredWindows = manifest.windows.filter(w =>
    selectedCoins.has(w.coin) &&
    (!selectedTrader || w.traders.some(t => t.name === selectedTrader))
  );

  return (
    <div className="container">
      <Header />
      <div className="filters">
        <CoinFilter selected={selectedCoins} onToggle={toggleCoin} />
        <TraderFilter
          traders={manifest.traders}
          selected={selectedTrader}
          onSelect={setSelectedTrader}
        />
      </div>
      <WindowGrid
        windows={filteredWindows}
        trader={selectedTrader}
        onSelect={(ts, coin) => navigate(`/window/${ts}/${coin}`)}
      />
    </div>
  );
}

function WindowPage() {
  const { ts, coin } = useParams<{ ts: string; coin: string }>();
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
        <button className="back-btn" onClick={() => navigate('/')}>Back</button>
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
      <button className="back-btn" onClick={() => navigate('/')}>← Back to all windows</button>
      <WindowDetailView detail={detail} traders={traders} />
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/window/:ts/:coin" element={<WindowPage />} />
    </Routes>
  );
}
