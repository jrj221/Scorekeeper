import { SymbolView } from "expo-symbols";
import { StyleSheet, TouchableOpacity, View } from "react-native";

import { Game } from "@/context/games-context";
import { useTheme } from "@/hooks/use-theme";
import { homeStyles } from "@/styles/home";
import { getGameWinnerLabel } from "@/utils/game";
import { ThemedText } from "./themed-text";

type Props = {
	game: Game;
	onPress: () => void;
	onDelete: () => void;
};

const fmt = (ts: number) => new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });

const sameDay = (a: number, b: number) => {
	const da = new Date(a),
		db = new Date(b);
	return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
};

export function GameCard({ game, onPress, onDelete }: Props) {
	const theme = useTheme();
	const finished = !!game.finishedAt;
	const winnerLabel = finished ? getGameWinnerLabel(game) : "";

	const subtitle = finished
		? sameDay(game.createdAt, game.finishedAt!)
			? `${fmt(game.finishedAt!)}  ·  ${game.players.length} player${game.players.length !== 1 ? "s" : ""}`
			: `${fmt(game.createdAt)} – ${fmt(game.finishedAt!)}  ·  ${game.players.length} player${game.players.length !== 1 ? "s" : ""}`
		: `${game.players.length} player${game.players.length !== 1 ? "s" : ""}  ·  Round ${game.rounds.length}`;

	return (
		<TouchableOpacity
			style={[homeStyles.card, { backgroundColor: theme.backgroundElement }, finished && styles.finished]}
			onPress={onPress}
		>
			<View style={homeStyles.cardContent}>
				<ThemedText type="default" style={finished ? { opacity: 0.75 } : undefined}>
					{game.name}
				</ThemedText>
				<ThemedText type="small" themeColor="textSecondary">
					{subtitle}
				</ThemedText>
				{finished && winnerLabel ? (
					<ThemedText type="small" themeColor="textSecondary">
						{winnerLabel}
					</ThemedText>
				) : null}
			</View>
			<TouchableOpacity onPress={onDelete} hitSlop={8}>
				<SymbolView name="trash" size={16} tintColor={theme.textSecondary} />
			</TouchableOpacity>
		</TouchableOpacity>
	);
}

const styles = StyleSheet.create({
	finished: {
		opacity: 0.85,
	},
});
