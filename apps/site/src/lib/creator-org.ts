import "server-only";
import { createCreatorOrgResolver } from "@graspful/creator-ui/creator-org-server";
import { createApiFetcher } from "@/lib/api";

export { CREATOR_ORG_COOKIE, type CreatorOrgMembership } from "@graspful/creator-ui/creator-org-shared";
export const resolveCreatorOrgSlug = createCreatorOrgResolver(createApiFetcher);
