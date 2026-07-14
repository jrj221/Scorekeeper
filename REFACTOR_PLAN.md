# Scorekeeper — Architecture & Deduplication Plan

Goal: make the codebase **building-block based** — a generic, configurable game engine that
specific "classic" games (Phase 10 today, more later) extend by overriding behavior, and a set
of composed UI blocks that every screen reuses instead of copy-pasting. This is a handoff plan
for implementation; it is deliberately medium-grained (what to build and why, not every line).

---

## 1. What's wrong today

### 1a. No game-type abstraction (the core problem)
Phase 10 is implemented as scattered `if (isPhase10)` branches, not as a variant of a base game:
- `game/[id]/index.tsx` — **31** phase-10 references
- `game/[id]/results.tsx` — 7, `info.tsx` — 4, `new-game.tsx` — 8, `utils/game.ts` — 10

Adding a second classic game (e.g. Yahtzee, Golf, Rummy) currently means editing all of these
files again. There is no seam to plug a new rule set into.

### 1b. Copy-pasted UI blocks
- **Podium + ranked "rest" list** is duplicated between `results.tsx` (animated) and the
  `viewMode === "results"` branch of `index.tsx` (static) — same constants (`COL_RANK`,
  `RANK_ICONS`, `PODIUM_H`, `PLATFORM_H`), same `TieList` scroll logic, same `podiumStyles`.
- **Setup form body** is duplicated across `new-game.tsx` (762 lines), `info.tsx` (817),
  and `edit.tsx` (388). The *primitives* (`SetupCard`, `OptionCard`, `Pills`, `PersonPicker`…
  in `components/setup-form.tsx`) are well-factored, but the **composed blocks** built from them
  are pasted verbatim: the Game-Name card, the ~120-line player-search + group-search dropdown
  block, the Game-Conditions (rounds/winner) card, the Dealer/Goes-first/Dice/Timer option cards,
  and the `firstPlayerPills` derivation.

### 1c. Dead code to delete
Confirmed zero imports outside their own file:
- `src/components/scoreboard.tsx`
- `src/components/round-entry-modal.tsx`
- `src/components/add-player-modal.tsx`
- `src/components/new-game-modal.tsx`
- `src/styles/game.ts` (only referenced by the two dead components above)
- `src/app/game/[id]/edit.tsx` — **dead route**: nothing links to `/game/[id]/edit`; it was
  superseded by `info.tsx`. It also re-implements player-search logic that the `usePlayerSearch`
  hook already provides.

> Verify each with a grep before deleting; do this as **Phase 0** so later phases work on a
> smaller surface.

---

## 2. Target architecture

### 2a. Game-type registry (strategy pattern) — the keystone
Create `src/game-types/` with one descriptor per game type plus a base descriptor. A game type is
data + behavior, consumed everywhere a variant decision is made today.

```
src/game-types/
  types.ts        # GameTypeDefinition interface
  base.ts         # default/"configurable" game (regular scoring)
  phase10.ts      # extends base, overrides the Phase 10 bits
  registry.ts     # id -> GameTypeDefinition; getGameType(game): GameTypeDefinition
```

`GameTypeDefinition` should own every behavior that currently branches on `isPhase10`:

- **Ranking / scoring**
  - `sortPlayers(game, players, totals)` — regular: by total per `rankByLowest`; phase10: by phase then total
  - `tierKey(game, playerId, totals)` — for `buildTiers`
  - `getTotals(game)` (base impl fine for both)
  - `winnerLabel(game)`
- **Progression**
  - `isFinalRound(game, currentRoundIndex)` — regular: `currentRound >= totalRounds-1`; phase10: `isPhase10Won`
  - `finishButtonLabel` — "Show Final Scores" vs "Finish Game"
- **Secondary stat** (the "(Phase X)" concept, generalized)
  - `secondaryStat?(game, playerId): { short: string; long: string } | null` — powers the name
    subtitle in the scorecard, the podium sub-line, and the rest-list line. Base returns null.
- **Scorecard cell decoration**
  - `cellBackground?(game, roundIndex, playerId, theme): string | undefined` — phase10 green/red tint
  - `extraTurnColumn?` — descriptor for the "Phased?" column (header label, render checkbox,
    onToggle → `updatePhased`). Base: none.
- **Setup / editing**
  - `lockedFields` (move the Phase 10 list here; classic-games.ts can reference it)
  - `setupSections?(state, ctx): ReactNode` — extra creation UI (Phase 10's "How many phases" +
    rules card). Base: none.
  - `infoSections?(game): ReactNode` — read-only equivalent for the info screen.

`getGameType(game)` returns the phase10 definition when `game.gameType === 'phase10'`, else base.
Phase 10's definition is literally `{ ...base, ...overrides }` — this is the "inherit the
configurable component to make a hard-coded one" the app should be built on.

Fold the existing helpers in `utils/game.ts` into this: the phase functions
(`getPhaseSequence`, `getPhaseAtRound`, `getCurrentPhase`, `isPhase10Won`) move behind
`phase10.ts`; the generic ones (`getGameTotals`, `buildTiers`, `getTurnState`, hint text) stay in
`utils/game.ts` and are called by the base definition.

### 2b. Decomposed UI building blocks
Create these presentational components (props in, no data fetching):

