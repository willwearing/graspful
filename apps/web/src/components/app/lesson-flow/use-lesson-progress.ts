"use client";

import { useRef, useState } from "react";
import type { KPPhase, LessonData, NextProblemHint } from "./types";

export function useLessonProgress(lesson: LessonData) {
  const [currentKP, setCurrentKP] = useState(0);
  const [phase, setPhase] = useState<KPPhase>("instruction");
  const [currentProblemId, setCurrentProblemId] = useState<string | null>(null);
  const [workedExampleOpen, setWorkedExampleOpen] = useState(true);
  const [kpPracticeDone, setKpPracticeDone] = useState(false);
  const reopenedKPIdsRef = useRef<string[]>([]);
  const kp = lesson.knowledgePoints[currentKP];
  const problems = kp.problems ?? [];
  const isLast = currentKP === lesson.knowledgePoints.length - 1;
  const currentProblem = problems.find((problem) => problem.id === currentProblemId) ??
    (currentProblemId === null && !kpPracticeDone ? problems[0] ?? null : null);
  const practiceComplete = problems.length === 0 || kpPracticeDone;
  const currentPhaseIndex = currentKP * 3 + (phase === "instruction" ? 0 : phase === "worked-example" ? 1 : 2);
  const progressPercent = ((currentPhaseIndex + 1) / (lesson.knowledgePoints.length * 3)) * 100;

  function resetPractice() {
    setCurrentProblemId(kp.problems?.[0]?.id ?? null);
    setKpPracticeDone(false);
  }

  function advancePhase() {
    if (phase === "instruction") {
      setPhase(kp.workedExampleText ? "worked-example" : "practice");
      setWorkedExampleOpen(true);
      if (!kp.workedExampleText) resetPractice();
    } else if (phase === "worked-example") {
      setPhase("practice");
      setWorkedExampleOpen(false);
      resetPractice();
    } else if (!isLast) {
      setCurrentKP((previous) => previous + 1);
      setPhase("instruction");
      setWorkedExampleOpen(true);
      setCurrentProblemId(null);
      setKpPracticeDone(false);
    }
  }

  function goBack() {
    if (phase === "practice") setPhase(kp.workedExampleText ? "worked-example" : "instruction");
    else if (phase === "worked-example") setPhase("instruction");
    else if (currentKP > 0) {
      setCurrentKP((previous) => previous - 1);
      setPhase("practice");
      setCurrentProblemId(null);
      setKpPracticeDone(false);
    }
  }

  function applyNextProblemHint(hint: NextProblemHint | null) {
    if (!hint) {
      const index = problems.findIndex((problem) => problem.id === currentProblem?.id);
      const next = index >= 0 ? problems[index + 1] ?? null : null;
      if (!next) setKpPracticeDone(true);
      setCurrentProblemId(next?.id ?? null);
      return;
    }
    if (hint.lessonComplete) {
      setKpPracticeDone(true);
      setCurrentProblemId(null);
      return;
    }
    if (hint.reopenWorkedExample) {
      setWorkedExampleOpen(true);
      reopenedKPIdsRef.current = Array.from(new Set([...reopenedKPIdsRef.current, hint.targetKPId]));
    }
    if (hint.targetKPId !== kp.id) {
      const targetIndex = lesson.knowledgePoints.findIndex((point) => point.id === hint.targetKPId);
      if (targetIndex >= 0) {
        setKpPracticeDone(false);
        setCurrentKP(targetIndex);
        setPhase("practice");
      }
    }
    setCurrentProblemId(hint.nextProblemId);
  }

  return {
    currentKP, phase, kp, problems, isLast, currentProblem, practiceComplete, progressPercent,
    workedExampleOpen, setWorkedExampleOpen, reopenedKPIdsRef, advancePhase, goBack,
    applyNextProblemHint, canGoBack: phase !== "instruction" || currentKP > 0,
  };
}
