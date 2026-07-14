import { Game } from '@/context/games-context';

/**
 * The round currently being played, 0-indexed. `game.currentRound` is authoritative once
 * an explicit "Next Round" press has set it (clamped so a stale value can never skip past
 * unscored data). Before that first press, falls back to the last round with any score
 * entered, so the active round doesn't jump ahead just because it's fully scored.
 */
export function getCurrentRoundIndex(game: Game): number {
  let lastScoredRound = -1;
  for (let i = 0; i < game.rounds.length; i++) {
    if (Object.keys(game.rounds[i]).length > 0) lastScoredRound = i;
  }
  const storedRound = game.currentRound;
  return storedRound !== undefined
    ? Math.min(storedRound, Math.max(0, lastScoredRound + 1))
    : Math.max(0, lastScoredRound);
}
