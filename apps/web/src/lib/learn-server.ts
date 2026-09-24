import "server-only";
import { notFound } from "next/navigation";
import { apiFetch, ApiError, type ApiFetcher } from "@/lib/api";
import { requireAppSession } from "@/lib/app-session";

interface AuthSessionResult {
  token: string;
  serverApiFetch: ApiFetcher;
}

interface OrgMembership {
  orgId: string;
  slug: string;
  name: string;
  role: string;
  isActive: boolean;
}

export interface LearnAcademyRecord {
  id: string;
  slug: string;
  name: string;
  description: string | null;
}

export interface LearnCourseRecord {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  academyId?: string | null;
  academySlug?: string | null;
}

export async function requireLearnSession(): Promise<AuthSessionResult> {
  const { token, fetcher } = await requireAppSession();
  return { token, serverApiFetch: fetcher };
}

export async function requireLearnAccess(orgSlug: string): Promise<AuthSessionResult> {
  const auth = await requireLearnSession();
  const orgs = await auth.serverApiFetch<OrgMembership[]>("/users/me/orgs");
  const membership = orgs.find((org) => org.slug === orgSlug && org.isActive);

  if (!membership) {
    notFound();
  }

  return auth;
}

export async function resolveAcademyBySlug(
  orgSlug: string,
  academySlug: string,
  fetcher: ApiFetcher = apiFetch,
): Promise<LearnAcademyRecord> {
  try {
    return await fetcher<LearnAcademyRecord>(
      `/orgs/${encodeURIComponent(orgSlug)}/academies/slug/${encodeURIComponent(academySlug)}`,
    );
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 404) notFound();
    throw error;
  }
}

export async function resolveCourseBySlug(
  orgSlug: string,
  courseSlug: string,
  fetcher: ApiFetcher = apiFetch,
): Promise<LearnCourseRecord> {
  try {
    return await fetcher<LearnCourseRecord>(`/orgs/${encodeURIComponent(orgSlug)}/courses/slug/${encodeURIComponent(courseSlug)}`);
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 404) notFound();
    throw error;
  }
}
