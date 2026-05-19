import { Stack, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useGamesContext } from '@/context/games-context';
import { useTheme } from '@/hooks/use-theme';
import { shared } from '@/styles/shared';

export default function NewGameStartScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { templates } = useGamesContext();

  return (
    <ThemedView style={shared.screen}>
      <Stack.Screen options={{ title: 'New Game' }} />
      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          <TouchableOpacity
            style={[styles.freshBtn, { backgroundColor: '#0077B6' }]}
            onPress={() => router.push('/new-game')}
          >
            <ThemedText type="default" style={{ color: '#fff', fontWeight: '600' }}>Start Fresh</ThemedText>
            <ThemedText type="small" style={{ color: 'rgba(255,255,255,0.7)' }}>Create a new game from scratch</ThemedText>
          </TouchableOpacity>

          {templates.length > 0 && (
            <View style={styles.section}>
              <ThemedText style={styles.label} themeColor="textSecondary">FROM A TEMPLATE</ThemedText>
              <View style={styles.list}>
                {templates.map(t => (
                  <TouchableOpacity
                    key={t.id}
                    style={[styles.templateCard, { backgroundColor: theme.backgroundElement }]}
                    onPress={() => router.push(`/new-game?templateId=${t.id}`)}
                  >
                    <View style={{ flex: 1, gap: 3 }}>
                      <ThemedText type="default">{t.name}</ThemedText>
                      <View style={styles.meta}>
                        <ThemedText type="small" themeColor="textSecondary">
                          {t.totalRounds !== undefined ? `${t.totalRounds} rounds` : 'Indefinite'}
                        </ThemedText>
                        <ThemedText type="small" themeColor="textSecondary"> · </ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">
                          {t.rankByLowest ? 'Lowest wins' : 'Highest wins'}
                        </ThemedText>
                      </View>
                      {t.description ? (
                        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                          {t.description}
                        </ThemedText>
                      ) : null}
                    </View>
                    <ThemedText type="small" style={{ color: '#0077B6' }}>→</ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: Spacing.three,
    gap: Spacing.four,
    paddingBottom: Spacing.six,
  },
  freshBtn: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  section: {
    gap: Spacing.two,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  list: {
    gap: Spacing.two,
  },
  templateCard: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
