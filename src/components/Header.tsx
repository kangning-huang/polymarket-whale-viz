import { useNavigate } from 'react-router-dom';

export default function Header() {
  const navigate = useNavigate();

  return (
    <header className="header">
      <h1 onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
        Polymarket Whale Watch
      </h1>
      <p className="subtitle">
        Study how top bots trade 15-minute crypto prediction markets on Polymarket.
        Updated every 2 hours.
      </p>
    </header>
  );
}
