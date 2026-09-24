"use client";

import { createBrowserApiFetcher } from "@graspful/creator-ui/api-client";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export { ApiError } from "@graspful/creator-ui/api-core";
export const apiClientFetch = createBrowserApiFetcher(createSupabaseBrowserClient);
