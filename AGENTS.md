# MealUp AI Office — agent operating rules (laboratory)

Applies to every AI Office department and subordinate specialist that receives a task related to this repository. This file is a **procedural pointer**, NOT a replacement for the original Costituzione Operativa AI v1.9 FROZEN.

## Canonical AI Office Masterplan and recovery

Before starting or resuming any AI Office work, read [`docs/ai-office/MASTERPLAN.md`](docs/ai-office/MASTERPLAN.md) and its single structured source [`tools/ai-office/masterplan-ledger.json`](tools/ai-office/masterplan-ledger.json). Locate the open `AIOS-XX.X` step, check its authorized scope, verified evidence, dependencies and FROZEN, preserve decision and recovery IDs, and update only the applicable step after independent QA. Do not confuse completed offline tests with autonomous model capability. Food Portrait has its own workstream, not an AI Office subtask. If the ledger and current task disagree materially, mark STALE/BLOCKED and reconcile before acting.

## Before each nontrivial order

1. Confirm who issued the order. The **CEO** directs the independent Talent Scout; the **Director** assigns scoped work to the operating departments and their authorized subagents. No subordinate expands permissions or switches agents on its own.
2. Read the current brief, baseline, FROZEN and DO NOT TOUCH list. State the final objective, observable Definition of Done, MUST, invariants, risks, authorized write scope and evidence sources. Verify facts before assuming them.
3. Run the Rule Activation Engine against the **exact verified original** of Costituzione Operativa AI v1.9. The canonical original is in the CEO's private ChatGPT Library, **not in this public GitHub repository**. Its SHA-256 is pinned by `tools/ai-office/constitution-task-packet.py`. Never request to commit the private full text publicly.
4. Activate ALL Universal Dogmas, then the conditional and special rules triggered by **the actual task and the chosen Skill**. Provide each specialist only the relevant exact excerpts plus stable rule IDs, version and source evidence. When the original is not accessible, mark the delegated job BLOCKED instead of inventing text or silently relying on a summary.
5. Before execution produce an ordered micro-step plan. Each step must contain one main objective, scope, prerequisites, expected output, method of verification, completion condition, dependencies and status. Respect causal order and the approved task scope.
6. For each task, the specialist may select any **previously verified, approved and suitable Skill**, not only Skill capabilities known at hiring. If an unapproved or external tool is needed, initiate a review; privilege changes, new integrations, costs, production writes or changes to FROZEN require the CEO's approval.
7. Checkpoint and reconcile all prior steps, evidence, changes, unknowns, decisions, exceptions and errors across handoffs, interruptions, changes and provider/quota rotations. Never lose or silently replace a prior MUST or open step.
8. Apply independent QA and postflight validation against the original goal, MUST, references, invariants, regressions and authorized change-set. Mark VERIFIED only when the applicable evidence exists; otherwise PARTIALLY VERIFIED, UNVERIFIED, BLOCKED or FAILED. Record Root Cause + Prevention where required.

## Protected-source policy

The original document must be supplied from an authorized **private local source** to `tools/ai-office/constitution-task-packet.py`. Its exact clause content must stay in protected local output, not public code, logs or artifact uploads. GitHub CI synthetic fixtures validate code but cannot prove a real handoff complies without the original source.

Technical policy: `docs/design/mealup-dynamic-skill-policy-v1.md`; source-aware rule extraction: `tools/ai-office/constitution-task-packet.py`. Default GitHub Actions syntax and QA runs remain routine infrastructure checks, **not authorization to act as autonomous agents**.

Never modify `main`, the official tester, public PWA or approved/FROZEN assets and documents without a separate explicit authorization. Additional spend remains 0 EUR. When lacking a capability, report the blocker and a safe alternative instead of inventing completion.
