import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { BookOpen, ChevronRight } from "lucide-react";

interface CourseCardProps {
  courseId: string;
  href?: string;
  name: string;
  description: string | null;
  orgId: string;
  completionPercent: number;
  totalConcepts: number;
  mastered: number;
}

export function CourseCard({
  courseId,
  href = `/browse/${courseId}`,
  name,
  description,
  completionPercent,
  totalConcepts,
  mastered,
}: CourseCardProps) {
  return (
    <Link href={href}>
      <Card className="group border-border hover:border-primary/50 transition-colors cursor-pointer">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{name}</CardTitle>
              {description && (
                <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">
                  {description}
                </p>
              )}
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
            <span>
              {mastered} / {totalConcepts} concepts mastered
            </span>
            <Badge variant="secondary">{Math.round(completionPercent)}%</Badge>
          </div>
          <Progress value={completionPercent} className="h-2" />
        </CardContent>
      </Card>
    </Link>
  );
}
