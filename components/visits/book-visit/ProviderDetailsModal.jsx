import React, { useMemo } from "react";
import {
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../../constants/colors";
import { useTheme } from "../../../contexts/ThemeContext";
import {
  getStackViewportSurfaceConfig,
  getStackViewportVariant,
} from "../../../utils/ui/stackViewportConfig";

export default function ProviderDetailsModal({
  visible,
  onClose,
  provider,
  specialty,
  onConfirm,
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
    modalBg: isDarkMode ? "#121826" : "#FFFFFF",
    soft: isDarkMode ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.04)",
  };
  const timezoneReady = Boolean(provider?.timezoneConfirmedAt);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.sheetHost, { justifyContent: isBottomSheet ? "flex-end" : "center" }]}>
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: colors.modalBg,
                maxWidth: surfaceConfig.modalMaxWidth || 600,
                maxHeight: isBottomSheet ? "85%" : "82%",
                borderBottomLeftRadius: isBottomSheet ? 0 : 28,
                borderBottomRightRadius: isBottomSheet ? 0 : 28,
              },
            ]}
          >
            <ScrollView contentContainerStyle={styles.scrollContent}>
              <View style={styles.header}>
                <View style={[styles.facilityImage, { backgroundColor: `${COLORS.brandPrimary}18` }]}>
                  {provider?.image ? (
                    <Image source={{ uri: provider.image }} style={styles.facilityImage} />
                  ) : (
                    <Ionicons name="business" size={32} color={COLORS.brandPrimary} />
                  )}
                </View>
                <Text style={[styles.facilityName, { color: colors.text }]}>{provider?.name || "Facility"}</Text>
                <Text style={[styles.specialty, { color: colors.textMuted }]}>{specialty}</Text>
              </View>

              <View style={[styles.infoSection, { backgroundColor: colors.soft }]}>
                <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>Location</Text>
                <View style={styles.infoRow}>
                  <Ionicons name="location" size={20} color={COLORS.brandPrimary} />
                  <Text style={[styles.infoValue, { color: colors.text }]}>{provider?.address || "Address unavailable"}</Text>
                </View>
              </View>

              <View style={[styles.infoSection, { backgroundColor: colors.soft }]}>
                <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>Scheduling timezone</Text>
                <View style={styles.infoRow}>
                  <Ionicons
                    name={timezoneReady ? "checkmark-circle" : "time-outline"}
                    size={20}
                    color={timezoneReady ? "#059669" : colors.textMuted}
                  />
                  <View style={styles.infoCopy}>
                    <Text style={[styles.infoValue, { color: colors.text }]}>
                      {timezoneReady ? provider?.timezone || "Confirmed" : "Scheduling setup pending"}
                    </Text>
                    <Text style={[styles.infoHint, { color: colors.textMuted }]}>
                      {timezoneReady
                        ? "Available times use this local timezone."
                        : "This facility is still preparing online booking."}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={[styles.assignmentNote, { backgroundColor: colors.soft }]}>
                <Ionicons name="people-outline" size={20} color={COLORS.brandPrimary} />
                <Text style={[styles.assignmentText, { color: colors.textMuted }]}>
                  A clinician is assigned automatically after you choose an available time.
                </Text>
              </View>
            </ScrollView>

            <View style={[styles.footer, { backgroundColor: colors.soft }]}>
              <Pressable onPress={onClose} style={styles.secondaryButton} accessibilityRole="button">
                <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Close</Text>
              </Pressable>
              <Pressable
                onPress={onConfirm}
                disabled={!timezoneReady}
                style={[styles.primaryButton, !timezoneReady ? styles.primaryButtonDisabled : null]}
                accessibilityRole="button"
                accessibilityState={{ disabled: !timezoneReady }}
              >
                <Text style={styles.primaryButtonText}>Choose facility</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  sheetHost: { flex: 1, width: "100%", paddingHorizontal: 16, paddingTop: 16 },
  modalContent: { width: "100%", alignSelf: "center", borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: "hidden" },
  scrollContent: { paddingBottom: 20 },
  header: { alignItems: "center", padding: 24, paddingBottom: 20 },
  facilityImage: { width: 80, height: 80, borderRadius: 24, marginBottom: 16, alignItems: "center", justifyContent: "center" },
  facilityName: { fontSize: 22, fontWeight: "700", textAlign: "center", marginBottom: 4, letterSpacing: 0 },
  specialty: { fontSize: 16, fontWeight: "400" },
  infoSection: { padding: 20, marginHorizontal: 20, marginBottom: 10, borderRadius: 20 },
  sectionHeader: { fontSize: 13, fontWeight: "600", marginBottom: 12 },
  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  infoCopy: { flex: 1, gap: 4 },
  infoValue: { flex: 1, fontSize: 15, lineHeight: 21, fontWeight: "600" },
  infoHint: { fontSize: 13, lineHeight: 19 },
  assignmentNote: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginHorizontal: 24, marginTop: 4, padding: 16, borderRadius: 20 },
  assignmentText: { flex: 1, fontSize: 13, lineHeight: 19 },
  footer: { padding: 20, flexDirection: "row", gap: 12 },
  secondaryButton: { paddingHorizontal: 24, height: 56, borderRadius: 20, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(150,150,150,0.1)" },
  secondaryButtonText: { fontSize: 16, fontWeight: "600" },
  primaryButton: { flex: 1, height: 56, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.brandPrimary },
  primaryButtonDisabled: { opacity: 0.45 },
  primaryButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
});
