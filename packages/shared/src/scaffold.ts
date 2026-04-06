import { CourseYamlSchema } from './schemas/course-yaml.schema';

// ─── Course scaffolding ────────────────────────────────────────────────────

export function scaffoldCourseObject(topic: string, options: { hours?: number; source?: string }) {
  const slug = topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return {
    course: {
      id: slug,
      name: topic,
      description: `Adaptive course on ${topic}`,
      estimatedHours: options.hours || 10,
      version: '2026.1',
      sourceDocument: options.source || 'TODO: Add source document',
    },
    sections: [
      { id: 'foundations', name: 'Foundations', description: 'Core concepts' },
      { id: 'application', name: 'Application', description: 'Applied concepts' },
    ],
    concepts: [
      {
        id: `${slug}-intro`,
        name: `Introduction to ${topic}`,
        section: 'foundations',
        difficulty: 2,
        estimatedMinutes: 15,
        tags: ['foundational'],
        prerequisites: [] as string[],
        knowledgePoints: [] as unknown[],
      },
    ],
  };
}

// ─── Brand scaffolding ─────────────────────────────────────────────────────

const NICHE_PRESETS: Record<string, { preset: string; tagline: string; headline: string }> = {
  education: { preset: 'blue', tagline: 'Learn smarter, not harder', headline: 'Master any subject with adaptive learning' },
  healthcare: { preset: 'emerald', tagline: 'Training that saves lives', headline: 'Adaptive healthcare education for professionals' },
  finance: { preset: 'slate', tagline: 'Build financial expertise', headline: 'Master finance with adaptive learning' },
  tech: { preset: 'indigo', tagline: 'Level up your skills', headline: 'Adaptive tech training that meets you where you are' },
  legal: { preset: 'amber', tagline: 'Know the law, pass the exam', headline: 'Adaptive legal education for exam success' },
  default: { preset: 'blue', tagline: 'Learn adaptively', headline: 'Personalized learning that works' },
};

export function scaffoldBrandObject(niche: string, options: { name?: string; domain?: string; orgSlug?: string }) {
  const config = NICHE_PRESETS[niche] || NICHE_PRESETS['default'];
  const slug = (options.name || niche).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const name = options.name || `${niche.charAt(0).toUpperCase() + niche.slice(1)} Academy`;
  const domain = options.domain || `${slug}.graspful.ai`;

  return {
    brand: {
      id: slug,
      name,
      domain,
      tagline: config.tagline,
      logoUrl: '/icon.svg',
      orgSlug: options.orgSlug || 'TODO: your-org-slug',
    },
    theme: {
      preset: config.preset,
      radius: '0.5rem',
    },
    landing: {
      hero: {
        headline: config.headline,
        subheadline: `${name} uses adaptive learning to help you master concepts faster.`,
        ctaText: 'Start Learning',
      },
      features: {
        heading: 'Why choose us?',
        items: [
          { title: 'Adaptive Learning', description: 'Content adapts to your knowledge level', icon: 'brain' },
          { title: 'Spaced Repetition', description: 'Review at optimal intervals for lasting memory', icon: 'clock' },
          { title: 'Progress Tracking', description: 'See exactly where you stand', icon: 'chart' },
        ],
      },
      howItWorks: {
        heading: 'How it works',
        items: [
          { title: 'Take a diagnostic', description: 'We assess what you already know' },
          { title: 'Learn adaptively', description: 'Focus on gaps, skip what you know' },
          { title: 'Master the material', description: 'Prove mastery through progressive challenges' },
        ],
      },
      faq: [] as unknown[],
    },
    pricing: {
      monthly: 0,
      currency: 'usd',
      trialDays: 0,
    },
    seo: {
      title: `${name} — Adaptive Learning`,
      description: config.tagline,
      keywords: [niche, 'learning', 'adaptive', 'education'],
    },
  };
}

// ─── Fill concept ──────────────────────────────────────────────────────────

export interface FillConceptOptions {
  kps?: number;
  problemsPerKp?: number;
}

export function fillConceptInRaw(raw: unknown, conceptId: string, options: FillConceptOptions): unknown {
  const parsed = CourseYamlSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Invalid course YAML: ${parsed.error.issues[0]?.message ?? 'unknown error'}`);
  }

  const data = parsed.data;
  const concept = data.concepts.find((c) => c.id === conceptId);
  if (!concept) {
    throw new Error(`Concept "${conceptId}" not found. Available: ${data.concepts.map((c) => c.id).join(', ')}`);
  }

  if (concept.knowledgePoints.length > 0) {
    throw new Error(`Concept "${conceptId}" already has ${concept.knowledgePoints.length} KP(s). Remove them first to regenerate.`);
  }

  const kpCount = options.kps ?? 2;
  const problemsPerKp = options.problemsPerKp ?? 3;

  const newKps = [];
  for (let i = 1; i <= kpCount; i++) {
    const problems = [];
    for (let j = 1; j <= problemsPerKp; j++) {
      problems.push({
        id: `${conceptId}-kp${i}-p${j}`,
        type: 'multiple_choice',
        question: `TODO: Write question ${j} for ${conceptId} KP${i}`,
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        correct: 0,
        explanation: 'TODO: Explain the correct answer',
        difficulty: Math.min(j + 1, 5),
      });
    }

    newKps.push({
      id: `${conceptId}-kp${i}`,
      instruction: `TODO: Write instruction for ${concept.name} — knowledge point ${i}`,
      workedExample: `TODO: Write a worked example for ${concept.name} — knowledge point ${i}`,
      problems,
    });
  }

  // Mutate the raw object to preserve YAML structure
  const rawObj = raw as Record<string, unknown>;
  const concepts = rawObj['concepts'] as Array<Record<string, unknown>>;
  const targetConcept = concepts.find((c) => c['id'] === conceptId);
  if (targetConcept) {
    targetConcept['knowledgePoints'] = newKps;
  }

  return rawObj;
}
