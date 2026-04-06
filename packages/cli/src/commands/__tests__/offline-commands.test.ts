import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as yaml from 'js-yaml';

const CLI_CWD = path.resolve(__dirname, '..', '..', '..');
const CLI_BIN = `node dist/index.js`;

function run(args: string, opts?: { cwd?: string }): string {
  try {
    return execSync(`${CLI_BIN} ${args}`, {
      cwd: opts?.cwd ?? CLI_CWD,
      encoding: 'utf-8',
      env: { ...process.env, NODE_ENV: 'test' },
    });
  } catch (e: any) {
    const msg = [e.stdout, e.stderr].filter(Boolean).join('\n');
    throw new Error(`CLI exited with code ${e.status}:\n${msg}`);
  }
}

describe('offline CLI commands', () => {
  let tmpdir: string;

  beforeEach(() => {
    tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'graspful-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpdir, { recursive: true, force: true });
  });

  // ── create course ─────────────────────────────────────────────────────

  describe('graspful create course', () => {
    it('scaffolds a valid YAML file with correct course id', () => {
      const outFile = path.join(tmpdir, 'course.yaml');
      run(`create course --topic "Test Course" --hours 5 -o ${outFile}`);

      expect(fs.existsSync(outFile)).toBe(true);

      const parsed = yaml.load(fs.readFileSync(outFile, 'utf-8')) as any;
      expect(parsed.course).toBeDefined();
      expect(parsed.course.id).toBe('test-course');
      expect(parsed.course.name).toBe('Test Course');
      expect(parsed.course.estimatedHours).toBe(5);
      expect(parsed.sections).toBeInstanceOf(Array);
      expect(parsed.concepts).toBeInstanceOf(Array);
      expect(parsed.concepts.length).toBeGreaterThan(0);
    });

    it('outputs to stdout when no -o flag is given', () => {
      const stdout = run('create course --topic "Stdout Test" --hours 3');
      const parsed = yaml.load(stdout) as any;
      expect(parsed.course.id).toBe('stdout-test');
    });
  });

  // ── create brand ──────────────────────────────────────────────────────

  describe('graspful create brand', () => {
    it('scaffolds a valid brand YAML file', () => {
      const outFile = path.join(tmpdir, 'brand.yaml');
      run(`create brand --niche tech --name "Tech Academy" -o ${outFile}`);

      expect(fs.existsSync(outFile)).toBe(true);

      const parsed = yaml.load(fs.readFileSync(outFile, 'utf-8')) as any;
      expect(parsed.brand).toBeDefined();
      expect(parsed.brand.name).toBe('Tech Academy');
      expect(parsed.brand.domain).toContain('tech-academy');
      expect(parsed.theme).toBeDefined();
      expect(parsed.landing).toBeDefined();
      expect(parsed.landing.hero).toBeDefined();
    });
  });

  // ── validate ──────────────────────────────────────────────────────────

  describe('graspful validate', () => {
    it('passes validation for a scaffolded course file', () => {
      const courseFile = path.join(tmpdir, 'course.yaml');
      run(`create course --topic "Validation Test" --hours 4 -o ${courseFile}`);

      const output = run(`validate ${courseFile}`);
      expect(output).toContain('PASS');
    });

    it('exits non-zero for invalid YAML', () => {
      const badFile = path.join(tmpdir, 'bad.yaml');
      fs.writeFileSync(badFile, 'not: a: valid: course');

      expect(() => run(`validate ${badFile}`)).toThrow();
    });
  });

  // ── describe ──────────────────────────────────────────────────────────

  describe('graspful describe', () => {
    it('shows concept count for a scaffolded course', () => {
      const courseFile = path.join(tmpdir, 'course.yaml');
      run(`create course --topic "Describe Test" --hours 6 -o ${courseFile}`);

      const output = run(`describe ${courseFile}`);
      expect(output).toContain('Concepts:');
      expect(output).toContain('KPs:');
    });

    it('returns JSON when --format json is used', () => {
      const courseFile = path.join(tmpdir, 'course.yaml');
      run(`create course --topic "JSON Describe" --hours 2 -o ${courseFile}`);

      const output = run(`--format json describe ${courseFile}`);
      const parsed = JSON.parse(output);
      expect(parsed.concepts).toBeDefined();
      expect(typeof parsed.concepts).toBe('number');
    });
  });

  // ── fill concept ──────────────────────────────────────────────────────

  describe('graspful fill concept', () => {
    it('adds KP stubs to a concept and updates the file', () => {
      const courseFile = path.join(tmpdir, 'course.yaml');
      run(`create course --topic "Fill Test" --hours 3 -o ${courseFile}`);

      // The scaffold creates a concept with id "{slug}-intro"
      const conceptId = 'fill-test-intro';
      run(`fill concept ${courseFile} ${conceptId}`);

      const updated = yaml.load(fs.readFileSync(courseFile, 'utf-8')) as any;
      const concept = updated.concepts.find((c: any) => c.id === conceptId);
      expect(concept).toBeDefined();
      expect(concept.knowledgePoints.length).toBeGreaterThan(0);
      expect(concept.knowledgePoints[0].problems.length).toBeGreaterThan(0);
    });

    it('respects --kps and --problems flags', () => {
      const courseFile = path.join(tmpdir, 'course.yaml');
      run(`create course --topic "KP Count" --hours 3 -o ${courseFile}`);

      run(`fill concept ${courseFile} kp-count-intro --kps 3 --problems 2`);

      const updated = yaml.load(fs.readFileSync(courseFile, 'utf-8')) as any;
      const concept = updated.concepts.find((c: any) => c.id === 'kp-count-intro');
      expect(concept.knowledgePoints).toHaveLength(3);
      expect(concept.knowledgePoints[0].problems).toHaveLength(2);
    });

    it('errors when concept id does not exist', () => {
      const courseFile = path.join(tmpdir, 'course.yaml');
      run(`create course --topic "Missing Concept" --hours 3 -o ${courseFile}`);

      expect(() => run(`fill concept ${courseFile} nonexistent-id`)).toThrow();
    });
  });

  // ── review ────────────────────────────────────────────────────────────

  describe('graspful review', () => {
    it('outputs a score line for a filled course', () => {
      const courseFile = path.join(tmpdir, 'course.yaml');
      run(`create course --topic "Review Test" --hours 3 -o ${courseFile}`);
      run(`fill concept ${courseFile} review-test-intro`);

      // Review may pass or fail, but it should always output a score
      let output: string;
      try {
        output = run(`review ${courseFile}`);
      } catch (e: any) {
        // review exits non-zero on failure — grab stdout from the error
        output = e.message;
      }
      expect(output).toContain('Score:');
    });

    it('returns structured JSON with --format json', () => {
      const courseFile = path.join(tmpdir, 'course.yaml');
      run(`create course --topic "JSON Review" --hours 3 -o ${courseFile}`);
      run(`fill concept ${courseFile} json-review-intro`);

      let output: string;
      try {
        output = run(`--format json review ${courseFile}`);
      } catch (e: any) {
        // Even on failure the JSON is in stdout
        output = e.message;
      }

      // Extract JSON from the output (may be wrapped in error message)
      const jsonMatch = output.match(/\{[\s\S]*\}/);
      expect(jsonMatch).not.toBeNull();
      const parsed = JSON.parse(jsonMatch![0]);
      expect(parsed.score).toBeDefined();
      expect(typeof parsed.passed).toBe('boolean');
    });
  });
});
