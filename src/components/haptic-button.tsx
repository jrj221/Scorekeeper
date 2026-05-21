import * as Haptics from "expo-haptics";
import { TouchableOpacity, type TouchableOpacityProps } from "react-native";

export function HapticButton({ onPress, ...props }: TouchableOpacityProps) {
  return (
    <TouchableOpacity
      {...props}
      onPress={(e) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress?.(e);
      }}
    />
  );
}
