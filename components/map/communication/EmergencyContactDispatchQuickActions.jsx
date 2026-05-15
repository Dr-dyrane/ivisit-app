import { View, Pressable, Text } from "react-native";
import { styles } from "./emergencyContactDispatch.styles";

// PULLBACK NOTE: Contact Dispatch CD-6 - Quick actions component.
// Owns: Quick action chip rendering and selection.
// Does NOT own: Action execution logic (handled by parent).

export function EmergencyContactDispatchQuickActions({ actions, onSelect, colors }) {
  return (
    <View style={styles.quickActionsContainer}>
      {actions.map((action) => (
        <Pressable
          key={action.key}
          onPress={() => onSelect(action)}
          style={({ pressed }) => [
            styles.quickActionChip,
            { backgroundColor: colors.bg },
            pressed && styles.quickActionChipPressed,
          ]}
        >
          <Text style={[styles.quickActionText, { color: colors.text }]}>{action.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export default EmergencyContactDispatchQuickActions;
