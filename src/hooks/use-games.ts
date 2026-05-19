import { useCallback } from 'react';
import { useRouter } from 'expo-router';

import { useGamesContext } from '@/context/games-context';

export function useGames() {
  const { games, deleteGame } = useGamesContext();
  const router = useRouter();

  const openNewGame = useCallback(() => router.push('/new-game'), [router]);

  const handleOpen = useCallback(
    (id: string) => router.push(`/game/${id}`),
    [router],
  );

  return { games, openNewGame, handleOpen, deleteGame };
}
