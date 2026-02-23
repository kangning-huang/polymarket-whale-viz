import { useMemo } from 'react';
import { Group } from '@visx/group';
import { AreaClosed, LinePath } from '@visx/shape';
import { scaleLinear } from '@visx/scale';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { GridRows } from '@visx/grid';
import { curveStepAfter } from '@visx/curve';
import { ParentSize } from '@visx/responsive';
import { motion } from 'framer-motion';
import type { InventoryPoint } from '../types';

interface Props {
  inventory: InventoryPoint[];
  duration?: number;
}

const margin = { top: 20, right: 20, bottom: 40, left: 50 };

function InventoryChartInner({
  inventory,
  duration = 900,
  width,
  height,
}: Props & { width: number; height: number }) {
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // Find max tokens for scale
  const maxTokens = useMemo(() => {
    return Math.max(
      ...inventory.map(p => Math.max(p.upTokens, p.downTokens)),
      10
    );
  }, [inventory]);

  // Scales
  const xScale = useMemo(
    () => scaleLinear({ domain: [0, duration], range: [0, innerWidth] }),
    [duration, innerWidth]
  );

  const yScale = useMemo(
    () => scaleLinear({ domain: [0, maxTokens * 1.1], range: [innerHeight, 0] }),
    [maxTokens, innerHeight]
  );

  // Format time
  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  return (
    <svg width={width} height={height} className="select-none">
      <defs>
        <linearGradient id="upGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22c55e" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#22c55e" stopOpacity="0.05" />
        </linearGradient>
        <linearGradient id="downGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#ef4444" stopOpacity="0.05" />
        </linearGradient>
      </defs>

      <Group left={margin.left} top={margin.top}>
        {/* Grid */}
        <GridRows
          scale={yScale}
          width={innerWidth}
          stroke="#1a1d20"
          strokeOpacity={0.5}
          numTicks={4}
        />

        {/* Up tokens area */}
        <motion.g
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <AreaClosed
            data={inventory}
            x={d => xScale(d.sec)}
            y={d => yScale(d.upTokens)}
            yScale={yScale}
            fill="url(#upGradient)"
            curve={curveStepAfter}
          />
          <LinePath
            data={inventory}
            x={d => xScale(d.sec)}
            y={d => yScale(d.upTokens)}
            stroke="#22c55e"
            strokeWidth={2}
            curve={curveStepAfter}
            style={{ filter: 'drop-shadow(0 0 4px rgba(34, 197, 94, 0.5))' }}
          />
        </motion.g>

        {/* Down tokens area */}
        <motion.g
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <AreaClosed
            data={inventory}
            x={d => xScale(d.sec)}
            y={d => yScale(d.downTokens)}
            yScale={yScale}
            fill="url(#downGradient)"
            curve={curveStepAfter}
          />
          <LinePath
            data={inventory}
            x={d => xScale(d.sec)}
            y={d => yScale(d.downTokens)}
            stroke="#ef4444"
            strokeWidth={2}
            curve={curveStepAfter}
            style={{ filter: 'drop-shadow(0 0 4px rgba(239, 68, 68, 0.5))' }}
          />
        </motion.g>

        {/* Final position markers */}
        {inventory.length > 0 && (
          <>
            <motion.circle
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring" }}
              cx={xScale(inventory[inventory.length - 1].sec)}
              cy={yScale(inventory[inventory.length - 1].upTokens)}
              r={5}
              fill="#22c55e"
              style={{ filter: 'drop-shadow(0 0 6px rgba(34, 197, 94, 0.8))' }}
            />
            <motion.circle
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.4, type: "spring" }}
              cx={xScale(inventory[inventory.length - 1].sec)}
              cy={yScale(inventory[inventory.length - 1].downTokens)}
              r={5}
              fill="#ef4444"
              style={{ filter: 'drop-shadow(0 0 6px rgba(239, 68, 68, 0.8))' }}
            />
          </>
        )}

        {/* Axes */}
        <AxisBottom
          top={innerHeight}
          scale={xScale}
          stroke="#262a2e"
          tickStroke="#262a2e"
          tickLength={4}
          numTicks={duration <= 300 ? 5 : 10}
          tickFormat={(v) => formatTime(v as number)}
          tickLabelProps={() => ({
            fill: '#71717a',
            fontSize: 10,
            fontFamily: 'JetBrains Mono',
            textAnchor: 'middle',
            dy: '0.25em',
          })}
        />
        <AxisLeft
          scale={yScale}
          stroke="#262a2e"
          tickStroke="#262a2e"
          tickLength={4}
          numTicks={4}
          tickLabelProps={() => ({
            fill: '#71717a',
            fontSize: 10,
            fontFamily: 'JetBrains Mono',
            textAnchor: 'end',
            dx: '-0.25em',
            dy: '0.25em',
          })}
        />
      </Group>
    </svg>
  );
}

export default function InventoryChart(props: Props) {
  const { inventory } = props;

  // Get final position
  const finalUp = inventory.length > 0 ? inventory[inventory.length - 1].upTokens : 0;
  const finalDown = inventory.length > 0 ? inventory[inventory.length - 1].downTokens : 0;

  return (
    <div className="chart-container p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-text-primary font-semibold">Position Inventory</h3>
        <div className="flex items-center gap-4 text-xs font-mono">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-long" />
            <span className="text-text-muted">Up:</span>
            <span className="text-long">{finalUp.toFixed(0)}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-short" />
            <span className="text-text-muted">Down:</span>
            <span className="text-short">{finalDown.toFixed(0)}</span>
          </span>
        </div>
      </div>
      <div style={{ height: 200 }}>
        <ParentSize>
          {({ width, height }) => (
            <InventoryChartInner {...props} width={width} height={height} />
          )}
        </ParentSize>
      </div>
    </div>
  );
}
