export interface ServiceArea {
  title: string;
  description: string;
  href: string;
}

export interface PlatformPrinciple {
  title: string;
  description: string;
}

export const siteName = "Graspful";
export const siteTagline =
  "Turn Your Expertise Into a Course Business";


export const serviceAreas: ServiceArea[] = [
  {
    title: "Adaptive Diagnostics",
    description:
      "Every student starts with a diagnostic that figures out what they already know. No wasted time on material they've mastered.",
    href: "/how-graspful-works",
  },
  {
    title: "Fully Automated Learning Paths",
    description:
      "The system knows what each student needs next and delivers it. Different paths for different learners, zero manual intervention.",
    href: "/how-graspful-works",
  },
  {
    title: "Research-Backed Retention",
    description:
      "Spaced repetition, mastery gates, and retrieval practice built in. Students keep what they learned.",
    href: "/how-graspful-works",
  },
  {
    title: "Your Brand, Your Business",
    description:
      "Your domain. Your colors. Your pricing. The learner sees your academy, not ours.",
    href: "/pricing",
  },
  {
    title: "Free to Build. You Keep 70%.",
    description:
      "No upfront costs. No platform subscription. Build your course for free and earn 70% of every paid subscription.",
    href: "/pricing",
  },
  {
    title: "Quality Checks Built In",
    description:
      "Automated checks catch duplicate questions, missing prerequisites, and content gaps before you publish.",
    href: "/docs",
  },
];

export const platformPrinciples: PlatformPrinciple[] = [
  {
    title: "Diagnose first",
    description:
      "Don't make everyone start at chapter one. Figure out what they already know and skip the stuff that wastes their time.",
  },
  {
    title: "Gate on mastery, not clicks",
    description:
      "Students move forward when they prove they understand it. Not when they click 'next' enough times.",
  },
  {
    title: "Bring knowledge back",
    description:
      "Spaced review is built in. Students keep what they learned instead of forgetting it two weeks later.",
  },
];

export const faqItems = [
  {
    question: "Do I need to know how to code?",
    answer:
      "No. You describe what you want to teach, and Graspful's AI builds the course structure, questions, and adaptive logic. You review and customize.",
  },
  {
    question: "How does the revenue share work?",
    answer:
      "You set your course price. When a learner subscribes, you keep 70% and Graspful keeps 30% to cover hosting, billing, the learner app, and the adaptive engine.",
  },
  {
    question: "Can I use my own domain and branding?",
    answer:
      "Yes. Your academy gets your domain, your logo, your colors. Learners see your brand, not ours.",
  },
  {
    question: "What subjects can I teach?",
    answer:
      "Anything with structured knowledge: programming, math, science, languages, professional certifications, compliance training. If it can be broken into concepts with prerequisites, it works.",
  },
  {
    question: "How is this different from Teachable or Thinkific?",
    answer:
      "Those platforms host videos. Graspful actually teaches. Every course gets adaptive diagnostics, mastery gating, and spaced review built in. Students don't just watch — they prove they learned.",
  },
  {
    question: "What happens if I want to leave?",
    answer:
      "Your course content is yours. Export it anytime as YAML. No lock-in.",
  },
];

export const footerLinks = {
  product: [
    { title: "Agents", href: "/how-graspful-works" },
    { title: "Pricing", href: "/pricing" },
    { title: "Docs", href: "/docs" },
  ],
  resources: [
    { title: "Blog", href: "/blog" },
    { title: "CLI Reference", href: "/docs/cli" },
    { title: "Course Schema", href: "/docs/course-schema" },
  ],
};
