import { useState, useEffect } from 'react';

function readCSSVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function useIsDarkMode(): boolean {
  const [isDark, setIsDark] = useState(() =>
    !window.matchMedia('(prefers-color-scheme: light)').matches
  );

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const handler = (e: MediaQueryListEvent) => setIsDark(!e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return isDark;
}

export function useThemeColors() {
  const [colors, setColors] = useState(() => read());

  function read() {
    return {
      text: readCSSVar('--text-primary') || '#c9d1d9',
      textSecondary: readCSSVar('--text-secondary') || '#8b949e',
      border: readCSSVar('--border') || '#30363d',
      accent: readCSSVar('--accent') || '#58a6ff',
      green: readCSSVar('--green') || '#3fb950',
      red: readCSSVar('--red') || '#f85149',
      purple: readCSSVar('--purple') || '#a371f7',
      orange: readCSSVar('--orange') || '#f0883e',
      surface: readCSSVar('--bg-surface') || '#161b22',
      secondary: readCSSVar('--bg-secondary') || '#21262d',
      gridLine: readCSSVar('--grid-line') || 'rgba(48,54,61,0.5)',
    };
  }

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const handler = () => setColors(read());
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return colors;
}
