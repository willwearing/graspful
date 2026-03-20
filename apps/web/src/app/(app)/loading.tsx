import { Skeleton } from "@/components/ui/skeleton";

export default function AppLoading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      <Skeleton className="mb-2 h-10 w-64" />
      <Skeleton className="mb-8 h-6 w-56" />

      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-36 w-full rounded-2xl" />
        <Skeleton className="h-36 w-full rounded-2xl" />
      </div>

      <Skeleton className="mb-8 h-40 w-full rounded-2xl" />
      <Skeleton className="mb-4 h-8 w-40" />

      <div className="space-y-4">
        <Skeleton className="h-36 w-full rounded-2xl" />
        <Skeleton className="h-36 w-full rounded-2xl" />
      </div>
    </div>
  );
}
