import type { BrandConfig } from "./config";

export const firefighterBrand: BrandConfig = {
  id: "firefighter",
  name: "FirefighterPrep",
  domain: "firefighterprep.vercel.app",
  tagline: "Practice Firefighter I topics",
  logoUrl: "/images/logo-firefighter.svg",
  faviconUrl: "/favicon.ico",
  ogImageUrl: "/images/og-firefighter.png",
  orgSlug: "firefighter-prep",

  theme: {
    light: {
      primary: "16 100% 50%",
      primaryForeground: "0 0% 100%",
      secondary: "0 72% 51%",
      secondaryForeground: "0 0% 100%",
      accent: "39 100% 50%",
      accentForeground: "0 0% 0%",
      background: "0 0% 100%",
      foreground: "222 47% 11%",
      card: "0 0% 100%",
      cardForeground: "222 47% 11%",
      popover: "0 0% 100%",
      popoverForeground: "222 47% 11%",
      muted: "30 20% 96%",
      mutedForeground: "25 10% 40%",
      destructive: "0 84% 60%",
      border: "30 20% 90%",
      input: "30 20% 90%",
      ring: "16 100% 50%",
    },
    dark: {
      primary: "16 100% 55%",
      primaryForeground: "0 0% 100%",
      secondary: "0 72% 56%",
      secondaryForeground: "0 0% 100%",
      accent: "39 100% 55%",
      accentForeground: "0 0% 0%",
      background: "222 47% 4%",
      foreground: "210 40% 98%",
      card: "222 47% 6%",
      cardForeground: "210 40% 98%",
      popover: "222 47% 6%",
      popoverForeground: "210 40% 98%",
      muted: "217 33% 17%",
      mutedForeground: "215 20% 65%",
      destructive: "0 63% 31%",
      border: "217 33% 17%",
      input: "217 33% 17%",
      ring: "16 100% 55%",
    },
    radius: "0.5rem",
    gradient: {
      start: "#DC2626",
      mid: "#EF4444",
      end: "#F97316",
      accent: "#FBBF24",
    },
  },

  landing: {
    hero: {
      headline: "Practice Firefighter I topics",
      subheadline: "Read or listen to lessons, then test your understanding with practice questions.",
      ctaText: "Create an account"
    },
    features: {
      heading: "What you can study",
      subheading: "Read or listen to lessons, answer practice questions, and return for review.",
      items: [
        {
          title: "Audio lessons",
          description: "Listen to the lesson text and worked examples. Use the screen to answer practice questions.",
          icon: "Headphones"
        },
        {
          title: "Practice by topic",
          description: "Your answers help the course estimate which topics need more practice.",
          icon: "Brain"
        },
        {
          title: "Scheduled review",
          description: "Return to earlier topics when they are due for review.",
          icon: "Timer"
        },
        {
          title: "Firefighter I study material",
          description: "Study Firefighter I topics from the NFPA 1001 course outline. Compare the outline with your local exam requirements.",
          icon: "Shield"
        }
      ]
    },
    howItWorks: {
      heading: "How it works",
      items: [
        {
          title: "Check your starting point",
          description: "Answer diagnostic questions to estimate which topics need practice."
        },
        {
          title: "Work through a lesson",
          description: "Read or listen to an explanation, study the worked example, and answer questions."
        },
        {
          title: "Return for review",
          description: "Use scheduled questions to check what you remember."
        }
      ]
    },
    faq: [
      {
        question: "What exam does this cover?",
        answer: "The current course covers Firefighter I topics from NFPA 1001. Check the course outline against your training provider and local exam requirements."
      },
      {
        question: "Can I study without headphones?",
        answer: "Lesson audio can play through your device speakers. Practice questions require screen interaction."
      },
      {
        question: "How long should I study?",
        answer: "Study time depends on your experience and exam requirements. Use practice results to plan further study with your training materials."
      },
      {
        question: "Can I subscribe?",
        answer: "Paid subscriptions are not available yet. Check the course page for current access options."
      }
    ],
    bottomCta: {
      headline: "Explore the course",
      subheadline: "Check the course outline and try the available practice material."
    }
  },

  seo: {
    title: "FirefighterPrep: Firefighter I practice",
    description: "Study Firefighter I topics with lesson audio, worked examples, practice questions, and scheduled review.",
    keywords: [
      "firefighter exam prep",
      "NFPA 1001",
      "firefighter certification",
      "audio learning",
      "adaptive learning"
    ]
  },

  pricing: {
    monthly: 14.99,
    yearly: 149,
    currency: "USD",
    trialDays: 7,
  },

  contentScope: {
    courseIds: [], // Populated from seed data at runtime
  },
};

