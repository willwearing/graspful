# Brand YAML files

Brand configuration defines landing-page copy, theme, SEO, and course scope for Graspful courses. Pricing fields are configuration values. Paid subscriptions and creator payouts require billing setup and verification before customer use.

## Format

Each `.yaml` file defines a brand. See the [Zod schema](../../packages/shared/src/schemas/brand-yaml.schema.ts) for the supported fields.

The checked-in YAML files and [frontend defaults](../../apps/web/src/lib/brand/defaults.ts) contain matching landing-page copy. Update both when changing default copy. Imported brand configuration is stored separately and must be updated through an import.

Use claims that the course content and product behavior support. Check the course outline before claiming exam coverage. Publish customer counts, outcome rates, and study-time estimates only when evidence is available.

## CLI usage

```bash
# Validate a brand file.
graspful validate brand.yaml

# Import the configuration after authentication.
graspful import brand.yaml

# Create a draft brand file, then edit its copy and configuration.
graspful create brand --niche "Kubernetes certification" -o brand.yaml
```

A generated brand file needs review. Set its organization, course scope, copy, and theme for the intended course. A custom domain also needs DNS and hosting configuration.

## Theme presets

Available presets: blue, red, green, orange, purple, slate, emerald, rose, amber, indigo.

Use `theme.preset` to select a palette, or specify the supported color fields.
