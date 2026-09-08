interface HowItWorksProps {
  heading: string;
  steps: Array<{ title: string; description: string }>;
}

export function HowItWorks({ heading, steps }: HowItWorksProps) {
  if (!steps || steps.length === 0) return null;
  return (
    <section className="relative bg-[#0A1628] py-14 md:py-20 overflow-hidden">
      <div className="relative z-10 mx-auto max-w-5xl px-6">
        <h2 className="text-center text-3xl font-bold tracking-[-0.04em] text-white sm:text-4xl mb-12">
          {heading}
        </h2>
        <div className="relative">
          {/* Horizontal connecting line */}
          <div className="absolute top-6 left-[10%] right-[10%] h-px hidden sm:block overflow-hidden">
            <div className="w-full h-full bg-gradient-to-r from-primary via-secondary to-primary animate-line-grow" style={{ animationDuration: '1.5s' }} />
          </div>
          <div className="grid gap-16 sm:grid-cols-3 sm:gap-8">
            {steps.map((step, i) => (
              <div key={step.title} className="flex flex-col items-center text-center">
                <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-white text-2xl font-bold mb-8">
                  {i + 1}
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">{step.title}</h3>
                <p className="text-slate-400 leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
