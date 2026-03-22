/**
 * k6 load test for graspful API.
 *
 * Usage:
 *   k6 run scripts/load-test.js --env API_URL=http://localhost:3000
 *
 * Authenticated endpoints (required for meaningful tests):
 *   k6 run scripts/load-test.js \
 *     --env API_URL=http://localhost:3000 \
 *     --env AUTH_TOKEN=<jwt> \
 *     --env ORG_ID=<uuid> \
 *     --env COURSE_ID=<uuid>
 */
import http from "k6/http";
import { check, group, sleep, fail } from "k6";
import { Rate, Trend } from "k6/metrics";

// ── Custom Metrics ──────────────────────────────────────────────────────────

const errorRate = new Rate("errors");
const healthDuration = new Trend("health_duration");
const courseListDuration = new Trend("course_list_duration");
const nextTaskDuration = new Trend("next_task_duration");
const enrollDuration = new Trend("enroll_duration");
const startLessonDuration = new Trend("start_lesson_duration");
const submitAnswerDuration = new Trend("submit_answer_duration");
const completeLessonDuration = new Trend("complete_lesson_duration");
const masteryDuration = new Trend("mastery_duration");
const studySessionDuration = new Trend("study_session_duration");

// ── Config ──────────────────────────────────────────────────────────────────

const BASE_URL = __ENV.API_URL || "http://localhost:3000";
const API = `${BASE_URL}/api/v1`;
const AUTH_TOKEN = __ENV.AUTH_TOKEN || "";
const ORG_ID = __ENV.ORG_ID || "";
const COURSE_ID = __ENV.COURSE_ID || "";

// Warn loudly if AUTH_TOKEN is missing — unauthenticated runs only hit /health
if (!AUTH_TOKEN) {
  console.warn(
    "⚠️  AUTH_TOKEN not provided. Only health checks will run. " +
      "Set --env AUTH_TOKEN=<jwt> for meaningful load tests.",
  );
}

