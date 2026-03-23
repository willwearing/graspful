import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { MarketingThemeForcer } from "@/components/marketing/theme-forcer";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div data-force-light="" className="min-h-screen bg-background text-foreground">
      <MarketingThemeForcer />
      <MarketingNav />
      <main className="pt-[73px]">{children}</main>
      <MarketingFooter />
    </div>
  );
}