**Results / standings** (`src/components/standings/`)
- `Podium` — top-3 platforms. Props: `tiers`, `totals`, `theme`, `secondaryStat`, and an
  `animated` flag (drives the rise animation from `results.tsx`; static when false). Absorbs the
  duplicated `TieList`/tie-scroll, `COL_RANK`, `RANK_ICONS`, platform sizing (incl. large-text
  scaling), and `podiumStyles`.
- `RankedList` — 4th-place-and-below dense list (the "rest" rows). Props: `tiers` (already sliced),
  `totals`, `secondaryStat`.

`results.tsx` becomes `Podium(animated) + RankedList`. The `viewMode==="results"` branch in
`index.tsx` becomes `Podium(static) + RankedList`. Deletes ~250 lines of duplication.

**Scorecard** (`src/components/scorecard/`)
Extract the `viewMode==="scores"` grid from `index.tsx` into a `Scorecard` component that takes
`game`, the `useGame` outputs, and the `GameTypeDefinition`, and uses `cellBackground` /
`secondaryStat` / column config instead of inline `isPhase10`. Keep the column-reorder and
vertical-sync animations inside it.

**Turn view** (`src/components/scorecard/`)
Extract the `viewMode==="turns"` list (turn order, dealer badge, rotation animation, the phased
column) into a `TurnList` component driven by the definition's `extraTurnColumn`.

> `index.tsx` should end up an orchestrator (~250–350 lines): header, tab toggle, round label,
> and mounting `TurnList` / `Scorecard` / `Podium` — not 1,600 lines of mixed concerns.

**Setup form blocks** (`src/components/setup-form.tsx` or a new `setup/` folder)
Promote the copy-pasted compositions to components that both `new-game.tsx` and `info.tsx`
(and template screens where applicable) render:
- `GameNameCard` — icon button + name input, with `locked`/`readOnly` variants
- `PlayersSection` — owns the player-search + group dropdowns and wires `usePlayerSearch`;
  today this ~120-line block is pasted in new-game, info, and edit
- `GameConditionsSection` — rounds (numpad + endless toggle) + winner segmented control
- `DealerOptionCard`, `FirstPlayerOptionCard` — including the shared `firstPlayerPills`
  derivation and hint text
- `ExtrasOptionCards` — dice/timer
- Move the `firstPlayerPills` builder into `setup-form.tsx` as a shared helper.

Keep each screen's own state/handlers; these blocks take values + callbacks (controlled
components). Do **not** try to unify create-vs-edit state management into one mega-hook — the
draft model (`useDraft`) vs local `useState` difference is fine; just share the *presentation*.

---

## 3. Phased execution (each phase compiles, runs, and is independently reviewable)

**Phase 0 — Delete dead code.** Remove the six dead files in §1c after grep-verifying. Run
`npm test` + `expo lint`. Small, safe, shrinks the surface.

**Phase 1 — Standings components.** Build `Podium` + `RankedList`; refactor `results.tsx` and the
results branch of `index.tsx` to use them. No behavior change (keep the animation in results,
static in the scorecard tab). Verify both screens visually.

**Phase 2 — Game-type registry (no UI move yet).** Add `src/game-types/*`. Implement base +
phase10 definitions by *moving* logic out of `utils/game.ts` and `useGame`. Replace `sortPlayers`,
tie-key, `isFinalRound`, winner label, and `getCurrentPhase`-driven displays with calls through
`getGameType(game)`. Podium/RankedList/index/results/info stop importing phase10 helpers directly
and instead use `secondaryStat`. Unit-test the definitions (extend `__tests__/game-utils.test.ts`).

**Phase 3 — Scorecard + TurnList components.** Extract from `index.tsx`, driven by the definition
(`cellBackground`, `extraTurnColumn`, `secondaryStat`). `index.tsx` becomes the orchestrator.
This is the largest phase; land it after 1–2 so the shared pieces already exist.

**Phase 4 — Setup form blocks.** Extract `GameNameCard`, `PlayersSection`, `GameConditionsSection`,
the option cards, and `firstPlayerPills`. Refactor `new-game.tsx` and `info.tsx` to compose them;
wire Phase 10's extra sections through `setupSections`/`infoSections`. Confirm template screens
(`new-template.tsx`, `template/[id].tsx`) reuse the option cards where they overlap.

**Phase 5 — Cleanup pass.** Remove now-unused constants/styles, dedupe leftover `firstPlayerPills`
/ hint derivations, and confirm `utils/game.ts` only holds generic helpers.

---

## 4. Guardrails
- **No behavior/visual regressions** — this is a refactor. Diff screens before/after; the
  large-text scaling paths and animations (column reorder, turn rotation, podium rise) must be
  preserved exactly.
- **Storage format unchanged** — do not alter the `Game`/`GameTemplate` shapes or `STORAGE_KEY`;
  the registry reads existing fields (`gameType`, `phasedRounds`, `phaseSubset`, `lockedFields`).
- **Adding a new classic game must touch only** `src/game-types/<new>.ts`, `registry.ts`, and
  `constants/classic-games.ts` — that's the acceptance test for whether the abstraction succeeded.
- Run `npm test` and `expo lint` after every phase.
- Expo is pinned; per `AGENTS.md`, check the versioned Expo docs before adding any new dependency
  (none should be needed for this refactor).
