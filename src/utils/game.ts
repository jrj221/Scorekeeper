import { DealerMode, Game, Player } from '@/context/games-context';
import { getGameType } from '@/game-types/registry';

import { getGameTotals } from './game-totals';

export { getGameTotals } from './game-totals';
export { getCurrentRoundIndex } from './game-round';

/**
 * Groups a pre-sorted player array into tiers of equal standing.
 * Tier 0 = 1st place, tier 1 = 2nd place, etc. (dense ranking).
 * Used by both the podium and the rest-list displays. Tie-key is game-type-aware
 * (e.g. Phase 10 ties on phase reached + score) via `getGameType(game).tierKey`.
 */
export function buildTiers(sortedPlayers: Player[], totals: Record<string, number>, game?: Game): Player[][] {
  const keyFor = (playerId: string) =>
    game ? getGameType(game).tierKey(game, playerId, totals) : `${totals[playerId] ?? 0}`;
  const tiers: Player[][] = [];
  for (const p of sortedPlayers) {
    const key = keyFor(p.id);
    const last = tiers[tiers.length - 1];
    const lastKey = last && keyFor(last[0].id);
    if (last && lastKey === key) last.push(p);
    else tiers.push([p]);
  }
  return tiers;
}

export function getGameWinnerLabel(game: Game): string {
  return getGameType(game).winnerLabel(game);
}

export function getPlayerWinRate(playerId: string, games: Game[]): string {
  const finished = games.filter(
    g => g.finishedAt && g.players.some(p => p.id === playerId),
  );
  if (finished.length === 0) return '--';
  let wins = 0;
  for (const game of finished) {
    const totals = getGameTotals(game);
    const sorted = getGameType(game).sortPlayers(game, game.players, totals);
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

type TurnState = {
  orderedIds: string[];
  firstPlayerId: string | null;
  dealerId: string | null;
};

/**
 * Returns the turn order, first player, and dealer for a round.
 *
 * A round's turn state is resolved once — the first time it's reached, via
 * `resolveTurnStateForRound` — and then locked into `game.dealerHistory`/
 * `firstPlayerHistory` (with `orderedIds` re-derived from the frozen first player)
 * so that later edits to turn order or dealer settings only ever affect rounds
 * that haven't started yet. A round with no frozen entry (the in-progress round,
 * before "Next Round" is pressed) falls back to a live computation from the
 * game's current settings.
 */
export function getTurnState(game: Game, roundIndex: number): TurnState {
  const frozenDealer = game.dealerHistory?.[roundIndex];
  const frozenFirstPlayer = game.firstPlayerHistory?.[roundIndex];
  if (frozenDealer !== undefined && frozenFirstPlayer !== undefined) {
    const order = game.turnOrder?.length ? game.turnOrder : game.players.map(p => p.id);
    const orderedIds = orderFrom(order, frozenFirstPlayer);
    return { orderedIds, firstPlayerId: frozenFirstPlayer, dealerId: frozenDealer };
  }
  return computeTurnState(game, roundIndex);
}

/** Rotates `order` to start at `firstPlayerId` (or leaves it as-is if null/not found). */
function orderFrom(order: string[], firstPlayerId: string | null): string[] {
  if (firstPlayerId === null) return order;
  const idx = order.indexOf(firstPlayerId);
  if (idx <= 0) return order;
  return [...order.slice(idx), ...order.slice(0, idx)];
}

/** Live computation of turn state from the game's current settings and turn order. */
function computeTurnState(game: Game, roundIndex: number): TurnState {
  const order = game.turnOrder?.length ? game.turnOrder : game.players.map(p => p.id);
  const n = order.length;
  if (n === 0) return { orderedIds: [], firstPlayerId: null, dealerId: null };

  const turnsTracked = !!game.turnOrderEnabled;

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
    return { orderedIds: order, firstPlayerId: null, dealerId };
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

/**
 * Freezes the turn state for every round up to and including `roundIndex` that
 * isn't already frozen, computing each from the game's settings as of this call.
 * Returns a patch to merge into the game (or `null` if nothing needed freezing).
 * Call this whenever a round is newly reached — on "Next Round", and once on
 * initial load for round 0 — so later edits to turn order/dealer settings can
 * only ever affect rounds not yet frozen.
 */
export function resolveTurnStateForRound(game: Game, roundIndex: number): Partial<Game> | null {
  const dealerHistory = [...(game.dealerHistory ?? [])];
  const firstPlayerHistory = [...(game.firstPlayerHistory ?? [])];
  let changed = false;
  for (let i = 0; i <= roundIndex; i++) {
    if (dealerHistory[i] !== undefined && firstPlayerHistory[i] !== undefined) continue;
    const { dealerId, firstPlayerId } = computeTurnState(game, i);
    dealerHistory[i] = dealerId;
    firstPlayerHistory[i] = firstPlayerId;
    changed = true;
  }
  return changed ? { dealerHistory, firstPlayerHistory } : null;
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
