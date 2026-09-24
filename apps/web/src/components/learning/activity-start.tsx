'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import type { DiagnosticStart, LessonStart } from '@graspful/shared';
import { apiClientFetch } from '@/lib/api-client';
import { DiagnosticFlow } from '@/components/app/diagnostic-flow';
import { LessonFlow } from '@/components/app/lesson-flow';
import { QuizFlow, type QuizData } from '@/components/app/quiz-flow';
import { ReviewFlow, type ReviewData } from '@/components/app/review-flow';
import { SectionExamFlow, type SectionExamData } from '@/components/app/section-exam-flow';
import { AcademyEnrollTracker } from '@/components/app/page-view-tracker';
import { Button } from '@/components/ui/button';

export type ActivityKind = 'lesson' | 'diagnostic' | 'quiz' | 'review' | 'exam';
export interface ActivityStartProps {
  kind: ActivityKind;
  orgSlug: string;
  courseId: string;
  token: string;
  conceptId?: string;
  sectionId?: string;
  academyId?: string;
  academyName?: string;
  backHref: string;
  continueHref: string;
}

const titles: Record<ActivityKind, string> = {
  lesson: 'Lesson', diagnostic: 'Diagnostic Assessment', quiz: 'Quiz', review: 'Concept Review', exam: 'Section Exam',
};

type ActivityData =
  | { kind: 'lesson'; value: LessonStart }
  | { kind: 'diagnostic'; value: DiagnosticStart }
  | { kind: 'quiz'; value: QuizData }
  | { kind: 'review'; value: ReviewData }
  | { kind: 'exam'; value: SectionExamData };

/** Starting an activity is an explicit action. Rendering and prefetch never write. */
export function ActivityStart(props: ActivityStartProps) {
  const { kind, orgSlug, courseId, token, conceptId, sectionId, academyId, backHref, continueHref } = props;
  const [data, setData] = useState<ActivityData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);

  async function start() {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    setError(null);
    const base = `/orgs/${encodeURIComponent(orgSlug)}/${academyId ? `academies/${encodeURIComponent(academyId)}` : `courses/${encodeURIComponent(courseId)}`}`;
    const post = <T,>(suffix: string) => apiClientFetch<T>(`${base}/${suffix}`, token, { method: 'POST' });
    try {
      switch (kind) {
        case 'diagnostic':
          // Enrollment is idempotent. A failed enrollment must not start a diagnostic.
          await post('enroll');
          setData({ kind, value: await post<DiagnosticStart>('diagnostic/start') });
          break;
        case 'lesson':
          setData({ kind, value: await post<LessonStart>(`lessons/${encodeURIComponent(conceptId!)}/start`) });
          break;
        case 'quiz':
          setData({ kind, value: await post<QuizData>('quizzes/generate') });
          break;
        case 'review':
          setData({ kind, value: await post<ReviewData>(`reviews/${encodeURIComponent(conceptId!)}/start`) });
          break;
        case 'exam':
          setData({ kind, value: await post<SectionExamData>(`sections/${encodeURIComponent(sectionId!)}/exam/start`) });
          break;
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not start this activity. Please try again.');
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  if (data) {
    switch (data.kind) {
      case 'lesson': return <LessonFlow orgSlug={orgSlug} courseId={courseId} token={token} lesson={data.value} continueHref={continueHref} />;
      case 'quiz': return <><h1 className="text-2xl font-bold text-foreground mb-6">Quiz</h1><QuizFlow orgSlug={orgSlug} courseId={courseId} token={token} quizData={data.value} continueHref={continueHref} /></>;
      case 'review': return <><h1 className="text-2xl font-bold text-foreground mb-6">Concept Review</h1><ReviewFlow orgSlug={orgSlug} courseId={courseId} conceptId={conceptId!} token={token} initialData={data.value} continueHref={continueHref} /></>;
      case 'exam': return <SectionExamFlow orgSlug={orgSlug} courseId={courseId} sectionId={sectionId!} token={token} examData={data.value} continueHref={continueHref} />;
      case 'diagnostic': return <>
        <h1 className="text-2xl font-bold text-foreground mb-6">Diagnostic Assessment</h1>
        {academyId ? <AcademyEnrollTracker academyId={academyId} academyName={props.academyName ?? academyId} /> : null}
        <DiagnosticFlow orgSlug={orgSlug} courseId={data.value.courseId ?? courseId} academyId={academyId} token={token} initialData={data.value} completionHref={backHref} completionLabel={academyId ? 'Go to Academy' : 'Go to Course'} />
      </>;
    }
  }

  return <div className="space-y-4">
    <Link className="text-sm text-muted-foreground hover:text-foreground" href={backHref}>Back to {academyId ? 'Academy' : 'Course'}</Link>
    <h1 className="text-2xl font-bold text-foreground">{titles[kind]}</h1>
    {error ? <p role="alert" className="text-destructive">{error}</p> : null}
    <Button disabled={pending} onClick={start}>{pending ? 'Starting…' : error ? 'Try again' : `Start ${titles[kind]}`}</Button>
  </div>;
}
