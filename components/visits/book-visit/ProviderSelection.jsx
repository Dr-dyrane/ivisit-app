import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { COLORS } from "../../../constants/colors";
import { useTheme } from "../../../contexts/ThemeContext";
import { BOOK_VISIT_SCREEN_COPY } from "../bookVisit/bookVisit.content";

function FacilitySkeleton({ backgroundColor }) {
  return (
    <View style={styles.skeletonList} accessibilityLabel="Loading facilities">
      {[0, 1, 2].map((key) => <View key={key} style={[styles.skeletonRow, { backgroundColor }]} />)}
    </View>
  );
}

export default function ProviderSelection({
  providers,
  specialty,
  onSelect,
  showHeader = true,
  searchQuery = "",
  onSearchChange,
  resultCount = null,
  loading = false,
  refreshing = false,
  error = null,
  onRetry,
  hasMore = false,
  loadingMore = false,
  onLoadMore,
}) {
  const { isDarkMode } = useTheme();
  const colors = {
    text: isDarkMode ? "#FFFFFF" : "#0F172A",
    textMuted: isDarkMode ? "#94A3B8" : "#64748B",
    cardBg: isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
  };
  const count = Number.isFinite(Number(resultCount)) ? Number(resultCount) : providers.length;

  const handlePress = (item) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect?.(item);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {showHeader ? <Text style={[styles.title, { color: colors.text }]}>Select a facility</Text> : null}
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          {count} available facilit{count === 1 ? "y" : "ies"} for {specialty}
        </Text>
        <View style={[styles.searchBar, { backgroundColor: colors.cardBg }]}>
          <Ionicons name="search" size={20} color={colors.textMuted} />
          <TextInput
            value={searchQuery}
            onChangeText={onSearchChange}
            placeholder="Search facilities"
            placeholderTextColor={colors.textMuted}
            style={[styles.searchInput, { color: colors.text }]}
            returnKeyType="search"
            accessibilityLabel="Search eligible facilities"
          />
          {refreshing && !loading ? <ActivityIndicator size="small" color={COLORS.brandPrimary} /> : null}
        </View>
      </View>

      {loading ? <FacilitySkeleton backgroundColor={colors.cardBg} /> : null}

      {!loading && error ? (
        <View style={[styles.statePanel, { backgroundColor: colors.cardBg }]}>
          <Ionicons name="cloud-offline-outline" size={25} color={colors.textMuted} />
          <Text style={[styles.stateTitle, { color: colors.text }]}>Facilities are unavailable</Text>
          <Text style={[styles.stateBody, { color: colors.textMuted }]}>We could not load eligible facilities right now.</Text>
          <Pressable onPress={onRetry} style={styles.retryButton} accessibilityRole="button">
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      ) : null}

      {!loading && !error && providers.length === 0 ? (
        <View style={[styles.statePanel, { backgroundColor: colors.cardBg }]}>
          <Ionicons name="business-outline" size={25} color={colors.textMuted} />
          <Text style={[styles.stateTitle, { color: colors.text }]}>{BOOK_VISIT_SCREEN_COPY.messages.noProviders}</Text>
          <Text style={[styles.stateBody, { color: colors.textMuted }]}>Try another search or choose a different specialty.</Text>
        </View>
      ) : null}

      {!loading && !error && providers.length > 0 ? (
        <FlatList
          data={providers}
          keyExtractor={(item) => String(item.id)}
          onEndReached={() => {
            if (hasMore && !loadingMore) onLoadMore?.();
          }}
          onEndReachedThreshold={0.4}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => handlePress(item)}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.listItem,
                { backgroundColor: colors.cardBg, transform: [{ scale: pressed ? 0.98 : 1 }] },
              ]}
            >
              <View style={styles.providerRow}>
                {item.image ? (
                  <Image source={{ uri: item.image }} style={styles.providerImage} />
                ) : (
                  <View style={[styles.providerImage, { backgroundColor: `${COLORS.brandPrimary}20` }]}>
                    <Ionicons name="business" size={24} color={COLORS.brandPrimary} />
                  </View>
                )}
                <View style={styles.facilityCopy}>
                  <Text style={[styles.listTitle, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                  {item.address ? <Text style={[styles.listSubtitle, { color: colors.textMuted }]} numberOfLines={2}>{item.address}</Text> : null}
                  <View style={styles.readinessRow}>
                    <Ionicons
                      name={item.timezoneConfirmedAt ? "checkmark-circle" : "time-outline"}
                      size={14}
                      color={item.timezoneConfirmedAt ? "#059669" : colors.textMuted}
                    />
                    <Text style={[styles.readinessText, { color: item.timezoneConfirmedAt ? "#059669" : colors.textMuted }]}>
                      {item.timezoneConfirmedAt ? item.timezone || "Timezone ready" : "Scheduling setup pending"}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </View>
            </Pressable>
          )}
          ListFooterComponent={loadingMore ? <ActivityIndicator style={styles.footerLoader} color={COLORS.brandPrimary} /> : null}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  header: { paddingVertical: 24, gap: 8 },
  title: { fontSize: 24, fontWeight: "700", letterSpacing: 0 },
  subtitle: { fontSize: 15, fontWeight: "400", lineHeight: 21 },
  searchBar: { flexDirection: "row", alignItems: "center", minHeight: 52, gap: 10, paddingHorizontal: 14, borderRadius: 20, marginTop: 6 },
  searchInput: { flex: 1, fontSize: 16, minHeight: 48 },
  skeletonList: { gap: 12 },
  skeletonRow: { minHeight: 100, borderRadius: 32 },
  statePanel: { alignItems: "center", padding: 24, borderRadius: 28, gap: 8 },
  stateTitle: { fontSize: 17, fontWeight: "700", textAlign: "center" },
  stateBody: { fontSize: 14, lineHeight: 20, textAlign: "center" },
  retryButton: { minHeight: 44, justifyContent: "center", paddingHorizontal: 18, marginTop: 6, borderRadius: 18, backgroundColor: COLORS.brandPrimary },
  retryText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  listContent: { paddingBottom: 100, gap: 12 },
  listItem: { padding: 20, borderRadius: 32, minHeight: 100, justifyContent: "center" },
  providerRow: { flexDirection: "row", gap: 16, alignItems: "center" },
  providerImage: { width: 64, height: 64, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  facilityCopy: { flex: 1, minWidth: 0 },
  listTitle: { fontSize: 18, fontWeight: "700", letterSpacing: 0 },
  listSubtitle: { fontSize: 13, marginTop: 3, fontWeight: "400", lineHeight: 18 },
  readinessRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 7 },
  readinessText: { fontSize: 12, fontWeight: "600" },
  footerLoader: { paddingVertical: 16 },
});
