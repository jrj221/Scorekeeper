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

  let visibleRoundCount = 0;
  if (game) {
    if (game.totalRounds !== undefined) {
      visibleRoundCount = game.totalRounds;
    } else if (game.turnOrder?.length) {
      // Turn-based game: never auto-advance; wait for explicit Next Round press
      visibleRoundCount = (game.currentRound ?? 0) + 1;
    } else {
      let lastComplete = -1;
      for (let i = 0; i < game.rounds.length; i++) {
        if (game.players.every(p => game.rounds[i][p.id] !== undefined)) {
          lastComplete = i;
        }
      }
      visibleRoundCount = Math.max(1, lastComplete + 2);
    }
  }

  // First incomplete round index (used for scorecard highlighting)
  let autoCurrentRoundIndex = visibleRoundCount - 1;
  if (game) {
    for (let i = 0; i < visibleRoundCount; i++) {
      const r = game.rounds[i] ?? {};
      if (game.players.some(p => r[p.id] === undefined)) {
        autoCurrentRoundIndex = i;
        break;
      }
    }
  }

  // For turn-based games, currentRound (defaulting to 0) is always the active round
  const currentRoundIndex =
    game?.turnOrder?.length
      ? (game.currentRound ?? 0)
      : autoCurrentRoundIndex;

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
