import { Stack, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useGamesContext } from '@/context/games-context';
import { useTheme } from '@/hooks/use-theme';
import { shared } from '@/styles/shared';
import { HapticButton } from "@/components/haptic-button";
import { forms } from '@/styles/forms';

export default function NewGroupScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { globalPlayers, createGroup } = useGamesContext();

  const [name, setName] = useState('');
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [nameError, setNameError] = useState('');

  const toggleMember = useCallback((id: string) => {
    setMemberIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }, []);

  const handleCreate = useCallback(() => {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError('Group name is required');
      return;
    }
    createGroup(trimmed, memberIds);
    router.back();
  }, [name, memberIds, createGroup, router]);

  const canCreate = name.trim().length > 0;

  return (
    <ThemedView style={shared.screen}>
      <Stack.Screen options={{ title: 'New Group' }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <FlatList
          data={globalPlayers}
          keyExtractor={p => p.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scroll}
          ListHeaderComponent={
            <View style={forms.section}>
              <ThemedText style={forms.label} themeColor="textSecondary">GROUP NAME</ThemedText>
              <View style={{ gap: 4 }}>
                <TextInput allowFontScaling={false}
                  style={[shared.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
                  placeholder="Enter group name"
                  placeholderTextColor={theme.textSecondary}
                  value={name}
                  onChangeText={v => { setName(v); setNameError(''); }}
                  maxLength={20}
                  returnKeyType="done"
                />
                {nameError ? <ThemedText style={styles.error}>{nameError}</ThemedText> : null}
              </View>
              <View style={styles.membersHeader}>
                <ThemedText style={forms.label} themeColor="textSecondary">MEMBERS</ThemedText>
                {memberIds.length > 0 && (
                  <ThemedText style={[forms.label, { opacity: 0.5 }]} themeColor="textSecondary">
                    {memberIds.length}
                  </ThemedText>
                )}
              </View>
              {globalPlayers.length === 0 && (
                <ThemedText type="small" themeColor="textSecondary" style={{ opacity: 0.6 }}>
                  No saved players yet — add players in the Players tab
                </ThemedText>
              )}
            </View>
          }
          renderItem={({ item }) => {
            const selected = memberIds.includes(item.id);
            return (
              <HapticButton
                style={[styles.memberRow, { borderBottomColor: theme.backgroundSelected }]}
                onPress={() => toggleMember(item.id)}
              >
                <ThemedText type="default">{item.name}</ThemedText>
                <View style={[
                  styles.checkbox,
                  { borderColor: selected ? theme.accent : theme.backgroundSelected },
                  selected && { backgroundColor: theme.accent },
                ]}>
                  {selected && <ThemedText style={styles.checkmark}>✓</ThemedText>}
                </View>
              </HapticButton>
            );
          }}
          ListFooterComponent={
            <HapticButton
              style={[shared.button, forms.createBtn, { backgroundColor: canCreate ? theme.accent : theme.backgroundElement }]}
              onPress={handleCreate}
              disabled={!canCreate}
            >
              <ThemedText type="smallBold" style={{ color: canCreate ? '#fff' : theme.textSecondary }}>
                Create Group
              </ThemedText>
            </HapticButton>
          }
        />
        <SafeAreaView edges={['bottom']} />
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: Spacing.three,
    gap: Spacing.four,
    paddingBottom: Spacing.six },
  membersHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.one,
    marginTop: Spacing.two },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center' },
  checkmark: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '700',
    lineHeight: 22,
    includeFontPadding: false },
  error: {
    fontSize: 12,
    color: '#C05050' } });
