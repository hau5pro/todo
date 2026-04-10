# Full App Audit — Design Spec

**Date:** 2026-04-10
**Scope:** Entire codebase
**Executor:** Claude (user reviews before each commit)

---

## Goal

A structured, priority-driven audit of the TO DO app covering bugs, performance, refactoring, test coverage, and documentation. The aim is to improve correctness and code quality without adding features or changing behaviour.

---

## Phases

### Phase 1 — Bugs & Correctness

Audit all code for logic errors and unsafe patterns before touching anything else.

**What to look for:**
- Unhandled promise rejections in DB ops and sync
- Missing null / undefined guards
- Race conditions in sync orchestrator (e.g. concurrent push/pull)
- Edge cases in recurrence logic (cyclical task advancement, RRule parsing)
- Edge cases in streak calculation (timezone boundaries, missing completions)
- Type safety gaps (implicit `any`, unsafe casts)
- State mutations that bypass the store
- UI state that can get stuck (e.g. edit modes not cleaned up on unmount)

**Outcome:** All confirmed bugs fixed, each as its own commit.

---

### Phase 2 — Performance

Look for rendering and runtime inefficiencies.

**What to look for:**
- Inline object/array/function literals passed as props (cause unnecessary re-renders)
- Missing `useMemo` / `useCallback` on expensive computations or stable callbacks
- Missing `React.memo` on pure leaf components that receive stable props
- Store selectors that return new references on every call
- Expensive operations (sort, filter, map) run on every render without memoisation
- Animation / Framer Motion patterns that cause layout thrash

**Outcome:** Measurable reduction in unnecessary re-renders; no behaviour change.

---

### Phase 3 — Refactoring

Improve code clarity and remove cruft.

**What to look for:**
- Dead code (unused exports, unreachable branches, stale feature flags)
- Duplicated logic that belongs in a shared utility
- Components doing too many things (split if a clear boundary exists)
- Overly large files (>400 lines is a signal, not a rule)
- Inconsistent naming (style, casing, terminology)
- Type improvements (loose types tightened, `any` replaced)

**Constraint:** Only refactor code that has a clear problem. No aesthetic-only changes.

**Outcome:** Cleaner, more navigable codebase; no behaviour change.

---

### Phase 4 — Test Coverage

Audit existing tests and fill meaningful gaps.

**Scope:**
- `src/tests/db/` — DB operations
- `src/tests/store/` — store actions
- `src/tests/hooks/` — custom hooks
- Utility functions (`src/utils/`)
- Streak / recurrence logic (already partially tested — fill edge cases)

**What counts as a meaningful gap:**
- Untested public functions with non-trivial logic
- Edge cases explicitly called out in comments but not covered
- Failure paths (DB errors, sync failures, invalid input)

**What to skip:**
- Pure rendering tests (brittle, low value)
- Tests that would require mocking the entire sync layer

**Outcome:** Higher confidence in correctness of core logic; all new tests passing.

---

### Phase 5 — Docs

Update documentation to reflect current state of the codebase.

**What to cover:**
- `CLAUDE.md` — update key file map if anything moved or changed, add any new patterns discovered during audit
- Inline comments for non-obvious logic:
  - Sync orchestrator debounce / race handling
  - Streak calculation edge cases
  - Drag performance workaround (line indicator + DOM refs)
  - iOS PWA focus workaround (always-mounted input)
  - CSS specificity decisions (e.g. nav-icon-btn--active:hover rule)
- Remove stale or misleading comments found during earlier phases

**Outcome:** A developer reading the codebase for the first time can understand the non-obvious parts without asking.

---

## Execution Rules

1. **Audit before fixing** — read all relevant files in the phase, build a complete issue list, then fix in priority order
2. **Atomic commits** — one logical change per commit; user reviews before each commit lands
3. **No cross-phase fixes** — bugs found during Phase 3 are noted, not fixed; handled in a follow-up
4. **No speculative changes** — every change must address a demonstrable problem
5. **Phase summaries** — brief written summary after each phase before proceeding

---

## Files in Scope

| Area | Files |
|---|---|
| Store | `src/store/index.ts` |
| DB | `src/db/client.ts`, `tasks.ts`, `lists.ts`, `folders.ts`, `habits.ts`, `sync.ts`, `settings.ts` |
| Sync | `src/sync/orchestrator.ts` |
| Views | `src/views/*.tsx` |
| Components | `src/components/*.tsx` |
| Hooks | `src/hooks/*.ts` |
| Utils | `src/utils/*.ts` |
| Config | `src/config/*.ts`, `src/config/*.tsx` |
| Contexts | `src/contexts/*.tsx` |
| Tests | `src/tests/**` |
| Docs | `CLAUDE.md`, inline comments |
