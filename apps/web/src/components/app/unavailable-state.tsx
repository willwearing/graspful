import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function UnavailableState({ backHref, message, backLabel = "Back", title = "Unavailable" }: {
  backHref: string;
  message: string;
  backLabel?: string;
  title?: string;
}) {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href={backHref} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />{backLabel}
      </Link>
      <div className="rounded-lg border border-border p-8 text-center">
        <h2 className="text-lg font-semibold text-foreground mb-2">{title}</h2>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}
