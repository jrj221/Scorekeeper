import { ReactNode } from 'react';

import { ThemeColors } from '@/constants/color-schemes';
import { Game, Player } from '@/context/games-context';

/** State + callbacks passed to `setupSections` for the creation-flow extra UI. */
export interface SetupSectionsState {
  phaseSubsetChoice: 'all' | 'odd' | 'even';
}
export interface SetupSectionsCtx {
  onChangePhaseSubset(choice: 'all' | 'odd' | 'even'): void;
}

/**
 * Strategy-pattern descriptor for a "classic" game variant (e.g. Phase 10) vs the
 * default/configurable game. `getGameType(game)` resolves the right definition; every
 * place that used to branch on `game.gameType === 'phase10'` should call through this
 * instead. See REFACTOR_PLAN.md §2a.
 */
export interface GameTypeDefinition {
  /** Sorts players by the game's win condition (highest-ranked first). */
  sortPlayers(game: Game, players: Player[], totals: Record<string, number>): Player[];

  /** Composite tie-key for a player under the game's win condition, used by `buildTiers`. */
  tierKey(game: Game, playerId: string, totals: Record<string, number>): string;

  /** Per-player score totals for the game. */
  getTotals(game: Game): Record<string, number>;

  /** Label shown for the winner(s) of a finished game, e.g. "🏆 Alice" or "🤝 2-way Tie". */
  winnerLabel(game: Game): string;

  /** True when `roundIndex` is (or would complete) the last round of the game. */
  isFinalRound(game: Game, roundIndex: number): boolean;

  /** Label for the button that ends the game once the final round is fully scored. */
  finishButtonLabel: string;

  /**
   * Optional secondary stat shown alongside a player's name (scorecard subtitle, podium
   * sub-line, rest-list line). Null/undefined when the game type has none.
   */
  secondaryStat?(game: Game, playerId: string): { short: string; long: string } | null;

  /**
   * Optional visual status for a scorecard cell (e.g. Phase 10's phased/not-phased
   * green/red). Only called for cells that already have a score (`hasScore` true);
   * return undefined for no special styling. `color` drives a left-edge accent bar
   * and a small state dot; `background` is a full-bleed tint behind the score.
   */
  cellStatus?(
    game: Game,
    roundIndex: number,
    playerId: string,
    theme: ThemeColors,
    hasScore: boolean,
  ): { color: string; background: string } | undefined;

  /** Optional extra column in the turn-order view (e.g. Phase 10's "Phased?" checkbox). */
  extraTurnColumn?: {
    headerLabel: string;
    isChecked(game: Game, roundIndex: number, playerId: string): boolean;
    /** Returns the `Game` patch to merge (via `updateGame({ ...game, ...patch })`) on toggle. */
    onToggle(game: Game, roundIndex: number, playerId: string, value: boolean): Partial<Game>;
  };

  /** Field names (e.g. 'rounds', 'rankByLowest') locked from editing for this game type. */
  lockedFields?: string[];

  /** Optional extra creation-flow UI (e.g. Phase 10's "how many phases" card). */
  setupSections?(state: SetupSectionsState, ctx: SetupSectionsCtx): ReactNode;

  /** Optional read-only equivalent of `setupSections` for the info screen. */
  infoSections?(game: Game): ReactNode;
}
