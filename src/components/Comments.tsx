import { useEffect } from 'react';
import { motion } from 'framer-motion';

interface Props {
  botName: string;
}

declare global {
  interface Window {
    disqus_config: () => void;
    DISQUS: { reset: (opts: { reload: boolean; config?: () => void }) => void } | undefined;
  }
}

export default function Comments({ botName }: Props) {
  useEffect(() => {
    const configFunction = function (this: any) {
      this.page.url = `https://polybot-arena.com/bot/${botName}`;
      this.page.identifier = `bot-${botName}`;
      this.page.title = `${botName} Strategy Discussion`;
    };

    // Set global config for initial load
    window.disqus_config = configFunction;

    if (window.DISQUS) {
      // Reset existing Disqus instance to load the new bot's thread.
      // Important: do NOT destroy/recreate the container div — Disqus needs
      // its internal iframe references to remain valid for reset to work.
      window.DISQUS.reset({
        reload: true,
        config: configFunction,
      });
    } else {
      const script = document.createElement('script');
      script.src = 'https://polymarket-whale-viz.disqus.com/embed.js';
      script.setAttribute('data-timestamp', String(+new Date()));
      script.async = true;
      document.body.appendChild(script);
    }

    return () => {
      // Clear thread content on unmount so a stale thread is never visible
      const thread = document.getElementById('disqus_thread');
      if (thread) {
        thread.innerHTML = '';
      }
    };
  }, [botName]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-surface border border-border rounded-xl p-6"
    >
      <h3 className="font-semibold text-text-primary mb-2 flex items-center gap-2">
        <span className="text-accent">💬</span>
        Discussion
      </h3>
      <p className="text-sm text-text-muted mb-4">
        What strategy is this bot using? Share your analysis and debate with others below.
      </p>
      <div id="disqus_thread" className="min-h-[200px]" />
    </motion.div>
  );
}
