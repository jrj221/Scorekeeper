import { Stack } from "expo-router";
import { Alert, FlatList, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { GameCard } from "@/components/game-card";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Game } from "@/context/games-context";
import { useGames } from "@/hooks/use-games";
import { homeStyles } from "@/styles/home";
import { shared } from "@/styles/shared";

export default function HomeScreen() {
	const { games, openNewGame, handleOpen, deleteGame } = useGames();

	const confirmDelete = (game: Game) => {
		Alert.alert(
			"Delete Game",
			`Delete "${game.name}"? This can't be undone.`,
			[
				{ text: "Cancel", style: "cancel" },
				{ text: "Delete", style: "destructive", onPress: () => deleteGame(game.id) },
			],
		);
	};

	return (
		<ThemedView style={shared.screen}>
			<Stack.Screen options={{ title: "Scorekeeper" }} />
			<SafeAreaView style={shared.safeArea}>
				{games.length === 0 ? (
					<ThemedView style={homeStyles.emptyState}>
						<ThemedText type="subtitle">No games yet</ThemedText>
						<ThemedText type="small" themeColor="textSecondary">
							Tap + to start a new game
						</ThemedText>
					</ThemedView>
				) : (
					<FlatList
						data={games}
						keyExtractor={(g) => g.id}
						contentContainerStyle={homeStyles.list}
						renderItem={({ item }) => (
							<GameCard
								game={item}
								onPress={() => handleOpen(item.id)}
								onDelete={() => confirmDelete(item)}
							/>
						)}
					/>
				)}

				<TouchableOpacity style={[homeStyles.fab, { backgroundColor: "#0077B6" }]} onPress={openNewGame}>
					<ThemedText type="subtitle" style={{ color: "#fff", lineHeight: 32 }}>
						+
					</ThemedText>
				</TouchableOpacity>
			</SafeAreaView>
		</ThemedView>
	);
}
