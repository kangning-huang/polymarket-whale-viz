import { Helmet } from 'react-helmet-async';

interface Props {
  title?: string;
  description?: string;
  path?: string;
  type?: string;
}

const SITE_NAME = 'Polybot Arena';
const BASE_URL = 'https://polybot-arena.com';
const OG_IMAGE = `${BASE_URL}/images/banner%20short%20dark%20high-res-v3.png`;
const DEFAULT_DESCRIPTION =
  'Watch elite trading bots compete in Polymarket crypto prediction markets. Compare bot strategies, entries, exits, and P&L in real-time across 5-minute, 15-minute, and 1-hour market windows.';

export default function SEOHead({
  title,
  description = DEFAULT_DESCRIPTION,
  path = '/',
  type = 'website',
}: Props) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} — Watch Trading Bots Compete on Polymarket`;
  // Ensure trailing slash for canonical URL (matches GitHub Pages directory serving)
  const canonicalPath = path === '/' ? '/' : path.replace(/\/?$/, '/');
  const canonicalUrl = `${BASE_URL}${canonicalPath}`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:image" content={OG_IMAGE} />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={OG_IMAGE} />
    </Helmet>
  );
}
