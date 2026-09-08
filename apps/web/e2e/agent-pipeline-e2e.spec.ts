import { test, expect } from "@playwright/test";
import { runQualityGate } from "@graspful/shared";
import { parse } from "yaml";
import { getE2eEnvironment } from "../../../scripts/e2e-env";

const testEnv = getE2eEnvironment(process.env);
const BACKEND_URL = testEnv.NEXT_PUBLIC_BACKEND_URL;
const GRASPFUL_BRAND = "graspful";
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ─── Shared state across serial tests ──────────────────────────────────────

let creatorApiKey: string;
let creatorOrgSlug: string;
let creatorEmail: string;
const creatorPassword = "TestPassword123!";

let learnerJwt: string;
let learnerEmail: string;
const learnerPassword = "TestPassword123!";
const SUPABASE_URL = testEnv.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = testEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let courseId: string;
let academyId: string;
let diagnosticSessionId: string;
let diagnosticQuestionNumber: number;
let diagnosticQuestion: DiagnosticQuestion;

interface DiagnosticQuestion {
  id: string;
  type: "multiple_choice" | "true_false" | "fill_blank";
  questionText: string;
  options?: Array<{ id: string; text: string }>;
}

const courseSlug = `e2e-pipeline-${Date.now()}`;

// ─── Course YAML: REST API Design ──────────────────────────────────────────
//
// A real course on REST API Design with 4 concepts, each with 2 KPs and
// 3+ problems per KP. Every question tests a specific concept with one
// clearly correct answer, plausible distractors, and a teaching explanation.
// ────────────────────────────────────────────────────────────────────────────