export const electricianBrand: BrandConfig = {
  id: "electrician",
  name: "ElectricianPrep",
  domain: "electricianprep.vercel.app",
  tagline: "Practice electrical code topics",
  logoUrl: "/images/logo-electrician.svg",
  faviconUrl: "/favicon.ico",
  ogImageUrl: "/images/og-electrician.png",
  orgSlug: "electrician-prep",

  theme: {
    light: {
      primary: "217 91% 60%",
      primaryForeground: "0 0% 100%",
      secondary: "45 93% 47%",
      secondaryForeground: "0 0% 0%",
      accent: "217 91% 95%",
      accentForeground: "217 91% 30%",
      background: "0 0% 100%",
      foreground: "222 47% 11%",
      card: "0 0% 100%",
      cardForeground: "222 47% 11%",
      popover: "0 0% 100%",
      popoverForeground: "222 47% 11%",
      muted: "214 32% 96%",
      mutedForeground: "215 16% 47%",
      destructive: "0 84% 60%",
      border: "214 32% 91%",
      input: "214 32% 91%",
      ring: "217 91% 60%",
    },
    dark: {
      primary: "217 91% 65%",
      primaryForeground: "0 0% 100%",
      secondary: "45 93% 52%",
      secondaryForeground: "0 0% 0%",
      accent: "217 33% 17%",
      accentForeground: "217 91% 80%",
      background: "222 47% 4%",
      foreground: "210 40% 98%",
      card: "222 47% 6%",
      cardForeground: "210 40% 98%",
      popover: "222 47% 6%",
      popoverForeground: "210 40% 98%",
      muted: "217 33% 17%",
      mutedForeground: "215 20% 65%",
      destructive: "0 63% 31%",
      border: "217 33% 17%",
      input: "217 33% 17%",
      ring: "217 91% 65%",
    },
    radius: "0.5rem",
    gradient: {
      start: "#2563EB",
      mid: "#3B82F6",
      end: "#06B6D4",
      accent: "#34D399",
    },
  },

  landing: {
    hero: {
      headline: "Practice electrical code topics",
      subheadline: "Read or listen to NEC lessons, then work through practice questions.",
      ctaText: "Create an account"
    },
    features: {
      heading: "What you can study",
      subheading: "Read or listen to lessons, answer practice questions, and return for review.",
      items: [
        {
          title: "Audio lessons",
          description: "Listen to explanations of electrical code topics. Use the screen to work through the questions.",
          icon: "Headphones"
        },
        {
          title: "Practice by topic",
          description: "Your answers help the course estimate which topics need more practice.",
          icon: "Brain"
        },
        {
          title: "Scheduled review",
          description: "Return to code concepts and calculations when they are due for review.",
          icon: "Timer"
        },
        {
          title: "Course outline",
          description: "See the topics covered in the course and compare them with the code edition and exam requirements in your area.",
          icon: "Zap"
        }
      ]
    },
    howItWorks: {
      heading: "How it works",
      items: [
        {
          title: "Check your starting point",
          description: "Answer diagnostic questions to estimate which topics need practice."
        },
        {
          title: "Work through a lesson",
          description: "Study explanations and worked examples before answering questions."
        },
        {
          title: "Return for review",
          description: "Use scheduled questions to check what you remember."
        }
      ]
    },
    faq: [
      {
        question: "What exam does this cover?",
        answer: "The course provides practice on National Electrical Code topics. Compare the course outline with the requirements of your exam provider."
      },
      {
        question: "Which code edition should I study?",
        answer: "Check the edition listed in the course and the edition required by your exam provider before you begin."
      },
      {
        question: "Can I listen to lessons?",
        answer: "Yes. Lesson audio reads the explanation text. Practice questions and calculations require your attention and screen interaction."
      },
      {
        question: "How long should I study?",
        answer: "Study time depends on your experience and exam requirements. Use practice results to identify topics that need further study."
      },
      {
        question: "Can I subscribe?",
        answer: "Paid subscriptions are not available yet. Check the course page for current access options."
      }
    ],
    bottomCta: {
      headline: "Explore the course",
      subheadline: "Check the course outline against your exam requirements."
    }
  },

  seo: {
    title: "ElectricianPrep: Electrical code practice",
    description: "Practice electrical code topics with lesson audio, worked examples, questions, and scheduled review.",
    keywords: [
      "electrician exam prep",
      "NEC study guide",
      "journeyman electrician exam",
      "master electrician exam",
      "national electrical code",
      "NEC audio",
      "electrician certification",
      "audio learning"
    ]
  },

  pricing: {
    monthly: 14.99,
    yearly: 149,
    currency: "USD",
    trialDays: 7,
  },

  contentScope: {
    courseIds: [],
  },
};

