import {
  Headphones, Brain, Timer, Shield, BookOpen, Zap, Code, Database, Workflow, UserCheck,
  FileCode, Bot, Network, Palette, DollarSign, ShieldCheck,
  type LucideIcon,
} from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  Headphones, Brain, Timer, Shield, BookOpen, Zap, Code, Database, Workflow, UserCheck,
  FileCode, Bot, Network, Palette, DollarSign, ShieldCheck,
};

interface FeaturesProps {
  heading: string;
  subheading: string;
  features: Array<{
    title: string;
    description: string;
    icon: string;
    wide?: boolean;
  }>;
}

export function Features({ heading, subheading, features }: FeaturesProps) {
  if (!features || features.length === 0) return null;
  return (
    <section className="bg-[#F8FAFC] py-14 md:py-20 dark:bg-card/50">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="text-center text-3xl font-bold tracking-[-0.04em] text-foreground sm:text-4xl mb-4">
          {heading}
        </h2>
        <p className="text-center text-muted-foreground mb-10 max-w-2xl mx-auto text-lg">
          {subheading}
        </p>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = iconMap[feature.icon] || Zap;
            return (
              <div
                key={`${feature.icon}-${feature.title}`}
                data-wide={feature.wide ? "true" : undefined}
                className={`group rounded-2xl border border-border/50 bg-white p-6 dark:bg-card ${
                  feature.wide ? "sm:col-span-2 lg:col-span-2" : ""
                }`}
              >
                <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
