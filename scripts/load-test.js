/**
 * k6 load test for niche-audio-prep API.
 *
 * Usage:
 *   k6 run scripts/load-test.js --env API_URL=http://localhost:3000
 *
 * Authenticated endpoints:
 *   k6 run scripts/load-test.js \
 *     --env API_URL=http://localhost:3000 \
 *     --env AUTH_TOKEN=<jwt> \
 *     --env ORG_ID=<uuid>
 */
import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

const errorRate = new Rate("errors");
const courseListDuration = new Trend("course_list_duration");
const healthDuration = new Trend("health_duration");

const BASE_URL = __ENV.API_URL || "http://localhost:3000";
const AUTH_TOKEN = __ENV.AUTH_TOKEN || "";

export const options = {
  stages: [
    { duration: "30s", target: 50 }, // Ramp up to 50 users
    { duration: "1m", target: 100 }, // Ramp up to 100 users
    { duration: "2m", target: 100 }, // Stay at 100 users
    { duration: "30s", target: 0 }, // Ramp down
  ],
  thresholds: {
    http_req_duration: ["p(95)<500"], // 95% of requests under 500ms
    errors: ["rate<0.05"], // Error rate under 5%
  },
};

const headers = AUTH_TOKEN
  ? {
      Authorization: `Bearer ${AUTH_TOKEN}`,
      "Content-Type": "application/json",
    }
  : { "Content-Type": "application/json" };

export default function () {
  // 1. Health check (unauthenticated)
  const healthRes = http.get(`${BASE_URL}/health`);
  healthDuration.add(healthRes.timings.duration);
  check(healthRes, {
    "health: status 200": (r) => r.status === 200,
  }) || errorRate.add(1);

  sleep(0.5);

  // 2. List courses (authenticated)
  if (AUTH_TOKEN) {
    const orgId = __ENV.ORG_ID || "";
    const coursesRes = http.get(`${BASE_URL}/orgs/${orgId}/courses`, {
      headers,
    });
    courseListDuration.add(coursesRes.timings.duration);
    check(coursesRes, {
      "courses: status 200": (r) => r.status === 200,
    }) || errorRate.add(1);

    sleep(0.5);

    // 3. Get course graph
    if (coursesRes.status === 200) {
      const courses = JSON.parse(coursesRes.body);
      if (courses.length > 0) {
        const courseId = courses[0].id;
        const graphRes = http.get(
          `${BASE_URL}/orgs/${orgId}/courses/${courseId}/graph`,
          { headers },
        );
        check(graphRes, {
          "graph: status 200": (r) => r.status === 200,
        }) || errorRate.add(1);
      }
    }

    sleep(0.5);

    // 4. Get next task (learning engine)
    if (orgId) {
      const nextTaskRes = http.get(
        `${BASE_URL}/orgs/${orgId}/learning/next-task`,
        { headers },
      );
      check(nextTaskRes, {
        "next-task: status 2xx": (r) =>
          r.status >= 200 && r.status < 300,
      }) || errorRate.add(1);
    }

    sleep(0.5);

    // 5. Get gamification stats
    if (orgId) {
      const xpRes = http.get(`${BASE_URL}/orgs/${orgId}/gamification/xp`, {
        headers,
      });
      check(xpRes, {
        "xp: status 2xx": (r) => r.status >= 200 && r.status < 300,
      }) || errorRate.add(1);
    }
  }

  sleep(1);
}
