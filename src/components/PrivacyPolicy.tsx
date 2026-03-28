import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Header from './Header';
import SEOHead from './SEOHead';

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen p-6">
      <SEOHead
        title="Privacy Policy"
        description="Privacy Policy for Polybot Arena — how we handle your data, cookies, and advertising."
        path="/privacy"
      />
      <div className="max-w-3xl mx-auto">
        <Header />
        <motion.button
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate('/')}
          className="btn-ghost mb-6 flex items-center gap-2"
        >
          <span>&larr;</span>
          <span>Back to Polybot Arena</span>
        </motion.button>

        <motion.article
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="prose-custom space-y-6"
        >
          <h1 className="text-3xl font-bold text-text-primary mb-2">Privacy Policy</h1>
          <p className="text-text-muted text-sm">Last updated: March 28, 2026</p>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-text-primary">Overview</h2>
            <p className="text-text-secondary leading-relaxed">
              Polybot Arena ("we," "us," or "our") operates the website at polybot-arena.com.
              This page informs you of our policies regarding the collection, use, and disclosure
              of personal information when you use our site.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-text-primary">Information We Collect</h2>
            <p className="text-text-secondary leading-relaxed">
              Polybot Arena is a static website that does not require user accounts or login.
              We do not collect personal information such as names, email addresses, or payment details.
            </p>
            <p className="text-text-secondary leading-relaxed">
              We may automatically collect certain non-personal information when you visit our site,
              including your browser type, operating system, referring URLs, and pages viewed. This
              data is collected through Google Analytics and is used solely to understand site
              traffic and improve the user experience.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-text-primary">Cookies and Tracking Technologies</h2>
            <p className="text-text-secondary leading-relaxed">
              Our site uses cookies and similar tracking technologies for the following purposes:
            </p>
            <ul className="list-disc list-inside space-y-2 text-text-secondary">
              <li>
                <strong>Google Analytics</strong> — We use Google Analytics to track site usage
                and visitor behavior. Google Analytics uses cookies to collect anonymous usage data.
                You can opt out by installing the{' '}
                <a
                  href="https://tools.google.com/dlpage/gaoptout"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline"
                >
                  Google Analytics Opt-out Browser Add-on
                </a>.
              </li>
              <li>
                <strong>Google AdSense</strong> — We use Google AdSense to display advertisements.
                Google may use cookies to serve ads based on your prior visits to this site or
                other websites. You can opt out of personalized advertising by visiting{' '}
                <a
                  href="https://www.google.com/settings/ads"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline"
                >
                  Google Ads Settings
                </a>.
              </li>
              <li>
                <strong>Disqus</strong> — Our comment sections are powered by Disqus, which may
                use its own cookies and tracking. Please refer to the{' '}
                <a
                  href="https://help.disqus.com/en/articles/1717103-disqus-privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline"
                >
                  Disqus Privacy Policy
                </a>{' '}
                for more details.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-text-primary">Third-Party Advertising</h2>
            <p className="text-text-secondary leading-relaxed">
              We use Google AdSense to serve ads on our site. Third-party vendors, including Google,
              use cookies to serve ads based on a user's prior visits to this website or other websites.
              Google's use of advertising cookies enables it and its partners to serve ads based on
              your visit to this site and/or other sites on the internet.
            </p>
            <p className="text-text-secondary leading-relaxed">
              You may opt out of personalized advertising by visiting{' '}
              <a
                href="https://www.google.com/settings/ads"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                Google Ads Settings
              </a>
              . Alternatively, you can opt out of third-party vendor cookies for personalized
              advertising by visiting{' '}
              <a
                href="https://optout.aboutads.info/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                aboutads.info
              </a>.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-text-primary">Data Sources</h2>
            <p className="text-text-secondary leading-relaxed">
              All trading data displayed on Polybot Arena is sourced from publicly available
              Polymarket APIs. We display publicly available on-chain trading activity of
              automated trading bots. No private or personal trader information is collected
              or displayed beyond what is already publicly visible on the Polymarket platform.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-text-primary">Children's Privacy</h2>
            <p className="text-text-secondary leading-relaxed">
              Our site is not directed at children under 13. We do not knowingly collect
              personal information from children under 13.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-text-primary">Changes to This Policy</h2>
            <p className="text-text-secondary leading-relaxed">
              We may update this privacy policy from time to time. Any changes will be posted
              on this page with an updated revision date.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-text-primary">Contact</h2>
            <p className="text-text-secondary leading-relaxed">
              If you have any questions about this privacy policy, please reach out via our{' '}
              <button
                onClick={() => navigate('/contact')}
                className="text-accent hover:underline"
              >
                contact page
              </button>.
            </p>
          </section>
        </motion.article>
      </div>
    </div>
  );
}
