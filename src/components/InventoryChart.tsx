import { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import type { InventoryPoint } from '../types';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

interface Props {
  inventory: InventoryPoint[];
}

export default function InventoryChart({ inventory }: Props) {
  const data = useMemo(() => {
    // Sample to at most ~60 bars for readability
    const step = Math.max(1, Math.floor(inventory.length / 60));
    const sampled = inventory.filter((_, i) => i % step === 0 || i === inventory.length - 1);

    return {
      labels: sampled.map(p => `${Math.floor(p.sec / 60)}:${String(p.sec % 60).padStart(2, '0')}`),
      datasets: [
        {
          label: 'Up Tokens',
          data: sampled.map(p => p.upTokens),
          backgroundColor: 'rgba(63,185,80,0.7)',
          borderColor: '#3fb950',
          borderWidth: 1,
        },
        {
          label: 'Down Tokens',
          data: sampled.map(p => p.downTokens),
          backgroundColor: 'rgba(248,81,73,0.7)',
          borderColor: '#f85149',
          borderWidth: 1,
        },
      ],
    };
  }, [inventory]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        ticks: { color: '#8b949e', maxTicksLimit: 15 },
        grid: { color: 'rgba(48,54,61,0.5)' },
      },
      y: {
        title: { display: true, text: 'Tokens Held', color: '#8b949e' },
        ticks: { color: '#8b949e' },
        grid: { color: 'rgba(48,54,61,0.5)' },
      },
    },
    plugins: {
      legend: {
        labels: { color: '#c9d1d9' },
      },
    },
  }), []);

  return (
    <div className="chart-box short">
      <h3 className="chart-title">Position Inventory</h3>
      <div className="chart-wrapper">
        <Bar data={data} options={options} />
      </div>
    </div>
  );
}
