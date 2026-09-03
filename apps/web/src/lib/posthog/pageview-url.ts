export function buildPostHogPageviewUrl(
  location: Pick<Location, "origin" | "pathname">,
): string {
  return `${location.origin}${location.pathname}`;
}
