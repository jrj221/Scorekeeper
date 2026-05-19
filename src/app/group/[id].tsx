import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
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

export default function EditGroupScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { globalPlayers, groups, updateGroup } = useGamesContext();

  const group = groups.find(g => g.id === id);

  const [name, setName] = useState(group?.name ?? '');
  const [memberIds, setMemberIds] = useState<string[]>(group?.playerIds ?? []);
  const [nameError, setNameError] = useState('');

  useEffect(() => {
    if (!group) {
      Alert.alert('Not found', 'This group no longer exists.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    }
  }, []);

  const toggleMember = useCallback((playerId: string) => {
    setMemberIds(prev => prev.includes(playerId) ? prev.filter(x => x !== playerId) : [...prev, playerId]);
  }, []);

  const handleSave = useCallback(() => {
    if (!group) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError('Group name is required');
      return;
    }
    updateGroup({ ...group, name: trimmed, playerIds: memberIds });
    router.back();
  }, [group, name, memberIds, updateGroup, router]);

  if (!group) return null;

  const canSave = name.trim().length > 0;

  return (
    <ThemedView style={shared.screen}>
      <Stack.Screen options={{ title: 'Edit Group' }} />
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
                  No saved players yet
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
            <View style={styles.footerBtns}>
              <TouchableOpacity
                style={[shared.button, styles.cancelBtn, { backgroundColor: theme.backgroundElement }]}
                onPress={() => router.back()}
              >
                <ThemedText type="smallBold" themeColor="textSecondary">Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[shared.button, styles.saveBtn, { backgroundColor: canSave ? '#0077B6' : theme.backgroundSelected }]}
                onPress={handleSave}
                disabled={!canSave}
              >
                <ThemedText type="smallBold" style={{ color: canSave ? '#fff' : theme.textSecondary }}>
                  Save
                </ThemedText>
              </TouchableOpacity>
            </View>
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
  footerBtns: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.three,
  },
  saveBtn: {
    flex: 2,
    alignItems: 'center',
    paddingVertical: Spacing.three,
  },
  error: {
    fontSize: 12,
    color: '#C05050',
  },
});
