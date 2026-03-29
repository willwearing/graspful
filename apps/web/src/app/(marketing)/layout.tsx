import Script from "next/script";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { MarketingThemeForcer } from "@/components/marketing/theme-forcer";

const forceLight = `(function(){var s=localStorage.getItem("theme-preference");if(!s){document.documentElement.classList.remove("dark");document.documentElement.style.colorScheme="light";document.body.style.background="#fff";document.body.style.color="#0F172A"}})()`;

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <Script id="force-light" strategy="beforeInteractive">{forceLight}</Script>
      <MarketingThemeForcer />
      <MarketingNav />
      <main className="pt-[73px]">{children}</main>
      <MarketingFooter />
    </div>
  );
}
