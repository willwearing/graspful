import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ApiKeysPage from "../page";

const getSession = vi.fn();
const apiClientFetch = vi.fn();

vi.mock("@/lib/contexts/creator-org-context", () => ({
  useCreatorOrg: () => ({ orgSlug: "graspful" }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({
    auth: {
      getSession,
    },
  }),
}));

vi.mock("@/lib/api-client", () => ({
  apiClientFetch: (...args: unknown[]) => apiClientFetch(...args),
}));

describe("ApiKeysPage", () => {
  beforeEach(() => {
    getSession.mockReset();
    apiClientFetch.mockReset();
    getSession.mockResolvedValue({
      data: { session: { access_token: "token-123" } },
    });
  });

  it("creates a key, closes the dialog, and shows the new key", async () => {
    apiClientFetch
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce({ key: "gsk_test_key", id: "key-1" })
      .mockResolvedValueOnce([
        {
          id: "key-1",
          name: "My Laptop CLI",
          keyPrefix: "gsk_test_key",
          createdAt: "2026-03-30T00:00:00.000Z",
          lastUsedAt: null,
          expiresAt: null,
        },
      ]);

    render(<ApiKeysPage />);

    await screen.findByText(/No API keys yet/i);

    fireEvent.click(screen.getByRole("button", { name: /Create API Key/i }));
    fireEvent.change(screen.getByPlaceholderText("e.g. My Laptop CLI"), {
      target: { value: "My Laptop CLI" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Create Key$/i }));

    await screen.findByText(/Your new API key \(shown once\):/i);
    await screen.findByText("gsk_test_key");

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /Create API Key/i })).not.toBeInTheDocument();
    });

    expect(screen.getByText("My Laptop CLI")).toBeVisible();
    expect(apiClientFetch).toHaveBeenNthCalledWith(
      2,
      "/orgs/graspful/api-keys",
      "token-123",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ name: "My Laptop CLI" }),
      })
    );
  });

  it("shows an inline error when creation fails", async () => {
    apiClientFetch
      .mockResolvedValueOnce([])
      .mockRejectedValueOnce(new Error("boom"));

    render(<ApiKeysPage />);

    await screen.findByText(/No API keys yet/i);

    fireEvent.click(screen.getByRole("button", { name: /Create API Key/i }));
    fireEvent.change(screen.getByPlaceholderText("e.g. My Laptop CLI"), {
      target: { value: "Broken key" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Create Key$/i }));

    expect(await screen.findByText(/Could not create API key\. Try again\./i)).toBeVisible();
  });
});
