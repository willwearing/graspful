export interface UserProgress {
  id: string;
  userId: string;
  studyItemId: string;
  orgId: string;
  listenCount: number;
  lastPositionSeconds: number;
  lastPlaybackRate: number;
  isCompleted: boolean;
  firstListenedAt: string | null;
  lastListenedAt: string | null;
  easeFactor: number;
  intervalDays: number;
  nextReviewAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserStreak {
  id: string;
  userId: string;
  orgId: string;
  date: string;
  listenSeconds: number;
  itemsCompleted: number;
}

export interface UserBookmark {
  id: string;
  userId: string;
  studyItemId: string;
  orgId: string;
  note: string | null;
  createdAt: string;
}
