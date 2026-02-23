import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function Header() {
  const navigate = useNavigate();

  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8"
    >
      <div className="flex items-center gap-3 mb-2">
        {/* Logo mark */}
        <motion.div
          onClick={() => navigate('/')}
          className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-purple flex items-center justify-center cursor-pointer"
          whileHover={{ scale: 1.05, rotate: 5 }}
          whileTap={{ scale: 0.95 }}
          style={{ boxShadow: '0 4px 20px rgba(99, 102, 241, 0.3)' }}
        >
          <span className="text-lg font-bold text-white">W</span>
          {/* Pulse indicator */}
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-long rounded-full border-2 border-void">
            <div className="absolute inset-0 bg-long rounded-full animate-ping opacity-75" />
          </div>
        </motion.div>

        <div>
          <h1
            onClick={() => navigate('/')}
            className="text-xl font-bold cursor-pointer hover:text-white transition-colors"
            style={{
              background: 'linear-gradient(90deg, #e4e4e7 0%, #a1a1aa 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Whale Watch
          </h1>
          <p className="text-xs text-text-muted">
            Polymarket 15-min crypto markets
          </p>
        </div>
      </div>

      <p className="text-sm text-text-secondary max-w-2xl leading-relaxed">
        Study the most profitable trading bots in real-time. See their entries, exits, and
        profit/loss on every market window.{' '}
        <span className="text-text-muted">Updates every 2 hours.</span>
      </p>
    </motion.header>
  );
}
