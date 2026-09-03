import { forwardRef, type ComponentPropsWithoutRef } from "react";

/**
 * Auth routes can redirect between graspful.ai and app.graspful.ai. A regular
 * anchor keeps that redirect in a document navigation instead of a Next.js RSC
 * fetch, which browsers reject when the redirect crosses origins.
 */
export const AuthLink = forwardRef<
  HTMLAnchorElement,
  ComponentPropsWithoutRef<"a">
>(function AuthLink(props, ref) {
  return <a ref={ref} {...props} />;
});