export const javascriptBrand: BrandConfig = {
  id: "javascript",
  name: "JSPrep",
  domain: "javascriptprep.vercel.app",
  tagline: "Practice JavaScript fundamentals",
  logoUrl: "/images/logo-javascript.svg",
  faviconUrl: "/favicon.ico",
  ogImageUrl: "/images/og-javascript.png",
  orgSlug: "javascript-prep",

  theme: {
    light: {
      primary: "50 100% 50%",
      primaryForeground: "0 0% 0%",
      secondary: "220 13% 18%",
      secondaryForeground: "0 0% 100%",
      accent: "50 100% 93%",
      accentForeground: "50 100% 25%",
      background: "0 0% 100%",
      foreground: "222 47% 11%",
      card: "0 0% 100%",
      cardForeground: "222 47% 11%",
      popover: "0 0% 100%",
      popoverForeground: "222 47% 11%",
      muted: "50 20% 96%",
      mutedForeground: "220 9% 46%",
      destructive: "0 84% 60%",
      border: "50 20% 90%",
      input: "50 20% 90%",
      ring: "50 100% 50%",
    },
    dark: {
      primary: "50 100% 55%",
      primaryForeground: "0 0% 0%",
      secondary: "220 13% 26%",
      secondaryForeground: "0 0% 100%",
      accent: "220 13% 17%",
      accentForeground: "50 100% 70%",
      background: "220 13% 4%",
      foreground: "210 40% 98%",
      card: "220 13% 6%",
      cardForeground: "210 40% 98%",
      popover: "220 13% 6%",
      popoverForeground: "210 40% 98%",
      muted: "220 13% 17%",
      mutedForeground: "215 20% 65%",
      destructive: "0 63% 31%",
      border: "220 13% 17%",
      input: "220 13% 17%",
      ring: "50 100% 55%",
    },
    radius: "0.5rem",
    gradient: {
      start: "#D97706",
      mid: "#EAB308",
      end: "#FACC15",
      accent: "#34D399",
    },
  },

  landing: {
    hero: {
      headline: "Practice JavaScript fundamentals",
      subheadline: "Study JavaScript concepts through explanations, worked examples, and practice questions.",
      ctaText: "Create an account"
    },
    features: {
      heading: "What you can study",
      subheading: "Read or listen to lessons, answer practice questions, and return for review.",
      items: [
        {
          title: "Audio lessons",
          description: "Read or listen to explanations of JavaScript concepts, then work through the examples.",
          icon: "Headphones"
        },
        {
          title: "Practice by topic",
          description: "Your answers help the course estimate which topics need more practice.",
          icon: "Brain"
        },
        {
          title: "Scheduled review",
          description: "Return to earlier concepts when they are due for review.",
          icon: "Timer"
        },
        {
          title: "JavaScript fundamentals",
          description: "Explore the course outline for topics such as closures, promises, and the event loop.",
          icon: "Code"
        }
      ]
    },
    howItWorks: {
      heading: "How it works",
      items: [
        {
          title: "Check your starting point",
          description: "Answer diagnostic questions to estimate which concepts need practice."
        },
        {
          title: "Work through examples",
          description: "Read the explanation, trace the example code, and answer questions."
        },
        {
          title: "Apply what you learn",
          description: "Practice in your editor and return to the course for review."
        }
      ]
    },
    faq: [
      {
        question: "What level is this for?",
        answer: "The course is for learners who want to study JavaScript fundamentals. Check the course outline for prerequisites and topics."
      },
      {
        question: "Is this for a specific certification?",
        answer: "The course focuses on JavaScript concepts for coding practice. It does not prepare for a named certification."
      },
      {
        question: "Can I listen to lessons?",
        answer: "Yes. Audio reads the explanation text. Use the screen for code examples and practice questions."
      },
      {
        question: "Can I subscribe?",
        answer: "Paid subscriptions are not available yet. Check the course page for current access options."
      }
    ],
    bottomCta: {
      headline: "Explore the course",
      subheadline: "Explore the topics and work through a practice question."
    }
  },

  seo: {
    title: "JSPrep: JavaScript practice",
    description: "Study JavaScript fundamentals with explanations, worked examples, practice questions, and scheduled review.",
    keywords: [
      "javascript learning",
      "learn javascript",
      "javascript fundamentals",
      "javascript audio course",
      "closures",
      "async await",
      "event loop",
      "audio learning"
    ]
  },

  pricing: {
    monthly: 14.99,
    yearly: 149,
    currency: "USD",
    trialDays: 7,
  },

  contentScope: {
    courseIds: [],
  },
};

