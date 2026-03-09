export interface Organization {
  id: string;
  slug: string;
  name: string;
  niche: string;
  isActive: boolean;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface OrgMembership {
  id: string;
  orgId: string;
  userId: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
}

export interface User {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  isGlobalAdmin: boolean;
  createdAt: string;
  updatedAt: string;
}
