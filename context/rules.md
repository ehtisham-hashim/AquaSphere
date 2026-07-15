# Rules — AQUA Sphere OS

This document tells anyone (or any AI) writing code for this project **how** to write it. `project-requirements.md` says what to build, `architecture.md` says how the system is shaped, and this file is the rulebook that keeps every file that gets written consistent with both — no matter who or what writes it.

If a rule here ever seems to conflict with a request, **this file wins**, unless the person running the project explicitly says otherwise.

---

## 1. Coding Standards

- **TypeScript everywhere, strict mode on.** Both `frontend/` and `backend/` use TypeScript. No `any` unless there is genuinely no other option — and if `any` is used, leave a comment saying why.
- **One responsibility per file.** Routes define HTTP verb + path. Controllers handle req/res. Services own business logic + DB calls. React components only handle UI. Don't mix database queries into React or business rules into controllers.
- **Functions should be short and named for what they do**, not how they do it (`calculateMineralFraction()` not `doMath()`).
- **No magic numbers.** `23` (litres per 19L bottle) or `13248` (litres per mineral set) must be named constants in `backend/src/lib/constants.ts`, not typed inline — these numbers are business rules, not decoration.
- **Every derived value must actually be derived.** If a number is "current stock" or "current balance," it must be computed from a transaction table (`SUM()` or an equivalent kept-in-sync value) — never a field the UI writes to directly. This is the single most important rule in the whole project (see `architecture.md` §4).
- **Comment the "why," not the "what."** Code should be readable enough to explain itself; comments exist for business-logic reasons that aren't obvious from the code (e.g. "delivery time, not production time — 19L bottles aren't produced ahead of delivery").
- **Consistent formatting** — Prettier + ESLint configured once at the project root, run on every file, no per-developer style variation.

## 2. Naming Conventions

(Full detail already defined in `architecture.md` §8 — repeated here as the enforceable rule.)

- Files/folders: `kebab-case`
- Classes, interfaces, types: `PascalCase`
- Variables, functions: `camelCase`
- Enum type: `PascalCase`, enum members: `SCREAMING_SNAKE_CASE`
- Database tables: singular `PascalCase` in Prisma schema, mapped to `snake_case` in Postgres
- API routes: plural, kebab-case (`/api/v1/vendor-payments`, not `/VendorPayment`)
- React components: `PascalCase`; hooks start with `use`

**Rule:** never invent a new naming style mid-project. If a new kind of file doesn't fit an existing pattern, match it to the closest existing one rather than starting a new convention.

## 3. Folder Rules

- Follow the folder structure in `architecture.md` §6 exactly — don't invent new top-level folders without a reason written down.
- **Backend**: Use a layered MVC architecture within `backend/src/`. Routes (`src/routes/`) map URLs to Controllers (`src/controllers/`), which handle HTTP requests/responses. Controllers call Services (`src/services/`), which contain the business logic and database queries.
- Shared logic (like mineral-set math) lives in `backend/src/utils/` or as a generic service, imported where needed. Do not copy-paste.
- **Frontend**: Use domain-driven feature folders (`frontend/src/features/<name>/`), mirroring backend modules 1:1. Each feature folder owns its own components, hooks, api calls, and types (e.g. `features/orders/components/`, `features/orders/api/`). Do not use global `components/` or `types/` folders except for truly app-wide shared primitives (like a generic Button).
- Shared Zod schemas live in `shared/schemas/` and are imported by both frontend and backend — never duplicated.
- Nothing business-specific goes in `middleware/` — that folder is only for truly generic, reusable code (auth, validation, error handling).

## 4. Error Handling

- **Never fail silently.** Every catch block either handles the error meaningfully or re-throws it — no empty `catch {}`.
- **One global error middleware** (`error.middleware.ts`) formats all error responses the same way: `{ status, message, errors? }`. The frontend should never need to guess the shape of an error.
- **Distinguish real errors from soft-block warnings.** A credit-limit warning or a stock-going-negative warning is *not* an error — it's a normal `200` response with a `warning` flag (see `architecture.md` §9). Reserve actual HTTP error codes (400/403/404/500) for genuine problems: bad input, missing records, unauthorized access, server failure.
- **Log real errors server-side** (at minimum to console in early phases; a proper logging service can come later) — but never log passwords, tokens, or full customer payment details.
- **Frontend**: every API call through TanStack Query must have error state handled in the UI (a toast, inline message, etc.) — no silent failed requests that leave the operator wondering if an order was saved.

## 5. Validation Rules

- **Every Zod schema must reject unknown/extra fields** (using `.strict()`) — this stops stray fields from silently reaching the database.
- **Business-rule validation lives in services.** E.g. "bottles returned ≤ customer's current balance" is checked in `deliveries.service.ts`, not scattered in the controller or the frontend form.
- **Every soft-block check (Section 9 of requirements) must be enforced server-side**, even though the frontend should also show the warning early for a good user experience. The frontend check is a convenience; the backend check is the real gate.
- **Required vs optional fields must match the requirements doc exactly** — e.g. Default Selling Price and Credit Limit are optional on Customer; Phone Number is required and unique.

## 6. Security Rules

