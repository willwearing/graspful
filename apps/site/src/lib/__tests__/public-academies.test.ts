import { afterEach, expect, it, vi } from "vitest";
import { getPublicAcademyCatalog } from "@/lib/public-academies";

afterEach(() => vi.unstubAllGlobals());
it("loads the public catalog without credentials or cached results", async () => {
  const catalog = [{ slug: "school", academies: [] }];
  const fetcher = vi.fn().mockResolvedValue(Response.json(catalog));
  vi.stubGlobal("fetch", fetcher);
  expect(await getPublicAcademyCatalog()).toEqual(catalog);
  const [url, init] = fetcher.mock.calls[0];
  expect(url).toMatch(/\/brands\/catalog\/academies$/);
  expect(init.cache).toBe("no-store");
  expect(new Headers(init.headers).has("Authorization")).toBe(false);
});
it("keeps the marketing catalog available when the API fails", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("failure", { status: 500 })));
  expect(await getPublicAcademyCatalog()).toEqual([]);
});
it("keeps the marketing catalog available when the API is offline", async () => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
  expect(await getPublicAcademyCatalog()).toEqual([]);
});
