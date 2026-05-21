import { FontAwesome5 } from "@expo/vector-icons";
import { SymbolView } from "expo-symbols";
import { StyleSheet, View } from "react-native";

import { Game } from "@/context/games-context";
import { useTheme } from "@/hooks/use-theme";
import { homeStyles } from "@/styles/home";
import { getGameTotals } from "@/utils/game";
import { ThemedText } from "./themed-text";
import { HapticButton } from "@/components/haptic-button";

type Props = {
	game: Game;
	onPress: () => void;
	onDelete: () => void;
};

const DEFAULT_ICON = "users";

const fmt = (ts: number) => new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });

const sameDay = (a: number, b: number) => {
	const da = new Date(a), db = new Date(b);
	return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
};

function winnerSuffix(game: Game): string {
	if (!game.finishedAt || game.players.length === 0) return "";
	const totals = getGameTotals(game);
	const scores = game.players.map(p => ({ ...p, total: totals[p.id] ?? 0 }));
	const best = game.rankByLowest
		? Math.min(...scores.map(s => s.total))
		: Math.max(...scores.map(s => s.total));
	const winners = scores.filter(s => s.total === best);
	if (winners.length === 1) return `  ·  🏆 ${winners[0].name}`;
	return `  ·  🤝 ${winners.length}-way Tie`;
}

export function GameCard({ game, onPress, onDelete }: Props) {
	const theme = useTheme();
	const finished = !!game.finishedAt;

	const subtitle = finished
		? sameDay(game.createdAt, game.finishedAt!)
			? `${fmt(game.finishedAt!)}  ·  ${game.players.length} player${game.players.length !== 1 ? "s" : ""}`
			: `${fmt(game.createdAt)} – ${fmt(game.finishedAt!)}  ·  ${game.players.length} player${game.players.length !== 1 ? "s" : ""}`
		: `${game.players.length} player${game.players.length !== 1 ? "s" : ""}  ·  Round ${game.rounds.length}`;

	const displayName = finished ? `${game.name}${winnerSuffix(game)}` : game.name;

	return (
		<HapticButton
			style={[homeStyles.card, { backgroundColor: theme.backgroundElement }, finished && styles.finished]}
			onPress={onPress}
		>
			<View style={[styles.iconContainer, { backgroundColor: theme.backgroundSelected }]}>
				<FontAwesome5
					name={(game.icon ?? DEFAULT_ICON) as any}
					size={22}
					color={theme.textSecondary}
				/>
			</View>
			<View style={homeStyles.cardContent}>
				<ThemedText type="default" style={finished ? { opacity: 0.75 } : undefined} numberOfLines={1}>
					{displayName}
				</ThemedText>
				<ThemedText type="small" themeColor="textSecondary">
					{subtitle}
				</ThemedText>
			</View>
			<HapticButton onPress={onDelete} hitSlop={8}>
				<SymbolView name="trash" size={16} tintColor={theme.textSecondary} />
			</HapticButton>
		</HapticButton>
	);
}

const styles = StyleSheet.create({
	finished: {
		opacity: 0.85 },
	iconContainer: {
		width: 44,
		alignSelf: "stretch",
		borderRadius: 8,
		alignItems: "center",
		justifyContent: "center" } });
