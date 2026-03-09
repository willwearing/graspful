export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'incomplete';

export type PlanTier = 'free' | 'individual' | 'team' | 'enterprise';

export interface Subscription {
  id: string;
  orgId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string | null;
  plan: PlanTier;
  status: SubscriptionStatus;
  trialEndsAt: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  maxMembers: number;
  createdAt: string;
  updatedAt: string;
}

export interface InviteToken {
  id: string;
  orgId: string;
  email: string;
  role: 'owner' | 'admin' | 'member';
  token: string;
  invitedBy: string;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
}

export type GenerationStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export interface AudioGenerationJob {
  id: string;
  orgId: string;
  examId: string | null;
  status: GenerationStatus;
  totalItems: number;
  completedItems: number;
  failedItems: number;
  voices: string[];
  errorLog: unknown[];
  startedAt: string | null;
  completedAt: string | null;
  triggeredBy: string | null;
  createdAt: string;
  updatedAt: string;
}
