import { useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TextInputView,
	View,
	TextInput
} from 'react-native';

import { CellEditModal } from './cell-edit-modal';
import { ThemedText } from './themed-text';
import { Player } from '@/context/games-context';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { shared } from '@/styles/shared';
import { HapticButton } from "@/components/haptic-button";

type Props = {
  visible: boolean;
  players: Player[];
  totalRounds: number | undefined;
  rankByLowest: boolean;
  onAdd: (name: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, newName: string) => void;
  onSaveSettings: (totalRounds: number | undefined, rankByLowest: boolean) => void;
  onClose: () => void;
};

export function EditGameModal({
  visible,
  players,
  totalRounds,
  rankByLowest: initialRankByLowest,
  onAdd,
  onDelete,
  onRename,
  onSaveSettings,
  onClose }: Props) {
  const theme = useTheme();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [renameError, setRenameError] = useState('');
  const [addName, setAddName] = useState('');
  const [addError, setAddError] = useState('');
  const [isIndefinite, setIsIndefinite] = useState(totalRounds === undefined);
  const [roundCount, setRoundCount] = useState<number | null>(totalRounds ?? null);
  const [rankByLowest, setRankByLowest] = useState(initialRankByLowest);
  const [showRoundNumpad, setShowRoundNumpad] = useState(false);
  const addInputRef = useRef<TextInput>(null);

  // Re-sync settings when modal opens with fresh props
  const onShow = () => {
    setIsIndefinite(totalRounds === undefined);
    setRoundCount(totalRounds ?? null);
    setRankByLowest(initialRankByLowest);
    setEditingId(null);
    setEditingName('');
    setRenameError('');
    setAddName('');
    setAddError('');
  };

  const startRename = (p: Player) => {
    setEditingId(p.id);
    setEditingName(p.name);
    setRenameError('');
  };

  const commitRename = () => {
    if (!editingId) return;
    const trimmed = editingName.trim();
    if (!trimmed) { cancelRename(); return; }
    const conflict = players.find(
      p => p.id !== editingId && p.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (conflict) {
      setRenameError(`"${trimmed}" is already in this game`);
      return;
    }
    onRename(editingId, trimmed);
    setEditingId(null);
    setEditingName('');
    setRenameError('');
  };

  const cancelRename = () => { setEditingId(null); setEditingName(''); setRenameError(''); };

  const handleAdd = () => {
    const trimmed = addName.trim();
    if (!trimmed) return;
    const isDuplicate = players.some(p => p.name.toLowerCase() === trimmed.toLowerCase());
    if (isDuplicate) {
      setAddError(`"${trimmed}" is already in this game`);
      return;
    }
    onAdd(trimmed);
    setAddName('');
    setAddError('');
    addInputRef.current?.focus();
  };

  const confirmDelete = (p: Player) => {
    Alert.alert('Remove Player', `Remove "${p.name}" from this game?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => {
        if (editingId === p.id) cancelRename();
        onDelete(p.id);
      }},
    ]);
  };

  const handleDone = () => {
    onSaveSettings(isIndefinite ? undefined : (roundCount ?? 10), rankByLowest);
    onClose();
  };

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={handleDone} onShow={onShow}>
        <KeyboardAvoidingView
          style={styles.overlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <HapticButton style={styles.dismissArea} activeOpacity={1} onPress={handleDone} />
          <View style={[styles.sheet, { backgroundColor: theme.backgroundElement }]}>

            {/* Header */}
            <View style={styles.header}>
              <ThemedText type="subtitle">Edit Game</ThemedText>
              <HapticButton style={[shared.button, { backgroundColor: '#0077B6' }]} onPress={handleDone}>
                <ThemedText type="smallBold" style={{ color: '#fff' }}>Done</ThemedText>
              </HapticButton>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

              {/* ── Players ── */}
              <ThemedText style={styles.sectionLabel} themeColor="textSecondary">PLAYERS</ThemedText>
              {players.length === 0 && (
                <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>No players yet</ThemedText>
              )}
              {players.map(p => (
                <View key={p.id} style={[styles.playerRow, { borderBottomColor: theme.backgroundSelected }]}>
                  {editingId === p.id ? (
                    <>
                      <View style={{ flex: 1, gap: 4 }}>
                        <TextInput
                          style={[styles.renameInput, { backgroundColor: theme.background, color: theme.text }]}
                          value={editingName}
                          onChangeText={v => { setEditingName(v); setRenameError(''); }}
                          onSubmitEditing={commitRename}
                          maxLength={15}
                          autoFocus
                          returnKeyType="done"
                          selectTextOnFocus
                        />
                        {renameError ? <ThemedText style={styles.errorText}>{renameError}</ThemedText> : null}
                      </View>
                      <HapticButton style={styles.iconBtn} onPress={commitRename}>
                        <ThemedText style={[styles.iconText, { color: '#0077B6' }]}>✓</ThemedText>
                      </HapticButton>
                      <HapticButton style={styles.iconBtn} onPress={cancelRename}>
                        <ThemedText style={styles.iconText} themeColor="textSecondary">✕</ThemedText>
                      </HapticButton>
                    </>
                  ) : (
                    <>
                      <HapticButton style={styles.nameBtn} onPress={() => startRename(p)}>
                        <ThemedText type="default" numberOfLines={1}>{p.name}</ThemedText>
                        <ThemedText style={styles.editHint} themeColor="textSecondary">  rename</ThemedText>
                      </HapticButton>
                      <HapticButton style={styles.iconBtn} onPress={() => confirmDelete(p)}>
                        <ThemedText style={styles.iconText} themeColor="textSecondary">✕</ThemedText>
                      </HapticButton>
                    </>
                  )}
                </View>
              ))}

              {/* Add player */}
              <View style={styles.addRow}>
                <View style={{ flex: 1, gap: 4 }}>
                  <TextInput
                    ref={addInputRef}
                    style={[styles.addInput, { backgroundColor: theme.background, color: theme.text }]}
                    placeholder="New player name"
                    placeholderTextColor={theme.textSecondary}
                    value={addName}
                    onChangeText={v => { setAddName(v); setAddError(''); }}
                    onSubmitEditing={handleAdd}
                    maxLength={15}
                    returnKeyType="done"
                    submitBehavior="submit"
                  />
                  {addError ? <ThemedText style={styles.errorText}>{addError}</ThemedText> : null}
                </View>
                <HapticButton
                  style={[shared.button, { backgroundColor: addName.trim() ? '#0077B6' : theme.backgroundSelected }]}
                  onPress={handleAdd}
                  disabled={!addName.trim()}>
                  <ThemedText type="smallBold" style={{ color: addName.trim() ? '#fff' : theme.textSecondary }}>Add</ThemedText>
                </HapticButton>
              </View>

              {/* ── Rounds ── */}
              <View style={[styles.divider, { backgroundColor: theme.backgroundSelected }]} />
              <ThemedText style={styles.sectionLabel} themeColor="textSecondary">ROUNDS</ThemedText>
              <View style={styles.segmentRow}>
                <HapticButton
                  style={[styles.segLeft, { backgroundColor: isIndefinite ? '#0077B6' : theme.backgroundSelected }]}
                  onPress={() => setIsIndefinite(true)}>
                  <ThemedText type="small" style={{ color: isIndefinite ? '#fff' : theme.text }}>Indefinite</ThemedText>
                </HapticButton>
                <HapticButton
                  style={[styles.segRight, { backgroundColor: !isIndefinite ? '#0077B6' : theme.backgroundSelected }]}
                  onPress={() => setIsIndefinite(false)}>
                  <ThemedText type="small" style={{ color: !isIndefinite ? '#fff' : theme.text }}>Set number</ThemedText>
                </HapticButton>
              </View>
              {!isIndefinite && (
                <HapticButton
                  style={[shared.input, styles.roundDisplay, { backgroundColor: theme.background }]}
                  onPress={() => setShowRoundNumpad(true)}>
                  <ThemedText style={{ color: roundCount ? theme.text : theme.textSecondary, fontSize: 16 }}>
                    {roundCount ?? 'Tap to set'}
                  </ThemedText>
                </HapticButton>
              )}

              {/* ── Winner ── */}
              <View style={[styles.divider, { backgroundColor: theme.backgroundSelected }]} />
              <ThemedText style={styles.sectionLabel} themeColor="textSecondary">WINNER</ThemedText>
              <View style={[styles.segmentRow, { marginBottom: Spacing.four }]}>
                <HapticButton
                  style={[styles.segLeft, { backgroundColor: !rankByLowest ? '#0077B6' : theme.backgroundSelected }]}
                  onPress={() => setRankByLowest(false)}>
                  <ThemedText type="small" style={{ color: !rankByLowest ? '#fff' : theme.text }}>Highest score</ThemedText>
                </HapticButton>
                <HapticButton
                  style={[styles.segRight, { backgroundColor: rankByLowest ? '#0077B6' : theme.backgroundSelected }]}
                  onPress={() => setRankByLowest(true)}>
                  <ThemedText type="small" style={{ color: rankByLowest ? '#fff' : theme.text }}>Lowest score</ThemedText>
                </HapticButton>
              </View>

            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <CellEditModal
        visible={showRoundNumpad}
        title="Number of Rounds"
        initialValue={roundCount}
        allowNegative={false}
        onSave={v => { setRoundCount(v && v > 0 ? v : 1); setShowRoundNumpad(false); }}
        onCancel={() => setShowRoundNumpad(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end' },
  dismissArea: {
    flex: 1 },
  sheet: {
    borderTopLeftRadius: Spacing.three,
    borderTopRightRadius: Spacing.three,
    paddingTop: Spacing.three,
    maxHeight: '85%' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.one },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.two },
  nameBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center' },
  editHint: {
    fontSize: 11,
    opacity: 0.6 },
  renameInput: {
    flex: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: 6,
    fontSize: 16 },
  iconBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center' },
  iconText: {
    fontSize: 16 },
  addRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three },
  errorText: {
    fontSize: 12,
    color: '#C05050' },
  addInput: {
    flex: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: 8,
    fontSize: 16 },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: Spacing.three,
    marginTop: Spacing.one },
  segmentRow: {
    flexDirection: 'row',
    marginHorizontal: Spacing.three,
    marginTop: Spacing.one },
  segLeft: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderTopLeftRadius: Spacing.two,
    borderBottomLeftRadius: Spacing.two },
  segRight: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderTopRightRadius: Spacing.two,
    borderBottomRightRadius: Spacing.two },
  roundDisplay: {
    marginHorizontal: Spacing.three,
    marginTop: Spacing.two,
    justifyContent: 'center' } });
