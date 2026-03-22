import type { BrandConfig } from "./config";

export const firefighterBrand: BrandConfig = {
  id: "firefighter",
  name: "FirefighterPrep",
  domain: "firefighterprep.audio",
  tagline: "Pass Your Firefighter Exam. Eyes-Free.",
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
  },

  landing: {
    hero: {
      headline: "Pass Your Firefighter Exam. Eyes-Free.",
      subheadline:
        "Audio-first adaptive learning for NFPA 1001. Study while you work out, commute, or do chores.",
      ctaText: "Start Studying Free",
    },
    features: {
      heading: "Why Audio Learning Works",
      subheading: "Turn dead time into study time. Learn while your hands and eyes are busy.",
      items: [
        {
          title: "Audio-First Learning",
          description:
            "Listen to exam content anywhere -- at the gym, in the car, on a run. No screen required.",
          icon: "Headphones",
          wide: true,
        },
        {
          title: "Adaptive Engine",
          description:
            "Our AI focuses on what you don't know yet. No wasted time re-studying mastered material.",
          icon: "Brain",
        },
        {
          title: "Spaced Repetition",
          description:
            "Scientifically-timed reviews lock knowledge into long-term memory.",
          icon: "Timer",
        },
        {
          title: "NFPA 1001 Coverage",
          description:
            "Complete coverage of Firefighter I & II certification requirements.",
          icon: "Shield",
          wide: true,
        },
      ],
    },
    howItWorks: {
      heading: "How It Works",
      items: [
        {
          title: "Take a Diagnostic",
          description: "5-minute quiz identifies what you already know and where to focus.",
        },
        {
          title: "Study Adaptively",
          description: "Listen to personalized lessons that target your weak areas first.",
        },
        {
          title: "Pass Your Exam",
          description: "Spaced repetition ensures you retain everything on test day.",
        },
      ],
    },
    faq: [
      {
        question: "What exam does this cover?",
        answer:
          "We cover NFPA 1001 Standard for Firefighter Professional Qualifications, including both Firefighter I and Firefighter II levels.",
      },
      {
        question: "Can I study without headphones?",
        answer:
          "Yes! Audio plays through your device speakers too. But headphones give the best experience for hands-free studying.",
      },
      {
        question: "How long until I'm ready for the exam?",
        answer:
          "Most students feel exam-ready after 4-6 weeks of daily 30-minute sessions. The adaptive engine adjusts to your pace.",
      },
      {
        question: "Is there a free trial?",
        answer:
          "Yes -- 7-day free trial with full access to all content. No credit card required to start.",
      },
    ],
    bottomCta: {
      headline: "Ready to Start Studying?",
      subheadline: "Join thousands of candidates who passed their exam with audio-first learning.",
    },
  },

  seo: {
    title: "FirefighterPrep -- Audio Exam Prep for NFPA 1001",
    description:
      "Pass your firefighter certification exam with audio-first adaptive learning. Study NFPA 1001 hands-free.",
    keywords: [
      "firefighter exam prep",
      "NFPA 1001",
      "firefighter certification",
      "audio learning",
      "adaptive learning",
    ],
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
  domain: "electricianprep.audio",
  tagline: "Pass Your Electrician Exam. Listen. Learn. Pass.",
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
  },

  landing: {
    hero: {
      headline: "Pass Your Electrician Exam. Listen. Learn. Pass.",
      subheadline:
        "Audio-first adaptive learning for the NEC. Study while you work, drive, or wire.",
      ctaText: "Start Studying Free",
    },
    features: {
      heading: "Why Audio Learning Works",
      subheading: "Turn dead time into study time. Learn while your hands and eyes are busy.",
      items: [
        {
          title: "Audio-First NEC Review",
          description:
            "Listen to NEC code sections, article numbers, and key thresholds on repeat. Study hands-free on the jobsite.",
          icon: "Headphones",
          wide: true,
        },
        {
          title: "Adaptive Learning Engine",
          description:
            "AI identifies your weak areas and focuses your study time there. No wasted time on what you already know.",
          icon: "Brain",
        },
        {
          title: "Spaced Repetition",
          description:
            "Scientifically-timed reviews lock wire gauges, ampacity ratings, and code sections into long-term memory.",
          icon: "Timer",
        },
        {
          title: "Complete NEC 2023 Coverage",
          description:
            "50+ topics covering wiring methods, grounding, overcurrent protection, load calculations, and special occupancies.",
          icon: "Zap",
          wide: true,
        },
      ],
    },
    howItWorks: {
      heading: "How It Works",
      items: [
        {
          title: "Take a Diagnostic",
          description:
            "Quick assessment identifies what NEC topics you already know and where to focus.",
        },
        {
          title: "Study Adaptively",
          description:
            "Listen to personalized lessons on grounding, conduit fill, load calcs -- whatever you need most.",
        },
        {
          title: "Pass Your Exam",
          description:
            "Spaced repetition ensures you retain article numbers and code requirements on test day.",
        },
      ],
    },
    faq: [
      {
        question: "What exam does this cover?",
        answer:
          "We cover the National Electrical Code (NEC/NFPA 70) -- the foundation for Journeyman and Master Electrician exams administered by PSI, Prometric, and state agencies.",
      },
      {
        question: "Which NEC edition?",
        answer:
          "All content is based on the 2023 NEC edition. We update when new editions are adopted.",
      },
      {
        question: "Can I study on the jobsite?",
        answer:
          "Yes -- that is exactly the point. Audio plays through your earbuds while you work. No screen needed.",
      },
      {
        question: "How long until I am ready?",
        answer:
          "Most students feel exam-ready after 4-6 weeks of daily 30-minute sessions. The adaptive engine adjusts to your pace.",
      },
      {
        question: "Is there a free trial?",
        answer:
          "Yes -- 7-day free trial with full access. No credit card required to start.",
      },
    ],
    bottomCta: {
      headline: "Ready to Start Studying?",
      subheadline: "Join thousands of electricians who passed their exam with audio-first learning.",
    },
  },

  seo: {
    title: "ElectricianPrep -- Audio Exam Prep for the NEC",
    description:
      "Pass your Journeyman or Master Electrician exam with audio-first adaptive learning. Study the NEC hands-free on the jobsite.",
    keywords: [
      "electrician exam prep",
      "NEC study guide",
      "journeyman electrician exam",
      "master electrician exam",
      "national electrical code",
      "NEC audio",
      "electrician certification",
      "audio learning",
    ],
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
  domain: "jsprep.audio",
  tagline: "Master JavaScript. Listen. Code. Ship.",
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
  },

  landing: {
    hero: {
      headline: "Master JavaScript. Listen. Code. Ship.",
      subheadline:
        "Audio-first adaptive learning for JavaScript fundamentals. Study closures, async, and the event loop while you commute.",
      ctaText: "Start Learning Free",
    },
    features: {
      heading: "Why Audio Learning Works",
      subheading: "Turn dead time into study time. Learn while your hands and eyes are busy.",
      items: [
        {
          title: "Audio-First JS Concepts",
          description:
            "Listen to clear explanations of closures, prototypes, async/await, and more. Study on the go.",
          icon: "Headphones",
          wide: true,
        },
        {
          title: "Adaptive Learning Engine",
          description:
            "AI identifies gaps in your JavaScript knowledge and focuses your study time there.",
          icon: "Brain",
        },
        {
          title: "Spaced Repetition",
          description:
            "Scientifically-timed reviews lock tricky concepts like `this` binding and the event loop into long-term memory.",
          icon: "Timer",
        },
        {
          title: "ES2024 Coverage",
          description:
            "From var vs let to generators and modules. 14 core concepts with 40+ practice problems.",
          icon: "Code",
          wide: true,
        },
      ],
    },
    howItWorks: {
      heading: "How It Works",
      items: [
        {
          title: "Take a Diagnostic",
          description:
            "Quick quiz identifies what JS concepts you already know and where to focus.",
        },
        {
          title: "Study Adaptively",
          description:
            "Listen to lessons on closures, promises, prototypes -- whatever you need most.",
        },
        {
          title: "Build Confidence",
          description:
            "Spaced repetition ensures you deeply understand JS, not just recognize syntax.",
        },
      ],
    },
    faq: [
      {
        question: "What level is this for?",
        answer:
          "Beginner to intermediate. We cover fundamentals through advanced concepts like closures, the event loop, and generators. Great for junior devs, bootcamp grads, or anyone filling JS knowledge gaps.",
      },
      {
        question: "Is this for a specific certification?",
        answer:
          "No specific cert -- this builds deep JavaScript fluency that applies to interviews, day-to-day coding, and frameworks like React or Node.js.",
      },
      {
        question: "Can I listen while coding?",
        answer:
          "Absolutely. Audio explanations work great as background learning while you practice. Many users listen during commutes and code in the evening.",
      },
      {
        question: "Is there a free trial?",
        answer:
          "Yes -- 7-day free trial with full access. No credit card required to start.",
      },
    ],
    bottomCta: {
      headline: "Ready to Start Learning?",
      subheadline: "Join thousands of developers who leveled up their JavaScript with audio-first learning.",
    },
  },

  seo: {
    title: "JSPrep -- Audio-First JavaScript Learning",
    description:
      "Master JavaScript fundamentals with audio-first adaptive learning. Closures, async/await, prototypes, and more -- study hands-free.",
    keywords: [
      "javascript learning",
      "learn javascript",
      "javascript fundamentals",
      "javascript audio course",
      "closures",
      "async await",
      "event loop",
      "audio learning",
    ],
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
  domain: "posthog-tam.audio",
  tagline: "Master PostHog. Technically.",
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
  },

  landing: {
    hero: {
      headline: "Master PostHog. Technically.",
      subheadline:
        "Technical onboarding for PostHog TAMs — data models, ingestion pipelines, identification, group analytics, and more.",
      ctaText: "Start Learning",
    },
    features: {
      heading: "Why Audio Learning Works",
      subheading: "Turn dead time into study time. Learn while your hands and eyes are busy.",
      items: [
        {
          title: "Data Model Foundations",
          description:
            "Learn entities, attributes, keys, and relationships before diving into PostHog specifics.",
          icon: "Database",
          wide: true,
        },
        {
          title: "Ingestion Pipeline Deep-Dive",
          description:
            "Understand how events flow from SDKs through Kafka to ClickHouse -- with architecture diagrams.",
          icon: "Workflow",
        },
        {
          title: "Identification Mastery",
          description:
            "Anonymous vs identified events, person merging, distinct_id -- the concepts customers struggle with most.",
          icon: "UserCheck",
        },
        {
          title: "Adaptive Learning",
          description:
            "AI-driven spaced repetition focuses on your weak areas. 37 concepts, 149 practice problems.",
          icon: "Brain",
          wide: true,
        },
      ],
    },
    howItWorks: {
      heading: "How It Works",
      items: [
        {
          title: "Take a Diagnostic",
          description: "Quick assessment identifies what PostHog concepts you already know.",
        },
        {
          title: "Study Adaptively",
          description: "Lessons build from data modeling fundamentals to PostHog-specific architecture.",
        },
        {
          title: "Help Customers",
          description: "Deep technical understanding means faster, better customer conversations.",
        },
      ],
    },
    faq: [
      {
        question: "Who is this for?",
        answer:
          "PostHog Technical Account Managers who want deep technical fluency with the product's data model, ingestion pipeline, and identification system.",
      },
      {
        question: "What does it cover?",
        answer:
          "8 sections: Data Modeling, Pipelines, PostHog Data Model, Ingestion Pipeline, Identification, Group Analytics, CDP, and Querying.",
      },
      {
        question: "How long does it take?",
        answer:
          "Estimated 12 hours total. Study at your own pace -- the adaptive engine adjusts to what you already know.",
      },
    ],
    bottomCta: {
      headline: "Ready to Start Learning?",
      subheadline: "Deep technical understanding means faster, better customer conversations.",
    },
  },

  seo: {
    title: "PostHog TAM Technical Onboarding",
    description:
      "Master PostHog's data model, ingestion pipeline, and identification system with adaptive learning.",
    keywords: [
      "posthog",
      "technical account manager",
      "onboarding",
      "data model",
      "ingestion pipeline",
      "analytics",
    ],
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
export const defaultBrand: BrandConfig = firefighterBrand;
