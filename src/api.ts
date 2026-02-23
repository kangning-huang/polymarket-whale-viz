import type { Manifest, WindowDetail } from './types';

const BASE = import.meta.env.BASE_URL;

export async function fetchManifest(): Promise<Manifest> {
  const res = await fetch(`${BASE}data/manifest.json`);
  if (!res.ok) throw new Error(`Failed to load manifest: ${res.status}`);
  return res.json();
}

export async function fetchWindowDetail(windowTs: number, coin: string): Promise<WindowDetail> {
  const res = await fetch(`${BASE}data/windows/${windowTs}_${coin}.json`);
  if (!res.ok) throw new Error(`Failed to load window ${windowTs}_${coin}: ${res.status}`);
  return res.json();
}

export function formatTime(ts: number): string {
  return new Date(ts * 1000).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  });
}

export function formatDate(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export function coinLabel(coin: string): string {
  return coin.toUpperCase();
}

export function pnlColor(pnl: number): string {
  if (pnl > 0) return 'var(--green)';
  if (pnl < 0) return 'var(--red)';
  return 'var(--text-secondary)';
}
