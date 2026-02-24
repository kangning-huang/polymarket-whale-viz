import { useEffect } from 'react';
import { motion } from 'framer-motion';

declare global {
  interface Window {
    disqus_config: () => void;
    DISQUS: { reset: (opts: { reload: boolean }) => void } | undefined;
  }
}

export default function SuggestBot() {
  useEffect(() => {
    window.disqus_config = function (this: any) {
      this.page.url = 'https://polybot-arena.com/';
      this.page.identifier = 'suggest-bots';
      this.page.title = 'Suggest a Bot - Polybot Arena';
    };

    if (window.DISQUS) {
      window.DISQUS.reset({ reload: true });
    } else {
      const script = document.createElement('script');
      script.src = 'https://polymarket-whale-viz.disqus.com/embed.js';
      script.setAttribute('data-timestamp', String(+new Date()));
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="bg-surface border border-border rounded-xl p-6"
    >
      <h3 className="font-semibold text-text-primary mb-2 flex items-center gap-2">
        <span className="text-accent">🤖</span>
        Suggest a Bot
      </h3>
      <p className="text-sm text-text-muted mb-4">
        Know a profitable Polymarket trading bot we should track? Drop their profile link below
        and we'll consider adding them to the arena.
      </p>
      <div id="disqus_thread" className="min-h-[200px]" />
    </motion.div>
  );
}
