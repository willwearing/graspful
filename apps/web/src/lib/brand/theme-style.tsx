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

  const { gradient } = brand.theme;
  const css = `
    :root {
      ${lightVars}
      --radius: ${brand.theme.radius};
      --gradient-start: ${gradient.start};
      --gradient-mid: ${gradient.mid};
      --gradient-end: ${gradient.end};
      --gradient-accent: ${gradient.accent};
    }
    .dark {
      ${darkVars}
    }
    [data-force-light] {
      ${lightVars}
      color-scheme: light;
    }
  `;

  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
