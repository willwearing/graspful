import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ApiKeysPage from "../page";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
  fetchApi: vi.fn(),
  orgSlug: "graspful",
}));
vi.mock("@/lib/contexts/creator-org-context", () => ({ useCreatorOrg: () => ({ orgSlug: mocks.orgSlug }) }));
vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({ auth: { getSession: mocks.getSession, onAuthStateChange: mocks.subscribe } }),
}));
vi.mock("@/lib/api-client", () => ({ apiClientFetch: mocks.fetchApi }));

const sessionFor = (id = "user-one", accessToken = "token-123") => ({ access_token: accessToken, user: { id } });
const metadata = { id: "key-1", name: "Laptop CLI", keyPrefix: "gsk_short", createdAt: "2026-03-30T00:00:00.000Z", lastUsedAt: null, expiresAt: null };
const created = { key: "gsk_test_key", id: "key-1" };
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((finish) => { resolve = finish; });
  return { promise, resolve };
}
function emitSession(event: string, session: ReturnType<typeof sessionFor> | null) {
  const callback = mocks.subscribe.mock.calls.at(-1)?.[0];
  expect(callback).toBeTypeOf("function");
  act(() => callback(event, session));
}
async function beginCreation(name = "Laptop CLI") {
  await screen.findByText(/No API keys yet/i);
  fireEvent.click(screen.getByRole("button", { name: "Create API Key" }));
  fireEvent.change(screen.getByRole("textbox", { name: "API key name" }), { target: { value: name } });
  fireEvent.click(screen.getByRole("button", { name: "Create Key" }));
}
function mockSuccessfulCreation() {
  mocks.fetchApi.mockResolvedValueOnce([]).mockResolvedValueOnce(created).mockResolvedValue([metadata]);
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.orgSlug = "graspful";
  mocks.getSession.mockResolvedValue({ data: { session: sessionFor() }, error: null });
  mocks.subscribe.mockReturnValue({ data: { subscription: { unsubscribe: mocks.unsubscribe } } });
});
afterEach(cleanup);

