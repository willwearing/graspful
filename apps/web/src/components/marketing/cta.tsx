import Link from "next/link";

interface CTAProps {
  ctaText: string;
}

export function CTA({ ctaText }: CTAProps) {
  return (
    <section className="relative overflow-hidden py-24">
      <div className="gradient-mesh">
        <div className="orb-1" />
        <div className="orb-2" />
      </div>
      <div className="relative z-10 mx-auto max-w-2xl px-6 text-center">
        <h2 className="text-3xl font-bold text-foreground sm:text-4xl mb-6">
          Ready to Start Studying?
        </h2>
        <p className="text-lg text-muted-foreground mb-10">
          Join thousands of candidates who passed their exam with audio-first learning.
        </p>
        <Link
          href="/sign-up"
          className="btn-gradient inline-block px-12 py-4 text-base font-medium"
        >
          {ctaText}
        </Link>
      </div>
    </section>
  );
}
