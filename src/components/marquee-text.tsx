import { useEffect, useState } from "react";
import { LayoutChangeEvent, StyleSheet, View } from "react-native";
import Animated, {
	cancelAnimation,
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withDelay,
	withRepeat,
	withSequence,
	withTiming,
} from "react-native-reanimated";

import { ThemedText, ThemedTextProps } from "@/components/themed-text";

const PAUSE_MS = 1200;
const PX_PER_SEC = 40;

/**
 * Single-line text that scrolls horizontally on a loop when it's wider than
 * its container (e.g. a long subtitle in large-text mode), instead of being
 * clipped or wrapping. Sits still — and looks like ordinary static text —
 * whenever it already fits.
 */
export function MarqueeText({ style, ...rest }: ThemedTextProps) {
	const [containerW, setContainerW] = useState(0);
	const [textW, setTextW] = useState(0);
	const offset = useSharedValue(0);

	const overflow = textW > containerW && containerW > 0;
	const distance = Math.max(0, textW - containerW);

	const onContainerLayout = (e: LayoutChangeEvent) => {
		setContainerW(e.nativeEvent.layout.width);
	};
	const onTextLayout = (e: LayoutChangeEvent) => {
		setTextW(e.nativeEvent.layout.width);
	};

	// (Re)start the loop whenever the measured overflow/distance changes
	// (e.g. a text-scale change or the text itself changing).
	useEffect(() => {
		cancelAnimation(offset);
		offset.value = 0;
		if (!overflow) return;
		const scrollMs = (distance / PX_PER_SEC) * 1000;
		offset.value = withRepeat(
			withSequence(
				withDelay(PAUSE_MS, withTiming(-distance, { duration: scrollMs, easing: Easing.linear })),
				withTiming(0, { duration: 0 }),
			),
			-1,
		);
	}, [overflow, distance, offset]);

	const animatedStyle = useAnimatedStyle(() => ({
		transform: [{ translateX: offset.value }],
	}));

	return (
		<View style={styles.container} onLayout={onContainerLayout}>
			<Animated.View style={[{ flexDirection: "row" }, overflow && animatedStyle]}>
				<ThemedText
					{...rest}
					numberOfLines={1}
					onLayout={onTextLayout}
					style={[style, overflow && styles.noShrink]}
				>
					{rest.children}
				</ThemedText>
			</Animated.View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		overflow: "hidden",
		flexShrink: 1,
		flexGrow: 1,
	},
	noShrink: {
		flexShrink: 0,
	},
});
