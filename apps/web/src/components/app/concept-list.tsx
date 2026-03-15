import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { MasteryBadge } from "@/components/app/mastery-badge";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { ChevronRight, Lock } from "lucide-react";
import type { MasteryState } from "@/lib/types";

interface CourseSection {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  sortOrder: number;
}

interface Concept {
  id: string;
  name: string;
  description: string | null;
  difficulty: number;
  sortOrder: number;
  sectionId?: string | null;
}

interface ConceptWithMastery extends Concept {
  masteryState: MasteryState;
}

interface ConceptListProps {
  concepts: ConceptWithMastery[];
  sections?: CourseSection[];
  courseId: string;
  locked?: boolean;
}

function ConceptRow({
  concept,
  courseId,
  locked,
  index,
}: {
  concept: ConceptWithMastery;
  courseId: string;
  locked?: boolean;
  index: number;
}) {
  const isLocked = locked && concept.masteryState === "unstarted";

  if (isLocked) {
    return (
      <Tooltip>
        <TooltipTrigger className="w-full text-left">
          <Card className="border-border opacity-50 cursor-not-allowed">
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground">
                  {index + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-medium text-muted-foreground truncate">
                    {concept.name}
                  </h3>
                  {concept.description && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {concept.description}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-4">
                <Lock className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </TooltipTrigger>
        <TooltipContent>
          Complete the diagnostic first to unlock concepts
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Link href={`/study/${courseId}/lesson/${concept.id}`}>
      <Card className="border-border hover:border-primary/30 transition-colors cursor-pointer">
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground">
              {index + 1}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-medium text-foreground truncate">
                {concept.name}
              </h3>
              {concept.description && (
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {concept.description}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0 ml-4">
            <MasteryBadge state={concept.masteryState} />
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export function ConceptList({ concepts, sections, courseId, locked }: ConceptListProps) {
  if (concepts.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center">
        <p className="text-muted-foreground">No concepts in this course yet.</p>
      </div>
    );
  }

  const hasSections = sections && sections.length > 0;

  if (!hasSections) {
    return (
      <TooltipProvider>
        <div className="space-y-2">
          {concepts.map((concept, i) => (
            <ConceptRow
              key={concept.id}
              concept={concept}
              courseId={courseId}
              locked={locked}
              index={i}
            />
          ))}
        </div>
      </TooltipProvider>
    );
  }

  // Group concepts by section
  const sortedSections = [...sections].sort((a, b) => a.sortOrder - b.sortOrder);
  const sectionMap = new Map<string, ConceptWithMastery[]>();
  const unsectioned: ConceptWithMastery[] = [];

  for (const section of sortedSections) {
    sectionMap.set(section.id, []);
  }
  for (const concept of concepts) {
    if (concept.sectionId && sectionMap.has(concept.sectionId)) {
      sectionMap.get(concept.sectionId)!.push(concept);
    } else {
      unsectioned.push(concept);
    }
  }

  let globalIndex = 0;

  return (
    <TooltipProvider>
      <div className="space-y-8">
        {sortedSections.map((section) => {
          const sectionConcepts = sectionMap.get(section.id) ?? [];
          if (sectionConcepts.length === 0) return null;

          const startIndex = globalIndex;
          globalIndex += sectionConcepts.length;

          return (
            <div key={section.id}>
              <div className="mb-3">
                <h3 className="text-lg font-semibold text-foreground">
                  {section.name}
                </h3>
                {section.description && (
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {section.description}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                {sectionConcepts.map((concept, i) => (
                  <ConceptRow
                    key={concept.id}
                    concept={concept}
                    courseId={courseId}
                    locked={locked}
                    index={startIndex + i}
                  />
                ))}
              </div>
            </div>
          );
        })}

        {unsectioned.length > 0 && (
          <div>
            <div className="space-y-2">
              {unsectioned.map((concept) => {
                const idx = globalIndex++;
                return (
                  <ConceptRow
                    key={concept.id}
                    concept={concept}
                    courseId={courseId}
                    locked={locked}
                    index={idx}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
