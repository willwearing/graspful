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
    title: {
      default: brand.seo.title,
      template: `%s | ${brand.name}`,
    },
    description: brand.seo.description,
    keywords: brand.seo.keywords,
    authors: [{ name: brand.name }],
    creator: brand.name,
    publisher: brand.name,
    openGraph: {
      type: "website",
      locale: "en_US",
      url: `https://${brand.domain}`,
      siteName: brand.name,
      title: brand.seo.title,
      description: brand.seo.description,
      ...(brand.ogImageUrl
        ? {
            images: [
              {
                url: brand.ogImageUrl,
                width: 1200,
                height: 630,
                alt: brand.seo.title,
              },
            ],
          }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: brand.seo.title,
      description: brand.seo.description,
      ...(brand.ogImageUrl ? { images: [brand.ogImageUrl] } : {}),
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    alternates: {
      canonical: `https://${brand.domain}`,
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
