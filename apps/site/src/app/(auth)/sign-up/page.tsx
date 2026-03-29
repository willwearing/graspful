import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = {
  title: "Sign Up",
  description: "Create a free Graspful account. Build adaptive learning courses with AI agents.",
  robots: { index: false, follow: true },
};

export default function SignUpPage() {
  return <AuthForm mode="sign-up" />;
}
