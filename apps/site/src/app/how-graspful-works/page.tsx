import { PageShell } from "@/components/site/page-shell";

export default function HowItWorksPage() {
  return (
    <PageShell
      eyebrow="Guidance"
      title="How Graspful works"
      intro="The platform is built around diagnosis, mastery, and review, not passive content delivery."
    >
      <div>
        <h2 className="section-heading">1. Diagnose what the learner already knows</h2>
        <p className="section-intro">
          Graspful does not force every learner through the same front door. The
          course starts by checking what they can already prove.
        </p>
        <h2 className="section-heading">2. Sequence the next concept deliberately</h2>
        <p className="section-intro">
          The platform changes the order of instruction according to the gaps
          that actually matter. That keeps the pace honest.
        </p>
      </div>
      <div>
        <h2 className="section-heading">3. Gate progress on mastery</h2>
        <p className="section-intro">
          Learners do not click through to completion. They move forward when
          the evidence supports it.
        </p>
        <h2 className="section-heading">4. Bring knowledge back before it fades</h2>
        <p className="section-intro">
          Spaced review is part of the product, not a side feature bolted on at
          the end of a course.
        </p>
      </div>
    </PageShell>
  );
}
