import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { HapticButton } from "@/components/haptic-button";
import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { Game } from "@/context/games-context";
import { GameTypeDefinition } from "@/game-types/types";
import { useTheme } from "@/hooks/use-theme";
import { getTurnState } from "@/utils/game";

const ROTATION_MS = 400;

type Theme = ReturnType<typeof useTheme>;

export interface TurnListProps {
	game: Game;
	gameType: GameTypeDefinition;
	gameId: string;
	currentRoundIndex: number;
	totals: Record<string, number>;
	allScored: boolean;
	isFinalRound: boolean;
	advanceRound: () => void;
	updateGamePartial: (patch: Partial<Game>) => void;
	theme: Theme;
	tint: string;
	largeText: boolean;
	rowH: number;
}

/**
 * Current-round turn order view: player rows in turn order, a dealer badge, the
 * turn-rotation slide animation, and (via `gameType.extraTurnColumn`) an optional
 * extra column such as Phase 10's "Phased?" checkbox.
 */
export function TurnList({
	game,
	gameType,
	gameId,
	currentRoundIndex,
	totals,
	allScored,
	isFinalRound,
	advanceRound,
	updateGamePartial,
	theme,
	tint: CURRENT_TINT,
	largeText,
	rowH: ROW_H,
}: TurnListProps) {
	const router = useRouter();
	const extraCol = gameType.extraTurnColumn;
	// Large-text mode scales up the extra column's label and checkbox (ThemedText auto-scales
	// custom fontSizes), so the column and checkbox need more room to avoid wrapping/clipping.
	const EXTRA_COL_W = largeText ? 84 : 60;
	const EXTRA_CHECKBOX_SIZE = largeText ? 30 : 24;

	const getScore = (roundIndex: number, playerId: string): number | null => {
		const r = game.rounds[roundIndex];
		if (!r) return null;
		const v = r[playerId];
		return v !== undefined ? v : null;
	};

	// Turn order rotation animation.
	// Ghost = the OLD first player appended below the list.
	// We animate slideY: 0 → -ROW_H (slide up).
	// At animation end: visible rows are [new[0], new[1], ..., new[n-2], ghost]
	// which maps exactly to new order at slideY=0 → snap is invisible.
	const [displayedOrder, setDisplayedOrder] = useState<string[]>(() =>
		game ? getTurnState(game, 0).orderedIds : [],
	);
	const displayedOrderRef = useRef(displayedOrder);
	// ghostIds: the players entering from the top (K of them for a K-slot scroll)
	const [ghostIds, setGhostIds] = useState<string[]>([]);
	const slideY = useSharedValue(0);
	const prevRoundRef = useRef(currentRoundIndex);
	const pendingOrderRef = useRef<string[]>([]);
	const isAnimatingRef = useRef(false);

	useEffect(() => {
		displayedOrderRef.current = displayedOrder;
	}, [displayedOrder]);

	const turnListAnimatedStyle = useAnimatedStyle(() => ({
		transform: [{ translateY: slideY.value }],
	}));

	// Detect round change → compute how many slots to scroll (K), set K ghost rows
	useEffect(() => {
		if (!game) return;
		const newOrder = getTurnState(game, currentRoundIndex).orderedIds;
		if (prevRoundRef.current === currentRoundIndex) {
			if (!isAnimatingRef.current) setDisplayedOrder(newOrder);
			return;
		}
		prevRoundRef.current = currentRoundIndex;
		const old = displayedOrderRef.current;
		// Order unchanged (e.g. goes-first off) → no rotation animation
		if (old.length === newOrder.length && old.every((v, i) => v === newOrder[i])) {
			setDisplayedOrder(newOrder);
			return;
		}
		pendingOrderRef.current = newOrder;
		const j = old.indexOf(newOrder[0]);
		// K = right-rotation distance: how far newOrder[0] is from the bottom
		const K = j <= 0 ? 1 : old.length - j;
		setGhostIds(newOrder.slice(0, K));
	}, [currentRoundIndex, game]);

	// After K ghost rows render above the list, slide everything down by K slots
	useEffect(() => {
		if (ghostIds.length === 0) return;
		isAnimatingRef.current = true;
		slideY.value = withTiming(ghostIds.length * ROW_H, { duration: ROTATION_MS });
		const t = setTimeout(() => {
			isAnimatingRef.current = false;
			setDisplayedOrder(pendingOrderRef.current);
			setGhostIds([]);
		}, ROTATION_MS);
		return () => clearTimeout(t);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [ghostIds]);

	// Snap slideY to 0 after new order commits — seamless because the K ghost positions
	// at animation end exactly match the new order at translateY=0.
	useEffect(() => {
		if (ghostIds.length === 0) slideY.value = 0;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [ghostIds]);

	const { firstPlayerId, dealerId } = getTurnState(game, currentRoundIndex);
	const playerMap = Object.fromEntries(game.players.map((p) => [p.id, p]));
	const firstPlayer = firstPlayerId ? playerMap[firstPlayerId] : null;

	const toggleExtra = (roundIndex: number, playerId: string) => {
		if (!extraCol) return;
		const current = extraCol.isChecked(game, roundIndex, playerId);
		updateGamePartial(extraCol.onToggle(game, roundIndex, playerId, !current));
	};

	const renderRow = (pid: string, opts: { ghost?: boolean; ghostIdx?: number } = {}) => {
		const p = playerMap[pid];
		if (!p) return null;
		const isDealer = pid === dealerId;
		const hasScore = getScore(currentRoundIndex, pid) !== null;
		const roundScore = getScore(currentRoundIndex, pid);
		const prevTotal = (totals[pid] ?? 0) - (roundScore ?? 0);
		const RowComp = opts.ghost ? View : HapticButton;
		return (
			<RowComp
				key={opts.ghost ? `ghost-${opts.ghostIdx}` : pid}
				style={[
					styles.turnRow,
					{
						height: ROW_H,
						borderBottomColor: theme.backgroundSelected,
						...(opts.ghost && opts.ghostIdx === 0 && { marginTop: -ghostIds.length * ROW_H }),
					},
				]}
				{...(!opts.ghost
					? {
							onPress: () =>
								router.push(`/game/${gameId}/score-player?playerId=${pid}&roundIndex=${currentRoundIndex}`),
							activeOpacity: 0.7,
						}
					: {})}
			>
				<View style={styles.turnNameRow}>
					<ThemedText style={[styles.turnName, largeText && extraCol && { fontSize: 13 }]} numberOfLines={1}>
						{p.name}
					</ThemedText>
					{hasScore && <ThemedText style={[styles.turnCheckmark, { color: CURRENT_TINT }]}>✓</ThemedText>}
					{isDealer && (
						<View style={[styles.dealerBadge, { backgroundColor: CURRENT_TINT + "20" }]}>
							<ThemedText style={[styles.dealerLabel, { color: CURRENT_TINT }]}>DEALER</ThemedText>
						</View>
					)}
				</View>
				<View style={styles.turnScoreArea}>
					<View style={styles.turnScoreRow}>
						<ThemedText style={[styles.turnScore, largeText && extraCol && { fontSize: 16, minWidth: 36 }]}>
							{prevTotal}
						</ThemedText>
						{roundScore !== null && (
							<ThemedText
								style={[styles.turnScoreDelta, { color: roundScore < 0 ? theme.danger : theme.text }]}
							>
								{roundScore >= 0 ? ` +${roundScore}` : ` ${roundScore}`}
							</ThemedText>
						)}
					</View>
				</View>
				{extraCol &&
					(opts.ghost ? (
						<View style={[styles.turnPhasedCell, { width: EXTRA_COL_W }]}>
							<View
								style={[
									styles.phaseCheckbox,
									{
										width: EXTRA_CHECKBOX_SIZE,
										height: EXTRA_CHECKBOX_SIZE,
										borderColor: theme.textSecondary,
									},
									extraCol.isChecked(game, currentRoundIndex, pid) && {
										backgroundColor: CURRENT_TINT,
										borderColor: CURRENT_TINT,
									},
								]}
							>
								{extraCol.isChecked(game, currentRoundIndex, pid) && (
									<ThemedText style={styles.phaseCheckMark}>✓</ThemedText>
								)}
							</View>
						</View>
					) : (
						<HapticButton
							style={[styles.turnPhasedCell, { width: EXTRA_COL_W }]}
							onPress={() => toggleExtra(currentRoundIndex, pid)}
							hitSlop={8}
						>
							<View
								style={[
									styles.phaseCheckbox,
									{
										width: EXTRA_CHECKBOX_SIZE,
										height: EXTRA_CHECKBOX_SIZE,
										borderColor: theme.textSecondary,
									},
									extraCol.isChecked(game, currentRoundIndex, pid) && {
										backgroundColor: CURRENT_TINT,
										borderColor: CURRENT_TINT,
									},
								]}
							>
								{extraCol.isChecked(game, currentRoundIndex, pid) && (
									<ThemedText style={styles.phaseCheckMark}>✓</ThemedText>
								)}
							</View>
						</HapticButton>
					))}
			</RowComp>
		);
	};

	return (
		<View style={{ flex: 1 }}>
			{firstPlayer && (
				<ThemedText style={[styles.goesFirstLabel, { color: theme.textSecondary }]}>
					{firstPlayer.name} goes first this round
				</ThemedText>
			)}
			<View
				style={[
					styles.turnHeaderRow,
					{ borderBottomColor: theme.backgroundSelected, backgroundColor: theme.backgroundSelected },
				]}
			>
				<ThemedText style={styles.turnHeaderCell} themeColor="textSecondary">
					Player
				</ThemedText>
				<ThemedText style={[styles.turnHeaderCell, styles.turnHeaderRight]} themeColor="textSecondary">
					Points so far
				</ThemedText>
				{extraCol && (
					<ThemedText
						style={[styles.turnHeaderCell, styles.turnHeaderPhased, { width: EXTRA_COL_W }]}
						themeColor="textSecondary"
						numberOfLines={1}
						adjustsFontSizeToFit
					>
						{extraCol.headerLabel}
					</ThemedText>
				)}
			</View>
			{/* Fixed-height clipped container so rows slide in/out cleanly */}
			<View style={[styles.turnList, { height: displayedOrder.length * ROW_H }]}>
				<Animated.View style={turnListAnimatedStyle}>
					{ghostIds.map((pid, idx) => renderRow(pid, { ghost: true, ghostIdx: idx }))}
					{displayedOrder.map((pid) => renderRow(pid))}
				</Animated.View>
			</View>
			{!isFinalRound && (
				<HapticButton
					style={[styles.nextRoundBtn, { backgroundColor: allScored ? CURRENT_TINT : theme.backgroundElement }]}
					onPress={advanceRound}
					disabled={!allScored}
				>
					<ThemedText type="smallBold" style={{ color: allScored ? "#fff" : theme.textSecondary }}>
						Next Round
					</ThemedText>
				</HapticButton>
			)}
			{game.players.length > 0 && (
				<HapticButton
					style={[
						styles.editOrderBtn,
						{ borderColor: theme.backgroundSelected, backgroundColor: theme.backgroundElement },
					]}
					onPress={() => router.push(`/game/${gameId}/turn-order`)}
				>
					<ThemedText type="small" themeColor="textSecondary">
						Edit Turn Order
					</ThemedText>
				</HapticButton>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	turnList: {
		borderRadius: Spacing.two,
		overflow: "hidden",
	},
	turnRow: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: Spacing.three,
		paddingVertical: Spacing.two + 2,
		borderBottomWidth: StyleSheet.hairlineWidth,
		gap: Spacing.two,
	},
	turnNameRow: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
	},
	turnName: {
		flexShrink: 1,
		fontSize: 17,
	},
	dealerBadge: {
		borderRadius: Spacing.one,
		paddingHorizontal: Spacing.one,
		paddingVertical: 2,
	},
	dealerLabel: {
		fontSize: 10,
		fontWeight: "700",
		letterSpacing: 0.5,
	},
	turnScoreArea: {
		alignItems: "flex-end",
		gap: 4,
	},
	turnScoreRow: {
		flexDirection: "row",
		alignItems: "baseline",
		gap: 4,
	},
	turnScore: {
		fontSize: 22,
		fontWeight: "600",
		minWidth: 50,
		textAlign: "right",
	},
	turnScoreDelta: {
		fontSize: 16,
		fontWeight: "500",
		opacity: 0.45,
	},
	editOrderBtn: {
		borderRadius: Spacing.two,
		borderWidth: StyleSheet.hairlineWidth,
		paddingVertical: Spacing.two,
		alignItems: "center",
		marginTop: Spacing.two,
	},
	nextRoundBtn: {
		borderRadius: Spacing.two,
		paddingVertical: Spacing.two + 2,
		alignItems: "center",
		marginTop: Spacing.two,
	},
	turnCheckmark: {
		fontSize: 16,
		fontWeight: "700",
	},
	goesFirstLabel: {
		fontSize: 14,
		paddingVertical: Spacing.two,
	},
	turnHeaderRow: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: Spacing.three,
		paddingVertical: Spacing.one,
		borderBottomWidth: StyleSheet.hairlineWidth,
	},
	turnHeaderCell: {
		flex: 1,
		fontSize: 11,
		fontWeight: "600",
		letterSpacing: 0.4,
		textTransform: "uppercase",
	},
	turnHeaderRight: {
		flex: 0,
		textAlign: "right",
	},
	turnHeaderPhased: {
		flex: 0,
		width: 60,
		textAlign: "right",
	},
	turnPhasedCell: {
		width: 60,
		alignItems: "flex-end",
		justifyContent: "center",
	},
	phaseCheckbox: {
		width: 24,
		height: 24,
		borderRadius: 6,
		borderWidth: 2,
		alignItems: "center",
		justifyContent: "center",
	},
	phaseCheckMark: {
		fontSize: 14,
		fontWeight: "700",
		color: "#fff",
	},
});
