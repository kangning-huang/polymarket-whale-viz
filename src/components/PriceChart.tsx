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
import { useThemeColors } from '../theme';
import { computeRollingAvg } from '../rolling';

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
  showRolling10?: boolean;
  showRolling30?: boolean;
}

export default function PriceChart({ prices, trades, settlement, coin, showRolling10, showRolling30 }: Props) {
  const theme = useThemeColors();
  const hasDenseData = prices.length > 100;
  const hasBidAsk = prices.some(p => p.bid != null && p.ask != null);

  const rolling10 = useMemo(
    () => showRolling10 && hasDenseData ? computeRollingAvg(prices, 10) : null,
    [prices, showRolling10, hasDenseData]
  );
  const rolling30 = useMemo(
    () => showRolling30 && hasDenseData ? computeRollingAvg(prices, 30) : null,
    [prices, showRolling30, hasDenseData]
  );

  const data = useMemo(() => {
    const buys = trades.filter(t => t.side === 'BUY');
    const sells = trades.filter(t => t.side === 'SELL');

    const datasets: any[] = [];

    if (hasBidAsk) {
      datasets.push({
        type: 'line' as const,
        label: 'Ask',
        data: prices.map(p => ({ x: p.sec, y: p.ask != null ? p.ask * 100 : null })),
        borderColor: `${theme.accent}33`,
        backgroundColor: `${theme.accent}14`,
        borderWidth: 0,
        pointRadius: 0,
        fill: '+1',
        tension: 0,
        order: 5,
      });
      datasets.push({
        type: 'line' as const,
        label: 'Bid',
        data: prices.map(p => ({ x: p.sec, y: p.bid != null ? p.bid * 100 : null })),
        borderColor: `${theme.accent}33`,
        borderWidth: 0,
        pointRadius: 0,
        fill: false,
        tension: 0,
        order: 5,
      });
    }

    // Mid price line
    datasets.push({
      type: 'line' as const,
      label: `${coin.toUpperCase()}-UP Mid`,
      data: prices.map(p => ({ x: p.sec, y: p.p * 100 })),
      borderColor: theme.accent,
      backgroundColor: `${theme.accent}1a`,
      borderWidth: hasDenseData ? 1.5 : 2,
      tension: hasDenseData ? 0 : 0.3,
      pointRadius: 0,
      fill: false,
      order: 3,
    });

    // Rolling averages
    if (rolling10) {
      datasets.push({
        type: 'line' as const,
        label: '10s Avg',
        data: prices.map((p, i) => ({
          x: p.sec,
          y: rolling10[i] != null ? rolling10[i]! * 100 : null,
        })),
        borderColor: theme.purple,
        borderWidth: 1.5,
        borderDash: [4, 4],
        pointRadius: 0,
        fill: false,
        tension: 0,
        spanGaps: true,
        order: 2,
      });
    }

    if (rolling30) {
      datasets.push({
        type: 'line' as const,
        label: '30s Avg',
        data: prices.map((p, i) => ({
          x: p.sec,
          y: rolling30[i] != null ? rolling30[i]! * 100 : null,
        })),
        borderColor: theme.orange,
        borderWidth: 1.5,
        borderDash: [8, 4],
        pointRadius: 0,
        fill: false,
        tension: 0,
        spanGaps: true,
        order: 2,
      });
    }

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
      backgroundColor: theme.green,
      borderColor: theme.green,
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
      backgroundColor: theme.red,
      borderColor: theme.red,
      pointRadius: sells.map(t => Math.max(3, Math.min(8, t.tokens / 5))),
      order: 1,
    });

    return { datasets };
  }, [prices, trades, coin, hasDenseData, hasBidAsk, theme, rolling10, rolling30]);

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
        min: 0,
        max: 900,
        ticks: {
          color: theme.textSecondary,
          stepSize: 60,
          callback: (val: number | string) => {
            const v = Number(val);
            const m = Math.floor(v / 60);
            const s = v % 60;
            return `${m}:${String(s).padStart(2, '0')}`;
          },
        },
        grid: { color: theme.gridLine },
      },
      y: {
        type: 'linear' as const,
        title: { display: true, text: 'Price (cents)', color: theme.textSecondary },
        min: 0,
        max: 100,
        ticks: { color: theme.textSecondary },
        grid: { color: theme.gridLine },
      },
    },
    plugins: {
      legend: {
        labels: {
          color: theme.text,
          usePointStyle: true,
          filter: (item: any) => item.text !== 'Ask' && item.text !== 'Bid',
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
            borderColor: settlement.winner === 'Up' ? theme.green : theme.red,
            borderWidth: 1,
            borderDash: [5, 5],
            label: {
              display: true,
              content: `Settlement: ${settlement.winner} wins`,
              position: 'end' as const,
              color: theme.text,
              backgroundColor: `${theme.surface}cc`,
              font: { size: 11 },
            },
          },
        },
      },
    },
  }), [settlement, theme]);

  return (
    <div className="chart-box">
      <h3 className="chart-title">
        {coin.toUpperCase()}-UP Price & Trades
        {hasDenseData && <span style={{ color: 'var(--text-secondary)', fontWeight: 400, fontSize: 12, marginLeft: 8 }}>
          ({prices.length} price points)
        </span>}
      </h3>
      <div className="chart-wrapper">
        <Chart type="scatter" data={data} options={options} />
      </div>
    </div>
  );
}
