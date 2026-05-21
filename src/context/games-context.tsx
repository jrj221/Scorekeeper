import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { buildSeedData } from '@/utils/seed-data';

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
  dealerEnabled?: boolean;
  dealerMode?: DealerMode;
  fixedDealerId?: string;
  firstPlayerId?: string;
  firstPlayerMode?: 'left-of-dealer';
  turnOrder?: string[];
  currentRound?: number;
};

export type GlobalPlayer = { id: string; name: string };

export type GameTemplate = {
  id: string;
  name: string;
  description?: string;
  totalRounds?: number;
  rankByLowest: boolean;
  createdAt: number;
};

export type PlayerGroup = {
  id: string;
  name: string;
  playerIds: string[];
};

export type DealerMode = 'fixed' | 'random' | 'rotation';

export type CreateGameOpts = {
  name: string;
  description?: string;
  players: Player[];
  totalRounds?: number;
  rankByLowest: boolean;
  dealerEnabled?: boolean;
  dealerMode?: DealerMode;
  fixedDealerId?: string;
  firstPlayerId?: string;
  firstPlayerMode?: 'left-of-dealer';
  turnOrder?: string[];
};

type GamesContextValue = {
  games: Game[];
  globalPlayers: GlobalPlayer[];
  templates: GameTemplate[];
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
  // Removes the player from all game records, resetting their stats
  resetGlobalPlayer: (id: string) => void;
  createTemplate: (opts: Omit<GameTemplate, 'id' | 'createdAt'>) => string;
  updateTemplate: (template: GameTemplate) => void;
  deleteTemplate: (id: string) => void;
  saveGameAsTemplate: (gameId: string) => string | null;
  getTemplate: (id: string) => GameTemplate | undefined;
  groups: PlayerGroup[];
  createGroup: (name: string, playerIds: string[]) => PlayerGroup;
  updateGroup: (group: PlayerGroup) => void;
  deleteGroup: (id: string) => void;
  seedData: () => void;
  resetData: () => void;
};

const GamesContext = createContext<GamesContextValue | null>(null);

export function GamesProvider({ children }: { children: React.ReactNode }) {
  const [games, setGames] = useState<Game[]>([]);
  const [globalPlayers, setGlobalPlayers] = useState<GlobalPlayer[]>([]);
  const [templates, setTemplates] = useState<GameTemplate[]>([]);
  const [groups, setGroups] = useState<PlayerGroup[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(json => {
        if (json) {
          try {
            const data = JSON.parse(json);
            setGames(data.games ?? []);
            setGlobalPlayers(data.globalPlayers ?? []);
            setTemplates(data.templates ?? []);
            setGroups(data.groups ?? []);
          } catch {}
        }
      })
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ games, globalPlayers, templates, groups }));
  }, [games, globalPlayers, templates, groups, loaded]);

  const createGame = useCallback((opts: CreateGameOpts): string => {
    const id = Date.now().toString();
    setGames(prev => [{
      id, name: opts.name, description: opts.description,
      players: opts.players, rounds: [], totalRounds: opts.totalRounds,
      rankByLowest: opts.rankByLowest, createdAt: Date.now(),
      dealerEnabled: opts.dealerEnabled,
      dealerMode: opts.dealerMode,
      fixedDealerId: opts.fixedDealerId,
      firstPlayerId: opts.firstPlayerId,
      firstPlayerMode: opts.firstPlayerMode,
      turnOrder: opts.turnOrder,
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

  const resetGlobalPlayer = useCallback((id: string) => {
    setGames(prev => prev.map(g => ({
      ...g,
      players: g.players.filter(p => p.id !== id),
      rounds: g.rounds.map(r => {
        const { [id]: _, ...remaining } = r;
        return remaining;
      }),
    })));
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

  const createTemplate = useCallback((opts: Omit<GameTemplate, 'id' | 'createdAt'>): string => {
    const id = `tmpl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setTemplates(prev => [{
      id, ...opts, createdAt: Date.now(),
    }, ...prev]);
    return id;
  }, []);

  const updateTemplate = useCallback((updated: GameTemplate) => {
    setTemplates(prev => prev.map(t => t.id === updated.id ? updated : t));
  }, []);

  const deleteTemplate = useCallback((id: string) => {
    setTemplates(prev => prev.filter(t => t.id !== id));
  }, []);

  const saveGameAsTemplate = useCallback((gameId: string): string | null => {
    const game = games.find(g => g.id === gameId);
    if (!game) return null;
    const id = `tmpl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setTemplates(prev => [{
      id,
      name: game.name,
      description: game.description,
      totalRounds: game.totalRounds,
      rankByLowest: game.rankByLowest,
      createdAt: Date.now(),
    }, ...prev]);
    return id;
  }, [games]);

  const createGroup = useCallback((name: string, playerIds: string[]): PlayerGroup => {
    const group: PlayerGroup = {
      id: `grp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: name.trim(),
      playerIds,
    };
    setGroups(prev => [...prev, group]);
    return group;
  }, []);

  const updateGroup = useCallback((updated: PlayerGroup) => {
    setGroups(prev => prev.map(g => g.id === updated.id ? updated : g));
  }, []);

  const deleteGroup = useCallback((id: string) => {
    setGroups(prev => prev.filter(g => g.id !== id));
  }, []);

  const getTemplate = useCallback((id: string) => templates.find(t => t.id === id), [templates]);

  const seedData = useCallback(() => {
    const seed = buildSeedData();
    setGlobalPlayers(prev => {
      const existingIds = new Set(prev.map(p => p.id));
      return [...prev, ...seed.globalPlayers.filter(p => !existingIds.has(p.id))];
    });
    setGames(prev => [...seed.games, ...prev]);
    setTemplates(prev => [...seed.templates, ...prev]);
    setGroups(prev => [...seed.groups, ...prev]);
  }, []);

  const resetData = useCallback(() => {
    setGames([]);
    setGlobalPlayers([]);
    setTemplates([]);
    setGroups([]);
  }, []);

  return (
    <GamesContext.Provider value={{
      games, globalPlayers, templates, groups, loaded,
      createGame, deleteGame, updateGame, getGame,
      addGlobalPlayer, removeGlobalPlayer, renameGlobalPlayer, resetGlobalPlayer,
      createTemplate, updateTemplate, deleteTemplate, saveGameAsTemplate, getTemplate,
      createGroup, updateGroup, deleteGroup,
      seedData, resetData,
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
