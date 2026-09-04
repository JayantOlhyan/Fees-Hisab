# Fees Hisab

> A clean, reliable, mobile-first fee management application for individual tuition teachers, currently powered by Notion.

[![Next.js](https://img.shields.io/badge/Next.js-16.3-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2-blue)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)

## Overview

**Fees Hisab** is a web application designed to replace paper notebooks and complex spreadsheets for individual tuition teachers. It provides a simple dashboard to manage students, track monthly fee payments, and identify overdue balances at a glance.

**Current Status:** Phase 0 (Foundation). The application is fully functional but currently uses **Notion** as its backend database. PostgreSQL integration and real authentication are planned for Phase 1.

## Why This Project Exists

Many independent teachers manage 20-100 students manually. Calculating who paid, who is overdue, and exactly how much is outstanding takes significant administrative time. Fees Hisab centralizes this data into a purpose-built interface that answers these questions instantly.

## Target Users

Individual tuition teachers, private educators, and small coaching classes.

## Features

| Feature | Status | Description |
| ------- | ------ | ----------- |
| **Dashboard** | ✅ Implemented | Overview of collections, outstanding dues, active students, and recent payments. |
| **Student Management** | ✅ Implemented | Add, edit, view, and archive students. Track joining dates and monthly fees. |
| **Fee Register** | ✅ Implemented | Monthly fee generation, tracking status (Upcoming, Due, Paid, Overdue, Partially Paid). |
| **Payment Tracking** | ✅ Implemented | Record payments (Cash, UPI, Bank Transfer) against specific fee records. |
| **Reports** | ✅ Implemented | View monthly collection percentages, student lifetime summaries, and outstanding dues. |
| **Data Export** | ✅ Implemented | Export all records to JSON or CSV for Excel/Google Sheets. |
| **Authentication** | 🚧 Mocked | JWT session framework is implemented, but login is currently bypassed for a demo user. |
| **PostgreSQL DB** | 📅 Planned | Prisma schema exists, but live DB transactions are deferred to Phase 1. |

## Tech Stack

### Frontend
- **Framework:** Next.js 16.3 (App Router)
- **Library:** React 19.2
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **Icons:** Lucide React
- **Animations:** Framer Motion

### Backend & Database
- **API Architecture:** Next.js Server Actions
- **Current Database:** Notion API (`@notionhq/client`)
- **Future Database:** PostgreSQL via Prisma ORM (Schema ready)
- **Local Settings:** `localStorage` (for Teacher Profile settings)
- **Authentication:** `jose` for JWT (currently running in mock mode)

### Testing
- **Unit Tests:** Vitest
- **E2E Tests:** Playwright

## Architecture

```text
User
 ↓
Next.js App Router (UI & Client Components)
 ↓
Next.js Server Actions (`src/actions/*`)
 ↓
Notion Service (`src/lib/notion/service.ts`)
 ↓
Notion Databases (Students, Fees, Payments)
```

*(Note: User preferences like Name and Salutation are handled locally via `localStorage` in `src/lib/storage.ts`.)*

## Repository Structure

```text
fees-hisab/
├── prisma/               # Deferred PostgreSQL schema
├── public/               # Static assets
├── src/
│   ├── actions/          # Server actions for mutations/queries
│   ├── app/              # Next.js App Router pages (Dashboard, Fees, Reports, etc.)
│   ├── components/       # Reusable UI components & Navigation
│   ├── data/             # Seed data
│   ├── lib/              # Core utilities
│   │   ├── auth/         # JWT Session handling (currently mocked)
│   │   ├── db/           # Prisma client initialization
│   │   ├── notion/       # Notion API integration (Active backend)
│   │   ├── storage.ts    # localStorage adapter for settings
│   │   └── validations/  # Zod schemas
│   ├── services/         # Business logic services
│   └── types/            # TypeScript domain models
└── tests/
    ├── e2e/              # Playwright tests
    └── unit/             # Vitest suites
```

## Prerequisites

- Node.js (v20 or newer)
- npm
- Notion Account (to set up the required databases)

## Installation & Local Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/JayantOlhyan/Fees-Hisab.git
   cd Fees-Hisab
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   ```bash
   cp .env.example .env.local
   ```
   Fill in your Notion API details in `.env.local` (see section below).

4. **Start the development server:**
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:3000`.

## Environment Variables

| Variable | Required | Purpose | Example |
| -------- | -------- | ------- | ------- |
| `NOTION_API_KEY` | Yes | Authenticates with Notion. | `secret_abc123...` |
| `NOTION_STUDENTS_DATABASE_ID` | Yes | ID of the Students DB in Notion. | `123456...` |
| `NOTION_FEE_RECORDS_DATABASE_ID` | Yes | ID of the Fee Records DB in Notion. | `abcdef...` |
| `NOTION_PAYMENTS_DATABASE_ID` | Yes | ID of the Payments DB in Notion. | `xyz789...` |
| `AUTH_SECRET` | Yes | Secret for JWT generation. | `your_secure_secret` |
| `NODE_ENV` | Yes | Environment mode. | `development` |
| `NEXT_PUBLIC_APP_URL` | No | Base URL for the application. | `http://localhost:3000` |
| `DATABASE_URL` | No | PostgreSQL connection (Deferred). | `postgresql://...` |

## Database (Current: Notion)

The application currently relies on three separate Notion databases mapped as follows:
- **Students Database:** Stores student profiles, monthly fee amounts, and due days.
- **Fee Records Database:** Stores monthly billing cycles, amounts due vs. paid, and payment status.
- **Payments Database:** Ledger of individual payment transactions.

*(A Prisma schema for PostgreSQL exists in `prisma/schema.prisma` mapping `users`, `students`, `fee_records`, and `payments`, but its usage is currently bypassed in favor of Notion.)*

## Authentication & Security

- **Authentication is currently MOCKED.** Although `jose` is set up to generate and verify JWTs, `getSession()` and `requireAuth()` in `src/lib/auth/session.ts` return a hardcoded `DEFAULT_SESSION`.
- The `/login` route automatically redirects to `/students`.
- Because authentication is mocked, there is no real authorization/RBAC implemented yet.

## Testing

The project has robust test coverage configured:

- **Run Unit Tests (Vitest):**
  ```bash
  npm run test
  ```
- **Run Unit Tests in Watch Mode:**
  ```bash
  npm run test:watch
  ```
- **Run E2E Tests (Playwright):**
  ```bash
  npm run test:e2e
  ```

## Known Limitations

1. **Authentication is Demo-Only:** Real login, registration, and session enforcement are bypassed.
2. **Notion Backend:** The app relies on Notion's API, which may be subject to rate limits and latency compared to a direct PostgreSQL connection.
3. **Local Settings:** Teacher Profile settings (Name, Salutation) are stored in browser `localStorage`. They will not sync across different devices or browsers.
4. **No Offline Support:** While PWA caching might be added in the future, the app currently requires an active internet connection to communicate with Notion.

## Roadmap

### Phase 1 (Next)
- PostgreSQL live migration replacing Notion.
- Full relational Student-Fee-Payment backend server actions.
- Functional teacher login/register screens with real session cookies.

### Phase 2 (Future)
- Offline sync / service worker caching.
- WhatsApp reminder generator button.

## Contributing

1. Fork the repository.
2. Create your feature branch (`git checkout -b feature/amazing-feature`).
3. Run formatting and linting (`npm run format` & `npm run lint`).
4. Ensure tests pass (`npm run test`).
5. Commit your changes.
6. Open a Pull Request.

## License

This project is licensed under the MIT License.
