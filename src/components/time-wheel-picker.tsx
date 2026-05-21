import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Dimensions, Modal, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";

import { HapticButton } from "@/components/haptic-button";
import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

const ITEM_H = 56;
const VISIBLE = 5;        // must be odd
const WHEEL_H = ITEM_H * VISIBLE;
const MID = Math.floor(VISIBLE / 2);

// ─── Single column ──────────────────────────────────────────────────────────
type WheelProps = {
  values: number[];
  selected: number;
  onSelect: (v: number) => void;
};

export type WheelHandle = { scrollToValue: (v: number, animated?: boolean) => void };

const WheelColumn = forwardRef<WheelHandle, WheelProps>(function WheelColumn({ values, selected, onSelect }, handleRef) {
  const theme = useTheme();
  const ref = useRef<ScrollView>(null);
  const [offsetY, setOffsetY] = useState(values.indexOf(selected) * ITEM_H);
  // True once a fling begins — prevents onScrollEndDrag from snapping early
  const hasMomentum = useRef(false);
  const dragSnapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useImperativeHandle(handleRef, () => ({
    scrollToValue: (v: number, animated = true) => {
      const idx = values.indexOf(v);
      if (idx >= 0) {
        ref.current?.scrollTo({ y: idx * ITEM_H, animated });
        setOffsetY(idx * ITEM_H);
      }
    },
  }));

  useEffect(() => {
    const idx = values.indexOf(selected);
    if (idx >= 0) setTimeout(() => ref.current?.scrollTo({ y: idx * ITEM_H, animated: false }), 0);
  }, []);

  const snap = (y: number) => {
    const idx = Math.max(0, Math.min(values.length - 1, Math.round(y / ITEM_H)));
    setOffsetY(idx * ITEM_H);
    onSelect(values[idx]);
    ref.current?.scrollTo({ y: idx * ITEM_H, animated: true });
  };

  return (
    <View style={[styles.wheelWrap, { backgroundColor: theme.backgroundElement }]}>
      <View pointerEvents="none" style={styles.separatorsAbs}>
        <View style={[styles.sep, { backgroundColor: theme.textSecondary, top: ITEM_H * MID }]} />
        <View style={[styles.sep, { backgroundColor: theme.textSecondary, top: ITEM_H * (MID + 1) }]} />
      </View>

      <ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate={0.994}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingVertical: ITEM_H * MID }}
        onScroll={(e) => setOffsetY(e.nativeEvent.contentOffset.y)}
        // onScrollEndDrag fires BEFORE onMomentumScrollBegin, so we defer the
        // snap by 50 ms and cancel it when momentum actually starts.
        onScrollEndDrag={(e) => {
          const y = e.nativeEvent.contentOffset.y;
          dragSnapTimer.current = setTimeout(() => {
            if (!hasMomentum.current) snap(y);
          }, 50);
        }}
        onMomentumScrollBegin={() => {
          hasMomentum.current = true;
          if (dragSnapTimer.current) { clearTimeout(dragSnapTimer.current); dragSnapTimer.current = null; }
        }}
        onMomentumScrollEnd={(e) => { hasMomentum.current = false; snap(e.nativeEvent.contentOffset.y); }}
        style={{ height: WHEEL_H }}
      >
        {values.map((v, i) => {
          // Distance from the "virtual centre" as the user scrolls
          const dist = Math.abs((offsetY / ITEM_H) - i);
          const opacity = Math.max(0.12, 1 - dist * 0.45);
          const fontSize = dist < 0.5 ? 34 : dist < 1.5 ? 26 : 20;
          const fontWeight: "700" | "300" = dist < 0.5 ? "700" : "300";
          return (
            <TouchableOpacity
              key={v}
              style={styles.item}
              activeOpacity={0.6}
              onPress={() => {
                onSelect(v);
                const idx = values.indexOf(v);
                setOffsetY(idx * ITEM_H);
                ref.current?.scrollTo({ y: idx * ITEM_H, animated: true });
              }}
            >
              <ThemedText style={{ fontSize, fontWeight, lineHeight: ITEM_H, textAlign: "center", opacity, color: theme.text }}>
                {String(v).padStart(2, "0")}
              </ThemedText>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
});

const MINUTES = Array.from({ length: 61 }, (_, i) => i);  // 0–60
const SECONDS = Array.from({ length: 60 }, (_, i) => i);  // 0–59

// ─── Picker modal ───────────────────────────────────────────────────────────
type Props = {
  visible: boolean;
  minutes: number;
  seconds: number;
  onConfirm: (minutes: number, seconds: number) => void;
  onCancel: () => void;
};

export function TimeWheelPicker({ visible, minutes, seconds, onConfirm, onCancel }: Props) {
  const theme = useTheme();
  const [mins, setMins] = useState(minutes);
  const [secs, setSecs] = useState(seconds);
  const secWheelRef = useRef<WheelHandle>(null);

  useEffect(() => {
    if (visible) { setMins(minutes); setSecs(seconds); }
  }, [visible]);

  const handleConfirm = () => {
    if (mins === 0 && secs === 0) {
      // Roll seconds back to 1 visually before confirming
      setSecs(1);
      secWheelRef.current?.scrollToValue(1, true);
      setTimeout(() => onConfirm(0, 1), 350);
    } else {
      onConfirm(mins, secs);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onCancel} />
        <View style={[styles.sheet, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText style={[styles.title, { color: theme.textSecondary }]}>Set Duration</ThemedText>

          {/* Labels row */}
          <View style={styles.labelsRow}>
            <ThemedText style={[styles.colLabel, { color: theme.textSecondary }]}>min</ThemedText>
            <View style={styles.colonSpace} />
            <ThemedText style={[styles.colLabel, { color: theme.textSecondary }]}>sec</ThemedText>
          </View>

          {/* Wheels + colon — colon is centred with the selection row */}
          <View style={styles.wheelsRow}>
            <View style={{ flex: 1 }}>
              <WheelColumn values={MINUTES} selected={mins} onSelect={setMins} />
            </View>
            {/* Colon sits at the centre of WHEEL_H, aligned with selection */}
            <View style={styles.colonWrap}>
              <ThemedText style={[styles.colon, { color: theme.text }]}>:</ThemedText>
            </View>
            <View style={{ flex: 1 }}>
              <WheelColumn ref={secWheelRef} values={SECONDS} selected={secs} onSelect={setSecs} />
            </View>
          </View>

          <HapticButton
            style={[styles.confirmBtn, { backgroundColor: theme.accent }]}
            onPress={handleConfirm}
          >
            <ThemedText type="smallBold" style={{ color: theme.accentText, fontSize: 17 }}>Done</ThemedText>
          </HapticButton>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { flex: 1 },
  sheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.four,
    gap: Spacing.two,
    maxHeight: Dimensions.get("window").height * 0.52,
  },
  title: { fontSize: 13, textAlign: "center", letterSpacing: 0.3 },
  labelsRow: {
    flexDirection: "row",
    paddingHorizontal: Spacing.one,
  },
  colLabel: { flex: 1, fontSize: 11, fontWeight: "600", letterSpacing: 0.8, textAlign: "center" },
  colonSpace: { width: 32 },
  wheelsRow: { flexDirection: "row", alignItems: "center", gap: 0 },
  wheelWrap: { borderRadius: 14, overflow: "hidden" },
  separatorsAbs: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, zIndex: 1 },
  sep: { position: "absolute", left: 8, right: 8, height: StyleSheet.hairlineWidth },
  item: { height: ITEM_H, alignItems: "center", justifyContent: "center" },
  colonWrap: {
    width: 32,
    height: WHEEL_H,
    alignItems: "center",
    justifyContent: "center",
  },
  colon: { fontSize: 30, fontWeight: "300" },
  confirmBtn: { height: 54, borderRadius: 14, alignItems: "center", justifyContent: "center" },
});
