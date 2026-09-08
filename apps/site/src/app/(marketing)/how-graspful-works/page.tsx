import Link from "next/link";

const steps = [
  {
    title: "Estimate the starting point",
    description: "A diagnostic asks questions from the course and uses answers to estimate a learner's knowledge. These estimates guide which concepts to practice.",
  },
  {
    title: "Choose a concept to practice",
    description: "The learning engine uses the prerequisite graph and the learner's current estimates to select work. When a learner struggles, prerequisite concepts can return for practice.",
  },
  {
    title: "Teach, then check understanding",
    description: "Each knowledge point has an instruction, a worked example, and problems. Answers update the learner model. The usefulness of that evidence depends on the quality of the course questions.",
  },
  {
    title: "Return for review",
    description: "The system schedules review of previously studied concepts. Learners can answer further questions and revisit explanations as they continue the course.",
  },
];

export default function HowItWorksPage() {
  return (
    <main id="main-content" className="pt-24">
      <section className="bg-muted/30 py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">How Graspful works</h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">Your course supplies the lessons, questions, and prerequisites. Graspful uses learner answers to select practice and schedule review.</p>
        </div>
      </section>
      <section className="mx-auto max-w-4xl px-6 py-16">
        <ol className="divide-y divide-border">
          {steps.map((step, i) => (
            <li key={step.title} className="grid gap-3 py-6 first:pt-0 sm:grid-cols-[2rem_1fr]">
              <span aria-hidden="true" className="text-sm text-muted-foreground">0{i + 1}</span>
              <div>
                <h2 className="text-lg font-semibold">{step.title}</h2>
                <p className="mt-3 leading-relaxed text-muted-foreground">{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-8 text-sm leading-relaxed text-muted-foreground">Learner progress is an estimate based on their answers. Review course content and answer keys before publishing, and use learner feedback to improve the course.</p>
        <Link href="/docs" className="mt-6 inline-block text-sm font-medium underline underline-offset-4">Read the authoring guide</Link>
      </section>
    </main>
  );
}
