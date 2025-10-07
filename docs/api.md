# MrWinRock API

Source: [src/app.ts](src/app.ts) • Router: [src/routes/index.ts](src/routes/index.ts)

- Public base: /
- API base: /api
- Admin base: /admin

The same resource routes are mounted under both /api and /admin. Authentication requirements differ by mount (see below).

## Authentication and headers

- x-api-key: API key header enforced by [`requireApiKey`](src/middleware/apiKey.ts).
  - On /api/*: required for all requests.
  - On /admin/*: required only for write endpoints where route explicitly uses the middleware (POST/PUT on skills/projects/experience). Contact and health under /admin do not require x-api-key.
  - In development (NODE_ENV=development), missing key is allowed.
- Cf-Access-Jwt-Assertion: Required on all /admin/* requests. Verified against Cloudflare Access using [`requireAccess`](src/app.ts).

CORS:

- /api/* origins: localhost:5173/4173, mrwinrock.com, <www.mrwinrock.com>, admin.mrwinrock.com
- /admin/* origin: env ADMIN_ORIGIN (see [src/config/env.ts](src/config/env.ts))

Content-Type: application/json for request bodies.

Envelope:

- Success: { ok: true, ... }
- Error (validation): { ok: false, error: ZodFlattenedError }, 400
- Error (auth): { ok: false, error: 'Unauthorized' | 'API key not configured' }, 401
- Error (server): { ok: false, error: string }, 500

---

## Public routes

### GET /

Returns a simple welcome.

Response 200:
{
  "ok": true,
  "message": "Welcome to MrWinRock API"
}

Source: [src/app.ts](src/app.ts)

### GET /health

Pings MongoDB and reports liveness.

Response 200:
{
  "ok": true,
  "status": "live",
  "method": "GET",
  "uptime": number | null,
  "timestamp": string
}

Error 500:
{ "ok": false, "error": string }

Source: [src/app.ts](src/app.ts)

### POST /health

Same as GET /health but with method: "POST".

Response 200:
{
  "ok": true,
  "status": "live",
  "method": "POST",
  "uptime": number | null,
  "timestamp": string
}

Error 500:
{ "ok": false, "error": string }

Source: [src/app.ts](src/app.ts)

### GET /fish

Health check easter egg.

Response 200:
{ "fish": "<><" }

Source: [src/app.ts](src/app.ts)

---

## Health (mounted under /api and /admin)

Base path: /{base}/health  
Router: [src/routes/health.routes.ts](src/routes/health.routes.ts)

- Auth:
  - /api/health/*: requires x-api-key
  - /admin/health/*: requires Cf-Access-Jwt-Assertion

### GET /{base}/health/

Response 200:
{
  "ok": true,
  "status": "live",
  "uptime": number,
  "timestamp": string
}

### GET /{base}/health/ready

Checks MongoDB readiness.

Response 200:
{ "ok": true, "status": "ready" }

Error 503:
{ "ok": false, "status": "not-ready", "error": string }

---

## Skills

Base path: /{base}/skills  
Routes: [src/features/skills/skills.routes.ts](src/features/skills/skills.routes.ts)  
Schema: [`SkillSchema`](src/features/skills/skills.schema.ts)

Skill object:
{
  "name": string,
  "category"?: string,
  "icon"?: string (url),
  "order": number,
  "_id"?: string
}

Auth:

- /api/skills: GET requires x-api-key; POST requires x-api-key
- /admin/skills: GET requires Cf-Access-Jwt-Assertion; POST requires Cf-Access-Jwt-Assertion + x-api-key

### GET /{base}/skills

List all skills ordered by order, name.

Response 200:
{ "ok": true, "data": Skill[] }

### POST /{base}/skills

Create a skill.

Request body (validated by SkillSchema):
{
  "name": string,
  "category"?: string,
  "icon"?: string (url),
  "order"?: number (default 0)
}

Success 201:
{ "ok": true, "data": Skill & { "_id": string } }

Validation error 400:
{ "ok": false, "error": ZodFlattenedError }

---

## Projects

Base path: /{base}/projects  
Routes: [src/features/projects/projects.routes.ts](src/features/projects/projects.routes.ts)  
Schema: [`ProjectSchema`](src/features/projects/projects.schema.ts)

Project object:
{
  "title": string,
  "description": string,
  "url"?: string (url),
  "repo"?: string (url),
  "tech": string[],
  "featured": boolean,
  "order": number,
  "_id"?: string
}

Auth:

- /api/projects: all methods require x-api-key
- /admin/projects: GET requires Cf-Access-Jwt-Assertion; POST/PUT require Cf-Access-Jwt-Assertion + x-api-key

### GET /{base}/projects

List all projects ordered by order, title.

Response 200:
{ "ok": true, "data": Project[] }

### POST /{base}/projects

Create a project.

Request body (ProjectSchema):
{
  "title": string,
  "description": string,
  "url"?: string,
  "repo"?: string,
  "tech"?: string[] (default []),
  "featured"?: boolean (default false),
  "order"?: number (default 0)
}

Success 201:
{ "ok": true, "data": Project & { "_id": string } }

Validation error 400:
{ "ok": false, "error": ZodFlattenedError }

### PUT /{base}/projects/:id

Update a project by id (24-char hex).

Path param:

- id: string (24 hex chars)

Request body (ProjectSchema): same shape as POST.

Success 200:
{ "ok": true, "data": Project & { "_id": string } }

Errors:

- 400: { "ok": false, "error": "Invalid id" } (when id invalid)
- 400: { "ok": false, "error": ZodFlattenedError } (validation)

---

## Experience

Base path: /{base}/experience  
Routes: [src/features/experience/experience.routes.ts](src/features/experience/experience.routes.ts)  
Schema: [`ExperienceSchema`](src/features/experience/experience.schema.ts)

Experience object:
{
  "company": string,
  "role": string,
  "startDate": string,
  "endDate"?: string,
  "location"?: string,
  "description"?: string,
  "tech": string[],
  "order": number,
  "_id"?: string
}

Auth:

- /api/experience: GET requires x-api-key; POST requires x-api-key
- /admin/experience: GET requires Cf-Access-Jwt-Assertion; POST requires Cf-Access-Jwt-Assertion + x-api-key

### GET /{base}/experience

List all experience entries ordered by order asc, startDate desc.

Response 200:
{ "ok": true, "data": Experience[] }

### POST /{base}/experience

Create an experience entry.

Request body (ExperienceSchema):
{
  "company": string,
  "role": string,
  "startDate": string,
  "endDate"?: string,
  "location"?: string,
  "description"?: string,
  "tech"?: string[] (default []),
  "order"?: number (default 0)
}

Success 201:
{ "ok": true, "data": Experience & { "_id": string } }

Validation error 400:
{ "ok": false, "error": ZodFlattenedError }

---

## Contact

Base path: /{base}/contact  
Routes: [src/features/contact/contact.routes.ts](src/features/contact/contact.routes.ts)  
Schema: [`ContactSchema`](src/features/contact/contact.schema.ts)  
Service: [`sendContactEmail`](src/features/contact/contact.service.ts)

Auth:

- /api/contact: requires x-api-key
- /admin/contact: requires Cf-Access-Jwt-Assertion (no x-api-key)

### POST /{base}/contact

Send a contact email via Resend.

Request body (ContactSchema):
{
  "name": string,
  "email": string (email),
  "message": string (min 10, max 5000)
}

Success 200:
{
  "ok": true,
  "message": string,         // "Email sent" or similar
  "skipped"?: true           // present if email sending skipped by config
}

Errors:

- 400: { "ok": false, "error": ZodFlattenedError }
- 500: { "ok": false, "error": string } // e.g., Resend error

Notes:

- If RESEND_API_KEY or CONTACT_TO is missing, sending is skipped and returns ok: true with skipped: true.
- Reply-To is set when email passes a basic regex.

---

## Environment

See [src/config/env.ts](src/config/env.ts) for required variables:

- MONGODB_URI (string)
- ADMIN_ORIGIN (url)
- CF_ACCESS_TEAM_DOMAIN (string)
- CF_ACCESS_AUD (string)
- Optional: API_KEY, RESEND_API_KEY, CONTACT_TO, CONTACT_FROM, PORT, NODE_ENV
