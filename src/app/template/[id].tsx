import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useGamesContext } from '@/context/games-context';
import { useTheme } from '@/hooks/use-theme';
import { shared } from '@/styles/shared';
import { HapticButton } from "@/components/haptic-button";

export default function TemplateScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getTemplate } = useGamesContext();

  const template = getTemplate(id);

  useEffect(() => {
    if (!template) {
      Alert.alert('Not found', 'This template no longer exists.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    }
  }, []);

  if (!template) return null;

  return (
    <ThemedView style={shared.screen}>
      <Stack.Screen options={{ title: template.name }} />
      <SafeAreaView style={[shared.safeArea, { paddingTop: Spacing.three }]} edges={['bottom']}>
        <View style={styles.sections}>
          {template.description ? (
            <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText style={styles.label} themeColor="textSecondary">DESCRIPTION</ThemedText>
              <ThemedText type="default">{template.description}</ThemedText>
            </View>
          ) : null}

          <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText style={styles.label} themeColor="textSecondary">WIN CONDITION</ThemedText>
            <ThemedText type="default">
              {template.rankByLowest ? 'Lowest score wins' : 'Highest score wins'}
            </ThemedText>
          </View>

          <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText style={styles.label} themeColor="textSecondary">GAME LENGTH</ThemedText>
            <ThemedText type="default">
              {template.totalRounds !== undefined ? `${template.totalRounds} rounds` : 'Indefinite'}
            </ThemedText>
          </View>
        </View>

        <HapticButton
          style={[styles.editBtn, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}
          onPress={() => router.push(`/edit-template/${id}`)}
        >
          <ThemedText type="small" style={{ color: '#0077B6' }}>Edit Template</ThemedText>
        </HapticButton>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  sections: {
    gap: Spacing.two,
    flex: 1 },
  card: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
    gap: Spacing.one },
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8 },
  editBtn: {
    borderRadius: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: Spacing.three,
    alignItems: 'center' } });
