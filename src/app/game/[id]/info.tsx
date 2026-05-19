import { Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useGamesContext } from '@/context/games-context';
import { useTheme } from '@/hooks/use-theme';
import { shared } from '@/styles/shared';

export default function GameInfoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getGame } = useGamesContext();
  const theme = useTheme();
  const game = getGame(id);

  if (!game) {
    return (
      <ThemedView style={shared.screen}>
        <SafeAreaView style={shared.safeArea}>
          <ThemedText type="default">Game not found.</ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={shared.screen}>
      <Stack.Screen options={{ title: 'Game Info' }} />
      <SafeAreaView style={[shared.safeArea, { paddingTop: Spacing.three }]} edges={['bottom']}>
        <View style={styles.sections}>

          {game.description ? (
            <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText style={styles.label} themeColor="textSecondary">DESCRIPTION</ThemedText>
              <ThemedText type="default">{game.description}</ThemedText>
            </View>
          ) : null}

          <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText style={styles.label} themeColor="textSecondary">WIN CONDITION</ThemedText>
            <ThemedText type="default">
              {game.rankByLowest ? 'Lowest score wins' : 'Highest score wins'}
            </ThemedText>
          </View>

          <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText style={styles.label} themeColor="textSecondary">GAME LENGTH</ThemedText>
            <ThemedText type="default">
              {game.totalRounds !== undefined ? `${game.totalRounds} rounds` : 'Indefinite'}
            </ThemedText>
          </View>

          <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText style={styles.label} themeColor="textSecondary">PLAYERS</ThemedText>
            <ThemedText type="default">{game.players.length}</ThemedText>
          </View>

        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  sections: {
    gap: Spacing.two,
  },
  card: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
  },
});
