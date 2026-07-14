import { Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Podium } from "@/components/standings/Podium";
import { RankedList } from "@/components/standings/RankedList";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { useTextScaleContext } from "@/context/text-scale-context";
import { getGameType } from "@/game-types/registry";
import { useGame } from "@/hooks/use-game";
import { useTheme } from "@/hooks/use-theme";
import { shared } from "@/styles/shared";
import { buildTiers } from "@/utils/game";

export default function ResultsScreen() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const { game, totals, sortedPlayers } = useGame(id);
	const theme = useTheme();
	const { largeText } = useTextScaleContext();
	const [restRevealed, setRestRevealed] = useState(false);

	const tiers = buildTiers(sortedPlayers, totals, game);

	if (!game) return null;

	const restTiers = tiers.slice(3);
	const gameType = getGameType(game);
	const secondaryStat = gameType.secondaryStat
		? (playerId: string) => gameType.secondaryStat!(game, playerId)
		: undefined;

	return (
		<ThemedView style={shared.screen}>
			<Stack.Screen options={{ title: "Final Scores", headerBackTitle: "Home" }} />
			<SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
				<ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
					<Podium
						tiers={tiers}
						totals={totals}
						theme={theme}
						largeText={largeText}
						animated
						secondaryStat={secondaryStat}
						onTopRevealed={() => setRestRevealed(true)}
					/>
					<RankedList
						tiers={restTiers}
						totals={totals}
						theme={theme}
						secondaryStat={secondaryStat}
						animated
						revealed={restRevealed}
					/>
				</ScrollView>
			</SafeAreaView>
		</ThemedView>
	);
}

const styles = StyleSheet.create({
	scroll: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six },
});
