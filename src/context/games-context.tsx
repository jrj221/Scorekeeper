import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

const STORAGE_KEY = '@scorekeeper/games';

export type Player = { id: string; name: string };
export type Round = Record<string, number>;

export type Game = {
  id: string;
  name: string;
  description?: string;
  players: Player[];
  rounds: Round[];
  totalRounds?: number;
  rankByLowest: boolean;
  createdAt: number;
  finishedAt?: number; // set when game is ended — read-only after this
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
  loaded: boolean;
  createGame: (opts: CreateGameOpts) => string;
  deleteGame: (id: string) => void;
  updateGame: (game: Game) => void;
  getGame: (id: string) => Game | undefined;
};

const GamesContext = createContext<GamesContextValue | null>(null);

export function GamesProvider({ children }: { children: React.ReactNode }) {
  const [games, setGames] = useState<Game[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Load from storage on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(json => {
        if (json) {
          try { setGames(JSON.parse(json)); } catch {}
        }
      })
      .finally(() => setLoaded(true));
  }, []);

  // Persist on every change (after initial load)
  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(games));
  }, [games, loaded]);

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
    <GamesContext.Provider value={{ games, loaded, createGame, deleteGame, updateGame, getGame }}>
      {children}
    </GamesContext.Provider>
  );
}

export function useGamesContext() {
  const ctx = useContext(GamesContext);
  if (!ctx) throw new Error('useGamesContext must be used within GamesProvider');
  return ctx;
}
