import "server-only";
import { createRequiredSession } from "@graspful/creator-ui/app-session";
import { createApiFetcher } from "@/lib/api";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const requireAppSession = createRequiredSession(createSupabaseServerClient, createApiFetcher);
