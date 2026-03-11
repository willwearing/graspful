import { Skeleton } from "@/components/ui/skeleton";

export default function DiagnosticLoading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      <Skeleton className="h-8 w-64 mb-6" />
      <Skeleton className="h-2 w-full mb-8" />
      <Skeleton className="h-24 w-full mb-4" />
      <div className="space-y-3">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    </div>
  );
}
