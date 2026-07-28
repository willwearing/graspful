import type { Metadata } from "next";
import { AppShell } from "@/components/app/app-shell";
import { privatePageRobots } from "@/lib/seo/surface-indexing";

export const metadata: Metadata = {
  robots: privatePageRobots,
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
