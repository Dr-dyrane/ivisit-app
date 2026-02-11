// components/emergency/EmergencyContactsList.jsx
import React from "react";
import { View, Text, ActivityIndicator, Animated, StyleSheet } from "react-native";
import { COLORS } from "../../constants/colors";
import ContactCard from "./ContactCard";

export default function EmergencyContactsList({
    contacts,
    isContactsLoading,
    selectedContacts,
    onEdit,
    onDelete,
    onToggleSelect,
    onScroll,
    topPadding,
    bottomPadding,
    fadeAnim,
    slideAnim,
    colors,
    isDarkMode,
}) {
    const emptyState = !isContactsLoading && (!contacts || contacts.length === 0);

    return (
        <Animated.ScrollView
            contentContainerStyle={[
                styles.content,
                { paddingTop: topPadding, paddingBottom: bottomPadding },
            ]}
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={onScroll}
            style={{
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
            }}
        >
            <Animated.View
                style={{
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                    paddingHorizontal: 12,
                }}
            >
                <View style={[styles.card, { backgroundColor: colors.card }]}>
                    <Text style={[styles.title, { color: colors.text }]}>
                        iVisit Emergency Network
                    </Text>
                    <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                        Add family members, caregivers, and key contacts. This powers your iVisit emergency response system and enables fast coordination during medical situations.
                    </Text>
                </View>

                {isContactsLoading ? (
                    <View style={[styles.card, { backgroundColor: colors.card }]}>
                        <View
                            style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
                        >
                            <ActivityIndicator color={COLORS.brandPrimary} />
                            <Text style={{ color: colors.textMuted, fontWeight: "500" }}>
                                Loading contacts...
                            </Text>
                        </View>
                    </View>
                ) : null}

                {emptyState ? (
                    <View style={[styles.card, { backgroundColor: colors.card }]}>
                        <Text style={[styles.title, { color: colors.text }]}>
                            No contacts yet
                        </Text>
                        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                            Add at least one trusted contact for faster emergency
                            coordination.
                        </Text>
                    </View>
                ) : null}
            </Animated.View>

            {contacts.map((c, index) => (
                <Animated.View
                    key={String(c?.id)}
                    style={{
                        opacity: fadeAnim,
                        transform: [{ translateY: slideAnim }],
                        paddingHorizontal: 12,
                        marginTop: index === 0 ? 20 : 12,
                    }}
                >
                    <ContactCard
                        contact={c}
                        isDarkMode={isDarkMode}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        isSelected={selectedContacts.has(c?.id)}
                        onToggleSelect={onToggleSelect}
                    />
                </Animated.View>
            ))}
        </Animated.ScrollView>
    );
}

const styles = StyleSheet.create({
    content: { flexGrow: 1, paddingBottom: 40 },
    card: {
        borderRadius: 36,
        padding: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03,
        shadowRadius: 10,
        marginBottom: 12,
    },
    title: {
        fontSize: 22,
        fontWeight: "900",
        letterSpacing: -1.0,
    },
    subtitle: {
        marginTop: 8,
        fontSize: 14,
        lineHeight: 20,
        fontWeight: "500",
    },
});
