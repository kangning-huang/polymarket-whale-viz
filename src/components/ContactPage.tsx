import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Header from './Header';
import SEOHead from './SEOHead';

export default function ContactPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen p-6">
      <SEOHead
        title="Contact Us"
        description="Contact the Polybot Arena team — suggestions, bug reports, and questions about our Polymarket trading bot dashboard."
        path="/contact"
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
          <h1 className="text-3xl font-bold text-text-primary mb-2">Contact Us</h1>

          <section className="space-y-3">
            <p className="text-text-secondary leading-relaxed">
              We'd love to hear from you. Whether you have a suggestion for a new bot to track,
              found a bug, or have a question about how Polybot Arena works — here's how to
              reach us.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-text-primary">Suggest a Bot</h2>
            <p className="text-text-secondary leading-relaxed">
              Know of an interesting Polymarket trading bot we should track? Head to the{' '}
              <button onClick={() => navigate('/')} className="text-accent hover:underline">
                home page
              </button>{' '}
              and use the "Suggest a Bot" section at the bottom to leave a comment with the
              bot's Polymarket profile URL and why you think it's interesting.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-text-primary">Report an Issue</h2>
            <p className="text-text-secondary leading-relaxed">
              Found a bug, broken chart, or incorrect data? Please open an issue on our{' '}
              <a
                href="https://github.com/kangning-huang/polymarket-whale-viz/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                GitHub repository
              </a>.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-text-primary">General Inquiries</h2>
            <p className="text-text-secondary leading-relaxed">
              For general questions, feedback, or partnership inquiries, you can reach
              us through our GitHub repository or leave a comment on any bot's discussion
              thread on the site.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-text-primary">Open Source</h2>
            <p className="text-text-secondary leading-relaxed">
              Polybot Arena's source code is available on{' '}
              <a
                href="https://github.com/kangning-huang/polymarket-whale-viz"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                GitHub
              </a>
              . Contributions, pull requests, and feature suggestions are welcome.
            </p>
          </section>
        </motion.article>
      </div>
    </div>
  );
}
