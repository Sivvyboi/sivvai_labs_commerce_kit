# sivvai_labs_commerce_kit

A reusable, production-ready Next.js commerce framework for single-merchant social-commerce businesses — fashion, food, gadgets, beauty, perfume, supermarkets, accessories, restaurants, and more.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 (strict) |
| Styling | Tailwind CSS v4 |
| Database | Supabase + PostgreSQL |
| Architecture | Mobile-first, server-first |

---

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env.local
# Fill in your Supabase project URL, keys, and site details
```

### 3. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you should see the foundation status page.

### 4. Verify the health endpoint

```bash
curl http://localhost:3000/api/health
# → { "status": "ok", "timestamp": "...", "service": "...", ... }
```

---

## Project Structure

```
sivvai_labs_commerce_kit/
├── app/               # Next.js App Router (routes, layouts, pages)
│   ├── (commerce)/    # Storefront route group
│   ├── (admin)/       # Merchant admin route group
│   └── api/health/    # Health-check endpoint
├── components/        # Shared UI components
│   ├── ui/            # Primitive/headless UI atoms
│   └── providers/     # Client-side React context providers
├── config/            # Modular site configuration
│   ├── site.ts        # Brand identity
│   ├── localization.ts # Locale, currency, RTL
│   ├── seo.ts         # Default metadata
│   ├── featureFlag.ts # Feature toggles
│   └── index.ts       # Barrel export
├── constants/         # App-wide constants (routes, metadata)
├── docs/              # Architecture decision records
├── features/          # Feature slices (cart, auth, search — future)
├── hooks/             # Custom React hooks (future)
├── lib/               # Libraries and service clients
│   ├── supabase/      # Browser / server / middleware clients
│   ├── utils/         # cn, format, assert utilities
│   └── errors/        # Typed AppError class hierarchy
├── messages/          # i18n message catalogs (future)
├── services/          # External service integrations (future)
├── types/             # Global TypeScript types
│   ├── database.types.ts # Supabase schema types
│   └── environment.d.ts  # process.env type augmentation
└── public/            # Static assets
```

---

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Build for production |
| `npm run start` | Start the production server |
| `npm run lint` | Run ESLint |
| `npm run type-check` | Run TypeScript type checking |

---

## Configuration

All configuration lives in `config/`. Import from the barrel:

```ts
import { siteConfig, featureFlag, localizationConfig } from "@/config";
```

| File | Purpose |
|---|---|
| `config/site.ts` | Store name, URL, contact details, social handles |
| `config/localization.ts` | Locale, currency, timezone, RTL flag |
| `config/seo.ts` | Default metadata, OG tags, robots |
| `config/featureFlag.ts` | Feature toggles driven by `NEXT_PUBLIC_FEATURE_*` env vars |

---

## Import Aliases

A single `@/*` alias maps to the project root:

```ts
import { cn } from "@/lib/utils/cn";
import { ROUTES } from "@/constants/routes";
import type { Database } from "@/types";
```

---

## Environment Variables

Copy `.env.example` to `.env.local` and fill in the values. See `.env.example` for documentation on each variable.

**Never commit `.env.local`** — it is gitignored. Only `.env.example` is committed.

---

## Supabase Setup

The Supabase clients in `lib/supabase/` are stubs until `@supabase/ssr` is installed:

```bash
npm install @supabase/ssr @supabase/supabase-js
```

Then uncomment the implementation in each client file and add your project credentials to `.env.local`.

---

## Step Roadmap

| Step | Status | Description |
|---|---|---|
| **1 — Foundation** | ✅ Complete | Project structure, config, types, utilities |
| 2 — Design System | ⬜ Next | Tailwind design tokens, base components |
| 3 — Catalog | ⬜ | Product listing, PDP, categories |
| 4 — Auth | ⬜ | Supabase Auth, protected routes |
| 5 — Cart & Checkout | ⬜ | Cart state, order placement |
| 6 — Admin | ⬜ | Merchant dashboard |

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).
