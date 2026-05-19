import { Stack, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
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

export default function NewTemplateScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { createTemplate } = useGamesContext();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isIndefinite, setIsIndefinite] = useState(false);
  const [roundCountStr, setRoundCountStr] = useState('10');
  const [showRoundNumpad, setShowRoundNumpad] = useState(false);
  const [rankByLowest, setRankByLowest] = useState(false);

  const handleCreate = useCallback(() => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    const totalRounds = !isIndefinite ? Math.max(1, parseInt(roundCountStr, 10) || 1) : undefined;
    const id = createTemplate({
      name: trimmedName,
      description: description.trim() || undefined,
      totalRounds,
      rankByLowest,
    });
    router.replace(`/template/${id}`);
  }, [name, description, isIndefinite, roundCountStr, rankByLowest, createTemplate, router]);

  const canCreate = name.trim().length > 0;

  return (
    <ThemedView style={shared.screen}>
      <Stack.Screen options={{ title: 'New Template' }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Name */}
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

          {/* Description */}
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

          {/* Rounds */}
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

          {/* Winner */}
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

          {/* Create */}
          <TouchableOpacity
            style={[shared.button, styles.createBtn, { backgroundColor: canCreate ? '#0077B6' : theme.backgroundElement }]}
            onPress={handleCreate}
            disabled={!canCreate}
          >
            <ThemedText type="smallBold" style={{ color: canCreate ? '#fff' : theme.textSecondary }}>
              Create Template
            </ThemedText>
          </TouchableOpacity>
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
  section: {
    gap: Spacing.two,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  segmentRow: {
    flexDirection: 'row',
  },
  segLeft: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderTopLeftRadius: Spacing.two,
    borderBottomLeftRadius: Spacing.two,
  },
  segRight: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderTopRightRadius: Spacing.two,
    borderBottomRightRadius: Spacing.two,
  },
  createBtn: {
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingVertical: Spacing.three,
    marginTop: Spacing.one,
  },
});
