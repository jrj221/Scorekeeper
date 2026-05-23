import { FontAwesome5 } from "@expo/vector-icons";
import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from "expo-audio";
import * as Haptics from "expo-haptics";
import { Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { HapticButton } from "@/components/haptic-button";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { TimeWheelPicker } from "@/components/time-wheel-picker";
import { Spacing } from "@/constants/theme";
import { useGamesContext } from "@/context/games-context";
import { useGame } from "@/hooks/use-game";
import { useTheme } from "@/hooks/use-theme";
import { shared } from "@/styles/shared";

function formatTime(secs: number) {
	const m = Math.floor(secs / 60);
	const s = secs % 60;
	return `${m}:${String(s).padStart(2, "0")}`;
}

export default function TimerScreen() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const { game } = useGame(id);
	const { updateGame } = useGamesContext();
	const theme = useTheme();

	const defaultDuration = game?.extras?.timerDuration ?? 60;

	const [duration, setDuration] = useState(defaultDuration);
	const [remaining, setRemaining] = useState(defaultDuration);
	const [running, setRunning] = useState(false);
	const [alarmActive, setAlarmActive] = useState(false); // true while alarm buzzes/plays
	const [buzzEnabled, setBuzzEnabled] = useState(true);
	const [soundEnabled, setSoundEnabled] = useState(true);
	const [showPicker, setShowPicker] = useState(false);

	const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const buzzRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const soundRef = useRef<AudioPlayer | null>(null);

	// Refs so interval/async callbacks always read current toggle state
	const buzzEnabledRef = useRef(buzzEnabled);
	const soundEnabledRef = useRef(soundEnabled);
	buzzEnabledRef.current = buzzEnabled;
	soundEnabledRef.current = soundEnabled;

	// Stop sound/buzz immediately when toggled off during an active alarm
	useEffect(() => {
		if (!soundEnabled && alarmActive) {
			soundRef.current?.pause();
			soundRef.current?.remove();
			soundRef.current = null;
		}
	}, [soundEnabled]);

	useEffect(() => {
		if (!buzzEnabled && alarmActive) {
			if (buzzRef.current) { clearInterval(buzzRef.current); buzzRef.current = null; }
		}
	}, [buzzEnabled]);

	// Configure audio session once
	useEffect(() => {
		setAudioModeAsync({ playsInSilentMode: true });
		return () => {
			clearAll();
		};
	}, []);

	const clearAll = () => {
		if (countdownRef.current) {
			clearInterval(countdownRef.current);
			countdownRef.current = null;
		}
		if (buzzRef.current) {
			clearInterval(buzzRef.current);
			buzzRef.current = null;
		}
		soundRef.current?.pause();
		soundRef.current?.remove();
		soundRef.current = null;
	};

	const stopCountdown = () => {
		if (countdownRef.current) {
			clearInterval(countdownRef.current);
			countdownRef.current = null;
		}
	};

	const startAlarm = async () => {
		setAlarmActive(true);

		// Buzz — fire immediately then repeat every 1.2 s until dismissed
		if (buzzEnabledRef.current) {
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
			buzzRef.current = setInterval(() => {
				Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
			}, 1200);
		}

		// Sound — loop until dismissed
		if (soundEnabledRef.current) {
			try {
				const player = createAudioPlayer(require("../../../../assets/timer-done.mp3"));
				player.loop = true;
				player.volume = 1.0;
				player.play();
				soundRef.current = player;
			} catch (e) {
				console.warn("Timer sound failed to load:", e);
			}
		}
	};

	const dismissAlarm = () => {
		clearAll();
		setAlarmActive(false);
		setRunning(false);
		// Reset to full duration
		setRemaining(duration);
	};

	const handleTimerEnd = () => {
		stopCountdown();
		setRunning(false);
		startAlarm();
	};

	const start = () => {
		if (alarmActive) return;
		setRunning(true);
		countdownRef.current = setInterval(() => {
			setRemaining((prev) => {
				if (prev <= 1) {
					handleTimerEnd();
					return 0;
				}
				return prev - 1;
			});
		}, 1000);
	};

	const pause = () => {
		stopCountdown();
		setRunning(false);
	};

	const reset = () => {
		clearAll();
		setRunning(false);
		setAlarmActive(false);
		setRemaining(duration);
	};

	const handlePickerConfirm = (mins: number, secs: number) => {
		const total = mins * 60 + secs;
		const clamped = total < 1 ? 1 : total; // min 1 second; 0 rolls back to 1
		stopCountdown();
		setAlarmActive(false);
		setRunning(false);
		setDuration(clamped);
		setRemaining(clamped);
		setShowPicker(false);
		clearAll();
		if (game) updateGame({ ...game, extras: { ...game.extras, timerDuration: clamped } });
	};

	const pct = duration > 0 ? remaining / duration : 0;
	const timeColor = alarmActive ? theme.danger : pct <= 0.2 ? theme.danger : pct <= 0.5 ? theme.negative : theme.text;

	return (
		<ThemedView style={shared.screen}>
			<Stack.Screen options={{ title: "Timer" }} />
			<SafeAreaView style={styles.safe} edges={["bottom"]}>
				{/* Time display */}
				<View style={styles.displayArea}>
					<HapticButton
						onPress={() => {
							if (!running && !alarmActive) setShowPicker(true);
						}}
					>
						<ThemedText style={[styles.timeDisplay, { color: timeColor }]}>
							{formatTime(remaining)}
						</ThemedText>
					</HapticButton>
					<View style={styles.hintSlot}>
						{alarmActive ? (
							<ThemedText style={[styles.doneLabel, { color: theme.danger }]}>Time's up!</ThemedText>
						) : !running ? (
							<ThemedText style={[styles.editHint, { color: theme.textSecondary }]}>
								Tap to edit
							</ThemedText>
						) : null}
					</View>
				</View>

				{/* Controls */}
				<View style={styles.controls}>
					<HapticButton
						style={[styles.controlBtn, { backgroundColor: theme.backgroundElement }]}
						onPress={reset}
					>
						<ThemedText type="small" themeColor="textSecondary">
							Reset
						</ThemedText>
					</HapticButton>

					{alarmActive ? (
						<HapticButton
							style={[styles.mainBtn, { backgroundColor: theme.accent }]}
							onPress={dismissAlarm}
						>
							<ThemedText type="smallBold" style={{ color: theme.accentText, fontSize: 20 }}>
								Done
							</ThemedText>
						</HapticButton>
					) : (
						<HapticButton
							style={[styles.mainBtn, { backgroundColor: theme.accent }]}
							onPress={running ? pause : start}
						>
							<ThemedText type="smallBold" style={{ color: theme.accentText, fontSize: 20 }}>
								{running ? "Pause" : "Start"}
							</ThemedText>
						</HapticButton>
					)}
				</View>

				{/* Buzz / Sound toggles */}
				<View style={[styles.togglesRow, { backgroundColor: theme.backgroundElement }]}>
					<HapticButton style={styles.toggleRow} onPress={() => setBuzzEnabled((v) => !v)}>
						<View style={styles.toggleLabel}>
							<FontAwesome5 name="mobile-alt" size={16} color={theme.text} />
							<ThemedText type="small">Buzz</ThemedText>
						</View>
						<View
							style={[
								styles.toggle,
								{ backgroundColor: buzzEnabled ? theme.accent : theme.backgroundSelected },
							]}
						>
							<View style={[styles.toggleThumb, buzzEnabled && styles.toggleThumbOn]} />
						</View>
					</HapticButton>

					<View style={[styles.divider, { backgroundColor: theme.backgroundSelected }]} />

					<HapticButton style={styles.toggleRow} onPress={() => setSoundEnabled((v) => !v)}>
						<View style={styles.toggleLabel}>
							<FontAwesome5 name="bullhorn" size={14} color={theme.text} />
							<ThemedText type="small">Sound</ThemedText>
						</View>
						<View
							style={[
								styles.toggle,
								{ backgroundColor: soundEnabled ? theme.accent : theme.backgroundSelected },
							]}
						>
							<View style={[styles.toggleThumb, soundEnabled && styles.toggleThumbOn]} />
						</View>
					</HapticButton>
				</View>
			</SafeAreaView>

			<TimeWheelPicker
				visible={showPicker}
				minutes={Math.floor(duration / 60)}
				seconds={duration % 60}
				onConfirm={handlePickerConfirm}
				onCancel={() => setShowPicker(false)}
			/>
		</ThemedView>
	);
}

