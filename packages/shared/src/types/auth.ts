export interface AuthUser {
  userId: string;
  email: string;
}

export type OrgRole = 'owner' | 'admin' | 'member';

export interface OrgContext {
  userId: string;
  email: string;
  orgId: string;
  role: OrgRole;
}
