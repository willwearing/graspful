import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CalloutProps extends Omit<ComponentPropsWithoutRef<"div">, "title"> {
  as?: "div" | "section";
  title?: ReactNode;
  headingId?: string;
  titleClassName?: string;
}

export function Callout({
  as: Element = "div",
  title,
  headingId,
  titleClassName = "text-xl font-bold text-foreground mb-4",
  className,
  children,
  ...props
}: CalloutProps) {
  return (
    <Element className={cn("rounded-xl border border-border/50 bg-card p-6", className)} {...props}>
      {title != null && <h2 className={titleClassName} id={headingId}>{title}</h2>}
      {children}
    </Element>
  );
}
