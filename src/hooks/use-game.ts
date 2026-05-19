import { useCallback, useState } from 'react';

import { Player, Round, useGamesContext } from '@/context/games-context';

export function useGame(id: string) {
  const { getGame, updateGame } = useGamesContext();
  const game = getGame(id);

  const [showEditGame, setShowEditGame] = useState(false);

  const openEditGame = useCallback(() => setShowEditGame(true), []);
  const closeEditGame = useCallback(() => setShowEditGame(false), []);

  const endGame = useCallback(() => {
    if (!game || game.finishedAt) return;
    updateGame({ ...game, finishedAt: Date.now() });
  }, [game, updateGame]);

  const updateSettings = useCallback(
    (totalRounds: number | undefined, rankByLowest: boolean) => {
      if (!game) return;
      updateGame({ ...game, totalRounds, rankByLowest });
    },
    [game, updateGame],
  );

  const addPlayer = useCallback(
    (name: string) => {
      if (!game || !name.trim()) return;
      const player: Player = { id: Date.now().toString(), name: name.trim() };
      // Fill any round that already has scores from existing players with 0
      const rounds = game.rounds.map(r => {
        const hasExistingScores = game.players.some(p => r[p.id] !== undefined);
        return hasExistingScores ? { ...r, [player.id]: 0 } : r;
      });
      updateGame({ ...game, players: [...game.players, player], rounds });
    },
    [game, updateGame],
  );

  const deletePlayer = useCallback(
    (playerId: string) => {
      if (!game) return;
      const players = game.players.filter(p => p.id !== playerId);
      const rounds = game.rounds.map(r => {
        const next = { ...r };
        delete next[playerId];
        return next;
      });
      updateGame({ ...game, players, rounds });
    },
    [game, updateGame],
  );

  const renamePlayer = useCallback(
    (playerId: string, newName: string) => {
      if (!game || !newName.trim()) return;
      const players = game.players.map(p =>
        p.id === playerId ? { ...p, name: newName.trim() } : p,
      );
      updateGame({ ...game, players });
    },
    [game, updateGame],
  );

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

  return {
    game,
    showEditGame,
    openEditGame,
    closeEditGame,
    endGame,
    updateSettings,
    addPlayer,
    deletePlayer,
    renamePlayer,
    updateScore,
    totals,
    sortedPlayers,
    visibleRoundCount,
  };
}
