import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSignOut } from "../use-sign-out";
import { useAuthToken } from "../use-auth-token";
import { getAccessToken } from "@/lib/access-token";

const auth = vi.hoisted(() => ({ getSession: vi.fn(), signOut: vi.fn(), subscribe: vi.fn(), unsubscribe: vi.fn(), push: vi.fn(), refresh: vi.fn(), reset: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: auth.push, refresh: auth.refresh }) }));
vi.mock("@/lib/posthog/events", () => ({ resetPostHog: auth.reset }));
vi.mock("@/lib/supabase/client", () => ({ createSupabaseBrowserClient: () => ({ auth: {
  getSession: auth.getSession, signOut: auth.signOut, onAuthStateChange: auth.subscribe,
} }) }));

beforeEach(() => {
  vi.clearAllMocks();
  auth.getSession.mockResolvedValue({ data: { session: { access_token: "current" } }, error: null });
  auth.subscribe.mockReturnValue({ data: { subscription: { unsubscribe: auth.unsubscribe } } });
});
describe("session actions", () => {
  it("reads the current token on every call and returns an empty token after sign-out", async () => {
    expect(await getAccessToken()).toBe("current");
    auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    expect(await getAccessToken()).toBe("");
  });
  it("clears analytics and refreshes the app after successful sign-out", async () => {
    auth.signOut.mockResolvedValue({ error: null });
    const { result } = renderHook(() => useSignOut());
    await act(() => result.current.signOut());
    expect(auth.signOut).toHaveBeenCalledOnce();
    expect(auth.reset).toHaveBeenCalledOnce();
    expect(auth.push).toHaveBeenCalledWith("/");
    expect(auth.refresh).toHaveBeenCalledOnce();
  });
  it("keeps the session screen with an actionable error when sign-out fails", async () => {
    auth.signOut.mockResolvedValue({ error: new Error("offline") });
    const { result } = renderHook(() => useSignOut());
    await act(() => result.current.signOut());
    expect(result.current.error).toBe("Could not sign out. Please try again.");
    expect(auth.push).not.toHaveBeenCalled();
    expect(auth.reset).not.toHaveBeenCalled();
  });
  it("does not restore an old getSession result after an auth-state event", async () => {
    let finish!: (data: unknown) => void;
    auth.getSession.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const { result, unmount } = renderHook(() => useAuthToken());
    act(() => auth.subscribe.mock.calls[0][0]("SIGNED_OUT", null));
    await act(async () => finish({ data: { session: { access_token: "old-user" } }, error: null }));
    expect(result.current).toBeNull();
    act(() => auth.subscribe.mock.calls[0][0]("SIGNED_IN", { access_token: "new-user" }));
    await waitFor(() => expect(result.current).toBe("new-user"));
    unmount();
    expect(auth.unsubscribe).toHaveBeenCalledOnce();
  });
});
