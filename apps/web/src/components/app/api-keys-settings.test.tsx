import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiKeysSettings } from "./api-keys-settings";

const fetchApi = vi.hoisted(() => vi.fn());
const auth = vi.hoisted(() => ({ token: "user-one", userId: "user-one" }));
vi.mock("@/lib/api-client", () => ({ apiClientFetch: fetchApi }));
vi.mock("@/lib/hooks/use-auth-token", () => ({ useAuthSession: () => ({ access_token: auth.token, user: { id: auth.userId } }) }));
const metadata = { id: "key-1", name: "CLI key", keyPrefix: "gsk_abcd", createdAt: "2026-01-01", lastUsedAt: null, expiresAt: null };

beforeEach(() => { fetchApi.mockReset(); auth.token = "user-one"; auth.userId = "user-one"; });
describe("shared API key manager", () => {
  it("creates a named key, shows its one-time secret, and confirms revocation", async () => {
    fetchApi.mockResolvedValueOnce([]).mockResolvedValueOnce({ key: "gsk_secret", id: "key-1" }).mockResolvedValueOnce([metadata]).mockResolvedValueOnce({});
    render(<ApiKeysSettings orgId="org-one" />);
    await screen.findByText(/No API keys yet/);
    fireEvent.click(screen.getByRole("button", { name: "Create API Key" }));
    fireEvent.change(screen.getByRole("textbox", { name: "API key name" }), { target: { value: "  CLI key  " } });
    fireEvent.click(screen.getByRole("button", { name: "Create Key" }));
    expect(await screen.findByText("gsk_secret")).toBeVisible();
    expect(fetchApi).toHaveBeenCalledWith("/orgs/org-one/api-keys", "user-one", { method: "POST", body: JSON.stringify({ name: "CLI key" }) });
    fireEvent.click(await screen.findByRole("button", { name: "Revoke CLI key" }));
    expect(fetchApi.mock.calls.filter(([, , options]) => options?.method === "DELETE")).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "Revoke Key" }));
    await waitFor(() => expect(fetchApi).toHaveBeenCalledWith("/orgs/org-one/api-keys/key-1", "user-one", { method: "DELETE" }));
    await screen.findByText(/No API keys yet/);
  });

  it("shows load errors instead of reporting an empty successful list", async () => {
    fetchApi.mockRejectedValue(new Error("network"));
    render(<ApiKeysSettings orgId="org-one" />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Failed to load API keys");
  });

  it("ignores an old tenant response after changing organization", async () => {
    let resolveOld!: (value: unknown) => void;
    fetchApi.mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; })).mockResolvedValueOnce([]);
    const view = render(<ApiKeysSettings orgId="org-one" />);
    view.rerender(<ApiKeysSettings orgId="org-two" />);
    await screen.findByText(/No API keys yet/);
    await act(async () => resolveOld([metadata]));
    expect(screen.queryByText("CLI key")).not.toBeInTheDocument();
  });

  it("clears one-time secrets when the session changes", async () => {
    fetchApi.mockResolvedValueOnce([]).mockResolvedValueOnce({ key: "gsk_secret", id: "key-1" }).mockResolvedValueOnce([metadata]).mockResolvedValue([]);
    const view = render(<ApiKeysSettings orgId="org-one" />);
    await screen.findByText(/No API keys yet/);
    fireEvent.click(screen.getByRole("button", { name: "Create API Key" }));
    fireEvent.change(screen.getByRole("textbox", { name: "API key name" }), { target: { value: "CLI key" } });
    fireEvent.click(screen.getByRole("button", { name: "Create Key" }));
    await screen.findByText("gsk_secret");
    auth.token = "user-two";
    auth.userId = "user-two";
    view.rerender(<ApiKeysSettings orgId="org-one" />);
    expect(screen.queryByText("gsk_secret")).not.toBeInTheDocument();
    await waitFor(() => expect(fetchApi).toHaveBeenCalledWith("/orgs/org-one/api-keys", "user-two"));
  });
});

it("preserves the one-time secret across a token refresh for the same user", async () => {
  fetchApi.mockResolvedValueOnce([]).mockResolvedValueOnce({ key: "gsk_secret", id: "key-1" }).mockResolvedValue([metadata]);
  const view = render(<ApiKeysSettings orgId="org-one" />);
  await screen.findByText(/No API keys yet/);
  fireEvent.click(screen.getByRole("button", { name: "Create API Key" }));
  fireEvent.change(screen.getByRole("textbox", { name: "API key name" }), { target: { value: "CLI key" } });
  fireEvent.click(screen.getByRole("button", { name: "Create Key" }));
  await screen.findByText("gsk_secret");
  auth.token = "user-one-refreshed";
  view.rerender(<ApiKeysSettings orgId="org-one" />);
  expect(screen.getByText("gsk_secret")).toBeInTheDocument();
});

