import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GameCard } from '@/components/game-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useGamesContext } from '@/context/games-context';
import { useTheme } from '@/hooks/use-theme';
import { shared } from '@/styles/shared';
import { getPlayerWinRate } from '@/utils/game';

export default function PlayerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { globalPlayers, games, deleteGame } = useGamesContext();
  const theme = useTheme();
  const router = useRouter();

  const player = globalPlayers.find(p => p.id === id);
  const playerGames = games
    .filter(g => g.finishedAt && g.players.some(p => p.id === id))
    .sort((a, b) => b.finishedAt! - a.finishedAt!);

  const winRate = getPlayerWinRate(id, games);

  const confirmDelete = (gameId: string, gameName: string) => {
    Alert.alert('Delete Game', `Delete "${gameName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteGame(gameId) },
    ]);
  };

  if (!player) {
    return (
      <ThemedView style={shared.screen}>
        <Stack.Screen options={{ title: 'Player' }} />
        <SafeAreaView style={shared.safeArea} edges={['bottom']}>
          <ThemedText type="default">Player not found.</ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={shared.screen}>
      <Stack.Screen options={{ title: player.name, headerBackTitle: 'Players' }} />
      <SafeAreaView style={[shared.safeArea, { paddingTop: Spacing.two }]} edges={['bottom']}>

        {/* Stats card */}
        <View style={[styles.statsCard, { backgroundColor: theme.backgroundElement }]}>
          <View style={styles.statItem}>
            <ThemedText style={styles.statLabel} themeColor="textSecondary">WIN RATE</ThemedText>
            <ThemedText style={styles.statValue}>{winRate}</ThemedText>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.backgroundSelected }]} />
          <View style={styles.statItem}>
            <ThemedText style={styles.statLabel} themeColor="textSecondary">GAMES</ThemedText>
            <ThemedText style={styles.statValue}>{playerGames.length}</ThemedText>
          </View>
        </View>

        {/* Game history */}
        {playerGames.length > 0 && (
          <ThemedText style={styles.sectionLabel} themeColor="textSecondary">GAME HISTORY</ThemedText>
        )}
        <FlatList
          data={playerGames}
          keyExtractor={g => g.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
              No finished games yet
            </ThemedText>
          }
          renderItem={({ item }) => (
            <GameCard
              game={item}
              onPress={() => router.push(`/game/${item.id}`)}
              onDelete={() => confirmDelete(item.id, item.name)}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.two }} />}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  statsCard: {
    flexDirection: 'row',
    borderRadius: Spacing.two,
    marginBottom: Spacing.three,
    overflow: 'hidden',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.five,
    gap: Spacing.two,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '600',
    lineHeight: 36,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    marginBottom: Spacing.one,
  },
  list: {
    gap: Spacing.two,
  },
  empty: {
    paddingTop: Spacing.four,
    textAlign: 'center',
  },
});
