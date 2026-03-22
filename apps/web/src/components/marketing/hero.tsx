import Link from "next/link";

interface HeroProps {
  headline: string;
  subheadline: string;
  ctaText: string;
}

export function Hero({ headline, subheadline, ctaText }: HeroProps) {
  const words = headline.split(" ");

  return (
    <section className="relative min-h-[85vh] flex items-center">
      <div className="gradient-mesh overflow-hidden">
        <div className="orb-1" />
        <div className="orb-2" />
        <div className="orb-3" />
        <div className="orb-4" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-6 py-32 text-center md:py-44">
        <h1 className="text-5xl font-bold leading-[1.1] tracking-tight sm:text-6xl lg:text-7xl xl:text-9xl">
          {words.map((word, i) => (
            <span
              key={`${word}-${i}`}
              className={`inline-block animate-word-enter ${
                i >= words.length - 1 ? "text-gradient" : "text-foreground"
              }`}
              style={{ animationDelay: `${0.15 + i * 0.12}s` }}
            >
              {word}
              {i < words.length - 1 ? <span>&nbsp;</span> : null}
            </span>
          ))}
        </h1>
        <p
          className="animate-fade-up mx-auto mt-8 max-w-xl text-lg leading-relaxed text-muted-foreground md:text-xl"
          style={{ animationDelay: "0.6s" }}
        >
          {subheadline}
        </p>
        <div className="animate-fade-up" style={{ animationDelay: "0.8s" }}>
          <Link
            href="/sign-up"
            className="btn-gradient glow-pulse mt-14 inline-block px-12 py-4 text-base font-medium"
          >
            {ctaText}
          </Link>
        </div>
      </div>
    </section>
  );
}
