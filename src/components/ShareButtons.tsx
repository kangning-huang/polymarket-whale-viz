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
        canvas.toBlob((b) => {
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
        className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium text-sm transition-colors"
      >
        {isGenerating ? 'Generating...' : '📸 Download Image'}
      </button>

      <button
        onClick={handleShareTwitter}
        className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-medium text-sm transition-colors"
      >
        𝕏 Share on X
      </button>

      <button
        onClick={handleShareReddit}
        className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-medium text-sm transition-colors"
      >
        🔴 Share on Reddit
      </button>

      <button
        onClick={handleShareFacebook}
        className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-medium text-sm transition-colors"
      >
        Share on Facebook
      </button>

      {error && (
        <div className="w-full mt-2 px-4 py-2 rounded-lg bg-red-900/50 border border-red-700 text-red-200 text-sm">
          Error: {error}
        </div>
      )}
    </div>
  );
}
