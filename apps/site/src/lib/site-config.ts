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
export const siteTagline = "Author courses with your AI agent";

export const serviceAreas: ServiceArea[] = [
  {
    title: "Course content you can inspect",
    description: "Keep lessons, worked examples, questions, and prerequisites in YAML. Use your agent to edit the files and review the content before import.",
    href: "/docs",
  },
  {
    title: "Practice based on prerequisites",
    description: "Diagnostics estimate a learner's starting point. The learning engine selects practice using those estimates and the course's prerequisite graph.",
    href: "/how-graspful-works",
  },
  {
    title: "Questions with explanations",
    description: "Learners answer questions, get feedback, and return for scheduled review. Your course supplies the instructions, worked examples, and answer explanations.",
    href: "/how-graspful-works",
  },
];

export const platformPrinciples: PlatformPrinciple[] = [
  {
    title: "Estimate the starting point",
    description: "A diagnostic uses answers to estimate which concepts need practice.",
  },
  {
    title: "Use evidence from answers",
    description: "The learner model updates as students answer course questions.",
  },
  {
    title: "Schedule further practice",
    description: "Review brings previously studied concepts back for another attempt.",
  },
];

export const faqItems = [
  {
    question: "Do I need to write YAML myself?",
    answer: "Your coding agent can write the YAML from your source material and instructions. Graspful provides CLI and MCP tools for structure, validation, review, import, and publication. You are responsible for reviewing the generated content.",
  },
  {
    question: "Which authoring tools can I use?",
    answer: "Use Claude Code, Codex, or another agent with MCP support. You can also edit course files yourself and run the CLI directly.",
  },
  {
    question: "Can I charge learners?",
    answer: "Paid subscriptions are not available yet. Payment setup is in progress. Pricing and payment terms will be available before paid subscriptions open.",
  },
  {
    question: "Can I configure academy branding?",
    answer: "Use the brand YAML schema and CLI or MCP tools to configure your academy's name, colors, logo, and landing page. Review the result before sharing it.",
  },
  {
    question: "What makes a suitable course?",
    answer: "Start with a subject you can divide into concepts, prerequisites, explanations, and assessable questions. Provide reliable source material and check the questions against what each lesson teaches.",
  },
  {
    question: "What does the quality gate check?",
    answer: "Automated checks inspect the course structure and content for issues such as invalid prerequisites, duplicate questions, and missing teaching content. Read the warnings and review factual accuracy, examples, and answer keys yourself before publishing.",
  },
  {
    question: "Does import publish my course?",
    answer: "An import without --publish saves a draft. Review it, then use the publish command. Confirm published: true in the response before you share the course with learners.",
  },
  {
    question: "Where is my course content stored?",
    answer: "You author the course as YAML files on your computer and import a copy into Graspful. Keep those source files in your own repository so you can edit and reuse them.",
  },
];

export const footerLinks = {
  product: [
    { title: "How it works", href: "/how-graspful-works" },
    { title: "Pricing", href: "/pricing" },
    { title: "Docs", href: "/docs" },
  ],
  resources: [
    { title: "CLI reference", href: "https://graspful.ai/docs/cli" },
    { title: "Course schema", href: "https://graspful.ai/docs/course-schema" },
  ],
};
