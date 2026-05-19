import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CellEditModal } from '@/components/cell-edit-modal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useGamesContext } from '@/context/games-context';
import { useTheme } from '@/hooks/use-theme';
import { shared } from '@/styles/shared';

export default function EditTemplateScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getTemplate, updateTemplate } = useGamesContext();

  const template = getTemplate(id);

  const [name, setName] = useState(template?.name ?? '');
  const [description, setDescription] = useState(template?.description ?? '');
  const [isIndefinite, setIsIndefinite] = useState(template?.totalRounds === undefined);
  const [roundCountStr, setRoundCountStr] = useState(
    template?.totalRounds !== undefined ? template.totalRounds.toString() : '10',
  );
  const [showRoundNumpad, setShowRoundNumpad] = useState(false);
  const [rankByLowest, setRankByLowest] = useState(template?.rankByLowest ?? false);

  useEffect(() => {
    if (!template) {
      Alert.alert('Not found', 'This template no longer exists.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    }
  }, []);

  const handleSave = useCallback(() => {
    if (!template) return;
    const trimmedName = name.trim();
    if (!trimmedName) return;
    const totalRounds = !isIndefinite ? Math.max(1, parseInt(roundCountStr, 10) || 1) : undefined;
    updateTemplate({
      ...template,
      name: trimmedName,
      description: description.trim() || undefined,
      totalRounds,
      rankByLowest,
    });
    router.back();
  }, [template, name, description, isIndefinite, roundCountStr, rankByLowest, updateTemplate, router]);

  if (!template) return null;

  const canSave = name.trim().length > 0;

  return (
    <ThemedView style={shared.screen}>
      <Stack.Screen options={{ title: 'Edit Template' }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.section}>
            <ThemedText style={styles.label} themeColor="textSecondary">TEMPLATE NAME</ThemedText>
            <TextInput
              style={[shared.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
              placeholder="Enter template name"
              placeholderTextColor={theme.textSecondary}
              value={name}
              onChangeText={setName}
              maxLength={30}
              returnKeyType="next"
            />
          </View>

          <View style={styles.section}>
            <View style={styles.labelRow}>
              <ThemedText style={styles.label} themeColor="textSecondary">DESCRIPTION</ThemedText>
              <ThemedText style={[styles.label, { opacity: 0.5 }]} themeColor="textSecondary"> (OPTIONAL)</ThemedText>
            </View>
            <TextInput
              style={[shared.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
              placeholder="Add a description"
              placeholderTextColor={theme.textSecondary}
              value={description}
              onChangeText={setDescription}
              maxLength={80}
              returnKeyType="next"
            />
          </View>

          <View style={styles.section}>
            <ThemedText style={styles.label} themeColor="textSecondary">ROUNDS</ThemedText>
            <View style={styles.segmentRow}>
              <TouchableOpacity
                style={[styles.segLeft, { backgroundColor: isIndefinite ? '#0077B6' : theme.backgroundElement }]}
                onPress={() => setIsIndefinite(true)}
              >
                <ThemedText type="small" style={{ color: isIndefinite ? '#fff' : theme.text }}>Indefinite</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.segRight, { backgroundColor: !isIndefinite ? '#0077B6' : theme.backgroundElement }]}
                onPress={() => setIsIndefinite(false)}
              >
                <ThemedText type="small" style={{ color: !isIndefinite ? '#fff' : theme.text }}>Set number</ThemedText>
              </TouchableOpacity>
            </View>
            {!isIndefinite && (
              <TouchableOpacity
                style={[shared.input, { backgroundColor: theme.backgroundElement, justifyContent: 'center' }]}
                onPress={() => setShowRoundNumpad(true)}
              >
                <ThemedText style={{ color: roundCountStr ? theme.text : theme.textSecondary, fontSize: 16 }}>
                  {roundCountStr || 'Tap to set'}
                </ThemedText>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.section}>
            <ThemedText style={styles.label} themeColor="textSecondary">WINNER</ThemedText>
            <View style={styles.segmentRow}>
              <TouchableOpacity
                style={[styles.segLeft, { backgroundColor: !rankByLowest ? '#0077B6' : theme.backgroundElement }]}
                onPress={() => setRankByLowest(false)}
              >
                <ThemedText type="small" style={{ color: !rankByLowest ? '#fff' : theme.text }}>Highest score</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.segRight, { backgroundColor: rankByLowest ? '#0077B6' : theme.backgroundElement }]}
                onPress={() => setRankByLowest(true)}
              >
                <ThemedText type="small" style={{ color: rankByLowest ? '#fff' : theme.text }}>Lowest score</ThemedText>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.btns}>
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
              <ThemedText type="smallBold" style={{ color: canSave ? '#fff' : theme.textSecondary }}>Save</ThemedText>
            </TouchableOpacity>
          </View>
        </ScrollView>
        <SafeAreaView edges={['bottom']} />
      </KeyboardAvoidingView>

      <CellEditModal
        visible={showRoundNumpad}
        title="Number of Rounds"
        initialValue={parseInt(roundCountStr) || null}
        allowNegative={false}
        onSave={v => {
          setRoundCountStr(v && v > 0 ? v.toString() : '10');
          setShowRoundNumpad(false);
        }}
        onCancel={() => setShowRoundNumpad(false)}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: Spacing.three,
    gap: Spacing.four,
    paddingBottom: Spacing.six,
  },
  section: { gap: Spacing.two },
  labelRow: { flexDirection: 'row', alignItems: 'baseline' },
  label: { fontSize: 11, fontWeight: '600', letterSpacing: 0.8 },
  segmentRow: { flexDirection: 'row' },
  segLeft: {
    flex: 1, alignItems: 'center', paddingVertical: Spacing.two,
    borderTopLeftRadius: Spacing.two, borderBottomLeftRadius: Spacing.two,
  },
  segRight: {
    flex: 1, alignItems: 'center', paddingVertical: Spacing.two,
    borderTopRightRadius: Spacing.two, borderBottomRightRadius: Spacing.two,
  },
  btns: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.one },
  cancelBtn: { flex: 1, alignItems: 'center', paddingVertical: Spacing.three },
  saveBtn: { flex: 2, alignItems: 'center', paddingVertical: Spacing.three },
});
