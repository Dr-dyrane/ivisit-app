import React, { useMemo } from "react";
import {
  View,
  Text,
  Modal,
  TextInput,
  FlatList,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../contexts/ThemeContext";
import { COLORS } from "../../../constants/colors";
import {
  getStackViewportSurfaceConfig,
  getStackViewportVariant,
} from "../../../utils/ui/stackViewportConfig";

const SPECIALTY_ICONS = {
  Cardiology: "heart",
  Dermatology: "water",
  "General Practice": "medkit",
  Neurology: "headset",
  Orthopedics: "accessibility",
  Pediatrics: "happy",
  Psychiatry: "chatbubbles",
  Dentistry: "nutrition",
  Ophthalmology: "eye",
  ENT: "ear",
};

const getSpecialtyIcon = (specialty) => {
  for (const key in SPECIALTY_ICONS) {
    if (specialty.includes(key)) return SPECIALTY_ICONS[key];
  }
  return "medical";
};

export default function SpecialtySearchModal({
  visible,
  onClose,
  searchQuery,
  onSearchChange,
  specialties,
  onSelect,
}) {
  const { isDarkMode } = useTheme();
  const { width } = useWindowDimensions();
  const viewportVariant = useMemo(
    () => getStackViewportVariant({ platform: Platform.OS, width }),
    [width],
  );
  const surfaceConfig = useMemo(
    () => getStackViewportSurfaceConfig(viewportVariant),
    [viewportVariant],
  );
  const isBottomSheet = surfaceConfig.modalPresentationMode === "bottom-sheet";

  const colors = {
    text: isDarkMode ? "#FFFFFF" : "#0F172A",
    textMuted: isDarkMode ? "#94A3B8" : "#64748B",
    inputBg: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
    modalBg: isDarkMode ? "#121826" : "#FFFFFF",
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.keyboardHost}
          >
            <View
              style={[
                styles.sheetHost,
                { justifyContent: isBottomSheet ? "flex-end" : "center" },
              ]}
            >
              <View
                style={[
                  styles.searchModalContent,
                  {
                    backgroundColor: colors.modalBg,
                    maxWidth: surfaceConfig.modalMaxWidth || 560,
                    maxHeight: isBottomSheet ? "90%" : "82%",
                    borderBottomLeftRadius: isBottomSheet ? 0 : 28,
                    borderBottomRightRadius: isBottomSheet ? 0 : 28,
                  },
                ]}
              >
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>
                    Search specialty
                  </Text>
                  <Pressable onPress={onClose} style={styles.closeButton}>
                    <Ionicons name="close" size={24} color={colors.text} />
                  </Pressable>
                </View>

                <View
                  style={[
                    styles.searchBar,
                    { backgroundColor: colors.inputBg },
                  ]}
                >
                  <Ionicons name="search" size={20} color={colors.textMuted} />
                  <TextInput
                    style={[styles.searchInput, { color: colors.text }]}
                    placeholder="Cardiology, Dermatology..."
                    placeholderTextColor={colors.textMuted}
                    value={searchQuery}
                    onChangeText={onSearchChange}
                    autoFocus
                  />
                </View>

                <FlatList
                  data={specialties}
                  keyExtractor={(item) => item}
                  renderItem={({ item }) => (
                    <Pressable
                      onPress={() => onSelect(item)}
                      style={styles.modalListItem}
                    >
                      <View style={styles.specialtyRow}>
                        <View
                          style={[
                            styles.iconBox,
                            { backgroundColor: COLORS.brandPrimary + "15" },
                          ]}
                        >
                          <Ionicons
                            name={getSpecialtyIcon(item)}
                            size={20}
                            color={COLORS.brandPrimary}
                          />
                        </View>
                        <Text
                          style={[styles.listTitle, { color: colors.text }]}
                        >
                          {item}
                        </Text>
                      </View>
                      <Ionicons
                        name="chevron-forward"
                        size={20}
                        color={colors.textMuted}
                      />
                    </Pressable>
                  )}
                  contentContainerStyle={{ paddingBottom: 20 }}
                  keyboardShouldPersistTaps="handled"
                />
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  keyboardHost: {
    flex: 1,
  },
  sheetHost: {
    flex: 1,
    width: "100%",
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  searchModalContent: {
    width: "100%",
    alignSelf: "center",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  closeButton: {
    padding: 4,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 16,
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "400",
  },
  modalListItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(150,150,150,0.1)",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  specialtyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  listTitle: {
    fontSize: 16,
    fontWeight: "400",
  },
});
