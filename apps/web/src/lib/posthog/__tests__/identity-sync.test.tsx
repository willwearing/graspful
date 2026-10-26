import { act, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PostHogIdentitySync } from "../identity-sync";

type Session = { user: { id: string } } | null;

const mocks = vi.hoisted(() => ({
  identify: vi.fn(),
  unsubscribe: vi.fn(),
  initialSession: null as Session,
  onAuthChange: undefined as ((event: string, session: Session) => void) | undefined,
}));

vi.mock("../client", () => ({
  initPostHog: vi.fn(),
  posthog: { __loaded: true, identify: mocks.identify },
}));

vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({
    auth: {
      getSession: () => Promise.resolve({ data: { session: mocks.initialSession } }),
      onAuthStateChange: (callback: (event: string, session: Session) => void) => {
        mocks.onAuthChange = callback;
        return { data: { subscription: { unsubscribe: mocks.unsubscribe } } };
      },
    },
  }),
}));

describe("PostHogIdentitySync", () => {
  beforeEach(() => {
    mocks.identify.mockReset();
    mocks.unsubscribe.mockReset();
    mocks.initialSession = null;
    mocks.onAuthChange = undefined;
  });

  it("identifies the signed-in user once", async () => {
    mocks.initialSession = { user: { id: "user-1" } };

    render(<PostHogIdentitySync />);
    await act(async () => {});
    act(() => mocks.onAuthChange?.("TOKEN_REFRESHED", { user: { id: "user-1" } }));

    expect(mocks.identify).toHaveBeenCalledOnce();
    expect(mocks.identify).toHaveBeenCalledWith("user-1");
  });

  it("identifies a user who signs in after the shell mounts", async () => {
    render(<PostHogIdentitySync />);
    await act(async () => {});
    expect(mocks.identify).not.toHaveBeenCalled();

    act(() => mocks.onAuthChange?.("SIGNED_IN", { user: { id: "user-2" } }));

    expect(mocks.identify).toHaveBeenCalledWith("user-2");
  });

  it("stops listening on unmount", () => {
    const { unmount } = render(<PostHogIdentitySync />);
    unmount();

    expect(mocks.unsubscribe).toHaveBeenCalledOnce();
  });
});
