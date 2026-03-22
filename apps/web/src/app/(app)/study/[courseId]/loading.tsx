import { Skeleton } from "@/components/ui/skeleton";

export default function StudyLoading() {
  return (
    <div className="mx-auto max-w-4xl px-4 md:px-8 flex items-center justify-center py-12">
      <Skeleton className="h-6 w-48" />
    </div>
  );
}
