import Link from "next/link";

interface HeroProps {
  headline: string;
  subheadline: string;
  ctaText: string;
}

export function Hero({ headline, subheadline, ctaText }: HeroProps) {
  const words = headline.split(" ");

  return (
    <section className="relative min-h-[70vh] flex items-center">
      <div className="gradient-mesh overflow-hidden">
        <div className="orb-1" />
        <div className="orb-2" />
        <div className="orb-3" />
        <div className="orb-4" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-6 py-20 text-center md:py-32">
        <h1 className="text-7xl font-bold tracking-[-0.045em] leading-[1.08] sm:text-8xl lg:text-9xl">
          {words.map((word, i) => (
            <span
              key={`${word}-${i}`}
              className={`inline-block animate-word-enter ${
                i >= words.length - 1 ? "text-gradient" : "text-foreground"
              }`}
              style={{ animationDelay: `${0.15 + i * 0.14}s` }}
            >
              {word}
              {i < words.length - 1 ? <span>&nbsp;</span> : null}
            </span>
          ))}
        </h1>
        <p
          className="animate-fade-up mx-auto mt-8 max-w-xl text-xl leading-relaxed text-muted-foreground md:text-2xl"
          style={{ animationDelay: "0.6s" }}
        >
          {subheadline}
        </p>
        <div className="animate-fade-up" style={{ animationDelay: "0.8s" }}>
          <Link
            href="/sign-up"
            className="btn-gradient glow-pulse mt-10 inline-block px-12 py-4 text-base font-medium"
          >
            {ctaText}
          </Link>
        </div>
      </div>
    </section>
  );
}