- **Never trust client input for anything that affects money, stock, or bottle counts.** Always recompute and re-validate server-side.
- **Passwords**: bcrypt only, minimum salt rounds 10+, never logged, never returned in any API response.
- **JWTs**: stored in httpOnly cookies, secrets stored in environment variables — never hardcoded, never committed to git.
- **Role checks on every protected route** via `role.middleware.ts` — don't rely on the frontend hiding a button as the only protection. If Operator shouldn't see profit margins, the API must refuse to return that data to an Operator token.
- **Admin password reset requires accountant approval** — implement this as an actual two-step server-side flow, not a UI-only confirmation dialog.
- **Daily-closed records are backend-enforced as locked** — the accountant role must be rejected by the API (not just the UI) from writing transactions dated on/before the last close.
- **No secrets in the repo.** `.env` files are git-ignored; only `.env.example` (with placeholder values) is committed.
- **File uploads**: validate mime-type and size server-side (Multer config) before forwarding to S3.
- **CORS**: configured on Express to only allow the frontend origin. No wildcard `*` in production.

## 7. Libraries to Use

Stick to the confirmed stack — don't substitute "similar" packages mid-project:

**Frontend:** React 19, Vite, TypeScript, React Router v7, Tailwind CSS v4, Lucide React, React Hook Form, Zod, TanStack Query v5, Axios, TanStack Table, Recharts, date-fns.

**Backend:** Express, TypeScript, Prisma ORM, jsonwebtoken, bcrypt, Multer, Zod, node-cron, cors, helmet, cookie-parser.

**Other:** PostgreSQL (NeonDB), Prisma Migrate, PDFKit, ExcelJS.

If a task seems to need something outside this list, stop and flag it rather than quietly adding a new dependency — a new library is a project-wide decision, not a per-file one.

## 8. Libraries to Avoid

- **No competing state libraries** — don't add Redux, MobX, Recoil, Zustand, or Jotai; TanStack Query + React state already covers all needs.
- **No competing ORMs** — don't add TypeORM, Sequelize, Knex, or Drizzle alongside Prisma. One data-access layer only.
- **No competing UI kits** — don't add MUI, Ant Design, Chakra, or Bootstrap alongside Tailwind; it creates visual and bundle-size inconsistency.
- **No competing form libraries** — don't add Formik; React Hook Form + Zod is the standard.
- **No moment.js** — date-fns is already chosen; moment is heavier and effectively deprecated.
- **No Next.js, Remix, or SSR frameworks** — this is a Vite SPA + Express API. No server-side rendering needed for an internal operations tool.
- **No alternative auth-as-a-service** (Auth0, Clerk, Firebase Auth) unless explicitly requested later — the JWT + bcrypt approach is intentional and keeps the system self-contained and free-tier-friendly.
- **No local/session storage for anything business-critical** (balances, tokens meant to be secure) — httpOnly cookies and in-memory state only.
- **No generic "admin panel generator" packages** (e.g. AdminJS, React-Admin) — the UI is purpose-built around the 20-second order-entry goal, which generic admin scaffolding won't respect.

## 9. AI Boundaries

These are hard limits on what an AI assistant working on this codebase should and shouldn't do unprompted:

- **Never invent business rules.** If a number, formula, or workflow isn't in `project-requirements.md`, don't guess — flag it as an open question.
- **Never make a balance or count directly editable**, even if it seems convenient for a quick fix. If a bug needs correcting, add an adjustment/reversal transaction — don't patch the stored number.
- **Never silently swap a library**, change the database schema shape, or restructure folders without calling it out — these are project-wide decisions covered by this file, not local code style choices.
- **Never turn a soft-block into a hard block, or vice versa**, without being told to — this is a deliberate business decision (Section 9 of requirements), not a technical default.
- **Never remove the two-independent-status model** (delivery status vs payment status) to "simplify" order handling — this is a deliberate design decision, not an accident.
- **Always keep 19L and PET orders as separate types** — don't refactor them into one generic "order" shape that merges their fields, even if it looks like it would reduce duplication.
- **When unsure whether something is a hard rule or a stylistic preference, treat it as a hard rule** and ask, rather than optimizing it away.
- **Don't add speculative features** ("this might be useful later") beyond what's asked — extra scope adds maintenance weight to a small business system that needs to stay simple.

## 10. Performance Rules

- **The 20-second order target governs the UI.** Any order-desk screen should load customer data in one request, not several round trips — batch what the operator needs to see (balance, bottle count, last order) into a single endpoint response.
- **Paginate everything that lists records** (customers, orders, transactions) — never fetch an unbounded list, even in early phases when data is small, since habits set now carry forward.
- **Dashboard queries should be indexed** — anything summed live (today's sales, pending orders count) needs a database index on the fields it filters/groups by (date, status, customer ID).
- **Avoid N+1 queries.** Use Prisma's `include`/`select` to fetch related data in one query, not in a loop.
- **Cache read-heavy, slow-changing data on the frontend** via TanStack Query's built-in caching (e.g. item master list) rather than re-fetching on every screen visit.
- **Heavy report/export generation (PDFKit, ExcelJS)** should run as a background-friendly request (not blocking the main thread for large date ranges) — for very large yearly reports, consider generating asynchronously and notifying when ready, once usage grows enough to need it.

## 11. Git Rules

- **Conventional commits**: `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `test:` prefixes, short present-tense summary (`feat: add bottle ledger reconciliation check`).
- **One logical change per commit** — don't bundle an unrelated bug fix into a feature commit.
- **Branch naming**: `feature/<short-name>`, `fix/<short-name>` (e.g. `feature/pet-production-batch`).
- **No direct commits to `main`** — all changes go through a branch, even if reviewed by the same person, so history stays traceable (this mirrors the project's own "everything traceable through history" philosophy).
- **`.env` and secrets are never committed** — enforced via `.gitignore` from the very first commit.
- **Migrations are committed, never edited after being merged** — a schema change after the fact is a *new* migration, the same way a balance correction is a new transaction, not an edit to an old one.
- **Meaningful PR/commit descriptions** — reference which requirements or architecture section the change implements, so the "why" is traceable later, not just the "what."