const styles = StyleSheet.create({
	safe: { flex: 1, padding: Spacing.three, gap: Spacing.three },
	displayArea: { flex: 1, alignItems: "center", justifyContent: "center" },
	timeDisplay: { fontSize: 80, fontWeight: "200", letterSpacing: -2, lineHeight: 96, textAlign: "center" },
	hintSlot: { height: 28, alignItems: "center", justifyContent: "center", marginTop: 4 },
	editHint: { fontSize: 13, opacity: 0.6 },
	doneLabel: { fontSize: 20, fontWeight: "700" },
	controls: { flexDirection: "row", gap: Spacing.two },
	controlBtn: {
		flex: 1,
		paddingVertical: Spacing.three,
		borderRadius: 14,
		alignItems: "center",
		justifyContent: "center",
	},
	mainBtn: {
		flex: 2,
		paddingVertical: Spacing.three,
		borderRadius: 14,
		alignItems: "center",
		justifyContent: "center",
	},
	togglesRow: { flexDirection: "row", borderRadius: Spacing.two, overflow: "hidden" },
	toggleRow: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: Spacing.three,
		paddingVertical: Spacing.two,
	},
	toggleLabel: { flexDirection: "row", alignItems: "center", gap: Spacing.two },
	divider: { width: StyleSheet.hairlineWidth },
	toggle: { width: 44, height: 26, borderRadius: 13, justifyContent: "center", paddingHorizontal: 3 },
	toggleThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: "#fff" },
	toggleThumbOn: { alignSelf: "flex-end" },
});
