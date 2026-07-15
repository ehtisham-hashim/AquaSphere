# Memory — AQUA Sphere OS

Last updated: 2026-07-15

This file is the AI's short-term memory across sessions — what's done, what's in progress, and what's next, so no session has to re-read every other document from scratch to figure out where the project stands. Update it after every meaningful chunk of work (a finished feature, a finished file, or the end of a session), not just at the end of a phase.

---

## Current Phase

**Phase 1 — Project Setup** (see `phases.md`)
Status: **not started.** Development has not begun — this file is being created ahead of time so the structure exists the moment Phase 1 work starts.

## Current Module

None yet. First module up in Phase 1 is project scaffolding (no business module — this is repo/tooling setup).

## Current File

None yet — no files exist beyond the five planning documents:
`project-requirements.md`, `architecture.md`, `rules.md`, `design.md`, `phases.md`.

---

## Completed Features

_(Nothing yet — this section fills in as phases close out. Format going forward:)_

- [ ] Phase 1: Project Setup
- [ ] Phase 2: Authentication & Roles
- [ ] Phase 3: Customer Management
- [ ] Phase 4: Core Inventory & Item Master
- [ ] Phase 5: Bottle Ledger
- [ ] Phase 6: Orders (19L & PET)
- [ ] Phase 7: Deliveries
- [ ] Phase 8: Dashboard (Basics)
- [ ] Phase 9: Production (PET)
- [ ] Phase 10: Purchasing & Vendors
- [ ] Phase 11: Expenses
- [ ] Phase 12: Expanded Dashboard & Reports
- [ ] Phase 13: Notifications & Daily Closing
- [ ] Phase 14: Counter Sales & Invoicing
- [ ] Phase 15: Blowing Machine Division
- [ ] Phase 16: Website
- [ ] Phase 17: Optimization & Polish

## Pending Tasks

Pulled directly from `phases.md` Phase 1 checklist — the immediate queue:

- [ ] Initialize Next.js structure per `architecture.md` §6
- [ ] Scaffold Next.js 15 app; install Tailwind v4 + shadcn/ui
- [ ] Connect Prisma to a Postgres instance (Neon/Supabase free tier)
- [ ] Configure ESLint + Prettier project-wide per `rules.md` §1
- [ ] Create `.env.example`; confirm `.env` is git-ignored
- [ ] First empty Prisma migration, confirm it runs cleanly
- [ ] Confirm a Server Action can hit the DB end-to-end

## Next Task

**Initialize the Next.js app structure** — this is the very first concrete action once building begins, per Phase 1 in `phases.md`.

---

## Known Issues

Open items carried over from the planning documents — none are bugs yet (no code exists), but these are unresolved questions that will block specific later phases if not answered in time:

- **Mineral-set water volume conflict** — `project-requirements.md` §3 states 13,248 litres per mineral set; the handwritten manager notes say 15,140 litres. Must be confirmed with the owner before Phase 9 (Production) is built, since it's the core of the mineral-deduction formula.
- **Label & shrink-wrap conversion factors** (kg consumed per PET pack) — not yet provided. Blocks the finishing of Phase 9 (Production); can be scaffolded with placeholder values but must be corrected before go-live.
- **Report layout detail** — `project-requirements.md` §14/§18 flags that daily/weekly/monthly/yearly report layouts were only specified by topic, not exact format. Needs a working session with the owner before Phase 12 (Reports) is finished.
- **Formal price-history mechanism** — undecided whether needed beyond the per-order-item price snapshot. Deferred to Phase 17 unless the owner asks for it sooner.
- **Driver/route assignment** — explicitly out of scope for now (`project-requirements.md` §18), but worth re-confirming with the owner before Phase 17, in case priorities shifted.
- **Individual bottle serialization** — not building it now; data model must leave room for it (per `architecture.md` §4). Flagged as a design constraint to check during Phase 5 (Bottle Ledger) implementation, not just a future nice-to-have.

## Notes

- The five foundation documents (`project-requirements.md`, `architecture.md`, `rules.md`, `design.md`, `phases.md`) are finalized as of this date. Any change to *what* is being built, *how* it's structured, *how* code is written, or *how* it looks should be made in those files first — this memory file only tracks progress and decisions made along the way, it doesn't redefine scope.
- `phases.md` reordered the original phase list so Inventory and the Bottle Ledger are built *before* Orders/Deliveries, since both write into them. If a future session sees Orders work happening before Bottle Ledger/Inventory exist, that's a sequencing error — check `phases.md` before proceeding.
- The single most important rule across every document: **no balance, stock count, or bottle count is ever a directly-editable field** — everything is derived from a transaction ledger (`architecture.md` §4, `rules.md` §1 and §9). Any code review or AI-assisted change should be checked against this before being accepted.
- This file should be updated at the end of every work session, even a short one — "Current File" and "Next Task" especially, so the next session (human or AI) can resume in seconds instead of re-deriving context.
