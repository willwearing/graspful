export function FeedbackBanner() {
  return (
    <section className="feedback-banner" aria-labelledby="feedback-heading">
      <div className="site-width feedback-inner">
        <div>
          <h2 id="feedback-heading">Is this guidance useful?</h2>
          <p>
            If something is unclear, the problem is probably the product site,
            not you.
          </p>
        </div>
        <div className="feedback-actions">
          <a className="button secondary-button" href="mailto:founders@graspful.ai?subject=Site%20feedback">
            Send feedback
          </a>
          <a className="link-button" href="/docs">
            Read the docs
          </a>
        </div>
      </div>
    </section>
  );
}
