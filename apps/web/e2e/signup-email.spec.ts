import { signupEmailTests } from "./helpers/signup-email-tests";

for (const brand of [
  { id: "posthog", name: "PostHog TAM", destination: "/dashboard" },
  { id: "firefighter", name: "FirefighterPrep", destination: "/dashboard" },
  { id: "electrician", name: "ElectricianPrep", destination: "/dashboard" },
  { id: "javascript", name: "JSPrep", destination: "/dashboard" },
]) signupEmailTests(brand);
