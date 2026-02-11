// components/notifications/NotificationUI.jsx
import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";

export const NotificationHero = ({ notification, priorityColor, textColor, notificationIcon }) => (
    <View style={styles.heroSection}>
        <View style={styles.titleSection}>
            <Text style={[styles.editorialSubtitle, { color: priorityColor }]}>
                {notification.priority.toUpperCase()} PRIORITY
            </Text>
            <Text style={[styles.mainTitle, { color: textColor }]}>
                {notification.title}
            </Text>
        </View>

        {/* URGENCY SEAL: Nested Squircle Icon */}
        <View style={[styles.urgencySeal, { backgroundColor: priorityColor + '15', shadowColor: priorityColor }]}>
            <Ionicons name={notificationIcon} size={32} color={priorityColor} />
        </View>
    </View>
);

export const NotificationBriefing = ({ message, widgetBg, textColor }) => (
    <View style={[styles.briefingWidget, { backgroundColor: widgetBg }]}>
        <Text style={[styles.messageText, { color: textColor }]}>
            {message}
        </Text>
    </View>
);

export const NotificationMetadata = ({ notification, widgetBg, mutedColor, textColor, getRelativeTime }) => (
    <View style={styles.gridContainer}>
        <View style={[styles.dataSquare, { backgroundColor: widgetBg }]}>
            <Ionicons name="time" size={20} color={COLORS.brandPrimary} />
            <Text style={[styles.gridLabel, { color: mutedColor }]}>RECEIVED</Text>
            <Text style={[styles.gridValue, { color: textColor }]}>
                {getRelativeTime(notification.timestamp)}
            </Text>
        </View>
        <View style={[styles.dataSquare, { backgroundColor: widgetBg }]}>
            <Ionicons name="layers" size={20} color={COLORS.brandPrimary} />
            <Text style={[styles.gridLabel, { color: mutedColor }]}>CATEGORY</Text>
            <Text style={[styles.gridValue, { color: textColor }]}>
                {notification.type.toUpperCase()}
            </Text>
        </View>
    </View>
);

export const NotificationFooter = ({ timestamp, mutedColor, isDarkMode }) => (
    <View style={[styles.timestampRow, { borderTopColor: isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }]}>
        <Text style={[styles.fullDate, { color: mutedColor }]}>
            RECORD LOGGED: {new Date(timestamp).toLocaleString().toUpperCase()}
        </Text>
    </View>
);

export const NotificationActions = ({ actionType, onPress, widgetBg, mutedColor }) => {
    if (actionType) {
        return (
            <Pressable
                onPress={onPress}
                style={({ pressed }) => [
                    styles.primaryAction,
                    { backgroundColor: COLORS.brandPrimary, opacity: pressed ? 0.9 : 1 }
                ]}
            >
                <Text style={styles.actionText}>RESOLVE ACTION</Text>
                <Ionicons name="arrow-forward" size={20} color="#FFF" />
            </Pressable>
        );
    }

    return (
        <View style={[styles.infoBanner, { backgroundColor: widgetBg }]}>
            <Ionicons name="information-circle" size={18} color={mutedColor} />
            <Text style={[styles.infoBannerText, { color: mutedColor }]}>
                This is a permanent medical record for your information.
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    heroSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 32,
        marginTop: 8,
    },
    titleSection: { flex: 1, paddingRight: 20 },
    editorialSubtitle: {
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 2,
        marginBottom: 8,
    },
    mainTitle: {
        fontSize: 30,
        fontWeight: '900',
        letterSpacing: -1.2,
        lineHeight: 36,
    },
    urgencySeal: {
        width: 72,
        height: 72,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 5,
    },
    briefingWidget: {
        padding: 28,
        borderRadius: 36,
        marginBottom: 16,
    },
    messageText: {
        fontSize: 17,
        fontWeight: '500',
        lineHeight: 26,
        letterSpacing: -0.2,
    },
    gridContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
    },
    dataSquare: {
        flex: 1,
        padding: 20,
        borderRadius: 32,
    },
    gridLabel: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1.5,
        marginTop: 12,
        marginBottom: 4,
    },
    gridValue: {
        fontSize: 15,
        fontWeight: '900',
        letterSpacing: -0.3,
    },
    timestampRow: {
        paddingTop: 16,
        borderTopWidth: 1,
        marginBottom: 32,
    },
    fullDate: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1,
        textAlign: 'center',
    },
    primaryAction: {
        height: 64,
        borderRadius: 22,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        shadowColor: COLORS.brandPrimary,
        shadowOpacity: 0.2,
        shadowRadius: 15,
        shadowOffset: { width: 0, height: 10 },
    },
    actionText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: 1,
    },
    infoBanner: {
        padding: 16,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        justifyContent: 'center',
    },
    infoBannerText: {
        fontSize: 12,
        fontWeight: '600',
    }
});
