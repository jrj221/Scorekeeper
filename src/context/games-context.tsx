import React, { createContext, useCallback, useContext, useState } from 'react';

export type Player = { id: string; name: string };
export type Round = Record<string, number>; // only keys that have been entered exist

export type Game = {
  id: string;
  name: string;
  description?: string;
  players: Player[];
  rounds: Round[];
  totalRounds?: number; // undefined = indefinite
  rankByLowest: boolean;
  createdAt: number;
};

export type CreateGameOpts = {
  name: string;
  description?: string;
  players: Player[];
  totalRounds?: number;
  rankByLowest: boolean;
};

type GamesContextValue = {
  games: Game[];
  createGame: (opts: CreateGameOpts) => string;
  deleteGame: (id: string) => void;
  updateGame: (game: Game) => void;
  getGame: (id: string) => Game | undefined;
};

const GamesContext = createContext<GamesContextValue | null>(null);

export function GamesProvider({ children }: { children: React.ReactNode }) {
  const [games, setGames] = useState<Game[]>([]);

  const createGame = useCallback((opts: CreateGameOpts): string => {
    const id = Date.now().toString();
    const game: Game = {
      id,
      name: opts.name,
      description: opts.description,
      players: opts.players,
      rounds: [],
      totalRounds: opts.totalRounds,
      rankByLowest: opts.rankByLowest,
      createdAt: Date.now(),
    };
    setGames(prev => [game, ...prev]);
    return id;
  }, []);

  const deleteGame = useCallback((id: string) => {
    setGames(prev => prev.filter(g => g.id !== id));
  }, []);

  const updateGame = useCallback((updated: Game) => {
    setGames(prev => prev.map(g => (g.id === updated.id ? updated : g)));
  }, []);

  const getGame = useCallback((id: string) => games.find(g => g.id === id), [games]);

  return (
    <GamesContext.Provider value={{ games, createGame, deleteGame, updateGame, getGame }}>
      {children}
    </GamesContext.Provider>
  );
}

export function useGamesContext() {
  const ctx = useContext(GamesContext);
  if (!ctx) throw new Error('useGamesContext must be used within GamesProvider');
  return ctx;
}
