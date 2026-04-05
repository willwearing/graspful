import type { BrandConfig } from "./config";

function camelToKebab(str: string): string {
  return str.replace(/([A-Z])/g, "-$1").toLowerCase();
}

export function BrandThemeStyle({ brand }: { brand: BrandConfig }) {
  const lightVars = Object.entries(brand.theme.light)
    .map(([key, value]) => `--${camelToKebab(key)}: hsl(${value});`)
    .join("\n    ");

  const darkVars = Object.entries(brand.theme.dark)
    .map(([key, value]) => `--${camelToKebab(key)}: hsl(${value});`)
    .join("\n    ");

  const gradient = brand.theme.gradient;
  const radius = brand.theme.radius ?? "0.5rem";
  const gradientStart = gradient?.start ?? "#6366F1";
  const gradientMid = gradient?.mid ?? "#8B5CF6";
  const gradientEnd = gradient?.end ?? "#A855F7";
  const gradientAccent = gradient?.accent ?? "#22D3EE";

  const css = `
    :root {
      ${lightVars}
      --radius: ${radius};
      --gradient-start: ${gradientStart};
      --gradient-mid: ${gradientMid};
      --gradient-end: ${gradientEnd};
      --gradient-accent: ${gradientAccent};
    }
    .dark {
      ${darkVars}
    }
  `;

  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
