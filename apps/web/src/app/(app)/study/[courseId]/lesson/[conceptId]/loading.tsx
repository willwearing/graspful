import { Skeleton } from "@/components/ui/skeleton";

export default function LessonLoading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-8 space-y-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-2 w-full" />
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}
