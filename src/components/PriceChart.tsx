import { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  LineController,
  ScatterController,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import { Chart } from 'react-chartjs-2';
import type { PricePoint, Trade } from '../types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  LineController,
  ScatterController,
  Tooltip,
  Legend,
  Filler,
  annotationPlugin
);

interface Props {
  prices: PricePoint[];
  trades: Trade[];
  settlement: { winner: string; upPrice: number; downPrice: number };
  coin: string;
}

export default function PriceChart({ prices, trades, settlement, coin }: Props) {
  const hasDenseData = prices.length > 100;
  const hasBidAsk = prices.some(p => p.bid != null && p.ask != null);

  const data = useMemo(() => {
    const buys = trades.filter(t => t.side === 'BUY');
    const sells = trades.filter(t => t.side === 'SELL');

    const datasets: any[] = [];

    if (hasBidAsk) {
      // Bid-ask spread band (filled area)
      datasets.push({
        type: 'line' as const,
        label: 'Ask',
        data: prices.map(p => ({ x: p.sec, y: p.ask != null ? p.ask * 100 : null })),
        borderColor: 'rgba(88,166,255,0.2)',
        backgroundColor: 'rgba(88,166,255,0.08)',
        borderWidth: 0,
        pointRadius: 0,
        fill: '+1',
        tension: 0,
        order: 4,
      });
      datasets.push({
        type: 'line' as const,
        label: 'Bid',
        data: prices.map(p => ({ x: p.sec, y: p.bid != null ? p.bid * 100 : null })),
        borderColor: 'rgba(88,166,255,0.2)',
        borderWidth: 0,
        pointRadius: 0,
        fill: false,
        tension: 0,
        order: 4,
      });
    }

    // Mid price line
    datasets.push({
      type: 'line' as const,
      label: `${coin.toUpperCase()}-UP Mid`,
      data: prices.map(p => ({ x: p.sec, y: p.p * 100 })),
      borderColor: '#58a6ff',
      backgroundColor: 'rgba(88,166,255,0.1)',
      borderWidth: hasDenseData ? 1.5 : 2,
      tension: hasDenseData ? 0 : 0.3,
      pointRadius: 0,
      fill: false,
      order: 3,
    });

    // Trade scatter points
    datasets.push({
      type: 'scatter' as const,
      label: 'Buy',
      data: buys.map(t => ({
        x: t.sec,
        y: t.price * 100,
        tokens: t.tokens,
        usdc: t.usdc,
        outcome: t.outcome,
      })),
      backgroundColor: '#3fb950',
      borderColor: '#3fb950',
      pointRadius: buys.map(t => Math.max(3, Math.min(8, t.tokens / 5))),
      order: 1,
    });

    datasets.push({
      type: 'scatter' as const,
      label: 'Sell',
      data: sells.map(t => ({
        x: t.sec,
        y: t.price * 100,
        tokens: t.tokens,
        usdc: t.usdc,
        outcome: t.outcome,
      })),
      backgroundColor: '#f85149',
      borderColor: '#f85149',
      pointRadius: sells.map(t => Math.max(3, Math.min(8, t.tokens / 5))),
      order: 1,
    });

    return { datasets };
  }, [prices, trades, coin, hasDenseData, hasBidAsk]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'nearest' as const,
      intersect: false,
    },
    scales: {
      x: {
        type: 'linear' as const,
        title: { display: true, text: 'Seconds into window', color: '#8b949e' },
        min: 0,
        max: 900,
        ticks: { color: '#8b949e', stepSize: 60 },
        grid: { color: 'rgba(48,54,61,0.5)' },
      },
      y: {
        type: 'linear' as const,
        title: { display: true, text: 'Price (cents)', color: '#8b949e' },
        min: 0,
        max: 100,
        ticks: { color: '#8b949e' },
        grid: { color: 'rgba(48,54,61,0.5)' },
      },
    },
    plugins: {
      legend: {
        labels: {
          color: '#c9d1d9',
          usePointStyle: true,
          filter: (item: any) => {
            // Hide bid/ask from legend
            return item.text !== 'Ask' && item.text !== 'Bid';
          },
        },
      },
      tooltip: {
        callbacks: {
          label: (ctx: any) => {
            const raw = ctx.raw;
            if (raw.tokens !== undefined) {
              return `${ctx.dataset.label} ${raw.outcome}: ${raw.tokens.toFixed(1)} tokens @ $${(raw.y / 100).toFixed(3)} ($${raw.usdc.toFixed(2)})`;
            }
            return `${ctx.dataset.label}: ${raw.y.toFixed(1)}c`;
          },
        },
      },
      annotation: {
        annotations: {
          settlementLine: {
            type: 'line' as const,
            yMin: settlement.upPrice * 100,
            yMax: settlement.upPrice * 100,
            borderColor: settlement.winner === 'Up' ? '#3fb950' : '#f85149',
            borderWidth: 1,
            borderDash: [5, 5],
            label: {
              display: true,
              content: `Settlement: ${settlement.winner} wins`,
              position: 'end' as const,
              color: '#c9d1d9',
              backgroundColor: 'rgba(22,27,34,0.8)',
              font: { size: 11 },
            },
          },
        },
      },
    },
  }), [settlement]);

  return (
    <div className="chart-box">
      <h3 className="chart-title">
        {coin.toUpperCase()}-UP Price & Trades
        {hasDenseData && <span style={{ color: '#8b949e', fontWeight: 400, fontSize: 12, marginLeft: 8 }}>
          ({prices.length} price points)
        </span>}
      </h3>
      <div className="chart-wrapper">
        <Chart type="scatter" data={data} options={options} />
      </div>
    </div>
  );
}
