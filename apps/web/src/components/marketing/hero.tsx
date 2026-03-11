import Link from "next/link";

interface HeroProps {
  headline: string;
  subheadline: string;
  ctaText: string;
}

export function Hero({ headline, subheadline, ctaText }: HeroProps) {
  const words = headline.split(" ");

  return (
    <section className="relative">
      <div className="gradient-mesh overflow-hidden">
        <div className="orb-1" />
        <div className="orb-2" />
        <div className="orb-3" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-6 pt-32 pb-36 text-center md:pt-44 md:pb-48">
        <h1 className="text-4xl font-bold leading-[1.25] tracking-tight sm:text-5xl lg:text-6xl xl:text-7xl">
          {words.map((word, i) => (
            <span
              key={i}
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
            className="btn-gradient mt-14 inline-block px-12 py-4 text-base font-medium"
          >
            {ctaText}
          </Link>
        </div>
      </div>
    </section>
  );
}
