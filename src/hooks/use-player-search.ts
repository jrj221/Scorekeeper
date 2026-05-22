import { useCallback, useRef, useState } from 'react';
import { TextInput } from 'react-native';

import { Player, useGamesContext } from '@/context/games-context';

/**
 * Manages the player search / add flow shared across new-game, game edit, and game info screens.
 * Handles: search text, error display, adding by ID, submitting free-text, and group expansion.
 */
export function usePlayerSearch(
  players: Player[],
  onAdd: (next: Player[]) => void,
  options?: { deferGlobalSave?: boolean },
) {
  const { globalPlayers, addGlobalPlayer, groups } = useGamesContext();

  const [playerSearch, setPlayerSearch] = useState('');
  const [playerSearchError, setPlayerSearchError] = useState('');
  const playerSearchRef = useRef<TextInput>(null);

  const filteredGlobalPlayers = globalPlayers.filter(
    gp =>
      !players.some(p => p.id === gp.id) &&
      (playerSearch === '' || gp.name.toLowerCase().includes(playerSearch.toLowerCase())),
  );

  const addById = useCallback((id: string, name: string) => {
    if (players.some(p => p.id === id)) return;
    onAdd([...players, { id, name }]);
    setPlayerSearch('');
    setPlayerSearchError('');
  }, [players, onAdd]);

  const submit = useCallback(() => {
    const trimmed = playerSearch.trim();
    if (!trimmed) return;
    const match = globalPlayers.find(
      gp => gp.name.toLowerCase() === trimmed.toLowerCase() && !players.some(p => p.id === gp.id),
    );
    if (match) { addById(match.id, match.name); return; }
    if (players.some(p => p.name.toLowerCase() === trimmed.toLowerCase())) {
      setPlayerSearchError(`"${trimmed}" is already added`);
      return;
    }
    setPlayerSearchError('');
    let player: Player;
    if (options?.deferGlobalSave) {
      // Don't persist to globalPlayers yet — caller is responsible for registering on save.
      const existing = globalPlayers.find(gp => gp.name.toLowerCase() === trimmed.toLowerCase());
      player = existing ?? { id: `gp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, name: trimmed };
    } else {
      const global = addGlobalPlayer(trimmed);
      player = global ?? { id: `p_${Date.now()}`, name: trimmed };
    }
    if (!players.some(p => p.id === player.id)) {
      onAdd([...players, player]);
    }
    setPlayerSearch('');
    playerSearchRef.current?.focus();
  }, [playerSearch, players, globalPlayers, addGlobalPlayer, addById, onAdd]);

  const addGroup = useCallback((groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;
    const toAdd = group.playerIds
      .filter(pid => !players.some(p => p.id === pid))
      .map(pid => {
        const gp = globalPlayers.find(p => p.id === pid);
        return gp ? { id: gp.id, name: gp.name } : null;
      })
      .filter((p): p is Player => p !== null);
    if (toAdd.length > 0) onAdd([...players, ...toAdd]);
  }, [groups, globalPlayers, players, onAdd]);

  const clearSearch = () => {
    setPlayerSearch('');
    setPlayerSearchError('');
  };

  return {
    playerSearch,
    setPlayerSearch: (v: string) => { setPlayerSearch(v); setPlayerSearchError(''); },
    playerSearchError,
    playerSearchRef,
    filteredGlobalPlayers,
    addById,
    submit,
    addGroup,
    clearSearch,
  };
}
