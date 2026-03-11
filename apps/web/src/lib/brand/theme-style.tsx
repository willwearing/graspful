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

  const css = `
    :root {
      ${lightVars}
      --radius: ${brand.theme.radius};
    }
    .dark {
      ${darkVars}
    }
  `;

  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
