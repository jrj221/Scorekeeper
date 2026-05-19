import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { useAnimatedKeyboard, useAnimatedStyle } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useGamesContext } from '@/context/games-context';
import { useTheme } from '@/hooks/use-theme';
import { shared } from '@/styles/shared';
import { getPlayerWinRate } from '@/utils/game';

export default function PlayersScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { globalPlayers, addGlobalPlayer, removeGlobalPlayer, renameGlobalPlayer, games } = useGamesContext();
  const [nameInput, setNameInput] = useState('');
  const [addError, setAddError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [renameError, setRenameError] = useState('');
  const inputRef = useRef<TextInput>(null);

  const keyboard = useAnimatedKeyboard();
  const tabBarHeight = useBottomTabBarHeight();

  const bottomStyle = useAnimatedStyle(() => ({
    paddingBottom: Math.max(0, keyboard.height.value - tabBarHeight),
  }));

  const handleAdd = () => {
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    const isDuplicate = globalPlayers.some(p => p.name.toLowerCase() === trimmed.toLowerCase());
    if (isDuplicate) {
      setAddError(`"${trimmed}" is already a player`);
      return;
    }
    addGlobalPlayer(trimmed);
    setAddError('');
    setNameInput('');
    inputRef.current?.focus();
  };

  const startRename = (id: string, name: string) => {
    setEditingId(id);
    setEditingName(name);
    setRenameError('');
  };

  const commitRename = () => {
    if (!editingId) return;
    const trimmed = editingName.trim();
    if (!trimmed) { cancelRename(); return; }
    const conflict = globalPlayers.find(
      p => p.id !== editingId && p.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (conflict) {
      setRenameError(`"${trimmed}" is already a player`);
      return;
    }
    renameGlobalPlayer(editingId, trimmed);
    setEditingId(null);
    setEditingName('');
    setRenameError('');
  };

  const cancelRename = () => {
    setEditingId(null);
    setEditingName('');
    setRenameError('');
  };

  const confirmRemove = (id: string, name: string) => {
    Alert.alert('Remove Player', `Remove "${name}" from your players list?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => {
        if (editingId === id) cancelRename();
        removeGlobalPlayer(id);
      }},
    ]);
  };

  return (
    <ThemedView style={shared.screen}>
      <Animated.View style={[{ flex: 1 }, bottomStyle]}>
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
                No players yet — add some below
              </ThemedText>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
              {editingId === item.id ? (
                <View style={styles.renameRow}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <TextInput
                      style={[shared.input, { backgroundColor: theme.background, color: theme.text }]}
                      value={editingName}
                      onChangeText={v => { setEditingName(v); setRenameError(''); }}
                      onSubmitEditing={commitRename}
                      maxLength={15}
                      autoFocus
                      returnKeyType="done"
                      selectTextOnFocus
                    />
                    {renameError ? <ThemedText style={styles.error}>{renameError}</ThemedText> : null}
                  </View>
                  <TouchableOpacity style={styles.iconBtn} onPress={commitRename}>
                    <ThemedText style={[styles.iconText, { color: '#0077B6' }]}>✓</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.iconBtn} onPress={cancelRename}>
                    <ThemedText style={styles.iconText} themeColor="textSecondary">✕</ThemedText>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.cardContent}
                  onPress={() => router.push(`/player/${item.id}`)}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <ThemedText type="default">{item.name}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {getPlayerWinRate(item.id, games)}
                    </ThemedText>
                  </View>
                  <TouchableOpacity hitSlop={8} onPress={() => startRename(item.id, item.name)}>
                    <ThemedText type="small" themeColor="textSecondary">rename</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity hitSlop={8} onPress={() => confirmRemove(item.id, item.name)}>
                    <ThemedText type="small" themeColor="textSecondary">✕</ThemedText>
                  </TouchableOpacity>
                </TouchableOpacity>
              )}
            </View>
          )}
        />

        <View style={[styles.addRow, { borderTopColor: theme.backgroundSelected, backgroundColor: theme.backgroundElement }]}>
          <View style={{ flex: 1, gap: 4 }}>
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
          <TouchableOpacity
            style={[shared.button, { backgroundColor: nameInput.trim() ? '#0077B6' : theme.backgroundSelected }]}
            onPress={handleAdd}
            disabled={!nameInput.trim()}>
            <ThemedText type="smallBold" style={{ color: nameInput.trim() ? '#fff' : theme.textSecondary }}>
              Add
            </ThemedText>
          </TouchableOpacity>
        </View>
      </Animated.View>

      <SafeAreaView edges={['bottom']} style={{ backgroundColor: theme.backgroundElement }} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  listContent: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  emptyContainer: {
    flex: 1,
  },
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
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  renameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  iconBtn: {
    width: 32,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 16,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    padding: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  error: {
    fontSize: 12,
    color: '#C05050',
  },
});
