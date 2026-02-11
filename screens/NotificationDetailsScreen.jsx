"use client";

import React from "react";
import { StyleSheet, Animated } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS } from "../constants/colors";
import { useNotificationDetailsLogic } from "../hooks/notifications/useNotificationDetailsLogic";
import {
    NotificationHero,
    NotificationBriefing,
    NotificationMetadata,
    NotificationFooter,
    NotificationActions
} from "../components/notifications/NotificationUI";

const NotificationDetailsScreen = () => {
    const { state, actions } = useNotificationDetailsLogic();

    if (!state.notification) return null;

    return (
        <LinearGradient
            colors={state.isDarkMode ? [COLORS.bgDark, COLORS.bgDarkAlt] : [COLORS.bgLight, COLORS.bgLightAlt]}
            style={{ flex: 1 }}
        >
            <Animated.ScrollView
                style={{ opacity: state.fadeAnim, transform: [{ translateY: state.slideAnim }] }}
                contentContainerStyle={[styles.content, { paddingTop: state.topPadding, paddingBottom: state.bottomPadding }]}
                showsVerticalScrollIndicator={false}
                onScroll={actions.handleScroll}
                scrollEventThrottle={16}
            >
                <NotificationHero
                    notification={state.notification}
                    priorityColor={state.priorityColor}
                    textColor={state.textColor}
                    notificationIcon={state.notificationIcon}
                />

                <NotificationBriefing
                    message={state.notification.message}
                    widgetBg={state.widgetBg}
                    textColor={state.textColor}
                />

                <NotificationMetadata
                    notification={state.notification}
                    widgetBg={state.widgetBg}
                    mutedColor={state.mutedColor}
                    textColor={state.textColor}
                    getRelativeTime={actions.getRelativeTime}
                />

                <NotificationFooter
                    timestamp={state.notification.timestamp}
                    mutedColor={state.mutedColor}
                    isDarkMode={state.isDarkMode}
                />

                <NotificationActions
                    actionType={state.notification.actionType}
                    onPress={actions.handleActionPress}
                    widgetBg={state.widgetBg}
                    mutedColor={state.mutedColor}
                />
            </Animated.ScrollView>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    content: { paddingHorizontal: 24 },
});

export default NotificationDetailsScreen;
