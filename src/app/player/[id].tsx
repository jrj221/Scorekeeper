import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GameCard } from '@/components/game-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useGamesContext } from '@/context/games-context';
import { useTheme } from '@/hooks/use-theme';
import { shared } from '@/styles/shared';
import { getPlayerWinRate } from '@/utils/game';

export default function PlayerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { globalPlayers, games, deleteGame, removeGlobalPlayer, renameGlobalPlayer, resetGlobalPlayer } = useGamesContext();
  const theme = useTheme();
  const router = useRouter();

  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [renameInput, setRenameInput] = useState('');
  const [renameError, setRenameError] = useState('');
  const renameInputRef = useRef<TextInput>(null);

  const player = globalPlayers.find(p => p.id === id);
  const playerGames = games
    .filter(g => g.finishedAt && g.players.some(p => p.id === id))
    .sort((a, b) => b.finishedAt! - a.finishedAt!);
  const winRate = getPlayerWinRate(id, games);

  const openRenameDialog = () => {
    setRenameInput(player?.name ?? '');
    setRenameError('');
    setShowRenameDialog(true);
  };

  const commitRename = () => {
    const trimmed = renameInput.trim();
    if (!trimmed) return;
    const conflict = globalPlayers.find(
      p => p.id !== id && p.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (conflict) {
      setRenameError(`"${trimmed}" is already a player`);
      return;
    }
    renameGlobalPlayer(id, trimmed);
    setShowRenameDialog(false);
  };

  const confirmDelete = (gameId: string, gameName: string) => {
    Alert.alert('Delete Game', `Delete "${gameName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteGame(gameId) },
    ]);
  };

  const confirmDeletePlayer = () => {
    Alert.alert(
      'Delete Player',
      `Remove "${player?.name}" from your players list? They will be removed from all game records too.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => {
          removeGlobalPlayer(id);
          router.back();
        }},
      ],
    );
  };

  const confirmResetPlayer = () => {
    Alert.alert(
      'Reset Player',
      `Clear all game history for "${player?.name}"? Their stats will reset to zero. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: () => resetGlobalPlayer(id) },
      ],
    );
  };

  if (!player) {
    return (
      <ThemedView style={shared.screen}>
        <Stack.Screen options={{ title: 'Player' }} />
        <SafeAreaView style={shared.safeArea} edges={['bottom']}>
          <ThemedText type="default">Player not found.</ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={shared.screen}>
      <Stack.Screen
        options={{
          headerBackTitle: 'Players',
          headerTitle: () => (
            <TouchableOpacity style={styles.headerTitle} onPress={openRenameDialog} hitSlop={8}>
              <ThemedText style={styles.headerName}>{player.name}</ThemedText>
              <SymbolView name="pencil" size={14} tintColor={theme.textSecondary} />
            </TouchableOpacity>
          ),
        }}
      />
      <SafeAreaView style={[shared.safeArea, { paddingTop: Spacing.two }]} edges={['bottom']}>

        {/* Stats card */}
        <View style={[styles.statsCard, { backgroundColor: theme.backgroundElement }]}>
          <View style={styles.statItem}>
            <ThemedText style={styles.statLabel} themeColor="textSecondary">WIN RATE</ThemedText>
            <ThemedText style={styles.statValue}>{winRate}</ThemedText>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.backgroundSelected }]} />
          <View style={styles.statItem}>
            <ThemedText style={styles.statLabel} themeColor="textSecondary">GAMES</ThemedText>
            <ThemedText style={styles.statValue}>{playerGames.length}</ThemedText>
          </View>
        </View>

        {/* Game history */}
        {playerGames.length > 0 && (
          <ThemedText style={styles.sectionLabel} themeColor="textSecondary">GAME HISTORY</ThemedText>
        )}
        <FlatList
          data={playerGames}
          keyExtractor={g => g.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
              No finished games yet
            </ThemedText>
          }
          renderItem={({ item }) => (
            <GameCard
              game={item}
              onPress={() => router.push(`/game/${item.id}`)}
              onDelete={() => confirmDelete(item.id, item.name)}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.two }} />}
        />

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, { borderColor: theme.backgroundSelected, backgroundColor: theme.backgroundElement }]}
            onPress={confirmResetPlayer}
          >
            <ThemedText type="small" themeColor="textSecondary">Reset Player</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { borderColor: theme.backgroundSelected, backgroundColor: theme.backgroundElement }]}
            onPress={confirmDeletePlayer}
          >
            <ThemedText type="small" style={{ color: '#C05050' }}>Delete Player</ThemedText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Rename dialog */}
      <Modal
        visible={showRenameDialog}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRenameDialog(false)}
      >
        <View style={styles.dialogOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setShowRenameDialog(false)} />
          <View style={[styles.dialogCard, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText style={styles.dialogTitle} themeColor="textSecondary">RENAME PLAYER</ThemedText>
            <View style={{ gap: 4 }}>
              <TextInput
                ref={renameInputRef}
                style={[shared.input, { backgroundColor: theme.background, color: theme.text }]}
                placeholder="Player name"
                placeholderTextColor={theme.textSecondary}
                value={renameInput}
                onChangeText={v => { setRenameInput(v); setRenameError(''); }}
                onSubmitEditing={commitRename}
                maxLength={15}
                returnKeyType="done"
                selectTextOnFocus
              />
              {renameError ? <ThemedText style={styles.renameError}>{renameError}</ThemedText> : null}
            </View>
            <View style={styles.dialogBtns}>
              <TouchableOpacity
                style={[shared.button, styles.dialogCancel, { backgroundColor: theme.backgroundSelected }]}
                onPress={() => setShowRenameDialog(false)}
              >
                <ThemedText type="smallBold" themeColor="textSecondary">Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[shared.button, styles.dialogSave, { backgroundColor: renameInput.trim() ? '#0077B6' : theme.backgroundSelected }]}
                onPress={commitRename}
                disabled={!renameInput.trim()}
              >
                <ThemedText type="smallBold" style={{ color: renameInput.trim() ? '#fff' : theme.textSecondary }}>
                  Save
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  headerName: {
    fontSize: 17,
    fontWeight: '600',
  },
  statsCard: {
    flexDirection: 'row',
    borderRadius: Spacing.two,
    marginBottom: Spacing.three,
    overflow: 'hidden',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.five,
    gap: Spacing.two,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '600',
    lineHeight: 36,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    marginBottom: Spacing.one,
  },
  list: {
    gap: Spacing.two,
  },
  empty: {
    paddingTop: Spacing.four,
    textAlign: 'center',
  },
  actions: {
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
  actionBtn: {
    borderRadius: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  dialogOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    paddingBottom: 220,
  },
  dialogCard: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  dialogTitle: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    textAlign: 'center',
  },
  dialogBtns: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  dialogCancel: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  dialogSave: {
    flex: 2,
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  renameError: {
    fontSize: 12,
    color: '#C05050',
  },
});
