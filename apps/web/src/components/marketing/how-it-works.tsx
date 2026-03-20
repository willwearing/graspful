interface HowItWorksProps {
  steps: Array<{
    title: string;
    description: string;
  }>;
}

export function HowItWorks({ steps }: HowItWorksProps) {
  return (
    <section className="bg-muted/50 py-24">
      <div className="mx-auto max-w-4xl px-6">
        <h2 className="text-center text-3xl font-bold text-foreground mb-16">
          How It Works
        </h2>
        <div className="relative">
          {/* Connecting line */}
          <div className="absolute left-8 top-0 bottom-0 w-px bg-border hidden md:block" />

          <div className="space-y-12">
            {steps.map((step, i) => (
              <div
                key={`${step.title}-${step.description}`}
                className="flex gap-6 items-start"
              >
                <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xl font-bold shadow-lg">
                  {i + 1}
                </div>
                <div className="pt-2">
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