describe("Site API keys page with the shared manager", () => {
  it("creates a named key, closes the dialog, and shows its one-time secret", async () => {
    mockSuccessfulCreation();
    render(<ApiKeysPage />);
    await beginCreation("  Laptop CLI  ");
    expect(await screen.findByText(created.key)).toBeVisible();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByText("Laptop CLI")).toBeVisible();
    expect(mocks.fetchApi).toHaveBeenCalledWith("/orgs/graspful/api-keys", "token-123", {
      method: "POST", body: JSON.stringify({ name: "Laptop CLI" }),
    });
  });

  it("keeps a failed creation visible inside its dialog", async () => {
    mocks.fetchApi.mockResolvedValueOnce([]).mockRejectedValueOnce(new Error("network"));
    render(<ApiKeysPage />);
    await beginCreation();
    expect(await within(screen.getByRole("dialog")).findByRole("alert")).toHaveTextContent("Failed to create API key");
    expect(screen.queryByText(created.key)).not.toBeInTheDocument();
  });

  it.each(["user", "organization", "sign-out"])("clears secrets on %s changes", async (change) => {
    mockSuccessfulCreation();
    const view = render(<ApiKeysPage />);
    await beginCreation();
    await screen.findByText(created.key);
    mocks.fetchApi.mockResolvedValue([]);
    if (change === "organization") {
      mocks.orgSlug = "another-org";
      view.rerender(<ApiKeysPage />);
    } else {
      emitSession(change === "user" ? "SIGNED_IN" : "SIGNED_OUT", change === "user" ? sessionFor("user-two", "token-two") : null);
    }
    expect(screen.queryByText(created.key)).not.toBeInTheDocument();
    expect(screen.queryByText(metadata.name)).not.toBeInTheDocument();
    if (change === "sign-out") expect(screen.getByRole("button", { name: "Create API Key" })).toBeDisabled();
    else await waitFor(() => expect(mocks.fetchApi).toHaveBeenLastCalledWith(
      `/orgs/${mocks.orgSlug}/api-keys`, change === "user" ? "token-two" : "token-123",
    ));
  });

  it("preserves a displayed secret when the same user's token refreshes", async () => {
    mockSuccessfulCreation();
    render(<ApiKeysPage />);
    await beginCreation();
    await screen.findByText(created.key);
    emitSession("TOKEN_REFRESHED", sessionFor("user-one", "refreshed-token"));
    expect(screen.getByText(created.key)).toBeVisible();
    await waitFor(() => expect(mocks.fetchApi).toHaveBeenLastCalledWith("/orgs/graspful/api-keys", "refreshed-token"));
  });

  it("shows a pending creation after token refresh and rejects an older list response", async () => {
    const creation = deferred<typeof created>();
    const oldList = deferred<typeof metadata[]>();
    mocks.fetchApi.mockResolvedValueOnce([]).mockReturnValueOnce(creation.promise).mockReturnValueOnce(oldList.promise).mockResolvedValue([metadata]);
    render(<ApiKeysPage />);
    await beginCreation();
    emitSession("TOKEN_REFRESHED", sessionFor("user-one", "refreshed-token"));
    await act(async () => creation.resolve(created));
    expect(await screen.findByText(created.key)).toBeVisible();
    await screen.findByText(metadata.name);
    await act(async () => oldList.resolve([]));
    expect(screen.getByText(metadata.name)).toBeVisible();
    expect(mocks.fetchApi).toHaveBeenLastCalledWith("/orgs/graspful/api-keys", "refreshed-token");
  });

  it("ignores an old tenant's initial list response", async () => {
    const oldList = deferred<typeof metadata[]>();
    mocks.fetchApi.mockReturnValueOnce(oldList.promise).mockResolvedValue([]);
    const view = render(<ApiKeysPage />);
    await waitFor(() => expect(mocks.fetchApi).toHaveBeenCalledWith("/orgs/graspful/api-keys", "token-123"));
    expect(screen.getByRole("button", { name: "Create API Key" })).toBeDisabled();
    mocks.orgSlug = "another-org";
    view.rerender(<ApiKeysPage />);
    await screen.findByText(/No API keys yet/);
    await act(async () => oldList.resolve([metadata]));
    expect(screen.queryByText(metadata.name)).not.toBeInTheDocument();
  });

  it("discards a previous user's pending creation", async () => {
    const creation = deferred<typeof created>();
    mocks.fetchApi.mockResolvedValueOnce([]).mockReturnValueOnce(creation.promise).mockResolvedValue([]);
    render(<ApiKeysPage />);
    await beginCreation();
    emitSession("SIGNED_IN", sessionFor("user-two", "token-two"));
    await screen.findByText(/No API keys yet/);
    await act(async () => creation.resolve(created));
    expect(screen.queryByText(created.key)).not.toBeInTheDocument();
    expect(mocks.fetchApi).toHaveBeenLastCalledWith("/orgs/graspful/api-keys", "token-two");
  });

  it("preserves creation success when the follow-up list request fails", async () => {
    mocks.fetchApi.mockResolvedValueOnce([]).mockResolvedValueOnce(created).mockRejectedValueOnce(new Error("list failed"));
    render(<ApiKeysPage />);
    await beginCreation();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByText(created.key)).toBeVisible();
    expect(screen.getByRole("alert")).toHaveTextContent("Key created. Could not refresh the list.");
  });

  it("requires confirmation before revoking a key", async () => {
    mocks.fetchApi.mockResolvedValueOnce([metadata]).mockResolvedValueOnce({});
    render(<ApiKeysPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Revoke Laptop CLI" }));
    expect(mocks.fetchApi).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Revoke Key" }));
    await screen.findByText(/No API keys yet/);
    expect(mocks.fetchApi).toHaveBeenLastCalledWith("/orgs/graspful/api-keys/key-1", "token-123", { method: "DELETE" });
  });
});
