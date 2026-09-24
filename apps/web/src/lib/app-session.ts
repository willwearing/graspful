import "server-only";
import { createRequiredSession } from "@graspful/creator-ui/app-session";
import { createApiFetcher } from "@/lib/api";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cache } from "react";
import { resolvePageBrand } from "@/lib/brand/resolve";

const requireSession = createRequiredSession(createSupabaseServerClient, createApiFetcher);
export const requireAppSession = cache(async () => ({
  ...await requireSession(),
  brand: await resolvePageBrand(),
}));
