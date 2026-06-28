import { describe, it, expect, beforeEach, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AuthForm } from "@/components/auth/auth-form";
import { BrandProvider } from "@/lib/brand/context";
import { defaultBrand } from "@/lib/brand/defaults";

const mockSignUp = vi.fn();
const mockSignIn = vi.fn();
const mockPush = vi.fn();
const mockRefresh = vi.fn();
const mockApiClientFetch = vi.fn();
let mockSearchParams = "";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
  useSearchParams: () => new URLSearchParams(mockSearchParams),
}));

vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({
    auth: {
      signUp: (...args: unknown[]) => mockSignUp(...args),
      signInWithPassword: (...args: unknown[]) => mockSignIn(...args),
    },
  }),
}));

vi.mock("@/lib/posthog/events", () => ({
  trackSignUp: vi.fn(),
  trackSignIn: vi.fn(),
}));

vi.mock("@/lib/api-client", () => ({
  apiClientFetch: (...args: unknown[]) => mockApiClientFetch(...args),
}));

describe("AuthForm", () => {
  beforeEach(() => {
    mockSearchParams = "";
    mockSignUp.mockReset();
    mockSignIn.mockReset();
    mockPush.mockReset();
    mockRefresh.mockReset();
    mockApiClientFetch.mockReset();
  });

  it("replaces the sign-up form with a confirmation state when email verification is required", async () => {
    mockSignUp.mockResolvedValue({
      data: { session: null },
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

    expect(screen.getByText("Check your email for a confirmation link.")).toBeInTheDocument();
    expect(
      screen.getByText((content, node) =>
        node?.textContent === "We sent a confirmation link to willwearing+test123@gmail.com."
      )
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Email")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Password")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Create Account" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to sign in" })).toHaveAttribute(
      "href",
      "/sign-in?redirect=%2Fdashboard&email=willwearing%2Btest123%40gmail.com",
    );
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
});
