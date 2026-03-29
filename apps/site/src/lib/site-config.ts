export interface QuickLink {
  title: string;
  href: string;
  description: string;
}

export interface ServiceArea {
  title: string;
  description: string;
  href: string;
  links: QuickLink[];
}

export interface FeaturedStory {
  title: string;
  href: string;
  description: string;
  eyebrow: string;
}

export const siteName = "Graspful";
export const siteTagline =
  "Services and guidance for people building adaptive courses";

export const appUrl =
  process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";

export const topTasks: QuickLink[] = [
  {
    title: "Start building a course",
    href: `${appUrl}/sign-up`,
    description: "Create a Graspful account and open the creator workspace.",
  },
  {
    title: "Understand how adaptive learning works",
    href: "/how-graspful-works",
    description: "See the mastery model, diagnostics, spacing, and review flow.",
  },
  {
    title: "Review pricing and payouts",
    href: "/pricing",
    description: "See the 70/30 split, learner pricing, and operating costs.",
  },
  {
    title: "Read the implementation guidance",
    href: "/docs",
    description: "Use Graspful with YAML, AI agents, and your existing materials.",
  },
  {
    title: "Sign in to the creator dashboard",
    href: `${appUrl}/sign-in`,
    description: "Manage courses, branding, API keys, and student subscriptions.",
  },
  {
    title: "Publish under your own domain",
    href: `${appUrl}/sign-up`,
    description: "Launch a branded academy without taking over the infrastructure.",
  },
];

export const serviceAreas: ServiceArea[] = [
  {
    title: "Build courses",
    description:
      "Turn expertise, notes, and source material into structured adaptive courses.",
    href: "/docs",
    links: [
      {
        title: "Import a course from YAML",
        href: "/docs",
        description: "Use a schema-driven course definition with concepts and practice.",
      },
      {
        title: "Generate content with agents",
        href: "/docs",
        description: "Work with Codex, Claude, Cursor, or any MCP-compatible tool.",
      },
    ],
  },
  {
    title: "Publish and sell",
    description:
      "Launch a public academy with learner sign-up, billing, and brand controls already wired.",
    href: "/pricing",
    links: [
      {
        title: "Use Graspful pricing",
        href: "/pricing",
        description: "Operate on a simple 70/30 revenue share with no platform fee.",
      },
      {
        title: "Ship under your own name",
        href: `${appUrl}/sign-up`,
        description: "Apply your own domain, palette, and academy configuration.",
      },
    ],
  },
  {
    title: "Support learners",
    description:
      "Deliver diagnostics, adaptive sequencing, mastery gates, and spaced review.",
    href: "/how-graspful-works",
    links: [
      {
        title: "Run a diagnostic first",
        href: "/how-graspful-works",
        description: "Skip what the learner knows and focus effort on the real gaps.",
      },
      {
        title: "Reinforce with review",
        href: "/how-graspful-works",
        description: "Schedule follow-up sessions before knowledge decays.",
      },
    ],
  },
  {
    title: "Operate the platform",
    description:
      "Keep your creator workflow predictable with docs, release notes, and observability.",
    href: "/docs",
    links: [
      {
        title: "Read the product guidance",
        href: "/docs",
        description: "Learn how the backend, frontend, and authoring flow fit together.",
      },
      {
        title: "Check current platform direction",
        href: "/how-graspful-works",
        description: "Understand what Graspful is for and what it will not become.",
      },
    ],
  },
];

export const featuredStories: FeaturedStory[] = [
  {
    eyebrow: "Featured guidance",
    title: "Adaptive learning that changes the order, not just the pace",
    href: "/how-graspful-works",
    description:
      "Graspful changes what each learner sees next based on what they can already prove.",
  },
  {
    eyebrow: "For course creators",
    title: "A course platform that assumes you work with source material, not slide decks",
    href: "/docs",
    description:
      "Bring notes, guides, standards, and domain expertise. The system handles the rest.",
  },
  {
    eyebrow: "For operators",
    title: "One product website, one platform runtime, different jobs",
    href: "/docs",
    description:
      "The flagship site is bespoke. Customer academies stay constrained and reliable.",
  },
  {
    eyebrow: "For revenue",
    title: "You keep 70% when learners subscribe",
    href: "/pricing",
    description:
      "No monthly platform subscription. Graspful makes money when creators make money.",
  },
];

export const documentationLinks: QuickLink[] = [
  {
    title: "Course authoring reference",
    href: "/docs",
    description: "Schemas, workflows, and publishing guidance for creator teams.",
  },
  {
    title: "Pricing and payouts",
    href: "/pricing",
    description: "Revenue share, learner plans, and billing responsibilities.",
  },
  {
    title: "How Graspful works",
    href: "/how-graspful-works",
    description: "Platform model, learner experience, and operating boundaries.",
  },
];

export const searchDocuments = [
  {
    title: "How Graspful works",
    href: "/how-graspful-works",
    summary:
      "Diagnostic-first learning, mastery gates, adaptive sequencing, and spaced repetition.",
    tags: ["adaptive", "learning", "diagnostic", "mastery", "review"],
  },
  {
    title: "Pricing",
    href: "/pricing",
    summary:
      "Revenue share, launch costs, learner plans, and payout expectations.",
    tags: ["pricing", "billing", "payout", "revenue", "stripe"],
  },
  {
    title: "Documentation",
    href: "/docs",
    summary:
      "YAML import, AI agents, publishing workflow, and creator operations.",
    tags: ["docs", "yaml", "agents", "mcp", "publishing", "creator"],
  },
  {
    title: "Creator dashboard",
    href: `${appUrl}/sign-in`,
    summary:
      "Sign in to manage courses, API keys, brands, and subscriptions.",
    tags: ["dashboard", "sign in", "creator", "manage"],
  },
];
