import "server-only";
import { createServerApiFetch } from "@graspful/creator-ui/api-server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export { createApiFetcher } from "@graspful/creator-ui/api-server";
export { ApiError, type ApiFetchOptions, type ApiFetcher } from "@graspful/creator-ui/api-core";
export const apiFetch = createServerApiFetch(createSupabaseServerClient);
