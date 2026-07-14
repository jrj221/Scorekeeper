import { DealerMode, Game, Player } from '@/context/games-context';

/**
 * The round currently being played, 0-indexed. `game.currentRound` is authoritative once
 * an explicit "Next Round" press has set it (clamped so a stale value can never skip past
 * unscored data). Before that first press, falls back to the last round with any score
 * entered, so the active round doesn't jump ahead just because it's fully scored.
 */
export function getCurrentRoundIndex(game: Game): number {
  let lastScoredRound = -1;
  for (let i = 0; i < game.rounds.length; i++) {
    if (Object.keys(game.rounds[i]).length > 0) lastScoredRound = i;
  }
  const storedRound = game.currentRound;
  return storedRound !== undefined
    ? Math.min(storedRound, Math.max(0, lastScoredRound + 1))
    : Math.max(0, lastScoredRound);
}

/** The ordered phase numbers a game plays — all 10, or just the odd/even half for a shorter game. */
export function getPhaseSequence(game: Game): number[] {
  if (game.phaseSubset === 'odd') return [1, 3, 5, 7, 9];
  if (game.phaseSubset === 'even') return [2, 4, 6, 8, 10];
  return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
}

/** Phase the player was attempting during `roundIndex` (before that round's result applied). */
export function getPhaseAtRound(game: Game, playerId: string, roundIndex: number): number {
  const seq = getPhaseSequence(game);
  let idx = 0;
  for (let i = 0; i < roundIndex; i++) {
    if (game.phasedRounds?.[i]?.[playerId]) idx = Math.min(seq.length - 1, idx + 1);
  }
  return seq[idx];
}

/**
 * The phase a player is currently on/attempting. Only rounds before `currentRound`
 * count — marking a round "phased" doesn't advance the phase display until the
 * player actually presses "Next Round," matching the real Phase 10 flow. Finished
 * games count every recorded round, since there's no "in progress" round left.
 */
export function getCurrentPhase(game: Game, playerId: string): number {
  const cutoff = game.finishedAt ? (game.phasedRounds?.length ?? 0) : getCurrentRoundIndex(game);
  return getPhaseAtRound(game, playerId, cutoff);
}

/** True if any player completed the final phase during `roundIndex` — the game is won. */
export function isPhase10Won(game: Game, roundIndex: number): boolean {
  const lastPhase = getPhaseSequence(game).slice(-1)[0];
  return game.players.some(
    p => getPhaseAtRound(game, p.id, roundIndex) === lastPhase && game.phasedRounds?.[roundIndex]?.[p.id],
  );
}

/**
 * Sorts players by the game's win condition. Phase 10 ranks by phase reached
 * (highest first), breaking ties by lowest score. Regular games rank by total
 * score per `rankByLowest`.
 */
export function sortPlayers(game: Game, players: Player[], totals: Record<string, number>): Player[] {
  if (game.gameType === 'phase10') {
    return [...players].sort((a, b) => {
      const phaseDiff = getCurrentPhase(game, b.id) - getCurrentPhase(game, a.id);
      if (phaseDiff !== 0) return phaseDiff;
      return (totals[a.id] ?? 0) - (totals[b.id] ?? 0);
    });
  }
  return [...players].sort((a, b) =>
    game.rankByLowest ? (totals[a.id] ?? 0) - (totals[b.id] ?? 0) : (totals[b.id] ?? 0) - (totals[a.id] ?? 0),
  );
}

/** Composite tie-key for a player under the game's win condition. */
function tierKey(game: Game, playerId: string, totals: Record<string, number>): string {
  const total = totals[playerId] ?? 0;
  if (game.gameType === 'phase10') return `${getCurrentPhase(game, playerId)}:${total}`;
  return `${total}`;
}

/**
 * Groups a pre-sorted player array into tiers of equal standing.
 * Tier 0 = 1st place, tier 1 = 2nd place, etc. (dense ranking).
 * Used by both the podium and the rest-list displays.
 */
export function buildTiers(sortedPlayers: Player[], totals: Record<string, number>, game?: Game): Player[][] {
  const tiers: Player[][] = [];
  for (const p of sortedPlayers) {
    const key = game ? tierKey(game, p.id, totals) : `${totals[p.id] ?? 0}`;
    const last = tiers[tiers.length - 1];
    const lastKey = last && (game ? tierKey(game, last[0].id, totals) : `${totals[last[0].id] ?? 0}`);
    if (last && lastKey === key) last.push(p);
    else tiers.push([p]);
  }
  return tiers;
}

export function getGameTotals(game: Game): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const p of game.players) {
    totals[p.id] = game.rounds.reduce((sum, r) => sum + (r[p.id] ?? 0), 0);
  }
  return totals;
}

export function getGameWinnerLabel(game: Game): string {
  if (!game.finishedAt || game.players.length === 0) return '';
  const totals = getGameTotals(game);
  const sorted = sortPlayers(game, game.players, totals);
  const topTier = buildTiers(sorted, totals, game)[0] ?? [];
  if (topTier.length === 1) return `🏆 ${topTier[0].name}`;
  if (topTier.length === 2) return '🤝 2-way Tie';
  return `🤝 ${topTier.length}-way Tie`;
}

