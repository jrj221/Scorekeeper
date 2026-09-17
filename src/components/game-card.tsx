import { FontAwesome5 } from "@expo/vector-icons";
import { SymbolView } from "expo-symbols";
import { StyleSheet, View } from "react-native";

import { Game } from "@/context/games-context";
import { useTheme } from "@/hooks/use-theme";
import { homeStyles } from "@/styles/home";
import { getCurrentRoundIndex, getGameWinnerLabel } from "@/utils/game";
import { ThemedText } from "./themed-text";
import { HapticButton } from "@/components/haptic-button";
import { MarqueeText } from "@/components/marquee-text";

type Props = {
	game: Game;
	onPress: () => void;
	onDelete: () => void;
};

const DEFAULT_ICON = "users";

const fmt = (ts: number) =>
	new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

const sameDay = (a: number, b: number) => {
	const da = new Date(a), db = new Date(b);
	return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
};

function winnerInfo(game: Game): { icon: string; label: string } | null {
	if (!game.finishedAt || game.players.length === 0) return null;
	const label = getGameWinnerLabel(game);
	if (!label) return null;
	const isTie = label.startsWith("🤝");
	return { icon: isTie ? "handshake" : "trophy", label: label.replace(/^(🏆|🤝)\s*/, "") };
}

export function GameCard({ game, onPress, onDelete }: Props) {
	const theme = useTheme();
	const finished = !!game.finishedAt;
	const winner = winnerInfo(game);

	const subtitle = finished
		? sameDay(game.createdAt, game.finishedAt!)
			? `${fmt(game.finishedAt!)}  ·  ${game.players.length} player${game.players.length !== 1 ? "s" : ""}`
			: `${fmt(game.createdAt)} – ${fmt(game.finishedAt!)}  ·  ${game.players.length} player${game.players.length !== 1 ? "s" : ""}`
		: `${game.players.length} player${game.players.length !== 1 ? "s" : ""}  ·  Round ${getCurrentRoundIndex(game) + 1}`;

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
					{game.name}
				</ThemedText>
				{winner && (
					<View style={styles.winnerRow}>
						<FontAwesome5 name={winner.icon as any} size={10} color={theme.textSecondary} />
						<MarqueeText type="small" themeColor="textSecondary" style={{ flexShrink: 1 }}>
							{"  "}{winner.label}{"  ·  "}{subtitle}
						</MarqueeText>
					</View>
				)}
				{!winner && (
					<MarqueeText type="small" themeColor="textSecondary">
						{subtitle}
					</MarqueeText>
				)}
			</View>
			<HapticButton onPress={onDelete} hitSlop={8}>
				<SymbolView name="trash" size={16} tintColor={theme.textSecondary} />
			</HapticButton>
		</HapticButton>
	);
}

const styles = StyleSheet.create({
	finished: { opacity: 0.85 },
	iconContainer: {
		width: 44,
		alignSelf: "stretch",
		borderRadius: 8,
		alignItems: "center",
		justifyContent: "center",
	},
	winnerRow: {
		flexDirection: "row",
		alignItems: "center",
		alignSelf: "stretch",
	},
});