export const posthogBrand: BrandConfig = {
  id: "posthog",
  name: "PostHog TAM",
  domain: "posthog-tam.vercel.app",
  tagline: "Practice PostHog technical concepts",
  logoUrl: "/images/logo-firefighter.svg",
  faviconUrl: "/favicon.ico",
  ogImageUrl: "/images/og-firefighter.png",
  orgSlug: "posthog-tam",

  theme: {
    light: {
      primary: "12 100% 55%",
      primaryForeground: "0 0% 100%",
      secondary: "220 14% 20%",
      secondaryForeground: "0 0% 100%",
      accent: "42 100% 55%",
      accentForeground: "0 0% 0%",
      background: "0 0% 100%",
      foreground: "222 47% 11%",
      card: "0 0% 100%",
      cardForeground: "222 47% 11%",
      popover: "0 0% 100%",
      popoverForeground: "222 47% 11%",
      muted: "220 14% 96%",
      mutedForeground: "220 9% 46%",
      destructive: "0 84% 60%",
      border: "220 13% 91%",
      input: "220 13% 91%",
      ring: "12 100% 55%",
    },
    dark: {
      primary: "12 100% 60%",
      primaryForeground: "0 0% 100%",
      secondary: "220 14% 28%",
      secondaryForeground: "0 0% 100%",
      accent: "220 13% 17%",
      accentForeground: "12 100% 70%",
      background: "220 14% 4%",
      foreground: "210 40% 98%",
      card: "220 14% 6%",
      cardForeground: "210 40% 98%",
      popover: "220 14% 6%",
      popoverForeground: "210 40% 98%",
      muted: "220 13% 17%",
      mutedForeground: "215 20% 65%",
      destructive: "0 63% 31%",
      border: "220 13% 17%",
      input: "220 13% 17%",
      ring: "12 100% 60%",
    },
    radius: "0.5rem",
    gradient: {
      start: "#E11D48",
      mid: "#F43F5E",
      end: "#FB7185",
      accent: "#FBBF24",
    },
  },

  landing: {
    hero: {
      headline: "Practice PostHog technical concepts",
      subheadline: "Technical study material for PostHog TAMs, including data models, ingestion, and identification.",
      ctaText: "Create an account"
    },
    features: {
      heading: "What you can study",
      subheading: "Read or listen to lessons, answer practice questions, and return for review.",
      items: [
        {
          title: "Data model foundations",
          description: "Study entities, attributes, keys, and relationships before PostHog-specific topics.",
          icon: "Database"
        },
        {
          title: "Ingestion pipeline",
          description: "Trace events from SDKs through the ingestion pipeline.",
          icon: "Workflow"
        },
        {
          title: "Identification",
          description: "Work through anonymous events, identified events, person merging, and distinct IDs.",
          icon: "UserCheck"
        },
        {
          title: "Practice and review",
          description: "Answer questions and return to earlier topics when they are due for review.",
          icon: "Brain"
        }
      ]
    },
    howItWorks: {
      heading: "How it works",
      items: [
        {
          title: "Check your starting point",
          description: "Answer diagnostic questions to estimate which concepts need practice."
        },
        {
          title: "Work through the concepts",
          description: "Study explanations and examples from data modeling to PostHog architecture."
        },
        {
          title: "Apply the material",
          description: "Use the examples to reason through technical customer questions."
        }
      ]
    },
    faq: [
      {
        question: "Who is this for?",
        answer: "PostHog Technical Account Managers who want to study the product data model, ingestion pipeline, and identification system."
      },
      {
        question: "What does it cover?",
        answer: "The course outline includes data modeling, pipelines, identification, group analytics, CDP, and querying."
      },
      {
        question: "How long does it take?",
        answer: "Study time depends on your prior knowledge and how much practice you need. You can return to the course at your own pace."
      }
    ],
    bottomCta: {
      headline: "Explore the course",
      subheadline: "Use explanations and practice questions to check your technical understanding."
    }
  },

  seo: {
    title: "PostHog TAM technical study material",
    description: "Study PostHog data models, ingestion, and identification through explanations, examples, and practice questions.",
    keywords: [
      "posthog",
      "technical account manager",
      "onboarding",
      "data model",
      "ingestion pipeline",
      "analytics"
    ]
  },

  pricing: {
    monthly: 0,
    yearly: 0,
    currency: "USD",
    trialDays: 0,
  },

  contentScope: {
    courseIds: [],
  },
};

