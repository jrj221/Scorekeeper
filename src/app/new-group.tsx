import { Stack, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useGamesContext } from '@/context/games-context';
import { useTheme } from '@/hooks/use-theme';
import { shared } from '@/styles/shared';

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
            <View style={styles.section}>
              <ThemedText style={styles.label} themeColor="textSecondary">GROUP NAME</ThemedText>
              <View style={{ gap: 4 }}>
                <TextInput
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
                <ThemedText style={styles.label} themeColor="textSecondary">MEMBERS</ThemedText>
                {memberIds.length > 0 && (
                  <ThemedText style={[styles.label, { opacity: 0.5 }]} themeColor="textSecondary">
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
              <TouchableOpacity
                style={[styles.memberRow, { borderBottomColor: theme.backgroundSelected }]}
                onPress={() => toggleMember(item.id)}
              >
                <ThemedText type="default">{item.name}</ThemedText>
                <View style={[
                  styles.checkbox,
                  { borderColor: selected ? '#0077B6' : theme.backgroundSelected },
                  selected && { backgroundColor: '#0077B6' },
                ]}>
                  {selected && <ThemedText style={styles.checkmark}>✓</ThemedText>}
                </View>
              </TouchableOpacity>
            );
          }}
          ListFooterComponent={
            <TouchableOpacity
              style={[shared.button, styles.createBtn, { backgroundColor: canCreate ? '#0077B6' : theme.backgroundElement }]}
              onPress={handleCreate}
              disabled={!canCreate}
            >
              <ThemedText type="smallBold" style={{ color: canCreate ? '#fff' : theme.textSecondary }}>
                Create Group
              </ThemedText>
            </TouchableOpacity>
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
    paddingBottom: Spacing.six,
  },
  section: {
    gap: Spacing.two,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  membersHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.one,
    marginTop: Spacing.two,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '700',
    lineHeight: 22,
    includeFontPadding: false,
  },
  createBtn: {
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingVertical: Spacing.three,
    marginTop: Spacing.two,
  },
  error: {
    fontSize: 12,
    color: '#C05050',
  },
});
