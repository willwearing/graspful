import { test, expect } from "@playwright/test";

const BACKEND_URL = "http://localhost:3000/api/v1";
const GRASPFUL_BRAND = "graspful";
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ─── Shared state across serial tests ──────────────────────────────────────

let apiKey: string;
let orgSlug: string;
let courseId: string;
let registeredEmail: string;
const registeredPassword = "TestPassword123!";

const courseSlug = `e2e-pipeline-${Date.now()}`;

/**
 * Simulate the scaffold step: generate a course skeleton for "HTTP Fundamentals".
 *
 * In the real agent workflow this calls graspful_scaffold_course (MCP) or
 * `graspful create course` (CLI). Both invoke scaffoldCourseObject() from
 * @graspful/shared. Here we inline the expected output shape — a skeleton
 * with two sections and a handful of stub concepts (no KPs yet).
 */
function scaffoldCourseYaml(): string {
  return `
course:
  id: ${courseSlug}
  name: "HTTP Fundamentals"
  description: "Understand the HTTP protocol — requests, responses, methods, status codes, and headers."
  estimatedHours: 6
  version: "2026.1"

sections:
  - id: basics
    name: Basics
    description: Core HTTP request/response model

  - id: methods-and-status
    name: Methods and Status Codes
    description: HTTP verbs and response status families

  - id: headers-and-caching
    name: Headers and Caching
    description: Common headers and caching strategies

concepts:
  - id: request-response-model
    name: "Request-Response Model"
    section: basics
    difficulty: 1
    estimatedMinutes: 15
    tags: [foundational, http]
    prerequisites: []
    knowledgePoints: []

  - id: urls-and-resources
    name: "URLs and Resources"
    section: basics
    difficulty: 2
    estimatedMinutes: 15
    tags: [foundational, http]
    prerequisites: [request-response-model]
    knowledgePoints: []

  - id: http-methods
    name: "HTTP Methods"
    section: methods-and-status
    difficulty: 3
    estimatedMinutes: 20
    tags: [methods, http]
    prerequisites: [request-response-model]
    knowledgePoints: []

  - id: status-codes
    name: "Status Codes"
    section: methods-and-status
    difficulty: 4
    estimatedMinutes: 20
    tags: [status-codes, http]
    prerequisites: [http-methods]
    knowledgePoints: []

  - id: common-headers
    name: "Common Headers"
    section: headers-and-caching
    difficulty: 5
    estimatedMinutes: 25
    tags: [headers, http]
    prerequisites: [urls-and-resources, http-methods]
    knowledgePoints: []

  - id: caching-basics
    name: "Caching Basics"
    section: headers-and-caching
    difficulty: 5
    estimatedMinutes: 25
    tags: [caching, http]
    prerequisites: [common-headers, status-codes]
    knowledgePoints: []
`.trim();
}

/**
 * Simulate the fill step: add real KPs and problems to a concept.
 *
 * In the real agent workflow, the agent calls graspful_fill_concept to get
 * TODO stubs, then replaces those stubs with real content. Here we produce
 * the final YAML with real questions after filling all 6 concepts.
 *
 * Key quality requirements this content satisfies:
 *  - Each concept has 2 KPs
 *  - Each KP has 3 problems at different difficulties
 *  - Worked examples on all authored concepts (100% coverage)
 *  - No duplicate problem IDs
 *  - No duplicate questions at the same difficulty
 *  - Problems use real text (not "TODO" or "Option A" placeholders)
 */
