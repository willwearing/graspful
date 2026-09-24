"use client";

import { Progress } from "@/components/ui/progress";
import { useAudioPlayer } from "@/lib/hooks/use-audio-player";
import { useLessonAudio } from "@/lib/hooks/use-lesson-audio";
import { trackLessonAudioPlayed } from "@/lib/posthog/events";
import { Instruction } from "./lesson-flow/instruction";
import { WorkedExample } from "./lesson-flow/worked-example";
import { Practice } from "./lesson-flow/practice";
import { LessonNavigation } from "./lesson-flow/navigation";
import { useLessonProgress } from "./lesson-flow/use-lesson-progress";
import { useLessonPractice } from "./lesson-flow/use-lesson-practice";
import { useLessonSession } from "./lesson-flow/use-lesson-session";
import type { LessonFlowProps } from "./lesson-flow/types";

export function LessonFlow(props: LessonFlowProps) {
  const { lesson } = props;
  const progress = useLessonProgress(lesson);
  const practice = useLessonPractice(props, progress);
  const session = useLessonSession(props, progress);
  const { audioUrls } = useLessonAudio(lesson.knowledgePoints);
  const { loadQueue, isPlaying, currentItem } = useAudioPlayer();
  const { kp, currentKP, phase, progressPercent } = progress;
  const audio = audioUrls.get(kp.id);

  function playAudio() {
    if (!audio?.instructionUrl) return;
    trackLessonAudioPlayed(lesson.conceptId, kp.slug);
    loadQueue([{
      id: kp.id, title: `${lesson.conceptName} - ${kp.slug}`,
      audioUrl: audio.instructionUrl, durationSeconds: audio.instructionDuration,
    }]);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">{lesson.conceptName}</h2>
        <p className="text-sm text-muted-foreground mt-1">Knowledge Point {currentKP + 1} of {lesson.knowledgePoints.length}</p>
      </div>
      <Progress value={progressPercent} className="h-2" />
      {phase === "instruction" && <Instruction kp={kp} audioAvailable={!!audio?.instructionUrl} playing={isPlaying && currentItem?.id === kp.id} onPlay={playAudio} />}
      {phase === "worked-example" && <WorkedExample kp={kp} />}
      {phase === "practice" && <Practice progress={progress} practice={practice} />}
      {session.error && <p role="alert" className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">{session.error}</p>}
      <LessonNavigation progress={progress} blocked={practice.submitting || !!practice.error}
        completing={session.completing} completionError={session.error}
        onPrevious={() => { practice.reset(); progress.goBack(); }}
        onContinue={() => { practice.reset(); progress.advancePhase(); }}
        onComplete={() => void session.complete()} />
    </div>
  );
}
