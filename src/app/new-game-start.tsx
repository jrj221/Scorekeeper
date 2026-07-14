import { Stack, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useGamesContext } from '@/context/games-context';
import { useTheme } from '@/hooks/use-theme';
import { shared } from '@/styles/shared';
import { HapticButton } from "@/components/haptic-button";
import { forms } from '@/styles/forms';
import { FontAwesome5 } from '@expo/vector-icons';
import { CLASSIC_GAMES } from '@/constants/classic-games';
import { useTextScale } from '@/context/text-scale-context';

export default function NewGameStartScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { templates } = useGamesContext();
  const largeText = useTextScale() !== 1;

  return (
    <ThemedView style={shared.screen}>
      <Stack.Screen options={{ title: 'New Game' }} />
      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          <HapticButton
            style={[styles.freshBtn, { backgroundColor: theme.accent }]}
            onPress={() => router.replace('/new-game')}
          >
            <ThemedText type="default" style={{ color: '#fff', fontWeight: '600' }}>Start Fresh</ThemedText>
            <ThemedText type="small" style={{ color: 'rgba(255,255,255,0.7)' }}>Create a new game from scratch</ThemedText>
          </HapticButton>

          {templates.length > 0 && (
            <View style={forms.section}>
              <ThemedText style={forms.label} themeColor="textSecondary">FROM A TEMPLATE</ThemedText>
              <View style={styles.list}>
                {templates.map(t => (
                  <HapticButton
                    key={t.id}
                    style={[styles.templateCard, { backgroundColor: theme.backgroundElement }]}
                    onPress={() => router.replace(`/new-game?templateId=${t.id}`)}
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
                    </View>
                    <ThemedText type="small" style={{ color: theme.accent }}>→</ThemedText>
                  </HapticButton>
                ))}
              </View>
            </View>
          )}
          <View style={forms.section}>
            <ThemedText style={forms.label} themeColor="textSecondary">CLASSICS</ThemedText>
            <View style={styles.list}>
              {CLASSIC_GAMES.map(c => (
                <HapticButton
                  key={c.id}
                  style={[
                    styles.templateCard,
                    { backgroundColor: theme.backgroundElement },
                    largeText && { gap: Spacing.four },
                  ]}
                  onPress={() => router.replace(`/new-game?classicId=${c.id}`)}
                >
                  <View style={[styles.classicIcon, { backgroundColor: theme.backgroundSelected }]}>
                    <FontAwesome5 name={(c.icon ?? 'star') as any} size={16} color={theme.textSecondary} />
                  </View>
                  <View style={{ flex: 1, gap: 3 }}>
                    <ThemedText type="default">{c.name}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">Fixed rules</ThemedText>
                  </View>
                  <ThemedText type="small" style={{ color: theme.accent }}>→</ThemedText>
                </HapticButton>
              ))}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: Spacing.three,
    gap: Spacing.four,
    paddingBottom: Spacing.six },
  freshBtn: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
    gap: Spacing.one },
  list: {
    gap: Spacing.two },
  templateCard: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two },
  meta: {
    flexDirection: 'row',
    alignItems: 'center' },
  classicIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center' } });