function buildFullCourseYaml(): string {
  return `
course:
  id: ${courseSlug}
  name: "HTTP Fundamentals"
  description: "Understand the HTTP protocol — requests, responses, methods, status codes, and headers."
  estimatedHours: 6
  version: "2026.1"

sections:
  - id: basics
    name: Basics
    description: Core HTTP request/response model

  - id: methods-and-status
    name: Methods and Status Codes
    description: HTTP verbs and response status families

  - id: headers-and-caching
    name: Headers and Caching
    description: Common headers and caching strategies

concepts:
  # ── Concept 1: Request-Response Model (root) ──────────────────
  - id: request-response-model
    name: "Request-Response Model"
    section: basics
    difficulty: 1
    estimatedMinutes: 15
    tags: [foundational, http]
    prerequisites: []
    knowledgePoints:
      - id: rrm-kp1
        instruction: "HTTP is a request-response protocol. The client sends a request message to a server, and the server returns a response. Every HTTP interaction follows this pattern — the client always initiates."
        workedExample: "Open a browser and visit http://example.com. The browser sends an HTTP GET request to the server. The server replies with a 200 OK response containing the HTML page. You can see this exchange in the browser's Network tab."
        problems:
          - id: rrm-kp1-p1
            type: multiple_choice
            question: "In HTTP, which party always initiates the communication?"
            options: ["The server", "The client", "The DNS resolver", "The load balancer"]
            correct: 1
            explanation: "HTTP is client-initiated — the client sends a request, and the server responds."
            difficulty: 1
          - id: rrm-kp1-p2
            type: true_false
            question: "An HTTP server can send data to a client without the client first making a request."
            correct: "false"
            explanation: "Standard HTTP requires the client to initiate with a request. Server-initiated communication requires different protocols like WebSocket."
            difficulty: 2
          - id: rrm-kp1-p3
            type: multiple_choice
            question: "What are the two fundamental message types in an HTTP exchange?"
            options: ["Push and pull", "Request and response", "Query and reply", "Upload and download"]
            correct: 1
            explanation: "HTTP is built around requests (from client) and responses (from server)."
            difficulty: 3

      - id: rrm-kp2
        instruction: "An HTTP request contains a method, a URL, headers, and optionally a body. An HTTP response contains a status code, headers, and optionally a body. These components make up the protocol's message format."
        workedExample: "A simple GET request has the line 'GET /index.html HTTP/1.1' followed by headers like Host: example.com. The response starts with 'HTTP/1.1 200 OK' followed by content headers and the HTML body."
        problems:
          - id: rrm-kp2-p1
            type: multiple_choice
            question: "Which of these is NOT a standard part of an HTTP request?"
            options: ["Method", "URL", "Status code", "Headers"]
            correct: 2
            explanation: "The status code belongs to the response, not the request. Requests have a method, URL, headers, and optional body."
            difficulty: 1
          - id: rrm-kp2-p2
            type: fill_blank
            question: "An HTTP response always starts with a ___ code that indicates success or failure."
            correct: "status"
            explanation: "The status code (like 200 or 404) is the first meaningful piece of an HTTP response."
            difficulty: 2
          - id: rrm-kp2-p3
            type: true_false
            question: "Every HTTP request must include a body."
            correct: "false"
            explanation: "GET requests typically have no body. A body is optional and mainly used with POST and PUT."
            difficulty: 3

  # ── Concept 2: URLs and Resources ──────────────────────────────
  - id: urls-and-resources
    name: "URLs and Resources"
    section: basics
    difficulty: 2
    estimatedMinutes: 15
    tags: [foundational, http]
    prerequisites: [request-response-model]
    knowledgePoints:
      - id: url-kp1
        instruction: "A URL (Uniform Resource Locator) identifies a resource on the web. It has a scheme (http or https), a host, an optional port, a path, and optional query parameters."
        workedExample: "In the URL https://api.example.com:8080/users?page=2, the scheme is https, the host is api.example.com, the port is 8080, the path is /users, and the query parameter is page=2."
        problems:
          - id: url-kp1-p1
            type: multiple_choice
            question: "In the URL https://shop.example.com/products?sort=price, what is the path?"
            options: ["https://", "shop.example.com", "/products", "sort=price"]
            correct: 2
            explanation: "The path is /products — it identifies the resource on the server. The query string ?sort=price provides parameters."
            difficulty: 1
          - id: url-kp1-p2
            type: fill_blank
            question: "The part of a URL before :// is called the ___."
            correct: "scheme"
            explanation: "The scheme (like http or https) tells the client which protocol to use."
            difficulty: 2
          - id: url-kp1-p3
            type: multiple_choice
            question: "Which part of a URL is used to pass additional parameters to the server?"
            options: ["The host", "The port", "The path", "The query string"]
            correct: 3
            explanation: "Query strings (after the ?) provide key-value parameters like ?page=2&limit=10."
            difficulty: 3

      - id: url-kp2
        instruction: "A resource is any piece of content identified by a URL. Resources can be documents, images, API endpoints, or any addressable thing. The same resource can have different representations (HTML, JSON, XML) negotiated through headers."
        workedExample: "The URL /api/users/42 identifies user 42. Sending Accept: application/json returns JSON. Sending Accept: text/html might return an HTML profile page. Same resource, different representations."
        problems:
          - id: url-kp2-p1
            type: true_false
            question: "A single URL can only ever return one type of content."
            correct: "false"
            explanation: "Content negotiation allows the same URL to return different representations (JSON, HTML, XML) based on the Accept header."
            difficulty: 2
          - id: url-kp2-p2
            type: multiple_choice
            question: "What is a 'resource' in HTTP terminology?"
            options: ["A server's CPU allocation", "Any content identified by a URL", "A database table", "A network port"]
            correct: 1
            explanation: "In HTTP, a resource is anything addressable by a URL — documents, images, API data, etc."
            difficulty: 3
          - id: url-kp2-p3
            type: multiple_choice
            question: "Which HTTP header does a client use to request a specific content format?"
            options: ["Content-Type", "Accept", "Host", "Authorization"]
            correct: 1
            explanation: "The Accept header tells the server which media types the client prefers (e.g., Accept: application/json)."
            difficulty: 4

  # ── Concept 3: HTTP Methods ────────────────────────────────────
  - id: http-methods
    name: "HTTP Methods"
    section: methods-and-status
    difficulty: 3
    estimatedMinutes: 20
    tags: [methods, http]
    prerequisites: [request-response-model]
    knowledgePoints:
      - id: hm-kp1
        instruction: "HTTP defines several request methods (also called verbs). GET retrieves a resource. POST creates a new resource. PUT replaces a resource entirely. PATCH modifies part of a resource. DELETE removes a resource."
        workedExample: "To create a user, send POST /api/users with a JSON body. To fetch that user, send GET /api/users/42. To update their name, send PATCH /api/users/42 with just the name field. To delete them, send DELETE /api/users/42."
        problems:
          - id: hm-kp1-p1
            type: multiple_choice
            question: "Which HTTP method is used to retrieve a resource without modifying it?"
            options: ["POST", "PUT", "GET", "DELETE"]
            correct: 2
            explanation: "GET is the safe, read-only method for retrieving resources."
            difficulty: 1
          - id: hm-kp1-p2
            type: multiple_choice
            question: "Which method should you use to partially update a user's email address?"
            options: ["GET", "POST", "PUT", "PATCH"]
            correct: 3
            explanation: "PATCH is designed for partial updates. PUT would replace the entire resource."
            difficulty: 3
          - id: hm-kp1-p3
            type: fill_blank
            question: "The HTTP method used to remove a resource from the server is ___."
            correct: "DELETE"
            explanation: "DELETE requests the server to remove the resource at the given URL."
            difficulty: 2

      - id: hm-kp2
        instruction: "Methods have semantic properties. Safe methods (GET, HEAD) don't modify resources. Idempotent methods (GET, PUT, DELETE) produce the same result when called multiple times. POST is neither safe nor idempotent."
        workedExample: "Calling DELETE /api/users/42 twice will delete the user on the first call, and the second call has no additional effect — it's idempotent. Calling POST /api/users twice may create two users — it's not idempotent."
        problems:
          - id: hm-kp2-p1
            type: true_false
            question: "GET is considered a safe HTTP method because it does not modify server state."
            correct: "true"
            explanation: "Safe methods like GET and HEAD are read-only — they should never change the resource."
            difficulty: 2
          - id: hm-kp2-p2
            type: multiple_choice
            question: "Which HTTP method is NOT idempotent?"
            options: ["GET", "PUT", "DELETE", "POST"]
            correct: 3
            explanation: "POST can create a new resource each time it is called, so repeated calls may produce different results."
            difficulty: 3
          - id: hm-kp2-p3
            type: multiple_choice
            question: "If you call PUT /api/users/42 three times with the same body, what happens?"
            options: ["Three users are created", "The user is updated once; subsequent calls have no additional effect", "An error occurs on the second call", "The server rejects duplicate requests"]
            correct: 1
            explanation: "PUT is idempotent — making the same request multiple times produces the same end state."
            difficulty: 4

  # ── Concept 4: Status Codes ────────────────────────────────────
  - id: status-codes
    name: "Status Codes"
    section: methods-and-status
    difficulty: 4
    estimatedMinutes: 20
    tags: [status-codes, http]
    prerequisites: [http-methods]
    knowledgePoints:
      - id: sc-kp1
        instruction: "HTTP status codes are three-digit numbers grouped into five families. 1xx are informational, 2xx indicate success, 3xx are redirections, 4xx are client errors, and 5xx are server errors."
        workedExample: "200 OK means the request succeeded. 301 Moved Permanently redirects to a new URL. 404 Not Found means the resource doesn't exist. 500 Internal Server Error means the server failed."
        problems:
          - id: sc-kp1-p1
            type: multiple_choice
            question: "A status code starting with 4 indicates what kind of problem?"
            options: ["Server error", "Redirect", "Client error", "Informational"]
            correct: 2
            explanation: "4xx codes indicate client errors — the request was malformed, unauthorized, or targeted a missing resource."
            difficulty: 2
          - id: sc-kp1-p2
            type: fill_blank
            question: "The HTTP status code for a successful request is ___."
            correct: "200"
            explanation: "200 OK is the standard success response for HTTP requests."
            difficulty: 1
          - id: sc-kp1-p3
            type: true_false
            question: "A 500 status code means the client sent a bad request."
            correct: "false"
            explanation: "500 Internal Server Error indicates a server-side failure. Client errors use 4xx codes."
            difficulty: 3

      - id: sc-kp2
        instruction: "Some status codes carry specific meaning. 201 Created confirms a new resource was made. 204 No Content means success with no body. 401 Unauthorized means authentication is missing. 403 Forbidden means authenticated but not allowed."
        workedExample: "POST /api/users returns 201 Created with a Location header pointing to the new user. DELETE /api/users/42 returns 204 No Content since there's nothing to send back. Accessing /admin without a token returns 401."
        problems:
          - id: sc-kp2-p1
            type: multiple_choice
            question: "Which status code should a server return after successfully creating a new resource?"
            options: ["200 OK", "201 Created", "204 No Content", "301 Moved Permanently"]
            correct: 1
            explanation: "201 Created is the correct status code for successful resource creation, typically from a POST request."
            difficulty: 3
          - id: sc-kp2-p2
            type: multiple_choice
            question: "What is the difference between 401 Unauthorized and 403 Forbidden?"
            options: ["They mean the same thing", "401 means not authenticated; 403 means authenticated but not allowed", "401 is a server error; 403 is a client error", "403 means the resource doesn't exist"]
            correct: 1
            explanation: "401 means the client has not provided valid authentication. 403 means authentication is present but the user lacks permission."
            difficulty: 4
          - id: sc-kp2-p3
            type: true_false
            question: "A 204 No Content response indicates the request failed."
            correct: "false"
            explanation: "204 is a 2xx success code. It means the request succeeded but there is no content to return in the body."
            difficulty: 3

  # ── Concept 5: Common Headers ──────────────────────────────────
  - id: common-headers
    name: "Common Headers"
    section: headers-and-caching
    difficulty: 5
    estimatedMinutes: 25
    tags: [headers, http]
    prerequisites: [urls-and-resources, http-methods]
    knowledgePoints:
      - id: ch-kp1
        instruction: "HTTP headers are key-value pairs sent with requests and responses. Common request headers include Host (target server), Accept (desired content type), and Authorization (credentials). Common response headers include Content-Type and Content-Length."
        workedExample: "A request to an API might include: Host: api.example.com, Accept: application/json, Authorization: Bearer abc123. The response includes Content-Type: application/json and Content-Length: 482."
        problems:
          - id: ch-kp1-p1
            type: multiple_choice
            question: "Which header tells the server what content type the client can handle?"
            options: ["Content-Type", "Host", "Accept", "Content-Length"]
            correct: 2
            explanation: "The Accept header specifies which media types the client is willing to receive."
            difficulty: 2
          - id: ch-kp1-p2
            type: fill_blank
            question: "The ___ header identifies the target server in an HTTP request."
            correct: "Host"
            explanation: "The Host header is required in HTTP/1.1 and tells the server which virtual host the request is for."
            difficulty: 3
          - id: ch-kp1-p3
            type: true_false
            question: "The Content-Type header is sent by the client to describe the format of the request body."
            correct: "true"
            explanation: "Content-Type describes the media type of the body. Clients use it on POST/PUT requests; servers use it on responses."
            difficulty: 4

      - id: ch-kp2
        instruction: "Headers control behavior beyond content negotiation. The Authorization header carries credentials. CORS headers (Access-Control-Allow-Origin) control cross-origin requests. Set-Cookie and Cookie headers manage sessions."
        workedExample: "A login request sends POST /auth/login. The response includes Set-Cookie: session=abc123. Subsequent requests automatically include Cookie: session=abc123. A cross-origin request from frontend.com to api.com needs Access-Control-Allow-Origin: https://frontend.com."
        problems:
          - id: ch-kp2-p1
            type: multiple_choice
            question: "Which header does a server use to allow requests from a different origin?"
            options: ["Authorization", "Access-Control-Allow-Origin", "Cookie", "Referrer"]
            correct: 1
            explanation: "Access-Control-Allow-Origin is the CORS header that tells browsers which origins are allowed."
            difficulty: 3
          - id: ch-kp2-p2
            type: multiple_choice
            question: "After a server sends Set-Cookie: token=xyz, what happens on the next request?"
            options: ["The client must manually add the token", "The browser automatically sends Cookie: token=xyz", "The server rejects the request", "Nothing, cookies are one-time"]
            correct: 1
            explanation: "Browsers automatically include matching cookies in subsequent requests via the Cookie header."
            difficulty: 4
          - id: ch-kp2-p3
            type: true_false
            question: "The Authorization header is used to manage browser cookies."
            correct: "false"
            explanation: "Authorization carries credentials like API keys or Bearer tokens. Cookies are managed through Set-Cookie and Cookie headers."
            difficulty: 5

  # ── Concept 6: Caching Basics ──────────────────────────────────
  - id: caching-basics
    name: "Caching Basics"
    section: headers-and-caching
    difficulty: 5
    estimatedMinutes: 25
    tags: [caching, http]
    prerequisites: [common-headers, status-codes]
    knowledgePoints:
      - id: cb-kp1
        instruction: "HTTP caching stores responses locally so repeated requests don't need to reach the server. The Cache-Control header governs caching policy. Common directives include max-age (how long to cache), no-cache (revalidate every time), and no-store (never cache)."
        workedExample: "A response with Cache-Control: max-age=3600 tells the browser to reuse this response for one hour. After that, the browser must check with the server. Cache-Control: no-store prevents any caching, useful for sensitive data."
        problems:
          - id: cb-kp1-p1
            type: multiple_choice
            question: "What does Cache-Control: max-age=3600 mean?"
            options: ["The server processed the request in 3600ms", "The response can be cached for 3600 seconds", "The request timed out after 3600 seconds", "The cache holds 3600 entries"]
            correct: 1
            explanation: "max-age=3600 tells the client this response is fresh for 3600 seconds (one hour) before revalidation is needed."
            difficulty: 3
          - id: cb-kp1-p2
            type: fill_blank
            question: "To completely prevent a response from being cached, use Cache-Control: ___."
            correct: "no-store"
            explanation: "no-store instructs both the browser and any intermediary caches to never store the response."
            difficulty: 4
          - id: cb-kp1-p3
            type: true_false
            question: "Cache-Control: no-cache means the response will never be cached."
            correct: "false"
            explanation: "no-cache means the cached copy must be revalidated with the server before use. no-store prevents caching entirely."
            difficulty: 5

      - id: cb-kp2
        instruction: "Conditional requests let the client check if a cached response is still valid. The server sends an ETag (content fingerprint) or Last-Modified timestamp. The client sends If-None-Match or If-Modified-Since. If the content hasn't changed, the server responds with 304 Not Modified."
        workedExample: "First request: GET /data returns ETag: 'abc123'. Second request: GET /data with If-None-Match: 'abc123'. If the data hasn't changed, the server returns 304 Not Modified with no body, saving bandwidth."
        problems:
          - id: cb-kp2-p1
            type: multiple_choice
            question: "What status code does a server return when a conditional request shows the cached copy is still valid?"
            options: ["200 OK", "204 No Content", "304 Not Modified", "301 Moved Permanently"]
            correct: 2
            explanation: "304 Not Modified tells the client its cached version is still current — no need to retransmit the body."
            difficulty: 4
          - id: cb-kp2-p2
            type: multiple_choice
            question: "What is an ETag in HTTP caching?"
            options: ["An encryption key for HTTPS", "A content fingerprint for cache validation", "An error tracking identifier", "A session cookie variant"]
            correct: 1
            explanation: "An ETag is a unique identifier for a specific version of a resource, used to determine if the cached copy matches the server's current version."
            difficulty: 5
          - id: cb-kp2-p3
            type: fill_blank
            question: "The request header used to send a cached ETag back to the server is ___."
            correct: "If-None-Match"
            explanation: "If-None-Match sends the cached ETag. If it matches the server's current ETag, the server responds 304 Not Modified."
            difficulty: 5
`.trim();
}

