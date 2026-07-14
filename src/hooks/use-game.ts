import { useCallback } from 'react';

import { Game, Round, useGamesContext } from '@/context/games-context';
import { getGameType } from '@/game-types/registry';
import { getCurrentRoundIndex } from '@/utils/game';

export function useGame(id: string) {
  const { getGame, updateGame } = useGamesContext();
  const game = getGame(id);

  const totals: Record<string, number> = {};
  if (game) {
    for (const player of game.players) {
      totals[player.id] = game.rounds.reduce((sum, r) => sum + (r[player.id] ?? 0), 0);
    }
  }

  const sortedPlayers = game ? getGameType(game).sortPlayers(game, game.players, totals) : [];

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

  const currentRoundIndex = game ? getCurrentRoundIndex(game) : 0;

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

  const updateGamePartial = useCallback(
    (patch: Partial<Game>) => {
      if (!game) return;
      updateGame({ ...game, ...patch });
    },
    [game, updateGame],
  );

  const updatePhased = useCallback(
    (roundIndex: number, playerId: string, phased: boolean) => {
      if (!game) return;
      const len = Math.max(game.phasedRounds?.length ?? 0, roundIndex + 1);
      const phasedRounds: Record<string, boolean>[] = Array.from(
        { length: len },
        (_, i) => ({ ...game.phasedRounds?.[i] }),
      );
      phasedRounds[roundIndex] = { ...phasedRounds[roundIndex], [playerId]: phased };
      updateGame({ ...game, phasedRounds });
    },
    [game, updateGame],
  );

  return {
    game,
    endGame,
    updateScore,
    advanceRound,
    updatePhased,
    updateGamePartial,
    totals,
    sortedPlayers,
    visibleRoundCount,
    currentRoundIndex,
  };
}
