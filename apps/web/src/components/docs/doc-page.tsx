import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface DocPageProps {
  title: ReactNode;
  description: ReactNode;
  titleClassName?: string;
  children: ReactNode;
}

export function DocPage({ title, description, titleClassName, children }: DocPageProps) {
  return (
    <div>
      <h1 className={cn("text-4xl font-bold tracking-[-0.04em] text-foreground", titleClassName)}>
        {title}
      </h1>
      <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
        {description}
      </p>
      {children}
    </div>
  );
}
