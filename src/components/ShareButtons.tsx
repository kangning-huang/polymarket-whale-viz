import { useState } from 'react';
import html2canvas from 'html2canvas';

interface ShareButtonsProps {
  botName: string;
  coin: string;
  windowTs: number;
  duration: number;
  netPnl: number;
  shareableUrl: string;
}

// Icon components
const DownloadIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const XIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const RedditIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
  </svg>
);

const FacebookIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

export function ShareButtons({
  botName,
  coin,
  windowTs,
  duration,
  netPnl,
  shareableUrl,
}: ShareButtonsProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const durationLabel = duration === 300 ? '5m' : duration === 900 ? '15m' : '1h';
  const pnlText = netPnl >= 0 ? `made $${Math.abs(netPnl).toFixed(2)}` : `lost $${Math.abs(netPnl).toFixed(2)}`;
  const shareText = `${botName} ${pnlText} on ${coin.toUpperCase()} ${durationLabel} window`;

  const handleDownloadSnapshot = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const element = document.getElementById('shareable-content');
      if (!element) {
        throw new Error('Shareable content not found');
      }

      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#0a0e14',
        logging: false,
        useCORS: true,
      });

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b: Blob | null) => {
          if (b) resolve(b);
          else reject(new Error('Failed to create blob'));
        }, 'image/png');
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${botName}_${coin}_${windowTs}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Snapshot generation failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate snapshot');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShareTwitter = () => {
    const text = encodeURIComponent(shareText);
    const url = encodeURIComponent(shareableUrl);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
  };

  const handleShareReddit = () => {
    const url = encodeURIComponent(shareableUrl);
    const title = encodeURIComponent(shareText);
    window.open(`https://reddit.com/submit?url=${url}&title=${title}`, '_blank');
  };

  const handleShareFacebook = () => {
    const url = encodeURIComponent(shareableUrl);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
  };

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <button
        onClick={handleDownloadSnapshot}
        disabled={isGenerating}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 disabled:bg-slate-800/50 disabled:cursor-not-allowed text-slate-200 font-medium text-sm transition-all border border-slate-600/30 hover:border-slate-500/50"
        title="Download as image"
      >
        {isGenerating ? (
          <>
            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Generating...</span>
          </>
        ) : (
          <>
            <DownloadIcon />
            <span>Download</span>
          </>
        )}
      </button>

      <button
        onClick={handleShareTwitter}
        className="inline-flex items-center gap-2 p-2.5 rounded-lg bg-black hover:bg-slate-900 text-white transition-all border border-slate-700/50 hover:border-slate-600"
        title="Share on X"
        aria-label="Share on X"
      >
        <XIcon />
      </button>

      <button
        onClick={handleShareReddit}
        className="inline-flex items-center gap-2 p-2.5 rounded-lg bg-[#FF4500] hover:bg-[#FF5722] text-white transition-all"
        title="Share on Reddit"
        aria-label="Share on Reddit"
      >
        <RedditIcon />
      </button>

      <button
        onClick={handleShareFacebook}
        className="inline-flex items-center gap-2 p-2.5 rounded-lg bg-[#1877F2] hover:bg-[#4267B2] text-white transition-all"
        title="Share on Facebook"
        aria-label="Share on Facebook"
      >
        <FacebookIcon />
      </button>

      {error && (
        <div className="w-full mt-2 px-4 py-2 rounded-lg bg-red-900/50 border border-red-700 text-red-200 text-sm">
          Error: {error}
        </div>
      )}
    </div>
  );
}
