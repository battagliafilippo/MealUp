# MealUp AI Office — Director private checkpoint and Constitution gate

**Version:** lab implementation 18 October 2026. Applies only to `experiment/recipe-visual-agents`. This is a technical boundary and not authorization to run autonomous specialist models.

## Purpose and components

- `constitution-protected-handoff.cjs`: a task and its approved specialist Skill(s) are passed to the v1.9 Python rule engine using an **explicit private original DOCX path**. The Python tool verifies its pinned SHA-256, activates universal and relevant conditional clauses, and saves the selected original passages to a private local file only.
- `director-secure-preflight.cjs`: prepares a work order and *records only metadata* indicating READY/BLOCKED in the Director journal. A READY preflight is **NOT an agent execution**.
- `director-private-ledger.cjs`: append-only hash-linked and locally persistent journal. Stable event IDs and idempotent retries, restrictive permissions, checks against replay/tampering, and independent QA event roles.
- `AGENTS.md`: operating rules; `masterplan-ledger.json`: the canonical roadmap with step numbers.

## Input contract

The caller supplies a structured task with `taskId`, `agentId`, `roleId`, `constitutionVersion:'1.9'`, `activeBriefVersion`, `baselineId`, `goal`, `scope`, risk, MUST, FROZEN, DO NOT TOUCH, acceptance, `requiredCapabilities`, tags and fully specified atomic steps. Also pass a scoped approved `assignment`, a unique `attemptId`, `sourcePath` to the original **outside the repository**, and an existing `privateDirectory` (absolute, local, mode 0700, not symlink or inside public repo).

Results are deliberately limited to safe metadata: status, selected Skill IDs, count of selected constitutional rules, next step, and proof that **no external model was called, no agent executed and no project file changed**. The private original rule text and detailed rule packet must never enter GitHub commit history, Actions logs or public artifacts.

`director-private-ledger.cjs` persists its `director-events.v1.json` in the private directory with mode 0600. It uses an exclusive lock file, verifies the hash chain on read and atomically replaces the journal on append. If a lock persists after a crashed writer, stop and inspect manually rather than force resuming. A journal survives restarts **only if the same private filesystem remains available**; public GitHub Actions ephemeral storage is NOT a permanent source of shared memory.

## Fail-closed operating rules

- No original source → `BLOCKED_CANONICAL_CONSTITUTION_NOT_ACCESSIBLE`. Hash mismatch → `BLOCKED_CANONICAL_PREFLIGHT_FAILED`. No permission to write private journal → `BLOCKED_PRIVATE_STORAGE_UNAVAILABLE`.
- A missing/unknown task Skill is denied by the existing dynamic selector. The agent cannot install it automatically. A stale explicit Constitution version is denied rather than silently upgraded.
- Task recovery is not an excuse to bypass the original Constitution: each **new handoff** must pass the source check. Offline simulated evidence or a hash stored in the journal does not substitute for a real document.
- A `STEP_CHECKPOINT` requires evidence; only role QA can append `QA_REPORTED`. QA role names stored in the journal do not by themselves authenticate a live remote agent. Authentication and private runtime hosting remain future gates.
- This module is limited to **local private storage**, not deployed cloud memory, credential management, actual inter-agent inbox/outbox, autonomous quotas or the complete Director runtime.

## Verified vs missing

**Verified:** offline safety and restart tests in GitHub Actions; fail-closed when source absent; negative tests for wrong source and unapproved skill; private journal event replay and tampering checks.

**Not yet verified:** persistent integration of ChatGPT's private Library with an autonomous runtime, authenticating external agents and QA, model-provider live quotas, running an actual task and end-to-end communication between real departments.

**Next:** keep `AIOS-02.2 PARTIALLY_VERIFIED`, record `AIOS-03.1 PARTIALLY_VERIFIED` for private journal proof of concept. Follow next with `AIOS-03.2` only after defining safe resume and approved host. No authority to modify app or FROZEN.

All costs remain zero additional EUR.
