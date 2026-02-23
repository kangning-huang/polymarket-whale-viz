import { useEffect } from 'react';

interface Props {
  botName: string;
}

declare global {
  interface Window {
    disqus_config: () => void;
    DISQUS: { reset: (opts: { reload: boolean }) => void } | undefined;
  }
}

export default function Comments({ botName }: Props) {
  useEffect(() => {
    window.disqus_config = function (this: any) {
      this.page.url = `https://kangning-huang.github.io/polymarket-whale-viz/#/bot/${botName}`;
      this.page.identifier = `bot-${botName}`;
      this.page.title = `Bot: ${botName}`;
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
  }, [botName]);

  return (
    <div className="comments-section">
      <h3 className="chart-title">Discussion</h3>
      <p className="comments-hint">
        What strategy is this bot using? Share your analysis below.
      </p>
      <div id="disqus_thread" />
    </div>
  );
}
