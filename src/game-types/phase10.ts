import type { ThemeColors } from '@/constants/color-schemes';
import type { Game } from '@/context/games-context';
import { getCurrentRoundIndex } from '@/utils/game-round';

import { base } from './base';
import { GameTypeDefinition } from './types';

const PHASED_COLOR = '#22C55E';

// Blends `fg` over `bg` at `amount` opacity, returning an opaque hex color. Used so the
// Phase 10 cell tint reads as a flat, consistent color regardless of the alternating
// row stripe underneath, instead of letting that stripe show through a transparent tint.
function mixHex(fg: string, bg: string, amount: number): string {
  const parse = (hex: string) => {
    const h = hex.replace('#', '');
    return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
  };
  const [fr, fg2, fb] = parse(fg);
  const [br, bgG, bb] = parse(bg);
  const mix = (f: number, b: number) => Math.round(f * amount + b * (1 - amount));
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(mix(fr, br))}${toHex(mix(fg2, bgG))}${toHex(mix(fb, bb))}`;
}

/** The ordered phase numbers a game plays — all 10, or just the odd/even half for a shorter game. */
export function getPhaseSequence(game: Game): number[] {
  if (game.phaseSubset === 'odd') return [1, 3, 5, 7, 9];
  if (game.phaseSubset === 'even') return [2, 4, 6, 8, 10];
  return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
}

/** Phase the player was attempting during `roundIndex` (before that round's result applied). */
export function getPhaseAtRound(game: Game, playerId: string, roundIndex: number): number {
  const seq = getPhaseSequence(game);
  let idx = 0;
  for (let i = 0; i < roundIndex; i++) {
    if (game.phasedRounds?.[i]?.[playerId]) idx = Math.min(seq.length - 1, idx + 1);
  }
  return seq[idx];
}

/**
 * The phase a player is currently on/attempting. Only rounds before `currentRound`
 * count — marking a round "phased" doesn't advance the phase display until the
 * player actually presses "Next Round," matching the real Phase 10 flow. Finished
 * games count every recorded round, since there's no "in progress" round left.
 */
export function getCurrentPhase(game: Game, playerId: string): number {
  const cutoff = game.finishedAt ? (game.phasedRounds?.length ?? 0) : getCurrentRoundIndex(game);
  return getPhaseAtRound(game, playerId, cutoff);
}

/** True if any player completed the final phase during `roundIndex` — the game is won. */
export function isPhase10Won(game: Game, roundIndex: number): boolean {
  const lastPhase = getPhaseSequence(game).slice(-1)[0];
  return game.players.some(
    p => getPhaseAtRound(game, p.id, roundIndex) === lastPhase && game.phasedRounds?.[roundIndex]?.[p.id],
  );
}

/**
 * Phase 10: ranks by phase reached (highest first), breaking ties by lowest score;
 * the game ends the round a player completes the final phase.
 *
 * `setupSections`/`infoSections` lazy-`require` their JSX from `./phase10-setup` instead
 * of importing it statically, so this file (and everything upstream that imports it —
 * `registry.ts`, `utils/game.ts`) stays free of react-native imports. Those are only
 * needed by the two UI screens that actually render the sections.
 */
export const phase10: GameTypeDefinition = {
  ...base,

  sortPlayers(game, players, totals) {
    return [...players].sort((a, b) => {
      const phaseDiff = getCurrentPhase(game, b.id) - getCurrentPhase(game, a.id);
      if (phaseDiff !== 0) return phaseDiff;
      return (totals[a.id] ?? 0) - (totals[b.id] ?? 0);
    });
  },

  tierKey(game, playerId, totals) {
    return `${getCurrentPhase(game, playerId)}:${totals[playerId] ?? 0}`;
  },

  isFinalRound(game, roundIndex) {
    return isPhase10Won(game, roundIndex);
  },

  finishButtonLabel: 'Finish Game',

  secondaryStat(game, playerId) {
    const label = `Phase ${getCurrentPhase(game, playerId)}`;
    return { short: label, long: label };
  },

  lockedFields: ['rounds', 'rankByLowest', 'extras.dice', 'extras.timer', 'icon', 'name', 'phaseSubset'],

  cellBackground(game, roundIndex, playerId, theme: ThemeColors, hasScore) {
    if (!hasScore) return undefined;
    const phased = game.phasedRounds?.[roundIndex]?.[playerId];
    return phased
      ? mixHex(PHASED_COLOR, theme.background, 0.25)
      : mixHex(theme.danger, theme.background, 0.25);
  },

  extraTurnColumn: {
    headerLabel: 'Phased?',
    isChecked(game, roundIndex, playerId) {
      return !!game.phasedRounds?.[roundIndex]?.[playerId];
    },
    onToggle(game, roundIndex, playerId, value) {
      const len = Math.max(game.phasedRounds?.length ?? 0, roundIndex + 1);
      const phasedRounds: Record<string, boolean>[] = Array.from(
        { length: len },
        (_, i) => ({ ...game.phasedRounds?.[i] }),
      );
      phasedRounds[roundIndex] = { ...phasedRounds[roundIndex], [playerId]: value };
      return { phasedRounds };
    },
  },

  setupSections(state, ctx) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('./phase10-setup').renderPhase10SetupSections(state, ctx);
  },

  infoSections(game) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('./phase10-setup').renderPhase10InfoSections(game);
  },
};
