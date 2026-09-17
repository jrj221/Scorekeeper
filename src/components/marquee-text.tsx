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
 *
 * The text itself is rendered with `alignSelf: "flex-start"` and no width
 * constraint of its own, so `onLayout` reports its true intrinsic width even
 * though the outer container is bounded — that gap is what drives `overflow`.
 */
export function MarqueeText({ style, ...rest }: ThemedTextProps) {
	const [containerW, setContainerW] = useState(0);
	const [textW, setTextW] = useState(0);
	const offset = useSharedValue(0);

	const overflow = textW > 0 && containerW > 0 && textW > containerW;
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
		transform: [{ translateX: overflow ? offset.value : 0 }],
	}));

	return (
		<View style={styles.container} onLayout={onContainerLayout}>
			<Animated.View style={[styles.track, animatedStyle]}>
				<ThemedText {...rest} onLayout={onTextLayout} style={[style, styles.text]}>
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
		flexBasis: 0,
	},
	track: {
		alignSelf: "flex-start",
		flexDirection: "row",
	},
	text: {
		flexShrink: 0,
		flexGrow: 0,
	},
});
