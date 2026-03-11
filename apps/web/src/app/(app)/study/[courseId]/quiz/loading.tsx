import { Skeleton } from "@/components/ui/skeleton";

export default function QuizLoading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-8 space-y-6">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-2 w-full" />
      <Skeleton className="h-24 w-full" />
      <div className="space-y-3">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    </div>
  );
}