export function getPlayerWinRate(playerId: string, games: Game[]): string {
  const finished = games.filter(
    g => g.finishedAt && g.players.some(p => p.id === playerId),
  );
  if (finished.length === 0) return '--';
  let wins = 0;
  for (const game of finished) {
    const totals = getGameTotals(game);
    const sorted = sortPlayers(game, game.players, totals);
    const topTier = buildTiers(sorted, totals, game)[0] ?? [];
    if (topTier.some(p => p.id === playerId)) wins++;
  }
  return `${Math.round((wins / finished.length) * 100)}%`;
}

function deterministicIdx(gameId: string, roundIndex: number, n: number): number {
  const base = parseInt(gameId.replace(/\D/g, '').slice(-6) || '1') || 1;
  // Murmur-style integer hash — avoids the n-1 aliasing of a simple step
  let h = Math.imul(roundIndex + 1, base);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h = h ^ (h >>> 16);
  return Math.abs(h) % n;
}

/** Returns the effective turn order, first player, and dealer for a given round. */
export function getTurnState(game: Game, roundIndex: number): {
  orderedIds: string[];
  firstPlayerId: string | null;
  dealerId: string | null;
} {
  const order = game.turnOrder?.length ? game.turnOrder : game.players.map(p => p.id);
  const n = order.length;
  if (n === 0) return { orderedIds: [], firstPlayerId: null, dealerId: null };

  const turnsTracked = Array.isArray(game.turnOrder);

  // Goes-first off: keep players in their natural order, no first player.
  // Dealer is tracked independently and still rotates.
  if (!turnsTracked) {
    let dealerId: string | null = null;
    if (game.dealerEnabled) {
      switch (game.dealerMode) {
        case 'fixed':
          dealerId = game.fixedDealerId ?? null;
          break;
        case 'rotation': {
          const startIdx = game.fixedDealerId ? order.indexOf(game.fixedDealerId) : 0;
          dealerId = order[((startIdx >= 0 ? startIdx : 0) + roundIndex) % n];
          break;
        }
        case 'random':
        default:
          dealerId = order[deterministicIdx(game.id, roundIndex, n)];
          break;
      }
    }
    return { orderedIds: game.players.map(p => p.id), firstPlayerId: null, dealerId };
  }

  // Left-of-dealer: dealer is primary, first player derives from dealer
  if (game.firstPlayerMode === 'left-of-dealer' && game.dealerEnabled) {
    let dealerIdx = 0;
    if (game.dealerMode === 'fixed') {
      const idx = game.fixedDealerId ? order.indexOf(game.fixedDealerId) : -1;
      dealerIdx = idx !== -1 ? idx : 0;
    } else {
      dealerIdx = deterministicIdx(game.id, roundIndex, n);
    }
    const dealerId = order[dealerIdx];
    const firstIdx = (dealerIdx + 1) % n;
    const firstPlayerId = order[firstIdx];
    const orderedIds = [...order.slice(firstIdx), ...order.slice(0, firstIdx)];
    return { orderedIds, firstPlayerId, dealerId };
  }

  // Standard: first player is primary, dealer optionally derives from first player
  let baseIndex = 0;
  if (game.firstPlayerId) {
    const idx = order.indexOf(game.firstPlayerId);
    if (idx !== -1) baseIndex = idx;
  }

  // No firstPlayerId = random mode: pseudo-random, never same player twice in a row
  const firstIdx = !game.firstPlayerId
    ? (() => {
        const idx = deterministicIdx(game.id, roundIndex, n);
        if (roundIndex === 0 || n <= 1) return idx;
        const prevIdx = deterministicIdx(game.id, roundIndex - 1, n);
        return idx === prevIdx ? (idx + 1) % n : idx;
      })()
    : ((baseIndex - roundIndex) % n + n) % n;
  const firstPlayerId = order[firstIdx];
  const orderedIds = [...order.slice(firstIdx), ...order.slice(0, firstIdx)];

  let dealerId: string | null = null;
  if (game.dealerEnabled) {
    switch (game.dealerMode) {
      case 'fixed':
        dealerId = game.fixedDealerId ?? null;
        break;
      case 'rotation': {
        const startIdx = game.fixedDealerId ? order.indexOf(game.fixedDealerId) : 0;
        dealerId = order[((startIdx >= 0 ? startIdx : 0) + roundIndex) % n];
        break;
      }
      case 'random':
      default:
        dealerId = order[deterministicIdx(game.id, roundIndex, n)];
        break;
    }
  }

  return { orderedIds, firstPlayerId, dealerId };
}

export function getDealerHintText(
  dealerEnabled: boolean,
  dealerMode: DealerMode,
  fixedDealerName?: string,
): string | null {
  if (!dealerEnabled) return null;
  if (dealerMode === 'random') return 'The dealer will be randomly determined each round.';
  if (dealerMode === 'rotation') {
    return fixedDealerName
      ? `${fixedDealerName} deals first, then it rotates to the next player each round.`
      : 'Dealing rotates through all players each round.';
  }
  // fixed
  return fixedDealerName
    ? `${fixedDealerName} will deal every round.`
    : 'The same player will deal every round.';
}

export function getTurnHintText(
  turnsEnabled: boolean,
  firstPlayerMode: 'left-of-dealer' | 'rotation' | 'random' | undefined,
  firstPlayerName?: string,
): string | null {
  if (!turnsEnabled) return null;
  if (firstPlayerMode === 'left-of-dealer') return 'The player to the left of the dealer goes first each round.';
  if (firstPlayerMode === 'random') return 'The first player will be randomly determined each round.';
  // rotation mode
  if (firstPlayerName) return `${firstPlayerName} goes first in Round 1, then it rotates to the next player each round.`;
  return 'The first player rotates through the group each round.';
}
