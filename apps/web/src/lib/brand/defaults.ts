import type { BrandConfig } from "./config";

export const firefighterBrand: BrandConfig = {
  id: "firefighter",
  name: "FirefighterPrep",
  domain: "firefighterprep.audio",
  tagline: "Pass Your Firefighter Exam. Eyes-Free.",
  logoUrl: "/images/logo-firefighter.svg",
  faviconUrl: "/favicon.ico",
  ogImageUrl: "/images/og-firefighter.png",
  orgId: "firefighter-prep", // Organization slug — resolved to UUID by backend

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
    features: [
      {
        title: "Audio-First Learning",
        description:
          "Listen to exam content anywhere -- at the gym, in the car, on a run. No screen required.",
        icon: "Headphones",
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
      },
    ],
    howItWorks: [
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
  orgId: "electrician-prep",

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
    features: [
      {
        title: "Audio-First NEC Review",
        description:
          "Listen to NEC code sections, article numbers, and key thresholds on repeat. Study hands-free on the jobsite.",
        icon: "Headphones",
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
      },
    ],
    howItWorks: [
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

/** Default brand used as fallback */
export const defaultBrand: BrandConfig = firefighterBrand;
