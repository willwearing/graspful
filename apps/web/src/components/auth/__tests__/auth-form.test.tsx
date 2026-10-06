import { describe, it, expect, beforeEach, vi } from "vitest";
import { StrictMode } from "react";
import { renderToString } from "react-dom/server";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AuthForm } from "@/components/auth/auth-form";
import { BrandProvider } from "@/lib/brand/context";
import { defaultBrand } from "@/lib/brand/defaults";

const mockSignUp = vi.fn();
const mockSignIn = vi.fn();
const mockResend = vi.fn();
const mockPush = vi.fn();
const mockRefresh = vi.fn();
const mockApiClientFetch = vi.fn();
const mockTrackAuthFormEvent = vi.fn();
let mockSearchParams = "";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
  useSearchParams: () => new URLSearchParams(mockSearchParams),
}));

vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({
    auth: {
      signUp: (...args: unknown[]) => mockSignUp(...args),
      resend: (...args: unknown[]) => mockResend(...args),
      signInWithPassword: (...args: unknown[]) => mockSignIn(...args),
    },
  }),
}));

vi.mock("@/lib/posthog/events", () => ({
  trackSignUp: vi.fn(),
  trackSignIn: vi.fn(),
  trackAuthFormEvent: (...args: unknown[]) => mockTrackAuthFormEvent(...args),
}));

vi.mock("@/lib/api-client", () => ({
  apiClientFetch: (...args: unknown[]) => mockApiClientFetch(...args),
}));

