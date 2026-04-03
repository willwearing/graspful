import { notFound, redirect } from "next/navigation";
import { apiFetch, createApiFetcher, type ApiFetcher } from "@/lib/api";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) redirect("/sign-in");

  return {
    token,
    serverApiFetch: createApiFetcher(token),
  };
}

export async function requireLearnAccess(orgSlug: string): Promise<AuthSessionResult> {
  const auth = await requireLearnSession();
  const orgs = await auth.serverApiFetch<OrgMembership[]>("/users/me/orgs").catch(() => []);
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
  return fetcher<LearnAcademyRecord>(
    `/orgs/${orgSlug}/academies/slug/${academySlug}`,
  );
}

export async function resolveCourseBySlug(
  orgSlug: string,
  courseSlug: string,
  fetcher: ApiFetcher = apiFetch,
): Promise<LearnCourseRecord> {
  return fetcher<LearnCourseRecord>(`/orgs/${orgSlug}/courses/slug/${courseSlug}`);
}
