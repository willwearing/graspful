import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BrandProvider } from "@/lib/brand/context";
import { defaultBrand, posthogBrand } from "@/lib/brand/defaults";
import { HostSurfaceProvider } from "@/lib/host-context";
import { PostHogProvider } from "../provider";

const mocks = vi.hoisted(() => ({
  calls: [] as string[],
  register: vi.fn(),
  capture: vi.fn(),
}));

vi.mock("../client", () => ({
  initPostHog: vi.fn(),
  posthog: {
    __loaded: true,
    register: (properties: Record<string, string>) => {
      mocks.calls.push("register");
      mocks.register(properties);
    },
    capture: (event: string) => {
      mocks.calls.push(event);
      mocks.capture(event);
    },
    identify: vi.fn(),
  },
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({
    auth: {
      getSession: () => Promise.resolve({ data: { session: null } }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
  }),
}));

describe("PostHogProvider", () => {
  beforeEach(() => {
    mocks.calls.length = 0;
    mocks.register.mockReset();
    mocks.capture.mockReset();
  });

  it("tags events with the host surface and brand before the first pageview", () => {
    render(
      <HostSurfaceProvider surface="academy">
        <BrandProvider brand={posthogBrand}>
          <PostHogProvider>content</PostHogProvider>
        </BrandProvider>
      </HostSurfaceProvider>,
    );

    expect(mocks.register).toHaveBeenCalledWith({
      host_surface: "academy",
      brand_id: "posthog",
    });
    expect(mocks.calls.slice(0, 2)).toEqual(["register", "$pageview"]);
  });

  it("marks an unbranded subdomain as an academy host with the fallback brand", () => {
    render(
      <HostSurfaceProvider surface="academy">
        <BrandProvider brand={defaultBrand}>
          <PostHogProvider>content</PostHogProvider>
        </BrandProvider>
      </HostSurfaceProvider>,
    );

    expect(mocks.register).toHaveBeenCalledWith({
      host_surface: "academy",
      brand_id: "graspful",
    });
  });
});