describe("AuthForm", () => {
  beforeEach(() => {
    mockSearchParams = "";
    mockSignUp.mockReset();
    mockSignIn.mockReset();
    mockResend.mockReset();
    mockPush.mockReset();
    mockRefresh.mockReset();
    mockApiClientFetch.mockReset();
    mockTrackAuthFormEvent.mockReset();
  });

  it("keeps server-rendered form controls disabled until hydration attaches handlers", () => {
    const markup = renderToString(<BrandProvider brand={defaultBrand}><AuthForm mode="sign-in" /></BrandProvider>);
    const container = document.createElement("div");
    container.innerHTML = markup;
    expect(container.querySelector<HTMLInputElement>("#email")?.disabled).toBe(true);
    expect(container.querySelector<HTMLInputElement>("#password")?.disabled).toBe(true);
    expect(container.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(true);
  });

  it("uses free-account copy and tracks the first signup interaction once", () => {
    render(
      <BrandProvider brand={defaultBrand}>
        <AuthForm mode="sign-up" />
      </BrandProvider>
    );

    expect(
      screen.getByText(
        "Create a free Graspful account. No credit card required.",
      ),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "person@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "password123" },
    });

    expect(mockTrackAuthFormEvent.mock.calls.filter((call) => call[1] === "started")).toHaveLength(1);
    expect(mockTrackAuthFormEvent).toHaveBeenCalledWith("sign-up", "started", "graspful");
  });

  it.each([undefined, { id: "obfuscated-existing-user", identities: [] }])("shows neutral confirmation and recovery options for new and existing accounts (%j)", async (user) => {
    mockSignUp.mockResolvedValue({
      data: { session: null, user },
      error: null,
    });

    render(
      <BrandProvider brand={defaultBrand}>
        <AuthForm mode="sign-up" />
      </BrandProvider>
    );

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "willwearing+test123@gmail.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "StrongPassw0rd!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Account" }));

    await waitFor(() => {
      expect(screen.getByText("Check your email")).toBeInTheDocument();
    });

    expect(screen.getByText("Check your email or sign in to your existing account.")).toBeInTheDocument();
    expect(
      screen.getByText((content, node) =>
        node?.textContent === "If your account needs confirmation, check willwearing+test123@gmail.com for a link. Check your spam folder too."
      )
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Email")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Password")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Create Account" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to sign in" })).toHaveAttribute(
      "href",
      "/sign-in?redirect=%2Fdashboard&email=willwearing%2Btest123%40gmail.com",
    );
    expect(screen.queryByText(/We sent a confirmation link/)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Reset password" })).toHaveAttribute("href", "/forgot-password?email=willwearing%2Btest123%40gmail.com");
    mockResend.mockResolvedValueOnce({ error: new Error("Email rate limit exceeded") });
    fireEvent.click(screen.getByRole("button", { name: "Resend confirmation link" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Email rate limit exceeded");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Resend confirmation link" })).toBeEnabled();
    mockResend.mockResolvedValueOnce({ error: null });
    fireEvent.click(screen.getByRole("button", { name: "Resend confirmation link" }));
    expect(await screen.findByRole("status")).toHaveTextContent("a new link has been requested");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Wait 60 seconds/ })).toBeDisabled();
    expect(mockResend).toHaveBeenLastCalledWith({
      type: "signup", email: "willwearing+test123@gmail.com",
      options: { emailRedirectTo: "http://localhost:3000/auth/callback?redirect=%2Fdashboard" },
    });
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockRefresh).not.toHaveBeenCalled();
    expect(mockSignUp).toHaveBeenCalledWith({
      email: "willwearing+test123@gmail.com",
      password: "StrongPassw0rd!",
      options: {
        emailRedirectTo: "http://localhost:3000/auth/callback?redirect=%2Fdashboard",
      },
    });
  });

  it("provisions the personal org and auto-joins the brand org on sign-in", async () => {
    mockSearchParams = "redirect=%2Flearn%2Fposthog-tam";
    mockSignIn.mockResolvedValue({
      data: {
        session: {
          user: { id: "user-1" },
          access_token: "token-1",
        },
      },
      error: null,
    });
    mockApiClientFetch.mockResolvedValue({});

    render(
      <BrandProvider brand={defaultBrand}>
        <AuthForm mode="sign-in" />
      </BrandProvider>
    );

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "learner@test.example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "StrongPassw0rd!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() => {
      expect(mockApiClientFetch).toHaveBeenCalledTimes(1);
    });

    expect(mockApiClientFetch).toHaveBeenCalledWith("/auth/provision", "token-1", {
      method: "POST",
      body: JSON.stringify({ brandOrgSlug: defaultBrand.orgSlug }),
    });
    expect(mockPush).toHaveBeenCalledWith("/learn/posthog-tam");
  });

  it("shows an inline error instead of submitting when credentials are missing", async () => {
    render(
      <BrandProvider brand={defaultBrand}>
        <AuthForm mode="sign-in" />
      </BrandProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));

    expect(
      await screen.findByText(
        "Enter your email and password to sign in, or create an account if you're new.",
      ),
    ).toBeInTheDocument();
    expect(mockSignIn).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("preserves redirect and typed email when switching auth modes", () => {
    mockSearchParams = "redirect=%2Flearn%2Fposthog-tam%2Facademies%2Ftam";

    render(
      <BrandProvider brand={defaultBrand}>
        <AuthForm mode="sign-in" />
      </BrandProvider>
    );

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "learner@test.example.com" },
    });

    const createAccountLink = screen.getByRole("button", {
      name: "Create account instead",
    });
    expect(createAccountLink).toHaveAttribute(
      "href",
      "/sign-up?redirect=%2Flearn%2Fposthog-tam%2Facademies%2Ftam&email=learner%40test.example.com",
    );
  });

  it("records one form view under StrictMode and one start across field edits", () => {
    render(<StrictMode><BrandProvider brand={defaultBrand}><AuthForm mode="sign-in" /></BrandProvider></StrictMode>);
    expect(mockTrackAuthFormEvent.mock.calls.filter((call) => call[1] === "viewed")).toEqual([
      ["sign-in", "viewed", "graspful"],
    ]);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "person@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password123" } });
    expect(mockTrackAuthFormEvent.mock.calls.filter((call) => call[1] === "started")).toHaveLength(1);
  });

  it("classifies validation failures without submitting", () => {
    render(<BrandProvider brand={defaultBrand}><AuthForm mode="sign-in" /></BrandProvider>);
    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Enter your email and password");
    expect(mockTrackAuthFormEvent).toHaveBeenCalledWith("sign-in", "failed", "graspful", "validation");
    expect(mockTrackAuthFormEvent.mock.calls.some((call) => call[1] === "submitted")).toBe(false);
  });

  it("restores the button after an auth failure and allows a successful retry", async () => {
    mockSignIn.mockRejectedValueOnce(new Error("Invalid login credentials"))
      .mockResolvedValueOnce({ data: { session: { user: { id: "user-1" }, access_token: "token-1" } }, error: null });
    mockApiClientFetch.mockResolvedValue({});
    render(<BrandProvider brand={defaultBrand}><AuthForm mode="sign-in" /></BrandProvider>);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "person@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid login credentials");
    expect(screen.getByRole("button", { name: "Sign In" })).toBeEnabled();
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockTrackAuthFormEvent).toHaveBeenCalledWith("sign-in", "failed", "graspful", "authentication");
    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/dashboard"));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(mockTrackAuthFormEvent.mock.calls.filter((call) => call[1] === "submitted")).toHaveLength(2);
  });
});


it.each(['forgot', 'reset'])('keeps %s password controls disabled until hydration', async (mode) => {
  const { default: Page } = mode === 'forgot'
    ? await import('@/app/(marketing)/forgot-password/page')
    : await import('@/app/(marketing)/reset-password/page');
  const container = document.createElement('div');
  container.innerHTML = renderToString(<BrandProvider brand={defaultBrand}><Page /></BrandProvider>);
  for (const input of container.querySelectorAll<HTMLInputElement>('input')) expect(input.disabled).toBe(true);
  expect(container.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(true);
});
