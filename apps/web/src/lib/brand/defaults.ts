import type { BrandConfig } from "./config";

export const firefighterBrand: BrandConfig = {
  id: "firefighter",
  name: "FirefighterPrep",
  domain: "firefighterprep.audio",
  tagline: "Pass Your Firefighter Exam. Eyes-Free.",
  logoUrl: "/images/logo-firefighter.svg",
  faviconUrl: "/favicon.ico",
  ogImageUrl: "/images/og-firefighter.png",
  orgId: "", // Set from seed data

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
      muted: "30 20% 96%",
      mutedForeground: "25 10% 40%",
      border: "30 20% 90%",
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
      muted: "217 33% 17%",
      mutedForeground: "215 20% 65%",
      border: "217 33% 17%",
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

  contentScope: {
    courseIds: [], // Populated from seed data at runtime
  },
};

/** Default brand used as fallback */
export const defaultBrand: BrandConfig = firefighterBrand;
