import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface DocSectionProps extends Omit<ComponentPropsWithoutRef<"section">, "title"> {
  title: ReactNode;
  headingId?: string;
}

export function DocSection({ title, headingId, className, children, ...props }: DocSectionProps) {
  return (
    <section className={cn("mt-12", className)} {...props}>
      <h2 className="text-2xl font-bold text-foreground" id={headingId}>
        {title}
      </h2>
      {children}
    </section>
  );
}