export const options = {
  scenarios: {
    smoke: {
      executor: "ramping-vus",
      stages: [
        { duration: "30s", target: 50 },
        { duration: "1m", target: 100 },
        { duration: "2m", target: 100 },
        { duration: "30s", target: 0 },
      ],
      exec: "smokeTest",
    },
    ...(AUTH_TOKEN
      ? {
          study_session: {
            executor: "ramping-vus",
            stages: [
              { duration: "30s", target: 10 },
              { duration: "1m", target: 30 },
              { duration: "2m", target: 30 },
              { duration: "30s", target: 0 },
            ],
            exec: "studySessionScenario",
            startTime: "10s",
          },
        }
      : {}),
  },
  thresholds: {
    http_req_duration: ["p(95)<500"],
    errors: ["rate<0.01"], // 99%+ success rate
    next_task_duration: ["p(95)<400"],
    submit_answer_duration: ["p(95)<400"],
    start_lesson_duration: ["p(95)<400"],
    complete_lesson_duration: ["p(95)<400"],
  },
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function authHeaders() {
  return {
    Authorization: `Bearer ${AUTH_TOKEN}`,
    "Content-Type": "application/json",
  };
}

function courseBase() {
  return `${API}/orgs/${ORG_ID}/courses/${COURSE_ID}`;
}

// ── Scenario: Smoke (health + read-only endpoints) ──────────────────────────

export function smokeTest() {
  // 1. Health check (always)
  group("health", () => {
    const res = http.get(`${API}/health`);
    healthDuration.add(res.timings.duration);
    check(res, { "health: status 200": (r) => r.status === 200 }) ||
      errorRate.add(1);
  });

  sleep(0.5);

  if (!AUTH_TOKEN) return;

  // 2. List courses
  group("list courses", () => {
    const res = http.get(`${API}/orgs/${ORG_ID}/courses`, {
      headers: authHeaders(),
    });
    courseListDuration.add(res.timings.duration);
    check(res, { "courses: status 200": (r) => r.status === 200 }) ||
      errorRate.add(1);
  });

  sleep(0.5);

  // 3. Get next task
  if (COURSE_ID) {
    group("next task", () => {
      const res = http.get(`${courseBase()}/next-task`, {
        headers: authHeaders(),
      });
      nextTaskDuration.add(res.timings.duration);
      check(res, {
        "next-task: status 2xx": (r) => r.status >= 200 && r.status < 300,
      }) || errorRate.add(1);
    });
  }

  sleep(0.5);

  // 4. Get mastery
  if (COURSE_ID) {
    group("mastery", () => {
      const res = http.get(`${courseBase()}/mastery`, {
        headers: authHeaders(),
      });
      masteryDuration.add(res.timings.duration);
      check(res, {
        "mastery: status 2xx": (r) => r.status >= 200 && r.status < 300,
      }) || errorRate.add(1);
    });
  }

  sleep(0.5);

  // 5. Gamification XP
  if (ORG_ID) {
    group("gamification xp", () => {
      const res = http.get(`${API}/orgs/${ORG_ID}/gamification/xp`, {
        headers: authHeaders(),
      });
      check(res, {
        "xp: status 2xx": (r) => r.status >= 200 && r.status < 300,
      }) || errorRate.add(1);
    });
  }

  sleep(1);
}

// ── Scenario: Sequential Study Session ──────────────────────────────────────
//
// Simulates a realistic user flow:
//   enroll → get next task → start lesson → answer problems → complete lesson
//

export function studySessionScenario() {
  if (!AUTH_TOKEN || !ORG_ID || !COURSE_ID) {
    fail("study_session requires AUTH_TOKEN, ORG_ID, and COURSE_ID");
  }

  const hdrs = authHeaders();
  const base = courseBase();

  // 1. Enroll (idempotent on the backend)
  let enrollRes;
  group("enroll", () => {
    enrollRes = http.post(`${base}/enroll`, null, { headers: hdrs });
    enrollDuration.add(enrollRes.timings.duration);
    check(enrollRes, {
      "enroll: status 2xx": (r) => r.status >= 200 && r.status < 300,
    }) || errorRate.add(1);
  });

  sleep(1);

  // 2. Get next task to find a concept to study
  let conceptId = null;
  group("next task (study)", () => {
    const res = http.get(`${base}/next-task`, { headers: hdrs });
    nextTaskDuration.add(res.timings.duration);
    const ok = check(res, {
      "next-task: status 2xx": (r) => r.status >= 200 && r.status < 300,
    });
    if (!ok) {
      errorRate.add(1);
      return;
    }
    try {
      const body = JSON.parse(res.body);
      conceptId = body.conceptId || body.concept?.id || null;
    } catch (_) {
      // body may not be JSON
    }
  });

  if (!conceptId) {
    sleep(2);
    return; // nothing to study
  }

  sleep(0.5);

  // 3. Start lesson
  let lessonProblems = [];
  group("start lesson", () => {
    const res = http.post(`${base}/lessons/${conceptId}/start`, null, {
      headers: hdrs,
    });
    startLessonDuration.add(res.timings.duration);
    const ok = check(res, {
      "start-lesson: status 2xx": (r) => r.status >= 200 && r.status < 300,
    });
    if (!ok) {
      errorRate.add(1);
      return;
    }
    try {
      const body = JSON.parse(res.body);
      lessonProblems = body.problems || [];
    } catch (_) {
      // ignore
    }
  });

  sleep(1);

  // 4. Answer up to 3 problems from the lesson
  const answerable = lessonProblems.slice(0, 3);
  for (const problem of answerable) {
    group("submit answer", () => {
      const payload = JSON.stringify({
        problemId: problem.id,
        answer: problem.choices ? problem.choices[0] : "test-answer",
        responseTimeMs: Math.floor(Math.random() * 3000) + 1000,
      });
      const res = http.post(`${base}/lessons/${conceptId}/answer`, payload, {
        headers: hdrs,
      });
      submitAnswerDuration.add(res.timings.duration);
      check(res, {
        "answer: status 2xx": (r) => r.status >= 200 && r.status < 300,
      }) || errorRate.add(1);
    });

    sleep(0.5);
  }

  // 5. Complete lesson
  group("complete lesson", () => {
    const res = http.post(`${base}/lessons/${conceptId}/complete`, null, {
      headers: hdrs,
    });
    completeLessonDuration.add(res.timings.duration);
    check(res, {
      "complete-lesson: status 2xx": (r) => r.status >= 200 && r.status < 300,
    }) || errorRate.add(1);
  });

  sleep(2);
}
