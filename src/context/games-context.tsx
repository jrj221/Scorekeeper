import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

const STORAGE_KEY = '@scorekeeper/v2';

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
  finishedAt?: number;
};

export type GlobalPlayer = { id: string; name: string };

export type CreateGameOpts = {
  name: string;
  description?: string;
  players: Player[];
  totalRounds?: number;
  rankByLowest: boolean;
};

type GamesContextValue = {
  games: Game[];
  globalPlayers: GlobalPlayer[];
  loaded: boolean;
  createGame: (opts: CreateGameOpts) => string;
  deleteGame: (id: string) => void;
  updateGame: (game: Game) => void;
  getGame: (id: string) => Game | undefined;
  // Returns the player (existing or newly created), null if name is blank
  addGlobalPlayer: (name: string) => GlobalPlayer | null;
  removeGlobalPlayer: (id: string) => void;
  // Renames a player everywhere: global list + all games that reference them by ID
  renameGlobalPlayer: (id: string, newName: string) => void;
};

const GamesContext = createContext<GamesContextValue | null>(null);

export function GamesProvider({ children }: { children: React.ReactNode }) {
  const [games, setGames] = useState<Game[]>([]);
  const [globalPlayers, setGlobalPlayers] = useState<GlobalPlayer[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(json => {
        if (json) {
          try {
            const data = JSON.parse(json);
            setGames(data.games ?? []);
            setGlobalPlayers(data.globalPlayers ?? []);
          } catch {}
        }
      })
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ games, globalPlayers }));
  }, [games, globalPlayers, loaded]);

  const createGame = useCallback((opts: CreateGameOpts): string => {
    const id = Date.now().toString();
    setGames(prev => [{
      id, name: opts.name, description: opts.description,
      players: opts.players, rounds: [], totalRounds: opts.totalRounds,
      rankByLowest: opts.rankByLowest, createdAt: Date.now(),
    }, ...prev]);
    return id;
  }, []);

  const deleteGame = useCallback((id: string) => {
    setGames(prev => prev.filter(g => g.id !== id));
  }, []);

  const updateGame = useCallback((updated: Game) => {
    setGames(prev => prev.map(g => (g.id === updated.id ? updated : g)));
  }, []);

  const getGame = useCallback((id: string) => games.find(g => g.id === id), [games]);

  const addGlobalPlayer = useCallback((name: string): GlobalPlayer | null => {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const existing = globalPlayers.find(
      p => p.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (existing) return existing;
    const player: GlobalPlayer = {
      id: `gp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: trimmed,
    };
    setGlobalPlayers(prev => [...prev, player]);
    return player;
  }, [globalPlayers]);

  const removeGlobalPlayer = useCallback((id: string) => {
    setGlobalPlayers(prev => prev.filter(p => p.id !== id));
  }, []);

  const renameGlobalPlayer = useCallback((id: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setGlobalPlayers(prev => prev.map(p => p.id === id ? { ...p, name: trimmed } : p));
    setGames(prev => prev.map(g => ({
      ...g,
      players: g.players.map(p => p.id === id ? { ...p, name: trimmed } : p),
    })));
  }, []);

  return (
    <GamesContext.Provider value={{
      games, globalPlayers, loaded,
      createGame, deleteGame, updateGame, getGame,
      addGlobalPlayer, removeGlobalPlayer, renameGlobalPlayer,
    }}>
      {children}
    </GamesContext.Provider>
  );
}

export function useGamesContext() {
  const ctx = useContext(GamesContext);
  if (!ctx) throw new Error('useGamesContext must be used within GamesProvider');
  return ctx;
}
