# Brand YAML Files

Brand configurations define white-label landing pages, themes, pricing, and SEO for Graspful-powered courses.

## Format

Each `.yaml` file defines a complete brand. See `packages/shared/src/schemas/brand-yaml.schema.ts` for the full Zod schema.

## CLI Usage

```bash
# Validate a brand YAML
graspful validate brand.yaml

# Import (create/update) a brand
graspful import brand.yaml

# Generate a new brand from a niche
graspful create brand --niche "Kubernetes certification"
```

## Theme Presets

Available presets: blue, red, green, orange, purple, slate, emerald, rose, amber, indigo

Use `theme.preset` instead of specifying individual HSL color values.
