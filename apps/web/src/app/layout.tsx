import type { Metadata } from "next";
import { Suspense } from "react";
import { Inter } from "next/font/google";
import { headers } from "next/headers";
import { BrandProvider } from "@/lib/brand/context";
import { BrandThemeStyle } from "@/lib/brand/theme-style";
import { resolveBrand } from "@/lib/brand/resolve";
import { PostHogProvider } from "@/lib/posthog/provider";
import { DevBrandSwitcher } from "@/components/dev/brand-switcher";
import { ThemeProvider, themeInitScript } from "@/lib/theme/theme-provider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const hostname = headersList.get("host") || "localhost";
  const cookieHeader = headersList.get("cookie");
  const brand = await resolveBrand(hostname, cookieHeader);

  return {
    metadataBase: new URL(`https://${brand.domain}`),
    title: brand.seo.title,
    description: brand.seo.description,
    keywords: brand.seo.keywords,
    openGraph: {
      type: "website",
      title: brand.seo.title,
      description: brand.seo.description,
      ...(brand.ogImageUrl ? { images: [{ url: brand.ogImageUrl }] } : {}),
    },
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const hostname = headersList.get("host") || "localhost";
  const cookieHeader = headersList.get("cookie");
  const brand = await resolveBrand(hostname, cookieHeader);

  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <BrandThemeStyle brand={brand} />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <link rel="icon" href={brand.faviconUrl} />
      </head>
      <body className="min-h-screen bg-background text-foreground">
        <ThemeProvider>
          <BrandProvider brand={brand}>
            <Suspense fallback={null}>
              <PostHogProvider>{children}</PostHogProvider>
            </Suspense>
            <DevBrandSwitcher />
          </BrandProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
