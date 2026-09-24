import 'server-only';
import { ActivityStart, type ActivityStartProps } from '@/components/learning/activity-start';
import type { LearnerRoutes } from '@/lib/learner-routes';

type ActivityViewProps = Omit<ActivityStartProps, 'kind' | 'backHref' | 'continueHref'> & { routes: Pick<LearnerRoutes, 'course' | 'study'> };

function ActivityView({ routes, ...props }: ActivityViewProps & Pick<ActivityStartProps, 'kind'>) {
  return <div className="mx-auto max-w-3xl px-4 py-8 md:px-8">
    <ActivityStart {...props} backHref={routes.course} continueHref={routes.study} />
  </div>;
}

export const LessonView = (props: ActivityViewProps) => <ActivityView {...props} kind="lesson" />;
export const DiagnosticView = (props: ActivityViewProps) => <ActivityView {...props} kind="diagnostic" />;
export const QuizView = (props: ActivityViewProps) => <ActivityView {...props} kind="quiz" />;
export const ReviewView = (props: ActivityViewProps) => <ActivityView {...props} kind="review" />;
export const ExamView = (props: ActivityViewProps) => <ActivityView {...props} kind="exam" />;
