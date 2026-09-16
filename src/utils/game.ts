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

/**
 * Advances `fromId` one seat forward through `order` (the live turn-order array
 * at the moment this round is being resolved). Falls back to `order[0]` if
 * `fromId` isn't in `order` (e.g. that player was removed from the game).
 */
function nextSeatFrom(order: string[], fromId: string, n: number): string {
  const idx = order.indexOf(fromId);
  return order[idx === -1 ? 0 : (idx + 1) % n];
}

/**
 * Live computation of turn state for `roundIndex` from the game's current
 * settings and turn order.
 *
 * Rotation (dealer "rotation" mode, first-player "rotation" mode) is relative,
 * not absolute: round N's holder is one seat forward from round N-1's frozen
 * holder (`game.dealerHistory`/`firstPlayerHistory`), walked through `order` as
 * it stands right now — never recomputed as an offset from round 0. This means
 * reordering players only ever changes who's "next" from here, regardless of
 * what the order looked like in rounds already played.
 *
 * Rotation restarts fresh at the configured anchor (`fixedDealerId`/
 * `firstPlayerId`) instead of advancing from the previous round whenever
 * `roundIndex` is at or past `dealerRotationAnchorRound`/
 * `firstPlayerRotationAnchorRound` — set whenever the user explicitly (re)picks
 * a starting player, so that choice always takes effect from here forward
 * rather than being read as "as if they'd started round 0."
 */
function computeTurnState(game: Game, roundIndex: number): TurnState {
  const order = game.turnOrder?.length ? game.turnOrder : game.players.map(p => p.id);
  const n = order.length;
  if (n === 0) return { orderedIds: [], firstPlayerId: null, dealerId: null };

  const dealerRestarts = roundIndex === game.dealerRotationAnchorRound;
  const firstPlayerRestarts = roundIndex === game.firstPlayerRotationAnchorRound;
  const prevDealer =
    roundIndex > 0 && !dealerRestarts ? (game.dealerHistory?.[roundIndex - 1] ?? undefined) : undefined;
  const prevFirstPlayer =
    roundIndex > 0 && !firstPlayerRestarts ? (game.firstPlayerHistory?.[roundIndex - 1] ?? undefined) : undefined;

  const resolveDealer = (): string | null => {
    if (!game.dealerEnabled) return null;
    switch (game.dealerMode) {
      case 'fixed':
        return game.fixedDealerId ?? null;
      case 'rotation':
        if (prevDealer) return nextSeatFrom(order, prevDealer, n);
        return game.fixedDealerId && order.includes(game.fixedDealerId) ? game.fixedDealerId : order[0];
      case 'random':
      default:
        return order[deterministicIdx(game.id, roundIndex, n)];
    }
  };

  const turnsTracked = !!game.turnOrderEnabled;

  // Goes-first off: keep players in their natural order, no first player.
  // Dealer is tracked independently and still rotates.
  if (!turnsTracked) {
    return { orderedIds: order, firstPlayerId: null, dealerId: resolveDealer() };
  }

  // Left-of-dealer: dealer is primary, first player derives from THIS round's dealer.
  if (game.firstPlayerMode === 'left-of-dealer' && game.dealerEnabled) {
    const dealerId = resolveDealer();
    const dealerIdx = dealerId ? order.indexOf(dealerId) : -1;
    const firstIdx = dealerIdx === -1 ? 0 : (dealerIdx + 1) % n;
    const firstPlayerId = order[firstIdx];
    const orderedIds = [...order.slice(firstIdx), ...order.slice(0, firstIdx)];
    return { orderedIds, firstPlayerId, dealerId };
  }

  // Standard: first player is primary, dealer optionally derives from dealer settings.
  let firstPlayerId: string | null;
  if (!game.firstPlayerId) {
    // Random mode: pseudo-random, never same player twice in a row.
    const idx = deterministicIdx(game.id, roundIndex, n);
    const prevIdx = roundIndex > 0 ? deterministicIdx(game.id, roundIndex - 1, n) : -1;
    firstPlayerId = order[idx === prevIdx ? (idx + 1) % n : idx];
  } else if (prevFirstPlayer) {
    firstPlayerId = nextSeatFrom(order, prevFirstPlayer, n);
  } else {
    firstPlayerId = order.includes(game.firstPlayerId) ? game.firstPlayerId : order[0];
  }
  const firstIdx = order.indexOf(firstPlayerId);
  const orderedIds = [...order.slice(firstIdx), ...order.slice(0, firstIdx)];

  return { orderedIds, firstPlayerId, dealerId: resolveDealer() };
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
    // Compute against the history built so far this call, not the original
    // `game` — otherwise freezing several rounds in one pass (e.g. resuming a
    // game whose earlier rounds were never frozen) would have each round's
    // rotation ignore the ones just resolved before it in this same loop.
    const { dealerId, firstPlayerId } = computeTurnState({ ...game, dealerHistory, firstPlayerHistory }, i);
    dealerHistory[i] = dealerId;
    firstPlayerHistory[i] = firstPlayerId;
    changed = true;
  }
  return changed ? { dealerHistory, firstPlayerHistory } : null;
}

/**
 * Un-freezes `roundIndex`'s dealer and/or first-player so it recomputes live
 * from current settings on the next `getTurnState` call. Call this when the
 * user flips the dealer-tracking or goes-first toggle for the round currently
 * in progress — otherwise a round frozen while a feature was off (locking in
 * `null`) would stay locked at `null` forever even after the feature is turned
 * on, since a frozen non-undefined entry (including `null`) is normally never
 * recomputed.
 */
export function unfreezeTurnStateForRound(
  game: Game,
  roundIndex: number,
  fields: { dealer?: boolean; firstPlayer?: boolean },
): Partial<Game> | null {
  const dealerHistory = game.dealerHistory ? [...game.dealerHistory] : undefined;
  const firstPlayerHistory = game.firstPlayerHistory ? [...game.firstPlayerHistory] : undefined;
  let changed = false;
  if (fields.dealer && dealerHistory && dealerHistory[roundIndex] !== undefined) {
    dealerHistory[roundIndex] = undefined as unknown as string | null;
    changed = true;
  }
  if (fields.firstPlayer && firstPlayerHistory && firstPlayerHistory[roundIndex] !== undefined) {
    firstPlayerHistory[roundIndex] = undefined as unknown as string | null;
    changed = true;
  }
  if (!changed) return null;
  return {
    ...(dealerHistory ? { dealerHistory } : {}),
    ...(firstPlayerHistory ? { firstPlayerHistory } : {}),
  };
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
      ? `${fixedDealerName} deals this round, then it rotates to the next player each round.`
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
  if (firstPlayerName) return `${firstPlayerName} goes first in this round, then it rotates to the next player each round.`;
  return 'The first player rotates through the group each round.';
}
