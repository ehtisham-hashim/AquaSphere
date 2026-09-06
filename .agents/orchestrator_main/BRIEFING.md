# BRIEFING — 2026-09-03T14:33:45Z

## Mission
Execute the implementation plan for Dynamic Custom Raw Materials & Finished Goods (BOM) across backend, database seed, and frontend in AquaSphere/Wadaana.

## 🔒 My Identity
- Archetype: orchestrator
- Roles: orchestrator, user_liaison, human_reporter, successor
- Working directory: /home/ehtisham/Desktop/AquaSphere/.agents/orchestrator_main
- Original parent: parent
- Original parent conversation ID: f3deec1c-faaa-4003-8c2e-be224fc351ca

## 🔒 My Workflow
- **Pattern**: Project Pattern
- **Scope document**: /home/ehtisham/Desktop/AquaSphere/.agents/orchestrator_main/PROJECT.md
1. **Decompose**: Decompose into Survey, Database & Seed Milestone, Backend API & Logic Milestone, Frontend UI & Flow Milestone, and Final E2E Integration / Hardening.
2. **Dispatch & Execute**:
   - Direct: Orchestrate specialized subagents (Explorers -> Workers -> Reviewers -> Challengers -> Auditors).
3. **On failure**:
   - Retry: nudge stuck agent or re-send task
   - Replace: spawn fresh agent with partial progress
   - Skip: proceed without (only if non-critical)
   - Redistribute: split stuck agent's remaining work
   - Redesign: re-partition decomposition
   - Escalate: report to parent (last resort)
4. **Succession**: At 16 spawns, write handoff.md, spawn successor.
- **Work items**:
  1. Survey & Initial Codebase Mapping [in-progress]
  2. Database Layer & Seed Verification [pending]
  3. Backend Dynamic BOM Implementation [pending]
  4. Frontend UI Implementation [pending]
  5. E2E Verification & Hardening [pending]
- **Current phase**: 0 (Survey)
- **Current focus**: Survey codebase and existing schema/implementations via Explorers

## 🔒 Key Constraints
- NEVER write, modify, or create source code files directly.
- NEVER run build/test commands yourself — require workers to do so.
- NEVER investigate or explore the problem at the code level directly — dispatch Explorers for technical investigation.
- You MAY use file-editing tools ONLY for metadata/state files (.md) in your .agents/ folder.
- Maintain backward compatibility for all legacy data and batches.
- Never reuse a subagent after it has delivered its handoff — always spawn fresh.
- Binary veto on Forensic Auditor integrity violations.

## Current Parent
- Conversation ID: f3deec1c-faaa-4003-8c2e-be224fc351ca
- Updated: 2026-09-03T14:33:00Z

## Key Decisions Made
- Dispatched 3 parallel Survey Explorers for DB, Backend, and Frontend.

## Team Roster
| Agent | Type | Work Item | Status | Conv ID |
|-------|------|-----------|--------|---------|
| Database Explorer | teamwork_preview_explorer | Survey DB & Seed | in-progress | b97f39ba-d47d-413e-af60-1f668ed7d1a5 |
| Backend Explorer | teamwork_preview_explorer | Survey Backend & APIs | in-progress | b0de4ecf-6c9a-49e8-a403-ca3c4a876055 |
| Frontend Explorer | teamwork_preview_explorer | Survey Frontend UI | in-progress | 89d51cb9-1f98-420f-a258-372a59909f42 |

## Succession Status
- Succession required: no
- Spawn count: 3 / 16
- Pending subagents: b97f39ba-d47d-413e-af60-1f668ed7d1a5, b0de4ecf-6c9a-49e8-a403-ca3c4a876055, 89d51cb9-1f98-420f-a258-372a59909f42
- Predecessor: none
- Successor: not yet spawned

## Active Timers
- Heartbeat cron: 2ed709fa-a9ca-4003-ae31-152a791974bd/task-15
- Safety timer: none

## Artifact Index
- /home/ehtisham/Desktop/AquaSphere/ORIGINAL_REQUEST.md — User request
- /home/ehtisham/Desktop/AquaSphere/implementation_plan.md — Reference plan
- /home/ehtisham/Desktop/AquaSphere/.agents/orchestrator_main/PROJECT.md — Global project plan
- /home/ehtisham/Desktop/AquaSphere/.agents/orchestrator_main/progress.md — Liveness & progress heartbeat
