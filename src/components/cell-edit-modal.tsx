import { useEffect, useMemo, useState } from 'react';
import { Dimensions, Modal, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from './themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { HapticButton } from "@/components/haptic-button";
import { forms } from '@/styles/forms';

const SCREEN_W = Dimensions.get('window').width;
const SCREEN_H = Dimensions.get('window').height;
const SHEET_PAD = Spacing.three;
const KEY_GAP = 8;

// Fixed non-key content: paddingTop + header + display + done + 3 gaps between sections + 3 inter-row gaps
const FIXED_H = SHEET_PAD + 20 + 64 + 88 + Spacing.two * 3 + KEY_GAP * 3;

// Max key width if filling the full sheet width with 3 columns
const MAX_KEY_W = Math.floor((SCREEN_W - SHEET_PAD * 2 - KEY_GAP * 2) / 3);

const ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['±', '0', '⌫'],
] as const;

type Props = {
  visible: boolean;
  title: string;
  initialValue: number | null;
  allowNegative?: boolean;
  minValue?: number;
  onSave: (value: number | null) => void;
  onCancel: () => void;
};

export function CellEditModal({
  visible,
  title,
  initialValue,
  allowNegative = true,
  minValue,
  onSave,
  onCancel }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  // Keys fill full width; height sized so sheet takes ~50% of screen
  const keySize = useMemo(() => {
    const bottomPad = insets.bottom + Spacing.two;
    const availableForKeys = SCREEN_H * 0.5 - FIXED_H - bottomPad;
    return Math.max(36, Math.floor(availableForKeys / 4));
  }, [insets.bottom]);

  const [numStr, setNumStr] = useState('');
  const [negative, setNegative] = useState(false);
  const [overwriteNext, setOverwriteNext] = useState(false);
  const [hint, setHint] = useState('');

  useEffect(() => {
    if (visible) {
      setHint('');
      if (initialValue !== null) {
        setNumStr(Math.abs(initialValue).toString());
        setNegative(allowNegative && initialValue < 0);
        setOverwriteNext(true);
      } else {
        setNumStr('');
        setNegative(false);
        setOverwriteNext(false);
      }
    }
  }, [visible, initialValue, allowNegative]);

  const pressKey = (key: string) => {
    if (key === '±') {
      if (allowNegative) {
        setNegative(v => !v);
        setOverwriteNext(false);
      }
    } else if (key === '⌫') {
      setOverwriteNext(false);
      setNumStr(prev => prev.slice(0, -1));
    } else {
      if (overwriteNext) {
        setNumStr(key);
        setOverwriteNext(false);
      } else {
        setNumStr(prev => (prev.length >= 6 ? prev : prev + key));
      }
    }
  };

  const handleDone = () => {
    const rawN = numStr ? parseInt(numStr, 10) : null;
    const value = rawN === null ? null : allowNegative && negative ? -rawN : rawN;

    if (minValue !== undefined) {
      const effective = value ?? (overwriteNext && initialValue !== null ? initialValue : null);
      if (effective === null || effective < minValue) {
        setHint(`Must be at least ${minValue}`);
        return;
      }
    }

    setHint('');
    if (!numStr) {
      if (overwriteNext && initialValue !== null) {
        onSave(initialValue);
      } else {
        onSave(null);
      }
    } else {
      onSave(value);
    }
  };

  const hasValue = numStr.length > 0;
  const displayColor = hasValue && negative ? '#4CABD4' : theme.text;
  const displayText = hasValue ? `${negative ? '−' : ''}${numStr}` : '–';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <HapticButton style={styles.dismissArea} activeOpacity={1} onPress={onCancel} />
        <View style={[styles.sheet, { backgroundColor: theme.backgroundElement, paddingBottom: insets.bottom + Spacing.two }]}>

          <ThemedText style={styles.header} themeColor="textSecondary">{title}</ThemedText>

          <View style={styles.displayArea}>
            <ThemedText style={[styles.display, { color: displayColor }]}>{displayText}</ThemedText>
          </View>

          {hint ? (
            <ThemedText style={forms.hint}>{hint}</ThemedText>
          ) : null}

          <View style={styles.numpad}>
            {ROWS.map((row, ri) => (
              <View key={ri} style={styles.keyRow}>
                {row.map(key => {
                  const isSign = key === '±';
                  const isBack = key === '⌫';
                  const signActive = isSign && negative;
                  const disabled = isSign && !allowNegative;
                  const bg = disabled
                    ? theme.backgroundElement
                    : signActive
                    ? '#0077B6'
                    : isSign || isBack
                    ? theme.backgroundSelected
                    : theme.background;
                  return (
                    <HapticButton
                      key={key}
                      style={[styles.key, { width: MAX_KEY_W, height: keySize, backgroundColor: bg }]}
                      onPress={() => !disabled && pressKey(key)}
                      activeOpacity={disabled ? 1 : 0.6}>
                      <ThemedText style={[
                        styles.keyText,
                        { color: disabled ? 'transparent' : signActive ? '#fff' : theme.text },
                      ]}>
                        {key}
                      </ThemedText>
                    </HapticButton>
                  );
                })}
              </View>
            ))}
          </View>

          <HapticButton style={[styles.doneBtn, { backgroundColor: '#0077B6' }]} onPress={handleDone}>
            <ThemedText type="smallBold" style={{ color: '#fff', fontSize: 16 }}>Done</ThemedText>
          </HapticButton>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end' },
  dismissArea: {
    flex: 1 },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: SHEET_PAD,
    paddingTop: SHEET_PAD,
    gap: Spacing.two },
  header: {
    fontSize: 13,
    textAlign: 'center',
    letterSpacing: 0.3 },
  displayArea: {
    height: 64,
    justifyContent: 'center',
    alignItems: 'center' },
  display: {
    fontSize: 54,
    fontWeight: '300',
    lineHeight: 64,
    textAlign: 'center',
    letterSpacing: -1 },
  numpad: {
    gap: KEY_GAP },
  keyRow: {
    flexDirection: 'row',
    gap: KEY_GAP },
  key: {
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center' },
  keyText: {
    fontSize: 22,
    fontWeight: '400' },
  doneBtn: {
    height: 88,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center' } });