function buildFullCourseYaml(): string {
  return `
course:
  id: ${courseSlug}
  name: "REST API Design"
  description: "Learn to design clean, predictable REST APIs — resources, methods, status codes, and versioning."
  estimatedHours: 5
  version: "2026.1"

sections:
  - id: foundations
    name: Foundations
    description: Core REST concepts and resource modeling

  - id: operations
    name: Operations
    description: HTTP methods, status codes, and error handling

concepts:
  # ── Concept 1: Resources and URIs (root) ────────────────────────
  - id: resources-and-uris
    name: "Resources and URIs"
    section: foundations
    difficulty: 1
    estimatedMinutes: 20
    tags: [rest, resources, uri]
    prerequisites: []
    knowledgePoints:
      - id: ru-kp1
        instruction: "In REST, a resource is an entity or concept the API exposes, such as a user, order, or product. A URI (Uniform Resource Identifier) identifies each resource. Use nouns in URIs; HTTP methods express the action. Nested URIs such as /orders/789/items identify related resources, here the items belonging to order 789."
        workedExample: "Good: GET /api/users/42 retrieves user 42. Bad: GET /api/getUser?id=42 — the verb 'get' is redundant since GET already means 'retrieve.' The noun-based URI /api/users/42 is cleaner and follows REST conventions."
        problems:
          - id: ru-kp1-p1
            type: multiple_choice
            question: "Which URI follows REST naming conventions for retrieving a specific product?"
            options: ["/api/getProduct/5", "/api/products/5", "/api/product/fetch?id=5", "/api/v1/retrieveProduct/5"]
            correct: 1
            explanation: "REST URIs use nouns to identify resources. /api/products/5 uses the noun 'products' and the HTTP method (GET) expresses the action."
            difficulty: 1
          - id: ru-kp1-p2
            type: true_false
            question: "In REST API design, URIs should contain verbs like 'create' or 'delete' to describe the operation."
            correct: "false"
            explanation: "URIs should use nouns to identify resources. The HTTP method (GET, POST, PUT, DELETE) describes the operation, not the URI."
            difficulty: 2
          - id: ru-kp1-p3
            type: multiple_choice
            question: "What does the URI /api/orders/789/items represent in a REST API?"
            options: ["A function that lists items", "The items sub-resource belonging to order 789", "An RPC call to the items service", "A query parameter for filtering orders"]
            correct: 1
            explanation: "Nested URIs model relationships. /api/orders/789/items represents the collection of items belonging to order 789 — a sub-resource."
            difficulty: 3

      - id: ru-kp2
        instruction: "REST collections use plural nouns: /users, /products, /orders. A specific resource within a collection is addressed by appending its ID: /users/42. Use consistent pluralization throughout your API to make it predictable."
        workedExample: "An e-commerce API might have: GET /api/products (list all), GET /api/products/15 (single product), GET /api/products/15/reviews (reviews for product 15). The plural 'products' stays consistent."
        problems:
          - id: ru-kp2-p1
            type: multiple_choice
            question: "Which URI structure is most consistent for a REST API with users and their posts?"
            options: ["/user/1/post/5", "/users/1/posts/5", "/getUser/1/getPosts/5", "/api/user_posts?user=1&post=5"]
            correct: 1
            explanation: "REST uses plural nouns consistently: /users/1/posts/5 identifies post 5 belonging to user 1."
            difficulty: 2
          - id: ru-kp2-p2
            type: fill_blank
            question: "In REST, a URI like /api/customers represents a ___ of customer resources."
            correct: "collection"
            explanation: "A plural noun URI without a specific ID represents the entire collection. Adding an ID like /api/customers/10 identifies a single resource."
            difficulty: 1
          - id: ru-kp2-p3
            type: true_false
            question: "Mixing singular and plural nouns in REST URIs (e.g., /user/1/orders) is considered a best practice."
            correct: "false"
            explanation: "Consistent pluralization improves predictability. Use /users/1/orders, not /user/1/orders."
            difficulty: 3

  # ── Concept 2: Representations and Content Negotiation ──────────
  - id: representations
    name: "Representations and Content Negotiation"
    section: foundations
    difficulty: 2
    estimatedMinutes: 20
    tags: [rest, representations, content-negotiation]
    prerequisites: [resources-and-uris]
    knowledgePoints:
      - id: rep-kp1
        instruction: "A resource can have multiple representations — JSON, XML, HTML. The client requests a preferred format using the Accept header. The server responds with the chosen format and declares it in the Content-Type header. This decouples the resource identity from its format."
        workedExample: "A client sends GET /api/users/42 with Accept: application/json. The server returns the user data as JSON with Content-Type: application/json. A different client could request Accept: text/xml and receive XML for the same resource."
        problems:
          - id: rep-kp1-p1
            type: multiple_choice
            question: "Which HTTP header does a client use to request a JSON response from a REST API?"
            options: ["Content-Type: application/json", "Accept: application/json", "Format: json", "Response-Type: json"]
            correct: 1
            explanation: "The Accept header tells the server which media type the client wants. Content-Type describes the body of the current request, not the desired response format."
            difficulty: 2
          - id: rep-kp1-p2
            type: true_false
            question: "Content negotiation allows the same URI to return different data formats depending on the client's request headers."
            correct: "true"
            explanation: "Content negotiation uses the Accept header to let the same URI serve JSON, XML, or other formats — decoupling resource identity from representation."
            difficulty: 1
          - id: rep-kp1-p3
            type: multiple_choice
            question: "A server returns Content-Type: application/xml. What does this tell the client?"
            options: ["The client must send XML in future requests", "The response body is formatted as XML", "The server only accepts XML", "The API version is XML-based"]
            correct: 1
            explanation: "Content-Type in a response declares the media type of the response body. It does not constrain future requests or indicate server-wide limitations."
            difficulty: 3

      - id: rep-kp2
        instruction: "JSON is a common format for REST APIs. A self-link gives clients the resource URI so they can follow it without building the URL themselves. Opaque identifiers, such as UUIDs, make sequential resource IDs harder to guess. The server must still check the caller's permission to access each resource."
        workedExample: "GET /api/products/prod_xk9v2 returns an id (prod_xk9v2), name (Widget), price (29.99), and self-link (/api/products/prod_xk9v2). The client can follow the self-link. The server checks access even when the client supplies a valid opaque ID."
        problems:
          - id: rep-kp2-p1
            type: multiple_choice
            question: "Why is it recommended to use opaque identifiers (like UUIDs) instead of auto-increment integers in REST APIs?"
            options: ["They are shorter to type", "They make sequential resource IDs harder to guess", "They sort alphabetically", "They are required by the HTTP specification"]
            correct: 1
            explanation: "Opaque IDs make sequential guesses such as /users/1 and /users/2 less useful. Every request still needs an access check; an opaque ID does not grant permission."
            difficulty: 3
          - id: rep-kp2-p2
            type: fill_blank
            question: "The lesson describes ___ as a common data format for REST API responses."
            correct: "JSON"
            explanation: "JSON (JavaScript Object Notation) is lightweight, human-readable, and supported by virtually every programming language and HTTP client."
            difficulty: 1
          - id: rep-kp2-p3
            type: true_false
            question: "Including a self-link in a REST response helps clients navigate the API without hardcoding URLs."
            correct: "true"
            explanation: "Self-links let clients discover and follow resource URLs dynamically, reducing tight coupling between client and server."
            difficulty: 2

  # ── Concept 3: HTTP Methods for CRUD ────────────────────────────
  - id: http-methods-crud
    name: "HTTP Methods for CRUD"
    section: operations
    difficulty: 3
    estimatedMinutes: 25
    tags: [rest, http-methods, crud]
    prerequisites: [resources-and-uris]
    knowledgePoints:
      - id: hmc-kp1
        instruction: "REST maps CRUD operations to HTTP methods. POST creates a new resource in a collection. GET reads a resource or collection. PUT replaces a resource entirely. PATCH updates specific fields. DELETE removes a resource. POST targets the collection URI; PUT and PATCH target the specific resource URI."
        workedExample: "Create: POST /api/users with a body containing name Alice. Read: GET /api/users/42. Update name only: PATCH /api/users/42 with name Bob. Replace entirely: PUT /api/users/42 with full object. Delete: DELETE /api/users/42."
        problems:
          - id: hmc-kp1-p1
            type: multiple_choice
            question: "To add a new order to a REST API, which method and URI combination is correct?"
            options: ["GET /api/orders", "POST /api/orders", "PUT /api/orders", "POST /api/orders/new"]
            correct: 1
            explanation: "POST to the collection URI (/api/orders) creates a new resource. The server assigns the ID and returns 201 Created."
            difficulty: 1
          - id: hmc-kp1-p2
            type: multiple_choice
            question: "What is the key difference between PUT and PATCH in REST?"
            options: ["PUT is faster than PATCH", "PUT replaces the entire resource; PATCH updates only specific fields", "PATCH creates resources; PUT updates them", "There is no practical difference"]
            correct: 1
            explanation: "PUT sends the complete resource and replaces it entirely. PATCH sends only the fields that changed, making partial updates possible."
            difficulty: 3
          - id: hmc-kp1-p3
            type: fill_blank
            question: "The HTTP method used to remove a resource from a REST API is ___."
            correct: "DELETE"
            explanation: "DELETE /api/resources/42 requests the server to remove that resource. A successful deletion typically returns 204 No Content."
            difficulty: 2

      - id: hmc-kp2
        instruction: "Safety and idempotency are key properties of HTTP methods. Safe methods (GET, HEAD) never modify resources. Idempotent methods (GET, PUT, DELETE) produce the same outcome when called multiple times. POST is neither safe nor idempotent — each call can create a new resource."
        workedExample: "Calling DELETE /api/users/42 once deletes the user. Calling it again returns 404 but doesn't cause additional side effects — idempotent. Calling POST /api/users twice with the same body creates two separate users — not idempotent."
        problems:
          - id: hmc-kp2-p1
            type: true_false
            question: "Calling PUT /api/products/10 multiple times with the same body always produces the same result."
            correct: "true"
            explanation: "PUT is idempotent — repeating the same request replaces the resource with the same data each time, producing an identical outcome."
            difficulty: 2
          - id: hmc-kp2-p2
            type: multiple_choice
            question: "Which HTTP method can create a duplicate resource if called repeatedly with the same data?"
            options: ["GET", "PUT", "DELETE", "POST"]
            correct: 3
            explanation: "POST is not idempotent. Each call to POST /api/orders with the same body can create a new order, leading to duplicates."
            difficulty: 3
          - id: hmc-kp2-p3
            type: multiple_choice
            question: "Why is GET considered a 'safe' HTTP method?"
            options: ["It uses encryption", "It never modifies server-side resources", "It cannot return errors", "It requires authentication"]
            correct: 1
            explanation: "A safe method only retrieves data without causing side effects. GET and HEAD are safe; POST, PUT, PATCH, and DELETE are not."
            difficulty: 4

  # ── Concept 4: Status Codes and Error Responses ─────────────────
  - id: status-codes-errors
    name: "Status Codes and Error Responses"
    section: operations
    difficulty: 4
    estimatedMinutes: 25
    tags: [rest, status-codes, errors]
    prerequisites: [http-methods-crud]
    knowledgePoints:
      - id: sce-kp1
        instruction: "REST APIs use HTTP status codes to communicate outcomes. 200 OK for successful reads, 201 Created after POST, 204 No Content after DELETE. 400 Bad Request for invalid input, 401 Unauthorized for missing credentials, 403 Forbidden for insufficient permissions, 404 Not Found for missing resources, 409 Conflict for duplicate or state violations."
        workedExample: "POST /api/users with valid data returns 201 Created. POST /api/users with an email that already exists returns 409 Conflict. GET /api/users/999 for a nonexistent user returns 404 Not Found."
        problems:
          - id: sce-kp1-p1
            type: multiple_choice
            question: "After successfully creating a new resource via POST, which status code should the server return?"
            options: ["200 OK", "201 Created", "204 No Content", "302 Found"]
            correct: 1
            explanation: "201 Created indicates a new resource was successfully created. The response typically includes a Location header pointing to the new resource."
            difficulty: 1
          - id: sce-kp1-p2
            type: multiple_choice
            question: "A client sends a POST request with a duplicate email. Which status code best communicates this conflict?"
            options: ["400 Bad Request", "404 Not Found", "409 Conflict", "500 Internal Server Error"]
            correct: 2
            explanation: "409 Conflict signals that the request could not be completed because it conflicts with the current state of the resource — like a uniqueness constraint violation."
            difficulty: 3
          - id: sce-kp1-p3
            type: true_false
            question: "A 401 Unauthorized response means the user is authenticated but lacks permission for the requested action."
            correct: "false"
            explanation: "401 means authentication is missing or invalid. 403 Forbidden means authenticated but lacking permission. The naming is historically confusing."
            difficulty: 4

      - id: sce-kp2
        instruction: "Error responses should be structured and machine-readable. Include a consistent error object with fields like 'error', 'message', and optionally 'details' for field-level validation errors. Never return raw stack traces to clients — they leak implementation details."
        workedExample: "A well-structured 400 response includes an error code (validation_error), a message (Invalid request body), and details listing each field issue (e.g. email must be a valid email address). This tells the client exactly what went wrong and where."
        problems:
          - id: sce-kp2-p1
            type: multiple_choice
            question: "Which error response format is most useful for API clients?"
            options: ["A plain text message like 'Something went wrong'", "A structured JSON object with error type, message, and field-level details", "An HTML error page", "Just the HTTP status code with an empty body"]
            correct: 1
            explanation: "Structured JSON errors with a type, message, and field-level details let clients programmatically handle errors and display specific feedback to users."
            difficulty: 2
          - id: sce-kp2-p2
            type: true_false
            question: "Including a stack trace in API error responses helps clients debug issues faster."
            correct: "false"
            explanation: "Stack traces expose internal implementation details and are a security risk. Error responses should contain a human-readable message and machine-parseable error code, not internal debugging information."
            difficulty: 3
          - id: sce-kp2-p3
            type: fill_blank
            question: "A well-designed REST API error response should always include at least an error type and a human-readable ___."
            correct: "message"
            explanation: "A message field provides a human-readable explanation of what went wrong, complementing the machine-readable error type and HTTP status code."
            difficulty: 2
`.trim();
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function creatorAuthHeaders(extra?: Record<string, string>) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${creatorApiKey}`,
    ...extra,
  };
}

function learnerAuthHeaders(extra?: Record<string, string>) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${learnerJwt}`,
    ...extra,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe.serial(
  "Onboarding-to-Learner Pipeline — register, create course, publish, enroll, diagnostic, browse",
  () => {
    // ══════════════════════════════════════════════════════════════════
    //  CREATOR SIDE (API-level)
    // ══════════════════════════════════════════════════════════════════

    // ── Step 1: Register creator ───────────────────────────────────
    test("step 1: register creator — returns apiKey, orgSlug, userId", async ({
      request,
    }) => {
      creatorEmail = `e2e-creator-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@test.example.com`;

      // Local test setup only. Production registration uses browser auth;
      // the password-based API endpoint returns 410 in production.
      const res = await request.post(`${BACKEND_URL}/auth/register`, {
        data: { email: creatorEmail, password: creatorPassword },
        headers: { "Content-Type": "application/json" },
      });

      expect(res.status()).toBe(201);

      const body = await res.json();
      expect(body.userId).toMatch(UUID_RE);
      expect(body.orgSlug).toBeTruthy();
      expect(body.apiKey).toMatch(/^gsk_/);

      creatorApiKey = body.apiKey;
      creatorOrgSlug = body.orgSlug;
    });

    // ── Step 2: Brand auto-created ─────────────────────────────────
    test("step 2: brand auto-created — by-domain returns brand with matching orgSlug", async ({
      request,
    }) => {
      const domain = `${creatorOrgSlug}.graspful.ai`;

      const res = await request.get(
        `${BACKEND_URL}/brands/by-domain/${domain}`,
        { headers: { "Content-Type": "application/json" } }
      );

      expect(res.status()).toBe(200);

      const body = await res.json();
      expect(body.orgSlug).toBe(creatorOrgSlug);
    });

    // Step 2b: Registration provides readable default brand content.
    test("step 2b: default brand has a readable name and landing text", async ({
      request,
    }) => {
      const domain = `${creatorOrgSlug}.graspful.ai`;

      const res = await request.get(
        `${BACKEND_URL}/brands/by-domain/${domain}`,
        { headers: { "Content-Type": "application/json" } }
      );

      expect(res.status()).toBe(200);

      const brand = await res.json();

      // Brand name should NOT equal the raw slug
      expect(brand.name).not.toBe(creatorOrgSlug);

      // Brand name should be title-cased (not lowercase with spaces)
      expect(brand.name).not.toBe(creatorOrgSlug.replace(/-/g, ' '));

      // Landing hero headline should NOT be the raw slug
      const headline = brand.landing?.hero?.headline;
      expect(headline).toBeTruthy();
      expect(headline).not.toBe(creatorOrgSlug);
      expect(headline).not.toBe(creatorOrgSlug.replace(/-/g, ' '));
      expect(headline.length).toBeGreaterThanOrEqual(10);

      // Brand tagline should be at least 10 characters
      expect(brand.tagline).toBeTruthy();
      expect(brand.tagline.length).toBeGreaterThanOrEqual(10);
    });

    // Step 3: Validate the authored fixture before importing it.
    test("step 3: authored course passes the full local quality gate", async () => {
      const yaml = buildFullCourseYaml();
      const review = runQualityGate(parse(yaml));
      expect(review.failures).toEqual([]);
      expect(review.passed).toBe(true);
      expect(review.score).toBe("10/10");

      expect(yaml).toContain(`id: ${courseSlug}`);
      expect(yaml).toContain("resources-and-uris");
      expect(yaml).toContain("representations");
      expect(yaml).toContain("http-methods-crud");
      expect(yaml).toContain("status-codes-errors");

      // Verify no placeholder content
      expect(yaml).not.toContain("TODO");
      expect(yaml).not.toContain("Option A");
      expect(yaml).not.toContain("Option B");
      expect(yaml).not.toContain("Write question");
    });

    // ── Step 4: Fill concepts — verify real content ────────────────
    test("step 4: all concepts filled with real KPs and problems", async () => {
      const yaml = buildFullCourseYaml();

      // 4 concepts * 2 KPs * 3 problems = 24 problems
      const problemIds = yaml.match(
        /id: (ru|rep|hmc|sce)-kp\d+-p\d+/g
      );
      expect(problemIds).toBeTruthy();
      expect(problemIds!.length).toBe(24);

      // All questions have real text (not placeholders)
      const questionLines = yaml.match(/question: ".+"/g);
      expect(questionLines).toBeTruthy();
      for (const line of questionLines!) {
        expect(line).not.toContain("TODO");
        expect(line.length).toBeGreaterThan(20);
      }

      // All options have real text
      const optionArrays = yaml.match(/options: \[.+\]/g);
      expect(optionArrays).toBeTruthy();
      for (const arr of optionArrays!) {
        expect(arr).not.toMatch(/Option [A-D]/);
      }

      // All explanations are substantive
      const explanationLines = yaml.match(/explanation: ".+"/g);
      expect(explanationLines).toBeTruthy();
      for (const line of explanationLines!) {
        expect(line.length).toBeGreaterThan(20);
      }
    });

    // ── Step 5: Validate ───────────────────────────────────────────
    test("step 5: validate filled course — passes schema and DAG checks", async ({
      request,
    }) => {
      const yaml = buildFullCourseYaml();

      const res = await request.post(
        `${BACKEND_URL}/orgs/${creatorOrgSlug}/courses/review`,
        {
          data: { yaml },
          headers: creatorAuthHeaders(),
        }
      );

      expect(res.status()).toBe(201);

      const body = await res.json();
      expect(body.stats.concepts).toBe(4);
      expect(body.stats.kps).toBe(8);
      expect(body.stats.problems).toBe(24);
    });

    // Step 6: Publication requires all quality checks to pass.
    test("step 6: review passes all 10 quality checks", async ({ request }) => {
      const yaml = buildFullCourseYaml();

      const res = await request.post(
        `${BACKEND_URL}/orgs/${creatorOrgSlug}/courses/review`,
        {
          data: { yaml },
          headers: creatorAuthHeaders(),
        }
      );

      expect(res.status()).toBe(201);

      const body = await res.json();

      expect(body.failures).toEqual([]);
      expect(body.passed).toBe(true);
      expect(body.score).toBe("10/10");
      expect(body.stats.concepts).toBe(4);
      expect(body.stats.kps).toBe(8);
      expect(body.stats.problems).toBe(24);
    });

    // ── Step 7: Import + Publish ───────────────────────────────────
    test("step 7: import and publish course — verify counts", async ({
      request,
    }) => {
      const yaml = buildFullCourseYaml();

      // Import with publish: true
      const importRes = await request.post(
        `${BACKEND_URL}/orgs/${creatorOrgSlug}/courses/import`,
        {
          data: { yaml, publish: true },
          headers: creatorAuthHeaders(),
        }
      );

      expect(importRes.status()).toBe(201);

      const importBody = await importRes.json();
      expect(importBody.courseId).toMatch(UUID_RE);
      expect(importBody.conceptCount).toBe(4);
      expect(importBody.knowledgePointCount).toBe(8);
      expect(importBody.problemCount).toBe(24);
      expect(importBody.warnings).toEqual([]);
      expect(importBody.published, JSON.stringify(importBody.reviewFailures)).toBe(true);

      courseId = importBody.courseId;

      // Retrieve the course to get the academyId
      const coursesRes = await request.get(
        `${BACKEND_URL}/orgs/${creatorOrgSlug}/courses`,
        { headers: creatorAuthHeaders() }
      );
      expect(coursesRes.status()).toBe(200);

      const courses = await coursesRes.json();
      const ourCourse = courses.find(
        (c: { id: string }) => c.id === courseId
      );
      expect(ourCourse).toBeTruthy();
      expect(ourCourse.academyId).toBeTruthy();

      academyId = ourCourse.academyId;
    });

    // ══════════════════════════════════════════════════════════════════
    //  LEARNER SIDE (API-level)
    // ══════════════════════════════════════════════════════════════════

    // ── Step 8: Register learner ───────────────────────────────────
    test("step 8: register a second user (learner)", async ({ request }) => {
      learnerEmail = `e2e-learner-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@test.example.com`;

      const res = await request.post(`${BACKEND_URL}/auth/register`, {
        data: { email: learnerEmail, password: learnerPassword },
        headers: { "Content-Type": "application/json" },
      });

      expect(res.status()).toBe(201);

      const body = await res.json();
      expect(body.apiKey).toMatch(/^gsk_/);
      expect(body.userId).toMatch(UUID_RE);

      // Get a Supabase JWT — needed for learner endpoints that use SupabaseAuthGuard
      const signInRes = await fetch(
        `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ email: learnerEmail, password: learnerPassword }),
        }
      );
      expect(signInRes.status).toBeLessThan(300);
      const signInBody = await signInRes.json();
      learnerJwt = signInBody.access_token;
      expect(learnerJwt).toBeTruthy();

      // Add learner to creator's org so OrgMembershipGuard passes
      const provisionRes = await fetch(`${BACKEND_URL}/auth/provision`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${learnerJwt}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ brandOrgSlug: creatorOrgSlug }),
      });
      expect(provisionRes.status).toBeLessThan(300);
    });

    // ── Step 9: Learner enrolls ────────────────────────────────────
    test("step 9: learner enrolls in the academy", async ({ request }) => {
      const res = await request.post(
        `${BACKEND_URL}/orgs/${creatorOrgSlug}/academies/${academyId}/enroll`,
        { headers: learnerAuthHeaders() }
      );

      // Accept 201 (new enrollment) or 200 (already enrolled)
      expect([200, 201]).toContain(res.status());
    });

    // ── Step 10: Diagnostic start ──────────────────────────────────
    test("step 10: diagnostic start returns real question content", async ({
      request,
    }) => {
      const res = await request.post(
        `${BACKEND_URL}/orgs/${creatorOrgSlug}/academies/${academyId}/diagnostic/start`,
        { headers: learnerAuthHeaders() }
      );

      expect(res.status(), await res.text()).toBe(201);

      const session = await res.json();
      expect(session.sessionId).toMatch(UUID_RE);
      expect(session.isComplete).toBe(false);
      expect(session.questionNumber).toBe(1);
      expect(session.totalEstimated).toBe(4);

      validateDiagnosticQuestion(session.question);
      diagnosticSessionId = session.sessionId;
      diagnosticQuestionNumber = session.questionNumber;
      diagnosticQuestion = session.question;
    });

    // ── Step 11: Answer a question ─────────────────────────────────
    test("step 11: submit answer — next question also has real text", async ({
      request,
    }) => {
      // Starting again must resume the same pending diagnostic question.
      const startRes = await request.post(
        `${BACKEND_URL}/orgs/${creatorOrgSlug}/academies/${academyId}/diagnostic/start`,
        { headers: learnerAuthHeaders() }
      );

      expect(startRes.status(), await startRes.text()).toBe(201);
      const resumed = await startRes.json();
      expect(resumed.sessionId).toBe(diagnosticSessionId);
      expect(resumed.question.id).toBe(diagnosticQuestion.id);
      expect(resumed.questionNumber).toBe(diagnosticQuestionNumber);

      const answer = diagnosticQuestion.type === "multiple_choice"
        ? diagnosticQuestion.options![0].id
        : diagnosticQuestion.type === "true_false" ? true : "test answer";

      const answerRes = await request.post(
        `${BACKEND_URL}/orgs/${creatorOrgSlug}/academies/${academyId}/diagnostic/answer`,
        {
          data: {
            sessionId: diagnosticSessionId,
            answer,
            responseTimeMs: 3000,
          },
          headers: learnerAuthHeaders(),
        }
      );

      expect(answerRes.status(), await answerRes.text()).toBe(201);

      const nextState = await answerRes.json();
      expect(nextState.sessionId).toBe(diagnosticSessionId);
      expect(nextState.isComplete).toBe(false);
      expect(typeof nextState.wasCorrect).toBe("boolean");
      expect(nextState.questionNumber).toBe(diagnosticQuestionNumber + 1);
      validateDiagnosticQuestion(nextState.question);
      expect(nextState.question.id).not.toBe(diagnosticQuestion.id);
      diagnosticQuestionNumber = nextState.questionNumber;
      diagnosticQuestion = nextState.question;
    });

    // ══════════════════════════════════════════════════════════════════
    //  BROWSER VERIFICATION (Playwright)
    // ══════════════════════════════════════════════════════════════════

    // Step 12: Creator dashboard shows the published course.
    test("step 12: creator dashboard shows the published course", async ({
      page,
    }) => {
      // Sign in as the creator (who has membership in the org)
      await page.context().addCookies([
        {
          name: "dev-brand-override",
          value: GRASPFUL_BRAND,
          domain: "localhost",
          path: "/",
        },
      ]);

      await page.goto("/sign-in?redirect=%2Fcreator");
      await page.getByLabel("Email").fill(creatorEmail);
      await page.getByLabel("Password").fill(creatorPassword);
      await page.getByRole("button", { name: "Sign In" }).click();
      await page.waitForURL(/\/creator$/, { timeout: 15_000 });
      await expect(
        page.getByText("REST API Design")
      ).toBeVisible({ timeout: 15_000 });
    });

    // ── Step 13: Diagnostic UI — real question text ────────────────
    test("step 13: diagnostic UI shows real question and option text", async ({
      page,
    }) => {
      // Sign in as the learner
      await page.context().addCookies([
        {
          name: "dev-brand-override",
          value: creatorOrgSlug,
          domain: "localhost",
          path: "/",
        },
      ]);

      const diagnosticPath = `/academy/${academyId}/diagnostic`;
      await page.goto(`/sign-in?redirect=${encodeURIComponent(diagnosticPath)}`);
      await page.getByLabel("Email").fill(learnerEmail);
      await page.getByLabel("Password").fill(learnerPassword);
      await page.getByRole("button", { name: "Sign In" }).click();
      await page.waitForURL((url) => url.pathname.endsWith("/diagnostic"), { timeout: 15_000 });

      await expect(page.getByRole("heading", { name: "Diagnostic Assessment" })).toBeVisible({
        timeout: 15_000,
      });
      await expect(page.getByText(`Question ${diagnosticQuestionNumber} of ~4`, { exact: true })).toBeVisible();
      await expect(page.getByText(diagnosticQuestion.questionText, { exact: true })).toBeVisible();

      const submitButton = page.getByRole("button", { name: "Submit Answer" });
      let submitAnswer: () => Promise<void>;

      if (diagnosticQuestion.type === "multiple_choice") {
        const optionButtons = page.getByRole("radio");
        await expect(optionButtons).toHaveCount(diagnosticQuestion.options!.length);
        for (const option of diagnosticQuestion.options!) {
          await expect(page.getByRole("radio", { name: option.text, exact: true })).toBeVisible();
        }
        await optionButtons.first().click();
        await expect(submitButton).toBeVisible();
        await expect(submitButton).toBeEnabled();
        submitAnswer = () => submitButton.click();
      } else if (diagnosticQuestion.type === "true_false") {
        const trueButton = page.getByRole("button", { name: "True", exact: true });
        const falseButton = page.getByRole("button", { name: "False", exact: true });
        await expect(trueButton).toBeVisible();
        await expect(falseButton).toBeVisible();
        submitAnswer = () => trueButton.click();
      } else {
        expect(diagnosticQuestion.type).toBe("fill_blank");
        const answerInput = page.getByRole("textbox", { name: "Your answer" });
        await expect(answerInput).toBeVisible();
        await answerInput.fill("test answer");
        await expect(submitButton).toBeEnabled();
        submitAnswer = () => submitButton.click();
      }

      const answerPath = `/orgs/${creatorOrgSlug}/academies/${academyId}/diagnostic/answer`;
      const [answerRes] = await Promise.all([
        page.waitForResponse((response) =>
          response.url().endsWith(answerPath) && response.request().method() === "POST"),
        submitAnswer(),
      ]);
      expect(answerRes.status(), await answerRes.text()).toBe(201);
      const nextState = await answerRes.json();
      expect(nextState.sessionId).toBe(diagnosticSessionId);

      if (nextState.isComplete === true) {
        expect(nextState.questionsAnswered).toBe(diagnosticQuestionNumber);
        expect(nextState.result.totalConcepts).toBe(4);
        await expect(page.getByRole("heading", { name: "Diagnostic Complete" })).toBeVisible();
        await expect(page.getByText(`You answered ${diagnosticQuestionNumber} questions across 4 concepts.`, { exact: true })).toBeVisible();
      } else {
        expect(nextState.isComplete).toBe(false);
        expect(nextState.questionNumber).toBe(diagnosticQuestionNumber + 1);
        validateDiagnosticQuestion(nextState.question);
        await expect(page.getByText(nextState.question.questionText, { exact: true })).toBeVisible();
        await expect(page.getByText(`Question ${nextState.questionNumber} of ~4`, { exact: true })).toBeVisible();
      }
    });
  }
);

// ─── Validation helper ────────────────────────────────────────────────────────

function validateDiagnosticQuestion(question: DiagnosticQuestion) {
  expect(question).toBeTruthy();
  expect(question.id).toMatch(UUID_RE);
  expect(["multiple_choice", "true_false", "fill_blank"]).toContain(question.type);
  expect(question.questionText).toBeTruthy();
  expect(question.questionText.length).toBeGreaterThan(15);
  expect(question.questionText).not.toContain("TODO");
  expect(question.questionText).not.toContain("Write question");

  if (question.type === "multiple_choice") {
    expect(question.options).toBeDefined();
    expect(question.options!.length).toBeGreaterThanOrEqual(2);
    for (const option of question.options!) {
      expect(option.id).toEqual(expect.any(String));
      expect(option.text).toBeTruthy();
      expect(option.text.length).toBeGreaterThan(1);
      expect(option.text).not.toMatch(/^Option [A-D]$/);
    }
  }
}