it("reports creation success if refreshing the list fails", async () => {
  fetchApi.mockResolvedValueOnce([]).mockResolvedValueOnce({ key: "gsk_secret", id: "key-1" }).mockRejectedValueOnce(new Error("list failed"));
  render(<ApiKeysSettings orgId="org-one" />);
  await screen.findByText(/No API keys yet/);
  fireEvent.click(screen.getByRole("button", { name: "Create API Key" }));
  fireEvent.change(screen.getByRole("textbox", { name: "API key name" }), { target: { value: "CLI key" } });
  fireEvent.click(screen.getByRole("button", { name: "Create Key" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(screen.getByText("gsk_secret")).toBeVisible();
  expect(screen.getByRole("alert")).toHaveTextContent("Key created. Could not refresh the list.");
});

it("waits for the initial key list before allowing creation", async () => {
  fetchApi.mockReturnValue(new Promise(() => {}));
  render(<ApiKeysSettings orgId="org-one" />);
  expect(screen.getByRole("button", { name: "Create API Key" })).toBeDisabled();
});

it("shows a created secret when the access token refreshes while creation is pending", async () => {
  let finishCreate!: (value: { key: string; id: string }) => void;
  fetchApi.mockResolvedValueOnce([]).mockImplementationOnce(() => new Promise((resolve) => { finishCreate = resolve; })).mockResolvedValue([]);
  const view = render(<ApiKeysSettings orgId="org-one" />);
  await screen.findByText(/No API keys yet/);
  fireEvent.click(screen.getByRole("button", { name: "Create API Key" }));
  fireEvent.change(screen.getByRole("textbox", { name: "API key name" }), { target: { value: "CLI key" } });
  fireEvent.click(screen.getByRole("button", { name: "Create Key" }));
  auth.token = "user-one-refreshed";
  view.rerender(<ApiKeysSettings orgId="org-one" />);
  await act(async () => finishCreate({ key: "gsk_pending_secret", id: "key-1" }));
  expect(await screen.findByText("gsk_pending_secret")).toBeVisible();
  expect(fetchApi).toHaveBeenLastCalledWith("/orgs/org-one/api-keys", "user-one-refreshed");
});

it("shows a failed create request inside the open dialog", async () => {
  fetchApi.mockResolvedValueOnce([]).mockRejectedValueOnce(new Error("create failed"));
  render(<ApiKeysSettings orgId="org-one" />);
  await screen.findByText(/No API keys yet/);
  fireEvent.click(screen.getByRole("button", { name: "Create API Key" }));
  fireEvent.change(screen.getByRole("textbox", { name: "API key name" }), { target: { value: "CLI key" } });
  fireEvent.click(screen.getByRole("button", { name: "Create Key" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Failed to create API key");
  expect(screen.getByRole("dialog")).toContainElement(screen.getByRole("alert"));
});

it("keeps a failed revocation visible inside its confirmation dialog", async () => {
  fetchApi.mockResolvedValueOnce([metadata]).mockRejectedValueOnce(new Error("revoke failed"));
  render(<ApiKeysSettings orgId="org-one" />);
  fireEvent.click(await screen.findByRole("button", { name: "Revoke CLI key" }));
  fireEvent.click(screen.getByRole("button", { name: "Revoke Key" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Failed to revoke API key");
  expect(screen.getByRole("dialog")).toContainElement(screen.getByRole("alert"));
});

it("ignores a stale list error after a successful post-create refresh", async () => {
  let finishCreate!: (value: { key: string; id: string }) => void;
  let failOldList!: (error: Error) => void;
  fetchApi.mockResolvedValueOnce([])
    .mockImplementationOnce(() => new Promise((resolve) => { finishCreate = resolve; }))
    .mockImplementationOnce(() => new Promise((_resolve, reject) => { failOldList = reject; }))
    .mockResolvedValue([metadata]);
  const view = render(<ApiKeysSettings orgId="org-one" />);
  await screen.findByText(/No API keys yet/);
  fireEvent.click(screen.getByRole("button", { name: "Create API Key" }));
  fireEvent.change(screen.getByRole("textbox", { name: "API key name" }), { target: { value: "CLI key" } });
  fireEvent.click(screen.getByRole("button", { name: "Create Key" }));
  auth.token = "user-one-refreshed";
  view.rerender(<ApiKeysSettings orgId="org-one" />);
  await act(async () => finishCreate({ key: "gsk_pending_secret", id: "key-1" }));
  await screen.findByText("gsk_pending_secret");
  await act(async () => failOldList(new Error("stale failure")));
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(screen.getByText("CLI key")).toBeVisible();
});
