import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
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
import { homeStyles } from '@/styles/home';
import { shared } from '@/styles/shared';
import { getPlayerWinRate } from '@/utils/game';

export default function PlayersScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { globalPlayers, addGlobalPlayer, games, groups, deleteGroup } = useGamesContext();

  const [nameInput, setNameInput] = useState('');
  const [addError, setAddError] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const tabBarHeight = useBottomTabBarHeight();

  useEffect(() => {
    if (showAddDialog) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [showAddDialog]);

  const handleAdd = () => {
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    if (globalPlayers.some(p => p.name.toLowerCase() === trimmed.toLowerCase())) {
      setAddError(`"${trimmed}" is already a player`);
      return;
    }
    addGlobalPlayer(trimmed);
    setAddError('');
    setNameInput('');
    inputRef.current?.focus();
  };

  const closeAddDialog = () => {
    setShowAddDialog(false);
    setNameInput('');
    setAddError('');
  };

  const confirmDeleteGroup = (id: string, name: string) => {
    Alert.alert('Delete Group', `Delete "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteGroup(id) },
    ]);
  };

  const GroupsFooter = (
    <View style={styles.groupsSection}>
      <View style={styles.groupsHeader}>
        <ThemedText style={styles.sectionLabel} themeColor="textSecondary">GROUPS</ThemedText>
        <TouchableOpacity onPress={() => router.push('/new-group')}>
          <ThemedText type="small" style={{ color: '#0077B6' }}>+ New Group</ThemedText>
        </TouchableOpacity>
      </View>

      {groups.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.emptyGroups}>
          No groups yet
        </ThemedText>
      ) : (
        groups.map(g => {
          const memberNames = g.playerIds
            .map(id => globalPlayers.find(p => p.id === id)?.name)
            .filter(Boolean)
            .join(', ');
          return (
            <TouchableOpacity
              key={g.id}
              style={[styles.groupCard, { backgroundColor: theme.backgroundElement }]}
              onPress={() => router.push(`/group/${g.id}`)}
            >
              <View style={{ flex: 1, gap: 2 }}>
                <ThemedText type="default">{g.name}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                  {memberNames || 'No members'}
                </ThemedText>
              </View>
              <TouchableOpacity hitSlop={8} onPress={() => confirmDeleteGroup(g.id, g.name)}>
                <SymbolView name="trash" size={16} tintColor={theme.textSecondary} />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        })
      )}
    </View>
  );

  return (
    <ThemedView style={shared.screen}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={tabBarHeight}
      >
        <FlatList
          style={{ flex: 1 }}
          data={globalPlayers}
          keyExtractor={p => p.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.listContent,
            globalPlayers.length === 0 && styles.emptyContainer,
          ]}
          ListEmptyComponent={
            <View style={styles.empty}>
              <ThemedText type="small" themeColor="textSecondary">
                No players yet — tap + to add one
              </ThemedText>
            </View>
          }
          ListFooterComponent={GroupsFooter}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.card, { backgroundColor: theme.backgroundElement }]}
              onPress={() => router.push(`/player/${item.id}`)}
            >
              <View style={{ flex: 1, gap: 2 }}>
                <ThemedText type="default">{item.name}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {getPlayerWinRate(item.id, games)}
                </ThemedText>
              </View>
            </TouchableOpacity>
          )}
        />

        <TouchableOpacity
          style={[homeStyles.fab, { backgroundColor: '#0077B6' }]}
          onPress={() => setShowAddDialog(true)}
        >
          <ThemedText type="subtitle" style={{ color: '#fff', lineHeight: 32 }}>+</ThemedText>
        </TouchableOpacity>
      </KeyboardAvoidingView>

      <SafeAreaView edges={['bottom']} />

      {/* Centered add player dialog */}
      <Modal
        visible={showAddDialog}
        transparent
        animationType="fade"
        onRequestClose={closeAddDialog}
      >
        <KeyboardAvoidingView style={styles.dialogOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeAddDialog} />
          <View style={[styles.dialogCard, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText style={styles.dialogTitle} themeColor="textSecondary">ADD PLAYER</ThemedText>
            <View style={{ gap: 4 }}>
              <TextInput
                ref={inputRef}
                style={[shared.input, { backgroundColor: theme.background, color: theme.text }]}
                placeholder="Player name"
                placeholderTextColor={theme.textSecondary}
                value={nameInput}
                onChangeText={v => { setNameInput(v); setAddError(''); }}
                onSubmitEditing={handleAdd}
                maxLength={15}
                returnKeyType="done"
                submitBehavior="submit"
              />
              {addError ? <ThemedText style={styles.error}>{addError}</ThemedText> : null}
            </View>
            <View style={styles.dialogBtns}>
              <TouchableOpacity
                style={[shared.button, styles.dialogCancel, { backgroundColor: theme.backgroundSelected }]}
                onPress={closeAddDialog}
              >
                <ThemedText type="smallBold" themeColor="textSecondary">Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[shared.button, styles.dialogAdd, { backgroundColor: nameInput.trim() ? '#0077B6' : theme.backgroundSelected }]}
                onPress={handleAdd}
                disabled={!nameInput.trim()}
              >
                <ThemedText type="smallBold" style={{ color: nameInput.trim() ? '#fff' : theme.textSecondary }}>
                  Add
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  listContent: {
    padding: Spacing.three,
    gap: Spacing.two,
    paddingBottom: Spacing.six + Spacing.four,
  },
  emptyContainer: { flex: 1 },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing.six,
  },
  card: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  groupCard: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  error: { fontSize: 12, color: '#C05050' },
  sectionLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.8 },
  groupsSection: { marginTop: Spacing.four, gap: Spacing.two },
  groupsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  emptyGroups: { opacity: 0.6, paddingTop: Spacing.one },
  dialogOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  dialogCard: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  dialogTitle: { fontSize: 11, fontWeight: '600', letterSpacing: 0.8, textAlign: 'center' },
  dialogBtns: { flexDirection: 'row', gap: Spacing.two },
  dialogCancel: { flex: 1, alignItems: 'center', paddingVertical: Spacing.two },
  dialogAdd: { flex: 2, alignItems: 'center', paddingVertical: Spacing.two },
});
