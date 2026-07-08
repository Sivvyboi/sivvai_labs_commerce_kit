# Contributing to sivvai_labs_commerce_kit

Thank you for contributing. This document defines the standards every contributor must follow to keep the codebase consistent and production-ready.

---

## Prerequisites

- Node.js 20 LTS or later
- npm 10 or later
- Git

---

## Setup

```bash
git clone <repo-url>
cd sivvai_labs_commerce_kit
npm install
cp .env.example .env.local
# Fill in .env.local with your Supabase project credentials
npm run dev
```

---

## Branch Strategy

| Branch | Purpose |
|---|---|
| `main` | Production-ready code only |
| `dev` | Integration branch for features |
| `feature/<name>` | Individual feature work |
| `fix/<name>` | Bug fixes |
| `chore/<name>` | Config, tooling, refactoring |

**Never commit directly to `main`.**

---

## Coding Standards

### TypeScript

- Strict mode is enabled — no `any`, no `@ts-ignore` without a comment explaining why.
- All exported functions and types must have JSDoc comments.
- Use `assertDefined` and `assertNever` from `lib/utils/assert.ts` instead of non-null assertions (`!`).

### Components

- **Default to Server Components.** Only add `'use client'` when the component requires state, effects, or browser APIs.
- Push the `'use client'` boundary as deep as possible (to leaf components, not layouts).
- Shared components live in `components/`. Route-specific components live next to their route.

### Imports

- Use the `@/*` alias for all imports. No relative `../../` paths outside the same directory.
- Import from barrel files (`@/config`, `@/constants`, `@/types`) unless you need a specific type from the source file.

### Naming

| Element | Convention |
|---|---|
| Component files | `PascalCase.tsx` |
| Utility files | `camelCase.ts` or `kebab-case.ts` |
| Next.js special files | `lowercase` (`page.tsx`, `layout.tsx`) |
| CSS custom properties | `--kit-*` prefix |
| Constants | `SCREAMING_SNAKE_CASE` for values, `camelCase` for object keys |
| Feature flags | `camelCase` in `config/featureFlag.ts` |

---

## Error Handling

- **Expected errors** (validation, not found): return typed error objects. Do not throw.
- **Unexpected errors**: throw a typed `AppError` subclass from `lib/errors/app-error.ts`.
- **Never** throw plain `new Error("...")` in application code.
- Route Handlers must always return a structured JSON error: `{ error, code, message }`.

---

## Environment Variables

- Never hardcode values that belong in `.env.local`.
- Every new env var must be:
  1. Added to `.env.example` with a comment.
  2. Added to `types/environment.d.ts` with the correct type.
  3. Read through the appropriate config module (never raw `process.env` in components).

---

## Before Opening a PR

```bash
npm run lint        # Must pass with zero warnings
npm run type-check  # Must pass with zero errors
npm run build       # Must complete without errors
```

---

## Commit Message Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

feat(cart): add cart item quantity increment
fix(auth): handle expired session redirect
chore(deps): upgrade @supabase/ssr to v0.6
docs(readme): update supabase setup instructions
```

Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `ci`, `perf`
