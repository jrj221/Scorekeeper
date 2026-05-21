import { useNavigation } from "@react-navigation/native";
import { useEffect } from "react";
import { Alert } from "react-native";

export function useUnsavedChangesWarning(isDirty: boolean, onSave: () => void) {
	const navigation = useNavigation();

	useEffect(() => {
		const unsubscribe = navigation.addListener("beforeRemove", (e) => {
			if (!isDirty) return;
			e.preventDefault();
			Alert.alert("Unsaved Changes", "You have unsaved changes. Would you like to save before leaving?", [
				{
					text: "Save & Leave",
					onPress: () => {
						onSave();
						navigation.dispatch(e.data.action);
					},
				},
				{ text: "Stay" },
				{ text: "Cancel changes", style: "destructive", onPress: () => navigation.dispatch(e.data.action) },
			]);
		});
		return unsubscribe;
	}, [navigation, isDirty, onSave]);
}
