import { useMemo } from 'react';
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  LineElement,
  LineController,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import type { InventoryPoint } from '../types';
import { useThemeColors } from '../theme';

ChartJS.register(LinearScale, PointElement, LineElement, LineController, Tooltip, Legend, Filler);

interface Props {
  inventory: InventoryPoint[];
  duration?: number;
}

export default function InventoryChart({ inventory, duration }: Props) {
  const theme = useThemeColors();

  const data = useMemo(() => ({
    datasets: [
      {
        label: 'Up Tokens',
        data: inventory.map(p => ({ x: p.sec, y: p.upTokens })),
        borderColor: theme.green,
        backgroundColor: `${theme.green}33`,
        borderWidth: 1.5,
        pointRadius: 0,
        stepped: true as const,
        fill: true,
      },
      {
        label: 'Down Tokens',
        data: inventory.map(p => ({ x: p.sec, y: p.downTokens })),
        borderColor: theme.red,
        backgroundColor: `${theme.red}33`,
        borderWidth: 1.5,
        pointRadius: 0,
        stepped: true as const,
        fill: true,
      },
    ],
  }), [inventory, theme]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        type: 'linear' as const,
        min: 0,
        max: duration || 900,
        ticks: {
          color: theme.textSecondary,
          stepSize: (duration || 900) <= 300 ? 30 : 60,
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
        title: { display: true, text: 'Tokens Held', color: theme.textSecondary },
        ticks: { color: theme.textSecondary },
        grid: { color: theme.gridLine },
      },
    },
    plugins: {
      legend: {
        labels: { color: theme.text },
      },
    },
  }), [theme]);

  return (
    <div className="chart-box short">
      <h3 className="chart-title">Position Inventory</h3>
      <div className="chart-wrapper">
        <Line data={data} options={options} />
      </div>
    </div>
  );
}
