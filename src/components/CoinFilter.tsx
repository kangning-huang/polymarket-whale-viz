const COINS = ['btc', 'eth', 'sol', 'xrp'];

const COIN_COLORS: Record<string, string> = {
  btc: '#f7931a',
  eth: '#627eea',
  sol: '#14f195',
  xrp: '#00aae4',
};

interface Props {
  selected: Set<string>;
  onToggle: (coin: string) => void;
}

export default function CoinFilter({ selected, onToggle }: Props) {
  return (
    <div className="coin-filter">
      <label>Coins:</label>
      <div className="pill-group">
        {COINS.map(c => (
          <button
            key={c}
            className={`pill ${selected.has(c) ? 'active' : ''}`}
            style={selected.has(c) ? { borderColor: COIN_COLORS[c], color: COIN_COLORS[c] } : {}}
            onClick={() => onToggle(c)}
          >
            {c.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );
}
