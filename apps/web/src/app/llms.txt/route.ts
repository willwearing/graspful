import { resolvePageBrand } from "@/lib/brand/resolve";

export interface LlmsTxtInput {
  name: string;
  tagline: string;
  description: string;
  domain: string;
  features: string[];
}

export function generateLlmsTxt(input: LlmsTxtInput): string {
  const lines = [
    `# ${input.name}`,
    "",
    `> ${input.tagline}`,
    "",
    input.description,
    "",
    `## What ${input.name} Offers`,
    "",
    ...input.features.map((f) => `- ${f}`),
    "",
    `## Links`,
    "",
    `- Website: https://${input.domain}`,
    `- AI Agents: https://${input.domain}/agents`,
    `- Documentation: https://${input.domain}/docs`,
    `- Quickstart: https://${input.domain}/docs/quickstart`,
    `- Pricing: https://${input.domain}/pricing`,
    `- Sign Up: https://${input.domain}/sign-up`,
  ];
  return lines.join("\n");
}

export async function GET() {
  const brand = await resolvePageBrand();

  // Handle both shapes: { heading, subheading, items } (current) or raw array (legacy)
  const featureItems = brand.landing.features.items || brand.landing.features;
  const features = Array.isArray(featureItems)
    ? featureItems.map((f: any) => `${f.title}: ${f.description}`)
    : [];

  const content = generateLlmsTxt({
    name: brand.name,
    tagline: brand.tagline,
    description: brand.seo.description,
    domain: brand.domain,
    features,
  });

  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
