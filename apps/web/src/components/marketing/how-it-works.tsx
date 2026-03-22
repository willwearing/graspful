interface HowItWorksProps {
  heading: string;
  steps: Array<{
    title: string;
    description: string;
  }>;
}

export function HowItWorks({ heading, steps }: HowItWorksProps) {
  return (
    <section className="relative bg-[#0A1628] py-24 overflow-hidden">
      <div className="gradient-mesh opacity-30">
        <div className="orb-1" />
        <div className="orb-2" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl px-6">
        <h2 className="text-center text-3xl font-bold text-white sm:text-4xl mb-16">
          {heading}
        </h2>
        <div className="relative">
          <div className="absolute left-8 top-0 bottom-0 w-px hidden md:block overflow-hidden">
            <div className="w-full bg-gradient-to-b from-primary via-secondary to-primary animate-line-grow" />
          </div>

          <div className="space-y-12">
            {steps.map((step, i) => (
              <div
                key={`${step.title}-${step.description}`}
                className="flex gap-6 items-start"
              >
                <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-white text-xl font-bold shadow-lg shadow-primary/20">
                  {i + 1}
                </div>
                <div className="pt-2">
                  <h3 className="text-xl font-semibold text-white mb-2">
                    {step.title}
                  </h3>
                  <p className="text-slate-400 leading-relaxed">
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
