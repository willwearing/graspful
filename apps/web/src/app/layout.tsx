import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { headers } from "next/headers";
import { BrandProvider } from "@/lib/brand/context";
import { BrandThemeStyle } from "@/lib/brand/theme-style";
import { resolveBrand } from "@/lib/brand/resolve";
import { HostSurfaceProvider } from "@/lib/host-context";
import { getHostSurface, getRequestHost, isLocalHost } from "@/lib/hosts";
import { PostHogProvider } from "@/lib/posthog/provider";
import { DevBrandSwitcher } from "@/components/dev/brand-switcher";
import { ThemeProvider, themeInitScript } from "@/lib/theme/theme-provider";
import { safeJsonLd } from "@/lib/sanitize-json-ld";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const hostname = getRequestHost(headersList);
  const cookieHeader = headersList.get("cookie");
  const brand = await resolveBrand(hostname, cookieHeader);
  const canonicalHost = isLocalHost(hostname) ? brand.domain : hostname;

  return {
    metadataBase: new URL(`https://${canonicalHost}`),
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
      url: `https://${canonicalHost}`,
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
      canonical: `https://${canonicalHost}`,
    },
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const hostname = getRequestHost(headersList);
  const cookieHeader = headersList.get("cookie");
  const brand = await resolveBrand(hostname, cookieHeader);
  const hostSurface = getHostSurface(hostname);
  const canonicalHost = isLocalHost(hostname) ? brand.domain : hostname;

  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <BrandThemeStyle brand={brand} />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <link rel="icon" href={brand.faviconUrl} />
        <link rel="help" href="/llms.txt" type="text/plain" title="LLM instructions" />
        <link rel="help" href="/llms-full.txt" type="text/plain" title="LLM full documentation" />
        <link rel="help" href="/agents.md" type="text/markdown" title="Agent onboarding instructions" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: safeJsonLd({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: brand.name,
              applicationCategory: "EducationalApplication",
              operatingSystem: "Web",
              description: brand.seo.description,
              url: `https://${canonicalHost}`,
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
                description:
                  "Free to create and publish. 70/30 revenue share when learners subscribe.",
              },
              creator: {
                "@type": "Organization",
                name: "Graspful",
                url: "https://graspful.ai",
              },
              featureList: [
                "Adaptive Learning",
                "Spaced Repetition",
                "Knowledge Graphs",
                "AI Agent Integration",
                "White-Label Sites",
                "MCP Server",
              ],
            }),
          }}
        />
      </head>
      <body className="min-h-screen bg-background text-foreground">
        <ThemeProvider>
          <HostSurfaceProvider surface={hostSurface}>
            <BrandProvider brand={brand}>
              <PostHogProvider>{children}</PostHogProvider>
              <DevBrandSwitcher />
            </BrandProvider>
          </HostSurfaceProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
