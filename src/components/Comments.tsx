import { useEffect, useRef } from 'react';
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

/**
 * Remove all Disqus state so the next embed.js load starts fresh.
 * DISQUS.reset() is unreliable in hash-based SPAs — a full teardown
 * is the only way to guarantee the correct thread loads.
 */
function teardownDisqus() {
  // Remove Disqus embed scripts
  document.querySelectorAll<HTMLScriptElement>('script[src*="disqus.com"]').forEach(el => el.remove());
  // Remove iframes Disqus injects outside #disqus_thread
  document.querySelectorAll<HTMLIFrameElement>('iframe[src*="disqus.com"]').forEach(el => el.remove());
  // Remove any Disqus-generated elements (sidebar, overlay, etc.)
  document.querySelectorAll('[id^="dsq-"]').forEach(el => el.remove());
  // Clear the global so we take the fresh-load path next time
  delete (window as any).DISQUS;
}

export default function Comments({ botName }: Props) {
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Full teardown of any previous Disqus instance (from SuggestBot or another bot)
    teardownDisqus();
    if (threadRef.current) threadRef.current.innerHTML = '';

    // Configure for this bot's thread
    window.disqus_config = function (this: any) {
      this.page.url = `https://polybot-arena.com/bot/${botName}`;
      this.page.identifier = `bot-${botName}`;
      this.page.title = `${botName} Strategy Discussion`;
    };

    // Load Disqus embed from scratch
    const script = document.createElement('script');
    script.src = 'https://polymarket-whale-viz.disqus.com/embed.js';
    script.setAttribute('data-timestamp', String(+new Date()));
    script.async = true;
    document.body.appendChild(script);

    return () => {
      teardownDisqus();
      if (threadRef.current) threadRef.current.innerHTML = '';
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
      <div ref={threadRef} id="disqus_thread" className="min-h-[200px]" />
    </motion.div>
  );
}
