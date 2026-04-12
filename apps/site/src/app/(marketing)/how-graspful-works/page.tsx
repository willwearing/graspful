const steps = [
  {
    number: "1",
    title: "Find out what they already know",
    description:
      "Every course starts with a diagnostic. The platform figures out what the learner can prove they understand and skips the rest. No one sits through material they've already mastered.",
  },
  {
    number: "2",
    title: "Teach what actually matters next",
    description:
      "The sequence changes based on gaps. If a learner is weak on prerequisites, the platform handles that first. If they're strong, it moves them forward. The path is different for everyone.",
  },
  {
    number: "3",
    title: "Prove mastery before moving on",
    description:
      "Progress is gated on evidence. Learners solve problems that test real understanding. Clicking through slides doesn't count.",
  },
  {
    number: "4",
    title: "Keep what you learned",
    description:
      "Spaced review brings knowledge back at the right time. It's built into the product, not a feature you have to turn on. Students retain what they learned instead of losing it.",
  },
];

export default function HowItWorksPage() {
  return (
    <main id="main-content" className="pt-24">
      <section className="py-16 bg-muted/50">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            How it works
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-foreground mb-4">
            How Graspful works
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Diagnosis, mastery, and spaced review. Not a video player with a
            progress bar.
          </p>
        </div>
      </section>
      <section className="py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-5 sm:grid-cols-2">
            {steps.map((step) => (
              <div
                key={step.number}
                className="group rounded-2xl border border-border/50 bg-card p-10 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
              >
                <p className="text-sm font-semibold text-primary mb-2">
                  Step {step.number}
                </p>
                <h2 className="text-lg font-semibold text-foreground mb-2">
                  {step.title}
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
