"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-8">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-lg font-bold text-foreground no-underline">
              Graspful
            </Link>
            <nav className="flex items-center gap-4">
              <Link href="/creator" className="text-sm text-muted-foreground hover:text-foreground no-underline transition-colors">
                Dashboard
              </Link>
              <Link href="/creator/api-keys" className="text-sm text-muted-foreground hover:text-foreground no-underline transition-colors">
                API Keys
              </Link>
              <Link href="/creator/manage" className="text-sm text-muted-foreground hover:text-foreground no-underline transition-colors">
                New Course
              </Link>
            </nav>
          </div>
          <button
            onClick={handleSignOut}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
