import { useEffect, useRef } from 'react';

interface Props {
  botName: string;
}

export default function Comments({ botName }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    // Clear previous giscus instance
    ref.current.innerHTML = '';

    const script = document.createElement('script');
    script.src = 'https://giscus.app/client.js';
    script.setAttribute('data-repo', 'kangning-huang/polymarket-whale-viz');
    script.setAttribute('data-repo-id', ''); // Will be filled when Discussions enabled
    script.setAttribute('data-category', 'General');
    script.setAttribute('data-category-id', ''); // Will be filled when Discussions enabled
    script.setAttribute('data-mapping', 'specific');
    script.setAttribute('data-term', `Bot: ${botName}`);
    script.setAttribute('data-strict', '0');
    script.setAttribute('data-reactions-enabled', '1');
    script.setAttribute('data-emit-metadata', '0');
    script.setAttribute('data-input-position', 'top');
    script.setAttribute('data-theme', 'dark_dimmed');
    script.setAttribute('data-lang', 'en');
    script.setAttribute('data-loading', 'lazy');
    script.crossOrigin = 'anonymous';
    script.async = true;

    ref.current.appendChild(script);
  }, [botName]);

  return (
    <div className="comments-section">
      <h3 className="chart-title">Discussion</h3>
      <p className="comments-hint">
        What strategy is this bot using? Share your analysis below.
      </p>
      <div ref={ref} />
    </div>
  );
}
