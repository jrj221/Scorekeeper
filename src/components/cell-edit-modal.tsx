import { useEffect, useMemo, useState } from 'react';
import { Dimensions, Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from './themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const SCREEN_W = Dimensions.get('window').width;
const SCREEN_H = Dimensions.get('window').height;
const SHEET_PAD = Spacing.three;
const KEY_GAP = 8;
const KEY_W = Math.floor((SCREEN_W - SHEET_PAD * 2 - KEY_GAP * 2) / 3);

// Fixed overhead (px): paddingTop + header + displayArea + doneBtn + section gaps + key-row gaps
// Calculated so sheet top lands at ~50% of screen height
const FIXED_OVERHEAD = SHEET_PAD + 20 + 64 + 88 + KEY_GAP * 3 + Spacing.two * 3;

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
  onSave: (value: number | null) => void;
  onCancel: () => void;
};

export function CellEditModal({
  visible,
  title,
  initialValue,
  allowNegative = true,
  onSave,
  onCancel,
}: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  // Square buttons: use KEY_W as target height, capped so sheet fits on screen
  const KEY_H = useMemo(() => {
    const bottomPad = insets.bottom + Spacing.two;
    const maxForScreen = Math.floor((SCREEN_H - FIXED_OVERHEAD - bottomPad) / 4);
    return Math.max(44, Math.min(KEY_W, maxForScreen));
  }, [insets.bottom]);

  const [numStr, setNumStr] = useState('');
  const [negative, setNegative] = useState(false);

  useEffect(() => {
    if (visible) {
      if (initialValue !== null) {
        setNumStr(Math.abs(initialValue).toString());
        setNegative(allowNegative && initialValue < 0);
      } else {
        setNumStr('');
        setNegative(false);
      }
    }
  }, [visible, initialValue, allowNegative]);

  const pressKey = (key: string) => {
    if (key === '±') {
      if (allowNegative) setNegative(v => !v);
    } else if (key === '⌫') {
      setNumStr(prev => prev.slice(0, -1));
    } else {
      setNumStr(prev => (prev.length >= 6 ? prev : prev + key));
    }
  };

  const handleDone = () => {
    if (!numStr) {
      onSave(null);
    } else {
      const n = parseInt(numStr, 10);
      onSave(isNaN(n) ? null : allowNegative && negative ? -n : n);
    }
  };

  const hasValue = numStr.length > 0;
  const displayColor = hasValue && negative ? '#4CABD4' : theme.text;
  const displayText = hasValue ? `${negative ? '−' : ''}${numStr}` : '–';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.dismissArea} activeOpacity={1} onPress={onCancel} />
        <View style={[styles.sheet, { backgroundColor: theme.backgroundElement, paddingBottom: insets.bottom + Spacing.two }]}>

          <ThemedText style={styles.header} themeColor="textSecondary">{title}</ThemedText>

          <View style={styles.displayArea}>
            <ThemedText style={[styles.display, { color: displayColor }]}>{displayText}</ThemedText>
          </View>

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
                    <TouchableOpacity
                      key={key}
                      style={[styles.key, { width: KEY_W, height: KEY_H, backgroundColor: bg }]}
                      onPress={() => !disabled && pressKey(key)}
                      activeOpacity={disabled ? 1 : 0.6}>
                      <ThemedText style={[
                        styles.keyText,
                        { color: disabled ? 'transparent' : signActive ? '#fff' : theme.text },
                      ]}>
                        {key}
                      </ThemedText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>

          <TouchableOpacity style={[styles.doneBtn, { backgroundColor: '#0077B6' }]} onPress={handleDone}>
            <ThemedText type="smallBold" style={{ color: '#fff', fontSize: 16 }}>Done</ThemedText>
          </TouchableOpacity>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  dismissArea: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: SHEET_PAD,
    paddingTop: SHEET_PAD,
    gap: Spacing.two,
  },
  header: {
    fontSize: 13,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  displayArea: {
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
  },
  display: {
    fontSize: 54,
    fontWeight: '300',
    lineHeight: 64,
    textAlign: 'center',
    letterSpacing: -1,
  },
  numpad: {
    gap: KEY_GAP,
  },
  keyRow: {
    flexDirection: 'row',
    gap: KEY_GAP,
  },
  key: {
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: {
    fontSize: 22,
    fontWeight: '400',
  },
  doneBtn: {
    height: 88,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
