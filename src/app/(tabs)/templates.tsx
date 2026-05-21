import { useRouter } from 'expo-router';
import { Alert, FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useGamesContext } from '@/context/games-context';
import { useTheme } from '@/hooks/use-theme';
import { homeStyles } from '@/styles/home';
import { shared } from '@/styles/shared';
import { HapticButton } from "@/components/haptic-button";

export default function TemplatesScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { templates, deleteTemplate } = useGamesContext();

  const confirmDelete = (id: string, name: string) => {
    Alert.alert('Delete Template', `Delete "${name}"? This can't be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteTemplate(id) },
    ]);
  };

  return (
    <ThemedView style={shared.screen}>
      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
        <FlatList
          data={templates}
          keyExtractor={t => t.id}
          contentContainerStyle={[
            styles.listContent,
            templates.length === 0 && styles.emptyContainer,
          ]}
          ListEmptyComponent={
            <View style={styles.empty}>
              <ThemedText type="small" themeColor="textSecondary">
                No templates yet
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Tap + to create one, or save a game from its info page
              </ThemedText>
            </View>
          }
          renderItem={({ item }) => (
            <HapticButton
              style={[styles.card, { backgroundColor: theme.backgroundElement }]}
              onPress={() => router.push(`/template/${item.id}`)}
            >
              <View style={{ flex: 1, gap: 3 }}>
                <ThemedText type="default">{item.name}</ThemedText>
                <View style={styles.meta}>
                  <ThemedText type="small" themeColor="textSecondary">
                    {item.totalRounds !== undefined ? `${item.totalRounds} rounds` : 'Indefinite'}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary"> · </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {item.rankByLowest ? 'Lowest wins' : 'Highest wins'}
                  </ThemedText>
                </View>
              </View>
              <HapticButton
                hitSlop={8}
                onPress={() => confirmDelete(item.id, item.name)}
              >
                <ThemedText type="small" themeColor="textSecondary">✕</ThemedText>
              </HapticButton>
            </HapticButton>
          )}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.two }} />}
        />

        <HapticButton
          style={[homeStyles.fab, { backgroundColor: '#0077B6' }]}
          onPress={() => router.push('/new-template')}
        >
          <ThemedText type="subtitle" style={{ color: '#fff', lineHeight: 32 }}>+</ThemedText>
        </HapticButton>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  listContent: {
    padding: Spacing.three,
    gap: Spacing.two },
  emptyContainer: {
    flex: 1 },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    paddingTop: Spacing.six },
  card: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two },
  meta: {
    flexDirection: 'row',
    alignItems: 'center' } });