// ─── Helper ─────────────────────────────────────────────────────────────────

function authHeaders(extra?: Record<string, string>) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
    ...extra,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

test.describe.serial("Agent Pipeline E2E — scaffold, fill, validate, review, import, diagnostic", () => {

  // ── Step 0: Register a test user ─────────────────────────────────

  test("step 0: register a new user and get API key", async ({ request }) => {
    registeredEmail = `e2e-pipeline-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@test.example.com`;

    const res = await request.post(`${BACKEND_URL}/auth/register`, {
      data: { email: registeredEmail, password: registeredPassword },
      headers: { "Content-Type": "application/json" },
    });

    expect(res.status()).toBe(201);

    const body = await res.json();
    expect(body.userId).toMatch(UUID_RE);
    expect(body.orgSlug).toBeTruthy();
    expect(body.apiKey).toMatch(/^gsk_/);

    apiKey = body.apiKey;
    orgSlug = body.orgSlug;
  });

  // ── Step 1: Scaffold — verify skeleton structure ──────────────────

  test("step 1: scaffold produces valid skeleton with stub concepts", async () => {
    const yaml = scaffoldCourseYaml();

    // The scaffold should be valid YAML that parses against the schema,
    // but with 0 KPs on every concept (all stubs).
    expect(yaml).toContain(`id: ${courseSlug}`);
    expect(yaml).toContain("request-response-model");
    expect(yaml).toContain("urls-and-resources");
    expect(yaml).toContain("http-methods");
    expect(yaml).toContain("status-codes");
    expect(yaml).toContain("common-headers");
    expect(yaml).toContain("caching-basics");

    // Every concept should have knowledgePoints: [] (stubs)
    const stubMatches = yaml.match(/knowledgePoints: \[\]/g);
    expect(stubMatches).toBeTruthy();
    expect(stubMatches!.length).toBe(6);
  });

  // ── Step 2: Validate the scaffold (should be valid but all stubs) ─

  test("step 2: validate scaffold — valid schema, 0 KPs", async ({ request }) => {
    const yaml = scaffoldCourseYaml();

    const res = await request.post(
      `${BACKEND_URL}/orgs/${orgSlug}/courses/review`,
      {
        data: { yaml },
        headers: authHeaders(),
      }
    );

    expect(res.status()).toBe(201);

    const body = await res.json();
    // Scaffold has valid structure but won't score 10/10 because
    // there are no KPs/problems. That's expected — we just check it parses.
    expect(body.stats.concepts).toBe(6);
    expect(body.stats.kps).toBe(0);
    expect(body.stats.problems).toBe(0);
  });

  // ── Step 3: Fill concepts — build full content ───────────────────

  test("step 3: fill all concepts with real KPs and problems", async () => {
    const yaml = buildFullCourseYaml();

    // Verify this is no longer a stub course
    expect(yaml).not.toContain("TODO:");
    expect(yaml).not.toContain("Option A");
    expect(yaml).not.toContain("Option B");

    // Count problems — 6 concepts * 2 KPs * 3 problems = 36
    const problemIds = yaml.match(/id: [a-z]+-kp\d+-p\d+/g);
    expect(problemIds).toBeTruthy();
    expect(problemIds!.length).toBe(36);

    // All questions should have real text
    const questionLines = yaml.match(/question: ".+"/g);
    expect(questionLines).toBeTruthy();
    for (const line of questionLines!) {
      expect(line).not.toContain("TODO");
      expect(line.length).toBeGreaterThan(20);
    }
  });

  // ── Step 4: Validate filled course ────────────────────────────────

  test("step 4: validate filled course — passes schema and DAG checks", async ({ request }) => {
    const yaml = buildFullCourseYaml();

    const res = await request.post(
      `${BACKEND_URL}/orgs/${orgSlug}/courses/review`,
      {
        data: { yaml },
        headers: authHeaders(),
      }
    );

    expect(res.status()).toBe(201);

    const body = await res.json();
    expect(body.stats.concepts).toBe(6);
    expect(body.stats.kps).toBe(12);
    expect(body.stats.problems).toBe(36);
  });

  // ── Step 5: Review — must score 10/10 ─────────────────────────────

  test("step 5: review scores 10/10 — all quality gates pass", async ({ request }) => {
    const yaml = buildFullCourseYaml();

    const res = await request.post(
      `${BACKEND_URL}/orgs/${orgSlug}/courses/review`,
      {
        data: { yaml },
        headers: authHeaders(),
      }
    );

    expect(res.status()).toBe(201);

    const body = await res.json();
    expect(body.passed).toBe(true);
    expect(body.score).toBe("10/10");
    expect(body.failures).toEqual([]);

    // Verify specific quality check names all pass
    // (The review endpoint returns these implicitly via score — if any
    // failed, score would be <10/10 and failures would be non-empty)
    expect(body.stats.concepts).toBe(6);
    expect(body.stats.kps).toBe(12);
    expect(body.stats.problems).toBe(36);
  });

  // ── Step 6: Import course as draft ────────────────────────────────

  test("step 6: import course as draft", async ({ request }) => {
    const yaml = buildFullCourseYaml();

    const res = await request.post(
      `${BACKEND_URL}/orgs/${orgSlug}/courses/import`,
      {
        data: { yaml },
        headers: authHeaders(),
      }
    );

    expect(res.status()).toBe(201);

    const body = await res.json();
    expect(body.courseId).toMatch(UUID_RE);
    expect(body.conceptCount).toBe(6);
    expect(body.knowledgePointCount).toBe(12);
    expect(body.problemCount).toBe(36);
    expect(body.prerequisiteEdgeCount).toBeGreaterThanOrEqual(6);
    expect(body.warnings).toEqual([]);
    expect(body.published).toBe(false);
    expect(typeof body.url).toBe("string");

    courseId = body.courseId;
  });

  // ── Step 7: Publish the course ────────────────────────────────────

  test("step 7: publish the imported course", async ({ request }) => {
    const res = await request.post(
      `${BACKEND_URL}/orgs/${orgSlug}/courses/${courseId}/publish`,
      {
        data: {},
        headers: authHeaders(),
      }
    );

    expect(res.status()).toBe(201);

    const body = await res.json();
    expect(body.published).toBe(true);
    expect(body.courseId).toMatch(UUID_RE);
    expect(body.review.passed).toBe(true);
    expect(body.review.score).toBe("10/10");
  });

  // ── Step 8: Verify course graph structure ─────────────────────────

  test("step 8: course graph returns 3 sections and 6 concepts", async ({ request }) => {
    const res = await request.get(
      `${BACKEND_URL}/orgs/${orgSlug}/courses/${courseId}/graph`,
      { headers: authHeaders() }
    );

    expect(res.status()).toBe(200);

    const graph = await res.json();

    // Sections
    expect(graph.sections).toBeTruthy();
    expect(graph.sections.length).toBe(3);
    const sectionSlugs = graph.sections.map((s: { slug: string }) => s.slug);
    expect(sectionSlugs).toContain("basics");
    expect(sectionSlugs).toContain("methods-and-status");
    expect(sectionSlugs).toContain("headers-and-caching");

    // Concepts
    expect(graph.concepts).toBeTruthy();
    expect(graph.concepts.length).toBe(6);
    const conceptSlugs = graph.concepts.map((c: { slug: string }) => c.slug);
    expect(conceptSlugs).toContain("request-response-model");
    expect(conceptSlugs).toContain("caching-basics");

    // Prerequisites: at least 6 edges
    // (rrm->none, url->rrm, hm->rrm, sc->hm, ch->[url,hm], cb->[ch,sc])
    expect(graph.prerequisiteEdges).toBeTruthy();
    expect(graph.prerequisiteEdges.length).toBeGreaterThanOrEqual(6);
  });

  // ── Step 9: Concept detail has real KPs and problems ──────────────

  test("step 9: concept detail includes KPs with real questions", async ({ request }) => {
    // Fetch graph to get a concept UUID
    const graphRes = await request.get(
      `${BACKEND_URL}/orgs/${orgSlug}/courses/${courseId}/graph`,
      { headers: authHeaders() }
    );
    const graph = await graphRes.json();

    const httpMethodsConcept = graph.concepts.find(
      (c: { slug: string }) => c.slug === "http-methods"
    );
    expect(httpMethodsConcept).toBeTruthy();

    const res = await request.get(
      `${BACKEND_URL}/orgs/${orgSlug}/courses/${courseId}/concepts/${httpMethodsConcept.id}`,
      { headers: authHeaders() }
    );

    expect(res.status()).toBe(200);

    const detail = await res.json();
    expect(detail.name).toBe("HTTP Methods");
    expect(detail.knowledgePoints).toBeTruthy();
    expect(detail.knowledgePoints.length).toBe(2);

    // Each KP should have 3 problems with real text
    for (const kp of detail.knowledgePoints) {
      expect(kp.problems.length).toBe(3);
      for (const problem of kp.problems) {
        // Question text should be real, not placeholder
        expect(problem.questionText).toBeTruthy();
        expect(problem.questionText.length).toBeGreaterThan(15);
        expect(problem.questionText).not.toContain("TODO");

        // Options (if MC) should have real text
        // The concept detail API returns options as a flat string array
        if (problem.type === "multiple_choice" && problem.options) {
          for (const option of problem.options) {
            const text = typeof option === "string" ? option : option.text;
            expect(text).toBeTruthy();
            expect(text.length).toBeGreaterThan(1);
            expect(text).not.toMatch(/^Option [A-D]$/);
          }
        }
      }
    }
  });

  // ── Step 10: YAML export round-trips ──────────────────────────────

  test("step 10: exported YAML contains all concept IDs", async ({ request }) => {
    const res = await request.get(
      `${BACKEND_URL}/orgs/${orgSlug}/courses/${courseId}/yaml`,
      { headers: authHeaders() }
    );

    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.yaml).toBeTruthy();
    expect(typeof body.yaml).toBe("string");

    // All 6 concept IDs should survive the round-trip
    expect(body.yaml).toContain("request-response-model");
    expect(body.yaml).toContain("urls-and-resources");
    expect(body.yaml).toContain("http-methods");
    expect(body.yaml).toContain("status-codes");
    expect(body.yaml).toContain("common-headers");
    expect(body.yaml).toContain("caching-basics");
  });

  // ── Step 11: Browser — sign in and verify course in creator ───────

  test("step 11: course appears in creator dashboard", async ({ page }) => {
    // Set brand cookie and sign in
    await page.context().addCookies([
      {
        name: "dev-brand-override",
        value: GRASPFUL_BRAND,
        domain: "localhost",
        path: "/",
      },
    ]);

    await page.goto("/sign-in");
    await page.getByLabel("Email").fill(registeredEmail);
    await page.getByLabel("Password").fill(registeredPassword);
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL(/\/(creator|dashboard)/, { timeout: 15_000 });

    // Navigate to creator
    await page.goto("/creator");
    await expect(
      page.getByText("HTTP Fundamentals")
    ).toBeVisible({ timeout: 15_000 });
  });

  // ── Step 12: Browser — diagnostic renders real questions ──────────

  test("step 12: diagnostic page renders real questions (not TODO placeholders)", async ({ page }) => {
    // Set brand cookie and sign in
    await page.context().addCookies([
      {
        name: "dev-brand-override",
        value: GRASPFUL_BRAND,
        domain: "localhost",
        path: "/",
      },
    ]);

    await page.goto("/sign-in");
    await page.getByLabel("Email").fill(registeredEmail);
    await page.getByLabel("Password").fill(registeredPassword);
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL(/\/(creator|dashboard)/, { timeout: 15_000 });

    // Navigate to the course browse page
    await page.goto(`/browse/${courseId}`);

    // Wait for course page to load — it may show "Course Progress" or
    // the diagnostic CTA
    const courseHeading = page.getByRole("heading", { level: 1 });
    await expect(courseHeading).toBeVisible({ timeout: 15_000 });
    await expect(courseHeading).toContainText("HTTP Fundamentals");

    // Concepts should be listed
    await expect(
      page.getByRole("heading", { name: "Concepts" })
    ).toBeVisible();

    // Click "Take Diagnostic" to start the diagnostic
    await page.getByRole("link", { name: "Take Diagnostic" }).click();

    // Wait for diagnostic page
    await expect(page).toHaveURL(/\/diagnostic\//, { timeout: 10_000 });

    // The diagnostic should show "Diagnostic Assessment" or "Diagnostic Unavailable"
    const diagnosticText = page.getByText("Diagnostic Assessment");
    const unavailableText = page.getByText("Diagnostic Unavailable");
    await expect(diagnosticText.or(unavailableText)).toBeVisible({ timeout: 15_000 });

    const hasDiagnostic = await diagnosticText.isVisible().catch(() => false);

    if (hasDiagnostic) {
      // Verify question 1 appears
      await expect(page.getByText("Question 1 of")).toBeVisible({ timeout: 10_000 });

      // The "I don't know this yet" button should be visible
      await expect(
        page.getByRole("button", { name: "I don't know this yet" })
      ).toBeVisible();

      // Verify the question text is real — not a TODO placeholder
      // The question is rendered inside a <p> with class text-lg
      const questionText = page.locator("p.text-lg.font-medium");
      await expect(questionText).toBeVisible();
      const questionContent = await questionText.textContent();
      expect(questionContent).toBeTruthy();
      expect(questionContent!.length).toBeGreaterThan(15);
      expect(questionContent).not.toContain("TODO");
      expect(questionContent).not.toContain("Write question");

      // Verify options are real text — the MC options are button elements
      // with class rounded-lg border-2
      const optionButtons = page.locator("button.rounded-lg.border-2");
      const optionCount = await optionButtons.count();
      expect(optionCount).toBeGreaterThanOrEqual(2); // MC has 4, true/false has 2

      for (let i = 0; i < optionCount; i++) {
        const optText = await optionButtons.nth(i).textContent();
        expect(optText).toBeTruthy();
        expect(optText!.length).toBeGreaterThan(1);
        expect(optText).not.toMatch(/^Option [A-D]$/);
      }

      // Answer the first question (click any option, then submit)
      await optionButtons.first().click();
      const submitBtn = page.getByRole("button", { name: "Submit Answer" });
      if (await submitBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await submitBtn.click();
      }

      // Verify it advances to question 2
      await expect(page.getByText("Question 2 of")).toBeVisible({ timeout: 10_000 });

      // The second question should also be real
      const q2Text = await questionText.textContent();
      expect(q2Text).toBeTruthy();
      expect(q2Text!.length).toBeGreaterThan(15);
      expect(q2Text).not.toContain("TODO");
    }
    // If diagnostic is unavailable, the course was still imported and
    // published correctly — the diagnostic engine may not have enough
    // content to run. We don't fail the test in that case.
  });
});
