import { Stack, useRouter } from "expo-router";
import { Alert, SectionList, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { GameCard } from "@/components/game-card";
import { HapticButton } from "@/components/haptic-button";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { Game, useGamesContext } from "@/context/games-context";
import { useGames } from "@/hooks/use-games";
import { useTheme } from "@/hooks/use-theme";
import { homeStyles } from "@/styles/home";
import { shared } from "@/styles/shared";

export default function HomeScreen() {
	const { games, handleOpen, deleteGame } = useGames();
	const { templates } = useGamesContext();
	const theme = useTheme();
	const router = useRouter();

	const confirmDelete = (game: Game) => {
		Alert.alert("Delete Game", `Delete "${game.name}"? This can't be undone.`, [
			{ text: "Cancel", style: "cancel" },
			{ text: "Delete", style: "destructive", onPress: () => deleteGame(game.id) },
		]);
	};

	const handleFabPress = () => {
		if (templates.length === 0) {
			router.push("/new-game");
		} else {
			router.push("/new-game-start");
		}
	};

	const active = games.filter((g) => !g.finishedAt);
	const finished = games.filter((g) => !!g.finishedAt).sort((a, b) => b.finishedAt! - a.finishedAt!);

	const sections = [
		...(active.length > 0 ? [{ title: "In Progress", data: active }] : []),
		...(finished.length > 0 ? [{ title: "Finished", data: finished }] : []),
	];

	const isEmpty = games.length === 0;

	return (
		<ThemedView style={shared.screen}>
			<Stack.Screen options={{ title: "Scorekeeper" }} />
			<SafeAreaView style={shared.safeArea} edges={["bottom"]}>
				{isEmpty ? (
					<ThemedView style={homeStyles.emptyState}>
						<ThemedText type="subtitle">No games yet</ThemedText>
						<ThemedText type="small" themeColor="textSecondary">
							Tap + to start a new game
						</ThemedText>
					</ThemedView>
				) : (
					<SectionList
						sections={sections}
						keyExtractor={(g) => g.id}
						style={{ flex: 1 }}
						contentContainerStyle={homeStyles.list}
						stickySectionHeadersEnabled={false}
						renderSectionHeader={({ section }) => (
							<View
								style={[
									styles.sectionHeader,
									sections[0]?.title !== section.title && styles.sectionHeaderGap,
								]}
							>
								<ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
									{section.title.toUpperCase()}
								</ThemedText>
							</View>
						)}
						renderItem={({ item }) => (
							<GameCard
								game={item}
								onPress={() => handleOpen(item.id)}
								onDelete={() => confirmDelete(item)}
							/>
						)}
						ItemSeparatorComponent={() => <View style={{ height: Spacing.two }} />}
					/>
				)}

				<HapticButton style={[homeStyles.fab, { backgroundColor: theme.accent }]} onPress={handleFabPress}>
					<ThemedText type="subtitle" style={{ color: "#fff", lineHeight: 32 }}>
						+
					</ThemedText>
				</HapticButton>
			</SafeAreaView>
		</ThemedView>
	);
}

const styles = StyleSheet.create({
	sectionHeader: {
		paddingBottom: Spacing.one,
	},
	sectionHeaderGap: {
		marginTop: Spacing.three,
	},
	sectionTitle: {
		fontSize: 11,
		fontWeight: "600",
		letterSpacing: 0.8,
	},
});
