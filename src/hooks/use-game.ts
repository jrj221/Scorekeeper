import { useCallback } from 'react';

import { Round, useGamesContext } from '@/context/games-context';

export function useGame(id: string) {
  const { getGame, updateGame } = useGamesContext();
  const game = getGame(id);

  const totals: Record<string, number> = {};
  if (game) {
    for (const player of game.players) {
      totals[player.id] = game.rounds.reduce((sum, r) => sum + (r[player.id] ?? 0), 0);
    }
  }

  const sortedPlayers = game
    ? [...game.players].sort((a, b) =>
        game.rankByLowest ? totals[a.id] - totals[b.id] : totals[b.id] - totals[a.id],
      )
    : [];

  // Highest round index that has at least one score entered. Used as the fallback
  // current round for games that haven't had an explicit Next Round press yet.
  let lastScoredRound = -1;
  if (game) {
    for (let i = 0; i < game.rounds.length; i++) {
      if (Object.keys(game.rounds[i]).length > 0) lastScoredRound = i;
    }
  }

  let visibleRoundCount = 0;
  if (game) {
    if (game.totalRounds !== undefined) {
      visibleRoundCount = game.totalRounds;
    } else {
      // A new round row only appears after an explicit Next Round press (game.currentRound
      // advances) or when a score is actually entered in a new round (data migration safety).
      visibleRoundCount = Math.max(1, Math.max(game.currentRound ?? -1, lastScoredRound) + 1);
    }
  }

  // game.currentRound is the authority once explicitly set. Clamp it to lastScoredRound + 1
  // so stale stored values (e.g. from previous testing) can never skip past unscored data.
  // Before any Next Round press, fall back to lastScoredRound so the active round stays on
  // the last round that has scores and does NOT scan forward for the first empty row.
  const storedRound = game?.currentRound;
  const currentRoundIndex = storedRound !== undefined
    ? Math.min(storedRound, Math.max(0, lastScoredRound + 1))
    : Math.max(0, lastScoredRound);

  const endGame = useCallback(() => {
    if (!game || game.finishedAt) return;
    updateGame({ ...game, finishedAt: Date.now() });
  }, [game, updateGame]);

  const updateScore = useCallback(
    (roundIndex: number, playerId: string, value: number | null) => {
      if (!game) return;
      const len = Math.max(game.rounds.length, roundIndex + 1);
      const rounds: Round[] = Array.from({ length: len }, (_, i) => ({ ...game.rounds[i] }));
      const round = { ...rounds[roundIndex] };
      if (value === null) {
        delete round[playerId];
      } else {
        round[playerId] = value;
      }
      rounds[roundIndex] = round;
      updateGame({ ...game, rounds });
    },
    [game, updateGame],
  );

  const advanceRound = useCallback(() => {
    if (!game) return;
    const next = (game.currentRound ?? currentRoundIndex) + 1;
    if (game.totalRounds !== undefined && next >= game.totalRounds) return;
    updateGame({ ...game, currentRound: next });
  }, [game, currentRoundIndex, updateGame]);

  return {
    game,
    endGame,
    updateScore,
    advanceRound,
    totals,
    sortedPlayers,
    visibleRoundCount,
    currentRoundIndex,
  };
}
