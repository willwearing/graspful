import Link from "next/link";
import { footerLinks, siteName } from "@/lib/site-config";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/30 bg-background">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-8 sm:grid-cols-3">
          <div>
            <span className="text-lg font-bold text-foreground tracking-tight">
              {siteName}
            </span>
            <p className="mt-2 text-sm text-muted-foreground max-w-xs">
              Turn your expertise into adaptive courses that prove students
              actually learned.
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Product
            </p>
            <ul className="space-y-2 list-none p-0 m-0">
              {footerLinks.product.map((link) => (
                <li key={link.title}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors no-underline"
                  >
                    {link.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Resources
            </p>
            <ul className="space-y-2 list-none p-0 m-0">
              {footerLinks.resources.map((link) => (
                <li key={link.title}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors no-underline"
                  >
                    {link.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-10 border-t border-border/30 pt-6 text-center">
          <p className="text-xs text-muted-foreground/60">
            &copy; {new Date().getFullYear()} {siteName}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
