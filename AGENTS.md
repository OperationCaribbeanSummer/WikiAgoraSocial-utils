# Project: Backend JavaScript Application

## Tech Stack
This project uses **JavaScript (CommonJS)** with **Node.js** and **Express.js (v4)** for the API server.

---

## Runtime Dependencies

### Core Server & API
- **express (4.x)** – HTTP server and routing
- **mongoose (8.x)** – MongoDB ODM
- **redis (5.x)** – Caching, sessions, pub/sub
- **socket.io (4.x)** – Real-time communication
- **kafkajs (2.x)** – Kafka event streaming

### Validation & Data Integrity
- **zod (4.x)** – Runtime schema validation (primary)
- **ajv (8.x)** – JSON Schema validation (secondary / interoperability)

### Security & Middleware
- **helmet** – Secure HTTP headers
- **cors** – Cross-origin resource sharing
- **hpp** – HTTP parameter pollution protection
- **compression** – Gzip / Brotli responses
- **express-mongo-sanitize** – MongoDB operator injection protection
- **express-xss-sanitizer** – XSS input sanitization
- **cookie-parser** – Cookie parsing & handling

### Observability & Performance
- **morgan** – HTTP request logging
- **pino** – 

### Files, Media & Assets
- **multer** – Multipart/form-data & file uploads
- **sharp** – Image processing and optimization
- **fs-extra** – Extended filesystem utilities

### Communication & Messaging
- **axios** – HTTP client
- **nodemailer** – Email delivery

### Identifiers, Dates & Utilities
- **uuid** – Unique identifiers
- **slugify** – URL-safe slugs
- **dayjs** – Date & time handling
- **croner** – Cron-style job scheduling

### QR, Barcode & Docs
- **@bwip-js/node** – Barcode generation
- **qr-code-styling** – Styled QR codes
- **redoc-express** – OpenAPI documentation UI
- **ejs** – Server-side templating (limited use)

---

## Development & Tooling Dependencies

### Testing
- **vitest** – Unit & integration testing
- **supertest** – HTTP assertions

### Code Quality & Standards
- **standard** – JavaScript style & linting
- **husky** – Git hooks

### Commits & Workflow
- **@commitlint/cli**
- **@commitlint/config-conventional**
- **@commitlint/cz-commitlint**
- **cz-conventional-changelog**  
  → Enforces **Conventional Commits**

### Tooling & Docs
- **vitepress** – Documentation site
- **@faker-js/faker** – Test data generation

---

## Core Rules

- **Express.js**  
  Follow Express middleware patterns and best practices (async/await, centralized error handling).

- **No TypeScript**  
  Maintain **pure JavaScript**. Do not generate `.ts` files or type definitions.

- **Validation Strategy**
  - Use **Zod** for request/response validation.
  - Use **Ajv** only when JSON Schema compatibility is required.

- **Security First**
  - Always include sanitization, headers, and defensive middleware.
  - Never trust user input.

- **Testing**
  - Use **Vitest** + **Supertest** for APIs.
  - Prefer deterministic, isolated tests.

## Testing Rules

- Each module must have:
  - unit tests for services
  - integration tests for routes
- Mock Kafka & Redis by default
- No shared mutable state between tests

## Security Defaults

- Always enable:
  - helmet
  - mongo sanitize
  - xss sanitizer
- File uploads:
  - size limits required
  - MIME validation required
- Never trust headers from clients

- **Documentation**
  - Keep API behavior explicit.

- **Non-Goals**
  - Do not add new build tools or config files unless explicitly requested.
  - Do not delete comments
  - Do not use JsDoc comments

---

## API Guidelines
- RESTful conventions
- Consistent JSON envelopes for success & error responses
- Explicit status codes
- No silent failures

---

## Common Commands
- `npm run dev` – Start development server
- `npm test` – Run test suite
