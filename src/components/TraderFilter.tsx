import type { TraderConfig } from '../types';

interface Props {
  traders: TraderConfig[];
  selected: string;
  onSelect: (name: string) => void;
}

export default function TraderFilter({ traders, selected, onSelect }: Props) {
  return (
    <div className="trader-filter">
      <label>Trader:</label>
      <div className="pill-group">
        {traders.map(t => (
          <button
            key={t.name}
            className={`pill ${selected === t.name ? 'active' : ''}`}
            style={selected === t.name ? { borderColor: t.color, color: t.color } : {}}
            onClick={() => onSelect(t.name)}
          >
            {t.name}
          </button>
        ))}
      </div>
    </div>
  );
}
