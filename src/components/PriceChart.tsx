import { useMemo, useState, useCallback, useRef } from 'react';
import { Group } from '@visx/group';
import { LinePath, AreaClosed } from '@visx/shape';
import { scaleLinear } from '@visx/scale';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { GridRows, GridColumns } from '@visx/grid';
import { curveMonotoneX } from '@visx/curve';
import { localPoint } from '@visx/event';
import { useTooltip, TooltipWithBounds } from '@visx/tooltip';
import { motion, AnimatePresence } from 'framer-motion';
import { ParentSize } from '@visx/responsive';
import type { PricePoint, Trade } from '../types';
import { computeRollingAvg } from '../rolling';

interface Props {
  prices: PricePoint[];
  trades: Trade[];
  settlement: { winner: string; upPrice: number; downPrice: number };
  coin: string;
  duration?: number;
  showRolling10?: boolean;
  showRolling30?: boolean;
}

interface TooltipData {
  type: 'trade' | 'price';
  x: number;
  y: number;
  trade?: Trade & { upEquivPrice: number; isLong: boolean; pnlIfHeld: number };
  price?: { sec: number; price: number; bid?: number; ask?: number };
}

const margin = { top: 20, right: 20, bottom: 40, left: 50 };

function PriceChartInner({
  prices,
  trades,
  settlement,
  coin,
  duration = 900,
  showRolling10,
  showRolling30,
  width,
  height,
}: Props & { width: number; height: number }) {
  const [hoveredTrade, setHoveredTrade] = useState<number | null>(null);
  const [cursorX, setCursorX] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const {
    tooltipOpen,
    tooltipData,
    tooltipLeft,
    tooltipTop,
    showTooltip,
    hideTooltip,
  } = useTooltip<TooltipData>();

  // Dimensions
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // Scales
  const xScale = useMemo(
    () => scaleLinear({ domain: [0, duration], range: [0, innerWidth] }),
    [duration, innerWidth]
  );

  const yScale = useMemo(
    () => scaleLinear({ domain: [0, 100], range: [innerHeight, 0] }),
    [innerHeight]
  );

  // Process trades into Long/Short
  const processedTrades = useMemo(() => {
    return trades.map(t => {
      const isLong = (t.side === 'BUY' && t.outcome === 'Up') || (t.side === 'SELL' && t.outcome === 'Down');
      const upEquivPrice = t.outcome === 'Down' ? (1 - t.price) : t.price;
      // Calculate P&L if held to settlement
      const settlementValue = settlement.winner === 'Up' ? settlement.upPrice : settlement.downPrice;
      let pnlIfHeld = 0;
      if (isLong) {
        // Long position: profit if Up wins
        pnlIfHeld = settlement.winner === 'Up'
          ? (settlementValue - upEquivPrice) * t.tokens
          : -upEquivPrice * t.tokens;
      } else {
        // Short position: profit if Down wins
        pnlIfHeld = settlement.winner === 'Down'
          ? ((1 - settlementValue) - (1 - upEquivPrice)) * t.tokens
          : -(1 - upEquivPrice) * t.tokens;
      }
      return { ...t, isLong, upEquivPrice, pnlIfHeld };
    });
  }, [trades, settlement]);

  // Rolling averages
  const rolling10 = useMemo(
    () => showRolling10 && prices.length > 100 ? computeRollingAvg(prices, 10) : null,
    [prices, showRolling10]
  );
  const rolling30 = useMemo(
    () => showRolling30 && prices.length > 100 ? computeRollingAvg(prices, 30) : null,
    [prices, showRolling30]
  );

  // Bid/Ask band data
  const hasBidAsk = prices.some(p => p.bid != null && p.ask != null);
  const bidAskData = useMemo(() => {
    if (!hasBidAsk) return [];
    return prices.filter(p => p.bid != null && p.ask != null).map(p => ({
      sec: p.sec,
      bid: p.bid! * 100,
      ask: p.ask! * 100,
    }));
  }, [prices, hasBidAsk]);

  // Mouse handlers
  const handleMouseMove = useCallback((event: React.MouseEvent<SVGSVGElement>) => {
    const point = localPoint(event);
    if (!point) return;

    const x = point.x - margin.left;
    setCursorX(x);

    // Find nearest price point
    const sec = xScale.invert(x);
    const nearestPrice = prices.reduce((prev, curr) =>
      Math.abs(curr.sec - sec) < Math.abs(prev.sec - sec) ? curr : prev
    );

    showTooltip({
      tooltipData: {
        type: 'price',
        x: xScale(nearestPrice.sec),
        y: yScale(nearestPrice.p * 100),
        price: {
          sec: nearestPrice.sec,
          price: nearestPrice.p * 100,
          bid: nearestPrice.bid ? nearestPrice.bid * 100 : undefined,
          ask: nearestPrice.ask ? nearestPrice.ask * 100 : undefined,
        },
      },
      tooltipLeft: point.x,
      tooltipTop: point.y,
    });
  }, [prices, xScale, yScale, showTooltip]);

  const handleTradeHover = useCallback((trade: typeof processedTrades[0], index: number, event: React.MouseEvent) => {
    setHoveredTrade(index);
    const point = localPoint(event);
    if (!point) return;

    showTooltip({
      tooltipData: {
        type: 'trade',
        x: xScale(trade.sec),
        y: yScale(trade.upEquivPrice * 100),
        trade,
      },
      tooltipLeft: point.x,
      tooltipTop: point.y - 10,
    });
  }, [xScale, yScale, showTooltip]);

  // Format time
  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => {
          hideTooltip();
          setCursorX(null);
          setHoveredTrade(null);
        }}
        className="select-none"
      >
        {/* Gradient definitions */}
        <defs>
          <linearGradient id="bidAskGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="priceLineGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#60a5fa" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <filter id="longGlow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feFlood floodColor="#22c55e" floodOpacity="0.6"/>
            <feComposite in2="coloredBlur" operator="in"/>
            <feMerge>
              <feMergeNode/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <filter id="shortGlow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feFlood floodColor="#ef4444" floodOpacity="0.6"/>
            <feComposite in2="coloredBlur" operator="in"/>
            <feMerge>
              <feMergeNode/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        <Group left={margin.left} top={margin.top}>
          {/* Grid */}
          <GridRows
            scale={yScale}
            width={innerWidth}
            stroke="#1a1d20"
            strokeOpacity={0.5}
            numTicks={5}
          />
          <GridColumns
            scale={xScale}
            height={innerHeight}
            stroke="#1a1d20"
            strokeOpacity={0.5}
            numTicks={duration <= 300 ? 5 : 10}
          />

          {/* Bid/Ask band */}
          {hasBidAsk && bidAskData.length > 0 && (
            <AreaClosed
              data={bidAskData}
              x={d => xScale(d.sec)}
              y0={d => yScale(d.bid)}
              y1={d => yScale(d.ask)}
              yScale={yScale}
              fill="url(#bidAskGradient)"
              curve={curveMonotoneX}
            />
          )}

          {/* Rolling averages */}
          {rolling30 && (
            <LinePath
              data={prices.map((p, i) => ({ x: p.sec, y: rolling30[i] }))}
              x={d => xScale(d.x)}
              y={d => d.y != null ? yScale(d.y * 100) : 0}
              stroke="#f97316"
              strokeWidth={1.5}
              strokeDasharray="8,4"
              strokeOpacity={0.8}
              defined={d => d.y != null}
              curve={curveMonotoneX}
            />
          )}
          {rolling10 && (
            <LinePath
              data={prices.map((p, i) => ({ x: p.sec, y: rolling10[i] }))}
              x={d => xScale(d.x)}
              y={d => d.y != null ? yScale(d.y * 100) : 0}
              stroke="#a855f7"
              strokeWidth={1.5}
              strokeDasharray="4,4"
              strokeOpacity={0.8}
              defined={d => d.y != null}
              curve={curveMonotoneX}
            />
          )}

          {/* Main price line */}
          <LinePath
            data={prices}
            x={d => xScale(d.sec)}
            y={d => yScale(d.p * 100)}
            stroke="url(#priceLineGradient)"
            strokeWidth={prices.length > 100 ? 1.5 : 2}
            filter="url(#glow)"
            curve={prices.length > 100 ? undefined : curveMonotoneX}
          />

          {/* Settlement line */}
          <motion.line
            initial={{ opacity: 0, y1: yScale(50), y2: yScale(50) }}
            animate={{
              opacity: 1,
              y1: yScale(settlement.upPrice * 100),
              y2: yScale(settlement.upPrice * 100)
            }}
            transition={{ delay: 0.3, duration: 0.6, ease: "easeOut" }}
            x1={0}
            x2={innerWidth}
            stroke={settlement.winner === 'Up' ? '#22c55e' : '#ef4444'}
            strokeWidth={2}
            strokeDasharray="8,4"
            className="settlement-line"
          />

          {/* Settlement label */}
          <motion.g
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.4 }}
          >
            <rect
              x={innerWidth - 130}
              y={yScale(settlement.upPrice * 100) - 24}
              width={125}
              height={20}
              rx={4}
              fill="#111214"
              fillOpacity={0.9}
              stroke={settlement.winner === 'Up' ? '#22c55e' : '#ef4444'}
              strokeWidth={1}
            />
            <text
              x={innerWidth - 68}
              y={yScale(settlement.upPrice * 100) - 10}
              textAnchor="middle"
              fill={settlement.winner === 'Up' ? '#4ade80' : '#f87171'}
              fontSize={11}
              fontFamily="JetBrains Mono"
              fontWeight={600}
            >
              {settlement.winner} wins @ {(settlement.upPrice * 100).toFixed(0)}c
            </text>
          </motion.g>

          {/* Trade dots */}
          {processedTrades.map((trade, i) => {
            const cx = xScale(trade.sec);
            const cy = yScale(trade.upEquivPrice * 100);
            const radius = Math.max(4, Math.min(10, trade.tokens / 5));
            const isHovered = hoveredTrade === i;
            const isOtherHovered = hoveredTrade !== null && hoveredTrade !== i;

            return (
              <motion.circle
                key={i}
                cx={cx}
                cy={cy}
                r={radius}
                fill={trade.isLong ? '#22c55e' : '#ef4444'}
                filter={trade.isLong ? 'url(#longGlow)' : 'url(#shortGlow)'}
                initial={{ scale: 0, opacity: 0 }}
                animate={{
                  scale: isHovered ? 1.4 : 1,
                  opacity: isOtherHovered ? 0.3 : 1
                }}
                transition={{
                  type: "spring",
                  stiffness: 500,
                  damping: 30,
                  delay: i * 0.02
                }}
                onMouseEnter={(e) => handleTradeHover(trade, i, e)}
                onMouseLeave={() => {
                  setHoveredTrade(null);
                }}
                style={{ cursor: 'pointer' }}
              />
            );
          })}

          {/* Cursor line */}
          {cursorX !== null && (
            <line
              x1={cursorX}
              x2={cursorX}
              y1={0}
              y2={innerHeight}
              stroke="#6366f1"
              strokeWidth={1}
              strokeDasharray="4,4"
              strokeOpacity={0.5}
              pointerEvents="none"
            />
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
            numTicks={5}
            tickFormat={(v) => `${v}c`}
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

      {/* Tooltip */}
      <AnimatePresence>
        {tooltipOpen && tooltipData && (
          <TooltipWithBounds
            left={tooltipLeft}
            top={tooltipTop}
            style={{
              position: 'absolute',
              pointerEvents: 'none',
              zIndex: 50,
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-elevated/95 backdrop-blur-sm border border-border rounded-lg shadow-xl px-3 py-2 max-w-xs"
            >
              {tooltipData.type === 'trade' && tooltipData.trade && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-lg ${tooltipData.trade.isLong ? 'text-long' : 'text-short'}`}>
                      {tooltipData.trade.isLong ? '↑' : '↓'}
                    </span>
                    <span className="font-mono text-sm text-text-primary">
                      {tooltipData.trade.side} {tooltipData.trade.outcome}
                    </span>
                  </div>
                  <div className="text-xs text-text-secondary font-mono">
                    {tooltipData.trade.tokens.toFixed(1)} tokens @ {(tooltipData.trade.upEquivPrice * 100).toFixed(1)}c
                  </div>
                  <div className="text-xs text-text-muted">
                    ${tooltipData.trade.usdc.toFixed(2)} USDC
                  </div>
                  <div className="pt-1 border-t border-border mt-1">
                    <span className="text-xs text-text-muted">If held to settlement: </span>
                    <span className={`text-xs font-mono font-semibold ${
                      tooltipData.trade.pnlIfHeld >= 0 ? 'text-long' : 'text-short'
                    }`}>
                      {tooltipData.trade.pnlIfHeld >= 0 ? '+' : ''}${tooltipData.trade.pnlIfHeld.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
              {tooltipData.type === 'price' && tooltipData.price && (
                <div className="space-y-1">
                  <div className="font-mono text-sm text-text-primary">
                    {formatTime(tooltipData.price.sec)}
                  </div>
                  <div className="text-xs text-price font-mono">
                    Mid: {tooltipData.price.price.toFixed(1)}c
                  </div>
                  {tooltipData.price.bid && tooltipData.price.ask && (
                    <div className="text-xs text-text-muted font-mono">
                      Spread: {tooltipData.price.bid.toFixed(1)}c – {tooltipData.price.ask.toFixed(1)}c
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </TooltipWithBounds>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function PriceChart(props: Props) {
  const { coin, prices } = props;
  const hasDenseData = prices.length > 100;

  return (
    <div className="chart-container p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-text-primary font-semibold">
          <span className="text-price">{coin.toUpperCase()}-Up</span> Price & Trades
          {hasDenseData && (
            <span className="ml-2 text-xs text-text-muted font-normal">
              ({prices.length} price points)
            </span>
          )}
        </h3>
      </div>
      <p className="text-xs text-text-muted mb-4">
        <span className="text-long font-medium">Long</span> = Buy Up or Sell Down{' '}
        <span className="text-short font-medium ml-2">Short</span> = Sell Up or Buy Down
      </p>
      <div style={{ height: 400 }}>
        <ParentSize>
          {({ width, height }) => (
            <PriceChartInner {...props} width={width} height={height} />
          )}
        </ParentSize>
      </div>
    </div>
  );
}
