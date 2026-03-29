import { PageShell } from "@/components/site/page-shell";

export default function HowItWorksPage() {
  return (
    <PageShell
      eyebrow="How it works"
      title="How Graspful works"
      intro="Diagnosis, mastery, and spaced review. Not a video player with a progress bar."
    >
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground mb-4">1. Find out what they already know</h2>
        <p className="text-muted-foreground">
          Every course starts with a diagnostic. The platform figures out what
          the learner can prove they understand and skips the rest. No one sits
          through material they&apos;ve already mastered.
        </p>
        <h2 className="text-2xl font-bold tracking-tight text-foreground mb-4">2. Teach what actually matters next</h2>
        <p className="text-muted-foreground">
          The sequence changes based on gaps. If a learner is weak on
          prerequisites, the platform handles that first. If they&apos;re strong, it
          moves them forward. The path is different for everyone.
        </p>
      </div>
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground mb-4">3. Prove mastery before moving on</h2>
        <p className="text-muted-foreground">
          Progress is gated on evidence. Learners solve problems that test real
          understanding. Clicking through slides doesn&apos;t count.
        </p>
        <h2 className="text-2xl font-bold tracking-tight text-foreground mb-4">4. Keep what you learned</h2>
        <p className="text-muted-foreground">
          Spaced review brings knowledge back at the right time. It&apos;s built into
          the product, not a feature you have to turn on. Students retain what
          they learned instead of losing it.
        </p>
      </div>
    </PageShell>
  );
}
