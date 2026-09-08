import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BillingSettings } from "@/components/app/billing-settings";
import { apiClientFetch } from "@/lib/api-client";
import { useAuthToken } from "@/lib/hooks/use-auth-token";
import { trackBillingPortalOpened, trackCheckoutInitiated } from "@/lib/posthog/events";

vi.mock("@/lib/api-client", () => ({ apiClientFetch: vi.fn() }));
vi.mock("@/lib/hooks/use-auth-token", () => ({ useAuthToken: vi.fn() }));
vi.mock("@/lib/posthog/events", () => ({
  trackCheckoutInitiated: vi.fn(),
  trackBillingPortalOpened: vi.fn(),
}));

const freeSubscription = {
  plan: "free",
  status: "active",
  trialEndsAt: null,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  maxMembers: 1,
  billing: { checkoutAvailable: false, portalAvailable: false },
};

const fetchMock = vi.mocked(apiClientFetch);

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(useAuthToken).mockReturnValue("auth-token");
});

describe("BillingSettings", () => {
  it("keeps subscription details pending until authentication is available", () => {
    vi.mocked(useAuthToken).mockReturnValue(null);
    render(<BillingSettings orgId="org-1" />);

    expect(screen.getByText("Loading subscription details...")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.queryByText("free")).not.toBeInTheDocument();
  });

  it("shows a load error and retries without inventing a free subscription", async () => {
    fetchMock.mockRejectedValueOnce(new Error("Unavailable"));
    render(<BillingSettings orgId="org-1" />);

    expect(await screen.findByRole("alert")).toHaveTextContent("We could not load your subscription details.");
    expect(screen.queryByText("Current plan")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /upgrade|manage subscription/i })).not.toBeInTheDocument();

    fetchMock.mockResolvedValueOnce({ ...freeSubscription, plan: "team" });
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByText("team")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it.each([false, undefined])("hides the paid CTA when checkout readiness is %s", async (available) => {
    fetchMock.mockResolvedValueOnce({
      ...freeSubscription,
      billing: available === undefined ? undefined : { checkoutAvailable: available, portalAvailable: false },
    });
    render(<BillingSettings orgId="org-1" />);

    expect(await screen.findByText("Paid subscriptions are not available yet.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /upgrade/i })).not.toBeInTheDocument();
  });

  it.each([false, undefined])("hides management when portal readiness is %s", async (available) => {
    fetchMock.mockResolvedValueOnce({
      ...freeSubscription,
      plan: "individual",
      billing: available === undefined ? undefined : { checkoutAvailable: true, portalAvailable: available },
    });
    render(<BillingSettings orgId="org-1" />);

    expect(await screen.findByText("Subscription management is not available yet.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /manage subscription/i })).not.toBeInTheDocument();
  });

  it.each([
    {
      plan: "free",
      button: "Upgrade to Individual",
      pending: "Opening checkout...",
      endpoint: "checkout",
      payload: { plan: "individual", returnUrl: "/settings" },
      error: "We could not open checkout. Please try again.",
      tracking: trackCheckoutInitiated,
      trackingArgs: ["individual"],
    },
    {
      plan: "team",
      button: "Manage subscription",
      pending: "Opening subscription management...",
      endpoint: "portal",
      payload: { returnUrl: "/settings" },
      error: "We could not open subscription management. Please try again.",
      tracking: trackBillingPortalOpened,
      trackingArgs: [],
    },
  ])("handles pending, failure, and retry for $endpoint", async ({ plan, button, pending, endpoint, payload, error, tracking, trackingArgs }) => {
    fetchMock.mockResolvedValueOnce({
      ...freeSubscription,
      plan,
      billing: { checkoutAvailable: true, portalAvailable: true },
    });
    render(<BillingSettings orgId="org-1" />);
    const actionButton = await screen.findByRole("button", { name: button });
    let rejectAction!: (reason: Error) => void;
    fetchMock.mockImplementationOnce(() => new Promise((_, reject) => { rejectAction = reject; }));

    fireEvent.click(actionButton);

    expect(screen.getByRole("button", { name: pending })).toBeDisabled();
    expect(tracking).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenLastCalledWith(`/orgs/org-1/billing/${endpoint}`, "auth-token", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    fireEvent.click(screen.getByRole("button", { name: pending }));
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await act(async () => { rejectAction(new Error("Unavailable")); });

    expect(screen.getByRole("alert")).toHaveTextContent(error);
    expect(screen.getByRole("button", { name: button })).toBeEnabled();
    expect(tracking).not.toHaveBeenCalled();

    // A hash URL exercises the redirect without leaving the test document.
    fetchMock.mockResolvedValueOnce({ url: `#${endpoint}` });
    fireEvent.click(screen.getByRole("button", { name: button }));

    await waitFor(() => expect(tracking).toHaveBeenCalledWith(...trackingArgs));
    expect(window.location.hash).toBe(`#${endpoint}`);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("does not accept an older organization's subscription response", async () => {
    let resolveOld!: (value: unknown) => void;
    fetchMock.mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; }));
    const { rerender } = render(<BillingSettings orgId="org-1" />);

    fetchMock.mockResolvedValueOnce({ ...freeSubscription, plan: "team" });
    rerender(<BillingSettings orgId="org-2" />);
    expect(await screen.findByText("team")).toBeInTheDocument();

    await act(async () => { resolveOld(freeSubscription); });

    expect(screen.getByText("team")).toBeInTheDocument();
    expect(screen.queryByText("free")).not.toBeInTheDocument();
  });
});
