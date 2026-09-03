import { describe, expect, it } from "vitest";
import { buildPostHogPageviewUrl } from "../pageview-url";

describe("buildPostHogPageviewUrl", () => {
  it("keeps the absolute page URL without query parameters or fragments", () => {
    const location = new URL(
      "https://graspful.ai/cli-auth?email=person@example.com#token=secret",
    );

    expect(buildPostHogPageviewUrl(location)).toBe(
      "https://graspful.ai/cli-auth",
    );
  });
});
