import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Headphones,
  Brain,
  Timer,
  Shield,
  BookOpen,
  Zap,
  type LucideIcon,
} from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  Headphones,
  Brain,
  Timer,
  Shield,
  BookOpen,
  Zap,
};

interface FeaturesProps {
  features: Array<{
    title: string;
    description: string;
    icon: string;
  }>;
}

export function Features({ features }: FeaturesProps) {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <h2 className="text-center text-3xl font-bold text-foreground mb-4">
        Why Audio Learning Works
      </h2>
      <p className="text-center text-muted-foreground mb-16 max-w-2xl mx-auto">
        Turn dead time into study time. Learn while your hands and eyes are busy.
      </p>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((feature) => {
          const Icon = iconMap[feature.icon] || Zap;
          return (
            <Card key={`${feature.icon}-${feature.title}`} className="border-border bg-card">
              <CardHeader>
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-foreground">{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