export const graspfulBrand: BrandConfig = {
  id: "graspful",
  name: "Graspful",
  domain: "graspful.ai",
  tagline: "Build courses with practice and review",
  logoUrl: "/images/logo-graspful.svg",
  faviconUrl: "/favicon.ico",
  ogImageUrl: "/images/og-graspful.png",
  orgSlug: "graspful",

  theme: {
    light: {
      primary: "199 89% 48%",
      primaryForeground: "0 0% 100%",
      secondary: "210 80% 55%",
      secondaryForeground: "0 0% 100%",
      accent: "186 94% 42%",
      accentForeground: "0 0% 100%",
      background: "0 0% 100%",
      foreground: "222 47% 11%",
      card: "0 0% 100%",
      cardForeground: "222 47% 11%",
      popover: "0 0% 100%",
      popoverForeground: "222 47% 11%",
      muted: "200 10% 96%",
      mutedForeground: "200 5% 46%",
      destructive: "0 84% 60%",
      border: "200 10% 90%",
      input: "200 10% 90%",
      ring: "199 89% 48%",
    },
    dark: {
      primary: "199 89% 58%",
      primaryForeground: "0 0% 100%",
      secondary: "210 80% 62%",
      secondaryForeground: "0 0% 100%",
      accent: "186 94% 50%",
      accentForeground: "0 0% 100%",
      background: "210 25% 4%",
      foreground: "210 40% 98%",
      card: "210 25% 6%",
      cardForeground: "210 40% 98%",
      popover: "210 25% 6%",
      popoverForeground: "210 40% 98%",
      muted: "210 20% 17%",
      mutedForeground: "210 15% 65%",
      destructive: "0 63% 31%",
      border: "210 20% 17%",
      input: "210 20% 17%",
      ring: "199 89% 58%",
    },
    radius: "0.625rem",
    gradient: {
      start: "#0284C7",
      mid: "#0EA5E9",
      end: "#38BDF8",
      accent: "#2DD4BF",
    },
  },

  landing: {
    hero: {
      headline: "Build a course that responds to each learner.",
      subheadline: "Turn your source material into lessons, worked examples, and practice questions. Graspful uses learner answers to guide practice and schedule review.",
      ctaText: "Start a course draft"
    },
    features: {
      heading: "From source material to practice",
      subheading: "Keep the course content in files you can inspect and edit.",
      items: [
        {
          title: "Author with your agent",
          description: "Use Claude, Codex, or another agent with the CLI or MCP tools to write a course from your source material. The CLI creates a draft scaffold for you to complete.",
          icon: "Bot"
        },
        {
          title: "Inspect before publishing",
          description: "Review the lessons, worked examples, answers, and prerequisite graph. Run automated checks to find structural issues before you publish.",
          icon: "ShieldCheck"
        },
        {
          title: "Guide practice and review",
          description: "Learner answers update progress estimates. Prerequisites guide lesson order, and review questions return on a schedule.",
          icon: "Brain"
        }
      ]
    },
    howItWorks: {
      heading: "How it works",
      items: [
        {
          title: "Start with source material",
          description: "Give your notes or course outline to your external agent. Use Graspful tools to create a YAML draft and add the lessons and practice questions."
        },
        {
          title: "Review the course",
          description: "Check the facts and answer explanations against your sources. Run validation and quality checks, then fix the findings."
        },
        {
          title: "Import, then publish",
          description: "Import the reviewed files as a draft. Inspect the result and publish when it is ready for learners."
        }
      ]
    },
    faq: [
      {
        question: "What is Graspful?",
        answer: "Graspful lets you publish courses with lessons, practice questions, prerequisite tracking, and scheduled review. Course content is stored in YAML files and managed through a CLI or MCP tools."
      },
      {
        question: "How is the course written?",
        answer: "You or your external agent, such as Claude or Codex, write the course from source material. Graspful tools create draft scaffolds, validate the files, and import them. Review the content before publishing."
      },
      {
        question: "What setup do I need?",
        answer: "You need an agent that can run CLI commands or use MCP tools. The quickstart explains tool setup, account registration, and the draft-to-publish workflow."
      },
      {
        question: "Can I sell a course yet?",
        answer: "Paid subscriptions and creator payouts are not available yet. Billing setup and verification are required before accepting payments."
      },
      {
        question: "Can I use my own branding?",
        answer: "A brand configuration controls the course landing page, colors, and copy. A custom domain also requires domain and hosting configuration."
      },
      {
        question: "How do students learn?",
        answer: "Students answer diagnostic questions, work through lessons and examples, and answer practice questions. Their answers update progress estimates and help schedule later review."
      }
    ],
    bottomCta: {
      headline: "Start with one course draft",
      subheadline: "Bring a source document and an agent. Follow the quickstart to build, review, and import your first draft."
    }
  },

  seo: {
    title: "Graspful: Build courses with practice and review",
    description: "Create courses from source material with your agent and Graspful CLI or MCP tools. Review and publish lessons with practice questions and scheduled review.",
    keywords: [
      "course creation",
      "adaptive learning",
      "practice questions",
      "course authoring",
      "CLI",
      "MCP",
      "spaced repetition"
    ]
  },

  pricing: {
    monthly: 0,
    yearly: 0,
    currency: "USD",
    trialDays: 0,
  },

  contentScope: {
    courseIds: [],
  },
};

/** Default brand used as fallback */
export const defaultBrand: BrandConfig = graspfulBrand;
