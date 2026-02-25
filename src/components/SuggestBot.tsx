import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

/**
 * Remove all Disqus state so the next embed.js load starts fresh.
 */
function teardownDisqus() {
  document.querySelectorAll<HTMLScriptElement>('script[src*="disqus.com"]').forEach(el => el.remove());
  document.querySelectorAll<HTMLIFrameElement>('iframe[src*="disqus.com"]').forEach(el => el.remove());
  document.querySelectorAll('[id^="dsq-"]').forEach(el => el.remove());
  delete (window as any).DISQUS;
}

export default function SuggestBot() {
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    teardownDisqus();
    if (threadRef.current) threadRef.current.innerHTML = '';

    window.disqus_config = function (this: any) {
      this.page.url = 'https://polybot-arena.com/';
      this.page.identifier = 'suggest-bots';
      this.page.title = 'Suggest a Bot - Polybot Arena';
    };

    const script = document.createElement('script');
    script.src = 'https://polymarket-whale-viz.disqus.com/embed.js';
    script.setAttribute('data-timestamp', String(+new Date()));
    script.async = true;
    document.body.appendChild(script);

    return () => {
      teardownDisqus();
      if (threadRef.current) threadRef.current.innerHTML = '';
    };
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
      <div ref={threadRef} id="disqus_thread" className="min-h-[200px]" />
    </motion.div>
  );
}
