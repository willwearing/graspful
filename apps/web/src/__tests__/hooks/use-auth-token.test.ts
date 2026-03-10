import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useAuthToken } from "@/lib/hooks/use-auth-token";

vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({
    auth: {
      getSession: () => Promise.resolve({ data: { session: { access_token: "test-token" } } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
  }),
}));

describe("useAuthToken", () => {
  it("returns the access token from Supabase session", async () => {
    const { result } = renderHook(() => useAuthToken());
    await waitFor(() => {
      expect(result.current).toBe("test-token");
    });
  });
});
