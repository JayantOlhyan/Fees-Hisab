# Fees Hisab 📚

> **"Har Fee. Har Student. Pure Hisab."**  
> A simple, reliable tuition fee management application designed for individual tuition teachers.

---

## 1. Overview

Fees Hisab is built to replace paper notebooks, WhatsApp threads, and complex spreadsheets with a clean, mobile-first fee register. It enables individual teachers to answer within seconds:

- How many students do I currently have?
- Who has not paid this month?
- Who is overdue?
- How much money is collected vs. outstanding?
- What has a particular student paid historically?

---

## 2. Technology Stack

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript
- **Styling:** Tailwind CSS (mobile-first design)
- **Database & ORM:** PostgreSQL, Prisma ORM
- **Validation:** Zod
- **Authentication:** Jose (JWT) session-based authentication foundation
- **Testing:** Vitest (Unit testing), Playwright (E2E testing)
- **Code Quality:** ESLint, Prettier, TypeScript strict mode

---

## 3. Project Architecture

```text
fees-hisab/
├── prisma/
│   └── schema.prisma         # PostgreSQL schema & Prisma client configuration
├── public/
│   ├── logo.jpg              # Fees Hisab official brand logo
│   └── manifest.json         # PWA Manifest
├── src/
│   ├── app/                  # Next.js App Router pages & layouts
│   │   ├── fees/             # Monthly fee register
│   │   ├── reports/          # Collection & outstanding reports
│   │   ├── settings/         # Settings, JSON/CSV export & backup
│   │   ├── students/         # Student list & profiles
│   │   ├── layout.tsx
│   │   └── page.tsx          # Main dashboard
│   ├── components/
│   │   ├── ui/               # Reusable UI primitives (Button, Input, Card)
│   │   ├── Navigation.tsx    # Responsive desktop sidebar + mobile bottom nav
│   │   ├── RecordPaymentModal.tsx
│   │   └── StatusBadge.tsx
│   ├── data/                 # Sample seed data
│   ├── lib/
│   │   ├── auth/             # Session & auth utilities
│   │   ├── db/               # Prisma singleton client
│   │   ├── errors/           # App error hierarchy & error sanitization
│   │   ├── storage.ts        # Client/server persistence & fee status calculator
│   │   ├── utils.ts          # INR currency & date formatters
│   │   └── validations/      # Zod validation schemas
│   └── types/                # TypeScript domain models
├── tests/
│   ├── unit/                 # Vitest unit test suites
│   └── e2e/                  # Playwright E2E smoke tests
├── .env.example              # Environment variables template
├── eslint.config.mjs         # ESLint configuration
├── playwright.config.ts      # Playwright E2E configuration
├── vitest.config.ts          # Vitest configuration
└── package.json
```

---

## 4. Getting Started

### Prerequisites

- Node.js (v20 or v25)
- npm

### Installation

```bash
git clone https://github.com/JayantOlhyan/Fees-Hisab.git
cd Fees-Hisab
npm install
```

### Environment Configuration

Copy `.env.example` to `.env.local` and set your credentials:

```bash
cp .env.example .env.local
```

### Database Setup (Prisma)

Generate the Prisma Client:

```bash
npm run prisma:generate
```

---

## 5. Development & Testing Scripts

| Command                | Description                                         |
| :--------------------- | :-------------------------------------------------- |
| `npm run dev`          | Start development server at `http://localhost:3000` |
| `npm run build`        | Compile and bundle production build                 |
| `npm run start`        | Start production server                             |
| `npm run lint`         | Run ESLint checks                                   |
| `npm run format`       | Auto-format codebase with Prettier                  |
| `npm run format:check` | Check code style without writing                    |
| `npm run test`         | Run unit tests using Vitest                         |
| `npm run test:watch`   | Run unit tests in watch mode                        |
| `npm run test:e2e`     | Run Playwright E2E tests                            |

---

## 6. Phase Status & Scope

- **Current Phase:** Phase 0 — Foundation & Architecture (COMPLETE)
- **Deferred Work (Phase 1 & beyond):**
  - PostgreSQL live migration & production seed scripts (Phase 1)
  - Full relational Student-Fee-Payment backend server actions (Phase 1)
  - Full teacher login/register screens with session cookie setting (Phase 1)
  - Offline sync / service worker caching (Phase 2)
  - WhatsApp reminder generator button (Phase 2)

---

## 7. License

MIT
