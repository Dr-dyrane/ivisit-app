// components/emergency/ServiceRatingUI.jsx
import React from "react";
import { View, Text, Pressable, TextInput, StyleSheet, Platform, Animated, Keyboard } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { COLORS } from "../../constants/colors";

export const RatingModalBackdrop = ({ fadeAnim, isDarkMode, onClose, keyboardHeight }) => (
    <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
        <Pressable
            style={styles.flex1}
            onPress={() => {
                if (keyboardHeight > 0) {
                    Keyboard.dismiss();
                    return;
                }
                onClose();
            }}
        />
        {Platform.OS === "ios" ? (
            <BlurView
                intensity={20}
                tint={isDarkMode ? "dark" : "light"}
                style={StyleSheet.absoluteFillObject}
            />
        ) : (
            <View
                style={[
                    StyleSheet.absoluteFillObject,
                    { backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)' }
                ]}
            />
        )}
    </Animated.View>
);

export const RatingHeader = ({ title, subtitle, icon, colors }) => (
    <View style={styles.headerContainer}>
        <View style={[styles.iconWrapper, { backgroundColor: `${colors.accent}15` }]}>
            <Ionicons name={icon} size={32} color={colors.accent} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        {subtitle && (
            <Text style={[styles.subtitle, { color: colors.subtext }]}>{subtitle}</Text>
        )}
    </View>
);

export const ServiceDetailsCard = ({ details, colors }) => {
    if (!details) return null;
    return (
        <View style={[styles.detailsCard, { backgroundColor: colors.card }]}>
            {details.provider && (
                <DetailRow icon="person" text={details.provider} colors={colors} />
            )}
            {details.hospital && (
                <DetailRow icon="business" text={details.hospital} colors={colors} />
            )}
            {details.duration && (
                <DetailRow icon="time" text={details.duration} colors={colors} />
            )}
        </View>
    );
};

const DetailRow = ({ icon, text, colors }) => (
    <View style={styles.detailRow}>
        <Ionicons name={icon} size={16} color={colors.subtext} style={{ marginRight: 12 }} />
        <Text style={[styles.detailText, { color: colors.text }]}>{text}</Text>
    </View>
);

export const StarRating = ({ rating, stars, onRate, serviceTypeLabel, ratingText, colors }) => (
    <View style={styles.ratingSection}>
        <Text style={[styles.ratingLabel, { color: colors.text }]}>
            How was your {serviceTypeLabel}?
        </Text>

        <View style={styles.starsRow}>
            {stars.map((star) => {
                const isActive = star <= rating;
                return (
                    <Pressable
                        key={star}
                        onPress={() => {
                            Keyboard.dismiss();
                            onRate(star);
                        }}
                        style={({ pressed }) => [styles.starButton, { opacity: pressed ? 0.7 : 1 }]}
                    >
                        <Ionicons
                            name={isActive ? "star" : "star-outline"}
                            size={40}
                            color={isActive ? colors.accent : colors.subtext}
                        />
                    </Pressable>
                );
            })}
        </View>

        {rating > 0 && (
            <Text style={[styles.ratingText, { color: colors.accent }]}>
                {ratingText}
            </Text>
        )}
    </View>
);

export const CommentInput = ({ value, onChange, colors }) => (
    <View style={styles.commentSection}>
        <Text style={[styles.commentLabel, { color: colors.text }]}>
            Tell us more (optional)
        </Text>
        <TextInput
            value={value}
            onChangeText={onChange}
            placeholder="Share your experience to help us improve..."
            placeholderTextColor={colors.subtext}
            style={[
                styles.commentInput,
                {
                    color: colors.text,
                    backgroundColor: colors.card,
                }
            ]}
            multiline
        />
    </View>
);

export const RatingActions = ({ onSubmit, onClose, rating, keyboardHeight, colors }) => (
    <View style={styles.actionsContainer}>
        <Pressable
            onPress={() => {
                if (keyboardHeight > 0) {
                    Keyboard.dismiss();
                    return;
                }
                onClose();
            }}
            style={[styles.actionButton, { backgroundColor: colors.card }]}
        >
            <Text style={[styles.actionText, { color: colors.text }]}>Skip</Text>
        </Pressable>

        <Pressable
            onPress={onSubmit}
            disabled={rating < 1}
            style={[
                styles.actionButton,
                {
                    backgroundColor: rating >= 1 ? colors.accent : colors.card,
                    opacity: rating >= 1 ? 1 : 0.5,
                }
            ]}
        >
            <Text
                style={[
                    styles.actionText,
                    { color: rating >= 1 ? COLORS.bgLight : colors.text }
                ]}
            >
                Submit
            </Text>
        </Pressable>
    </View>
);

const styles = StyleSheet.create({
    backdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    flex1: { flex: 1 },
    headerContainer: { alignItems: 'center', marginBottom: 32 },
    iconWrapper: {
        width: 64,
        height: 64,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 30,
        fontWeight: '900',
        letterSpacing: -1.2,
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: { fontSize: 16, textAlign: 'center' },
    detailsCard: { borderRadius: 16, padding: 16, marginBottom: 24 },
    detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    detailText: { fontSize: 16, fontWeight: '500' },
    ratingSection: { marginBottom: 24 },
    ratingLabel: { fontSize: 18, fontWeight: '600', textAlign: 'center', marginBottom: 24 },
    starsRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 16 },
    starButton: { padding: 8 },
    ratingText: { textAlign: 'center', fontSize: 18, fontWeight: '500', marginBottom: 8 },
    commentSection: { marginBottom: 32 },
    commentLabel: { fontSize: 16, fontWeight: '500', marginBottom: 12 },
    commentInput: {
        borderRadius: 16,
        padding: 16,
        fontSize: 16,
        height: 100,
        textAlignVertical: 'top',
    },
    actionsContainer: { flexDirection: 'row', gap: 12 },
    actionButton: {
        flex: 1,
        height: 56,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionText: { fontSize: 16, fontWeight: '600' },
});
