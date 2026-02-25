import { Helmet } from 'react-helmet-async';

interface Props {
  title?: string;
  description?: string;
  path?: string;
  type?: string;
}

const SITE_NAME = 'Polybot Arena';
const BASE_URL = 'https://polybot-arena.com';
const DEFAULT_DESCRIPTION =
  'Watch elite trading bots compete in Polymarket crypto prediction markets. Compare bot strategies, entries, exits, and P&L in real-time across 5-minute, 15-minute, and 1-hour market windows.';

export default function SEOHead({
  title,
  description = DEFAULT_DESCRIPTION,
  path = '/',
  type = 'website',
}: Props) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} — Watch Trading Bots Compete on Polymarket`;
  const canonicalUrl = `${BASE_URL}${path}`;

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

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
    </Helmet>
  );
}
