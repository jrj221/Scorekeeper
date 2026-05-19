import { Stack, useLocalSearchParams } from 'expo-router';
import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useGamesContext } from '@/context/games-context';
import { useTheme } from '@/hooks/use-theme';
import { shared } from '@/styles/shared';

export default function GameInfoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getGame, saveGameAsTemplate, templates } = useGamesContext();
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

  const matchingTemplate = templates.some(t =>
    t.name === game.name &&
    (t.description ?? '') === (game.description ?? '') &&
    t.totalRounds === game.totalRounds &&
    t.rankByLowest === game.rankByLowest,
  );

  const handleSaveAsTemplate = () => {
    saveGameAsTemplate(id);
    Alert.alert('Template Saved', `"${game.name}" has been saved as a template.`);
  };

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

        {!matchingTemplate && (
          <TouchableOpacity
            style={[styles.templateBtn, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}
            onPress={handleSaveAsTemplate}
          >
            <ThemedText type="small" style={{ color: '#0077B6' }}>Save as Template</ThemedText>
          </TouchableOpacity>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  sections: {
    gap: Spacing.two,
    flex: 1,
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
  templateBtn: {
    borderRadius: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
});
