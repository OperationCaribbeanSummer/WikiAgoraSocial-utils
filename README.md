# WikiAgoraSocial-utils

<div align="center">

[![npm version](https://img.shields.io/npm/v/WikiAgoraSocial-utils.svg)](https://www.npmjs.com/package/WikiAgoraSocial-utils)
[![npm downloads](https://img.shields.io/npm/dm/WikiAgoraSocial-utils.svg)](https://www.npmjs.com/package/WikiAgoraSocial-utils)
[![Build Status](https://img.shields.io/github/actions/workflow/status/operationcaribbeansummer/WikiAgoraSocial-utils/ci.yml?branch=main)](https://github.com/operationcaribbeansummer/WikiAgoraSocial-utils/actions)
[![Coverage Status](https://coveralls.io/repos/github/operationcaribbeansummer/WikiAgoraSocial-utils/badge.svg)](https://coveralls.io/github/operationcaribbeansummer/WikiAgoraSocial-utils)
[![Known Vulnerabilities](https://snyk.io/test/npm/WikiAgoraSocial-utils/badge.svg)](https://snyk.io/test/npm/WikiAgoraSocial-utils)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

[![Maintenance](https://img.shields.io/badge/Maintained%3F-yes-green.svg)](https://github.com/operationcaribbeansummer/WikiAgoraSocial-utils/graphs/commit-activity)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli)
[![semantic-release](https://img.shields.io/badge/%20%F0%9F%93%A6%E2%9C%A8-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)

</div>

## 📝 Description

**Short description:** Replace with a concise, plain-language description of what your package does and why it matters. Describe the problem it solves and how it can improve the lives of its users.

**Keywords:** `node`, `npm-package`, `utility`.

## ✨ Features

- ✅ Feature 1 – brief explanation
- ✅ Feature 2 – works with CommonJS and ES modules
- ✅ Feature 3 – zero dependencies
- 🚧 Feature 4 – planned for future release
- 🚧 Feature 5 – contributions welcome

> More ideas and feature requests are welcome – [open an issue](https://github.com/operationcaribbeansummer/WikiAgoraSocial-utils/issues/new)

## 📦 Tech stack

- **Runtime:** Node.js (>=18)
- **Language:** JavaScript / TypeScript
- **Package manager:** npm / yarn / pnpm
- **Testing:** Vitest
- **Linting / formatting:** ESLint / StandardJS
- **CI/CD:** GitHub Actions

For a detailed list of dependencies, see [package.json](./package.json).

## 🚀 Quick Start

### Prerequisites

- Node.js >=18
- npm >=9 or yarn >=1.22 or pnpm >=7

## Installation

```bash
npm install @operationcaribbeansummer/wikiagorasocial-utils
```

## Basic Usage

```js
// CommonJS
const utils = require("@operationcaribbeansummer/wikiagorasocial-utils");

// ES Modules
import utils from "@operationcaribbeansummer/wikiagorasocial-utils";
```

```js
const {
  apiFactory,
} = require("@operationcaribbeansummer/wikiagorasocial-utils");

// Example: Create a User model first
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  createdAt: { type: Date, default: Date.now },
});
const User = mongoose.model("User", userSchema);

const options = {
  searchFields: ["name", "email"],
  defaultSort: "-createdAt",
  defaultSelect: "-__v",
};

app.get("/api/v4/users", apiFactory.getAll(User, options));
app.get("/api/v4/users/:id", apiFactory.getOne(User));
app.get("/api/v4/users/:id", apiFactory.getOne(User));
app.put("/api/v4/users/:id", apiFactory.updateOne(User));
app.patch("/api/v4/users/:id", apiFactory.replaceOne(User));
app.delete("/api/v4/users/:id", apiFactory.deleteOne(User));
app.post("/api/v4/users/bulk", apiFactory.bulkCreate(User));
app.put("/api/v4/users/bulk", apiFactory.bulkUpdate(User));
app.patch("/api/v4/users/bulk", apiFactory.bulkReplace(User));
app.delete("/api/v4/users/bulk", apiFactory.bulkDelete(User));
app.options("/api/v4/users/:id", apiFactory.optionOne(User));
app.options("/api/v4/users", apiFactory.option(User));
app.head("/api/v4/users/:id", apiFactory.headOne(User));
app.head("/api/v4/users", apiFactory.head(User));
```

```js
const utils = require("@operationcaribbeansummer/wikiagorasocial-utils");

utils.capitalize("test-string"); //
utils.toSlug("test%string"); //
utils.formatDate(""); //
utils.truncate(""); //
utils.isValidObjectId(""); //
utils.parseObjectId(""); //

// singularToPlural
utils.singularToPlural(""); //
```

```js
const { global44 } = require("@operationcaribbeansummer/wikiagorasocial-utils");

// Apply as global middleware in your Express app
app.use(global44());

// Or with custom configuration
app.use(
  global44({
    apiVersion: "v4",
    rateLimit: {
      limit: 1000,
      remaining: 999,
      reset: 3600,
    },
    pageSize: 20,
  }),
);
```

## 🔧 Global Middleware - `global44`

The `global44` middleware automatically adds comprehensive HTTP headers to all responses, providing better API documentation, security, and request tracking.

### Features

- **Request Tracking**: Automatically generates unique request IDs and measures response time
- **Security Headers**: Implements industry-standard security headers (HSTS, XSS protection, CSP)
- **CORS Support**: Configurable Cross-Origin Resource Sharing headers
- **Rate Limiting**: Built-in rate limiting information headers
- **Pagination**: Default pagination headers for list endpoints
- **Content Negotiation**: Comprehensive Accept/Content headers
- **Caching Control**: Proper cache control and ETag headers
- **API Versioning**: Automatic API version tracking

### Configuration Options

| Option                | Type   | Default | Description                      |
| --------------------- | ------ | ------- | -------------------------------- |
| `apiVersion`          | String | `'v4'`  | API version identifier           |
| `rateLimit.limit`     | Number | `1000`  | Maximum requests per window      |
| `rateLimit.remaining` | Number | `999`   | Remaining requests in window     |
| `rateLimit.reset`     | Number | `3600`  | Window reset time in seconds     |
| `pageSize`            | Number | `20`    | Default page size for pagination |

### Response Headers Added

#### Basic Information

- `x-timestamp` - Current server timestamp
- `X-API-Version` - API version (configurable)
- `X-Powered-By` - Server identifier
- `x-user-role` - Authenticated user role (or 'anonymous')

#### Content Negotiation

- `Accept-Patch`, `Accept-Post` - Supported media types
- `Accept-Charset` - Character encoding preferences
- `Accept-Datetime` - Datetime format preference
- `Accept-Encoding` - Compression algorithms
- `Accept-Language` - Language preference
- `Accept-Ranges` - Byte range support
- `Content-Type`, `Content-Language`, `Content-Encoding`

#### CORS Headers

- `Access-Control-Allow-Origin` - Allowed origins
- `Access-Control-Allow-Methods` - HTTP methods
- `Access-Control-Allow-Headers` - Request headers
- `Access-Control-Allow-Credentials` - Credential sharing
- `Access-Control-Max-Age` - Preflight cache duration
- `Access-Control-Expose-Headers` - Exposed response headers

#### Security Headers

- `X-Content-Type-Options: nosniff` - MIME type sniffing protection
- `X-Frame-Options: DENY` - Clickjacking protection
- `X-XSS-Protection: 1; mode=block` - XSS filter
- `Strict-Transport-Security` - HSTS (1 year)
- `Referrer-Policy` - Referrer information control
- `Permissions-Policy` - Feature permissions
- `Cross-Origin-*` policies - Isolation controls

#### Caching Headers

- `Cache-Control` - Cache directives
- `Pragma`, `Expires` - Legacy cache control
- `ETag` - Entity tag for validation
- `Last-Modified` - Last modification timestamp
- `Vary` - Cache variation factors

#### Rate Limiting

- `RateLimit-Limit` - Maximum requests allowed
- `RateLimit-Remaining` - Remaining requests
- `RateLimit-Reset` - Reset timestamp (Unix epoch)
- `Retry-After` - Retry delay in seconds

#### Pagination

- `X-Total-Count` - Total items count
- `X-Page-Number` - Current page number
- `X-Page-Size` - Items per page
- `X-Total-Pages` - Total pages

#### Request Tracking

- `X-Request-ID` - Unique request identifier (from client or auto-generated)
- `X-Response-Time` - Response time in milliseconds

#### Server Information

- `Allow` - Allowed HTTP methods
- `Server` - Server identification
- `Host` - Request host
- `Date` - Current server date/time (UTC)

### Usage Example

```js
const express = require("express");
const { global44 } = require("@operationcaribbeansummer/wikiagorasocial-utils");

const app = express();

// Apply global middleware with custom configuration
app.use(
  global44({
    apiVersion: "v5",
    // rateLimit: {
    //   limit: 5000,
    //   remaining: 4999,
    //   reset: 7200
    // },
    // pageSize: 50
  }),
);

// All routes will now include comprehensive headers
app.get("/api/users", (req, res) => {
  // Access request ID for logging
  console.log("Request ID:", req.requestId);

  res.json({
    success: true,
    data: [],
  });
});
```

### Request Object Extensions

The middleware also extends the request object with:

- `req.requestId` - The unique request identifier for logging purposes
- `req._startTime` - Timestamp when the request was received (for response time calculation)

### Best Practices

1. **Apply Early**: Add `global44()` middleware early in your middleware stack
2. **Customize Per Environment**: Use different configurations for development vs production
3. **Logging Integration**: Use `req.requestId` for correlating logs across services
4. **Override When Needed**: Specific routes can override default headers (e.g., pagination headers)
5. **Monitor Rate Limits**: Clients can use rate limit headers to implement backoff strategies

## ⚙️ Configuration

Create a .env file or pass configuration options directly:

```js
javascript;
const {
  apiFactory,
} = require("@operationcaribbeansummer/wikiagorasocial-utils");

const options = {
  searchFields: ["name", "email"],
  defaultSort: "-createdAt",
  defaultSelect: "-__v",
};

app.get("/api/v4/users", apiFactory.getAll(User, options));
```

For advanced configuration, see [docs/configuration.md](./docs/configuration.md).

## apiFactory

Basic usage - get 1 random item
```js
router.get('/random', apiFactory.random(Item));
```js

Get multiple random items
```js
router.get('/random', apiFactory.random(Post, {
    maxRandomCount: 50  // Allow up to 50 random items
}));
```

```js
// GET /api/posts/random?count=5
// Returns 5 random posts

// With filters - get random items matching criteria
// GET /api/items/random?count=3&filters={"category":"electronics","inStock":true}
router.get('/random', apiFactory.random(Item, {
    defaultSelect: 'name price category -__v',
    includeTotalCount: true
}));

// With field selection
// GET /api/users/random?count=10&fields=username,avatar
router.get('/random', apiFactory.random(User, {
    maxRandomCount: 20,
    maxTimeMS: 3000
}));
```

Response Format:

```json
{
  "success": true,
  "message": "Successfully retrieved 5 random items",
  "metadata": { ... },
  "count": 5,
  "requestedCount": 5,
  "totalAvailable": 1250,
  "data": [
    { "_id": "...", "name": "Item 1", ... },
    { "_id": "...", "name": "Item 2", ... },
    ...
  ]
}
```

## 📚 Documentation

- [API Reference](./docs/api.md)
- [Examples](./examples)
- [Changelog](./CHANGELOG.md)

## Build docs locally

```bash
npm run docs
```

## 🧪 Testing

Run the test suite:

```bash
npm test
```

Run coverage:

```bash
npm run coverage
```

We use Vitest and aim for >90% coverage.

## 🤝 Contributing

We welcome contributions! Please read our [Contributing Guidelines](./CONTRIBUTING.md) and [Code of Conduct](./CODE_OF_CONDUCT.md).

### How to contribute

1. Fork the repo
1. Create a feature branch (`git checkout -b feat/amazing-feature`)
1. Commit changes using [Conventional Commits](https://www.conventionalcommits.org)
1. Push to the branch
1. Open a Pull Request

### Commit conventions

We follow [Conventional Commits](https://www.conventionalcommits.org):

- `feat`: new feature
- `fix`: bug fix
- `docs`: documentation
- `test`: adding tests
- `chore`: maintenance
- `breaking`: breaking change

### Branching strategy

We use [GitHub Flow](https://docs.github.com/en/get-started/using-github/github-flow):

- `main` – production-ready code
- `feat/*` – feature branches
- `fix/*` – bug fixes
- `docs/*` – documentation updates

## 🛣️ Roadmap

See the [open issues](https://github.com/operationcaribbeansummer/WikiAgoraSocial-utils/issues) and [milestones](https://github.com/operationcaribbeansummer/WikiAgoraSocial-utils/milestones) for planned features and bugfixes.

## 💬 Support

- [GitHub Discussions](https://github.com/operationcaribbeansummer/WikiAgoraSocial-utils/discussions)
- [Open an issue](https://github.com/operationcaribbeansummer/WikiAgoraSocial-utils/issues/new/choose)

## 🙏 Credits

Author: Javier Ramos [@JaviRamosLab](https://github.com/JaviRamosLab)

Contributors: see [CONTRIBUTORS.md](./CONTRIBUTORS.md)

## 👩‍⚖️License

Code released under [MIT License](/LICENSE) / content under [CC-BY-SA](/LICENSE_CONTENT)

Copyleft (ɔ) 2026+, **OperationCaribbeanSummer contributors** <https://github.com/orgs/OperationCaribbeanSummer/people>

Copyleft (ɔ) 2023-2026, **Javier Ramos Nistal** <https://github.com/JaviRamosLab>

[![MIT license](https://custom-icon-badges.demolab.com/badge/license-MIT-blue.svg?logo=law)](https://choosealicense.com/licenses/mit)
[![CC−BY−SA](https://custom-icon-badges.demolab.com/badge/License-CC−BY−SA_v4.0-blue.svg?logo=law)](http://creativecommons.org/licenses/by-sa/4.0)

### 💡➕Contributions, ❗️Issues, ⏫Pull Request and 🌟STARS are welcome 🆗

### Show some ❤️ by starring 🌟 some of the [repositories](https://github.com/orgs/OperationCaribbeanSummer/repositories), [membering in the community](https://github.com/orgs/OperationCaribbeanSummer/people) and [fallowing us](https://github.com/orgs/OperationCaribbeanSummer)🙏!

### Developed by Javier Ramos Nistal ([JaviRamosLab.com](https://JaviRamosLab.com)), ([@JaviRamosLab](https://github.com/JaviRamosLab)), ([++JaviRamosLab](https://OperationCaribbeanSummer.org/peoples/JaviRamosLab)) from 🇨🇺 Cuba with "❤️, ⏰" and whithout "💰"
