import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SiteFooter } from "@/components/site/footer";
import { SiteHeader } from "@/components/site/header";
import { FeedbackBanner } from "@/components/site/feedback-banner";
import { siteName } from "@/lib/site-config";
import { ThemeProvider, themeInitScript } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: `${siteName} - Services and guidance`,
    template: `%s | ${siteName}`,
  },
  description:
    "Graspful is the platform for serious adaptive courses, creator operations, and learner guidance.",
  openGraph: {
    title: `${siteName} - Services and guidance`,
    description:
      "Build, publish, and run adaptive learning products with a product site that looks like a product site.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <ThemeProvider>
          <SiteHeader />
          {children}
          <FeedbackBanner />
          <SiteFooter />
        </ThemeProvider>
      </body>
    </html>
  );
}
