import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface WindowSlot {
  ts: number;
  duration: number;
  coin: string;
  pnl: number;
}

interface Props {
  windows: WindowSlot[];
  selectedSlot: string;
  onSelect: (slot: string) => void;
}

export default function TimelineRibbon({ windows, selectedSlot, onSelect }: Props) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const durationLabel = (duration: number) => {
    if (duration === 300) return '5m';
    if (duration === 3600) return '1h';
    return '15m';
  };

  // Group by timestamp for display
  const grouped = useMemo(() => {
    const map = new Map<string, WindowSlot[]>();
    windows.forEach(w => {
      const key = `${w.ts}_${w.duration}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(w);
    });
    return Array.from(map.entries())
      .sort((a, b) => Number(b[0].split('_')[0]) - Number(a[0].split('_')[0]));
  }, [windows]);

  const formatTime = (ts: number) => {
    const d = new Date(ts * 1000);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts * 1000);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-text-secondary">Trading Windows</h3>
        <span className="text-xs text-text-muted font-mono">{grouped.length} windows</span>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Scrollable container */}
        <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide fade-horizontal">
          {grouped.map(([key, slots], index) => {
            const totalPnl = slots.reduce((sum, s) => sum + s.pnl, 0);
            const isSelected = selectedSlot === key;
            const isHovered = hoveredIndex === index;
            const ts = Number(key.split('_')[0]);
            const duration = Number(key.split('_')[1]);

            return (
              <motion.button
                key={key}
                onClick={() => onSelect(key)}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                className={`
                  relative flex-shrink-0 rounded-lg transition-all duration-200
                  ${isSelected
                    ? 'ring-2 ring-white/30 ring-offset-2 ring-offset-void'
                    : ''
                  }
                `}
                style={{
                  width: duration === 300 ? 60 : duration === 3600 ? 96 : 80,
                }}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.02 }}
              >
                {/* P&L Bar */}
                <div
                  className={`
                    h-8 rounded-lg transition-all duration-200
                    ${totalPnl > 0 ? 'bg-gradient-to-t from-long/30 to-long/60' : ''}
                    ${totalPnl < 0 ? 'bg-gradient-to-t from-short/30 to-short/60' : ''}
                    ${totalPnl === 0 ? 'bg-gradient-to-t from-text-dim/30 to-text-dim/50' : ''}
                    ${isSelected ? 'shadow-lg' : ''}
                    ${isHovered ? 'brightness-125' : ''}
                  `}
                  style={{
                    boxShadow: isSelected
                      ? totalPnl > 0
                        ? '0 0 20px rgba(34, 197, 94, 0.4)'
                        : totalPnl < 0
                          ? '0 0 20px rgba(239, 68, 68, 0.4)'
                          : 'none'
                      : 'none'
                  }}
                />

                {/* Duration badge */}
                {duration !== 900 && (
                  <div className="absolute -top-1 -right-1 bg-purple text-white text-xxs px-1 rounded font-mono">
                    {durationLabel(duration)}
                  </div>
                )}

                {/* Coin dots */}
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                  {slots.map((slot, i) => (
                    <div
                      key={i}
                      className={`w-1 h-1 rounded-full ${
                        slot.coin === 'btc' ? 'bg-orange' :
                        slot.coin === 'eth' ? 'bg-purple' :
                        slot.coin === 'sol' ? 'bg-price' :
                        'bg-long'
                      }`}
                    />
                  ))}
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Hover tooltip */}
        <AnimatePresence>
          {hoveredIndex !== null && grouped[hoveredIndex] && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              className="absolute top-12 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
            >
              <div className="bg-elevated/95 backdrop-blur-sm border border-border rounded-lg shadow-xl px-3 py-2 whitespace-nowrap">
                {(() => {
                  const [key, slots] = grouped[hoveredIndex];
                  const ts = Number(key.split('_')[0]);
                  const duration = Number(key.split('_')[1]);
                  const totalPnl = slots.reduce((sum, s) => sum + s.pnl, 0);
                  const coins = [...new Set(slots.map(s => s.coin.toUpperCase()))];

                  return (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-text-primary">
                          {formatTime(ts)}
                        </span>
                        <span className="text-xs text-text-muted">
                          {formatDate(ts)}
                        </span>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-surface text-text-secondary font-mono">
                          {durationLabel(duration)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-text-muted">
                          {coins.join(', ')}
                        </span>
                        <span className={`font-mono text-sm font-semibold ${
                          totalPnl > 0 ? 'text-long' : totalPnl < 0 ? 'text-short' : 'text-text-primary'
                        }`}>
                          {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-3 text-xs text-text-muted">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-2 rounded bg-gradient-to-t from-long/30 to-long/60" />
          Profit
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-2 rounded bg-gradient-to-t from-short/30 to-short/60" />
          Loss
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-orange" /> BTC
          <span className="w-1.5 h-1.5 rounded-full bg-purple" /> ETH
          <span className="w-1.5 h-1.5 rounded-full bg-price" /> SOL
          <span className="w-1.5 h-1.5 rounded-full bg-long" /> XRP
        </span>
      </div>
    </div>
  );
}
