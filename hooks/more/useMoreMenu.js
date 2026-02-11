import { useMemo } from "react";
import { Platform } from "react-native";
import { STACK_TOP_PADDING } from "../../constants/layout";
import {
    navigateToEmergencyContacts,
    navigateToHelpSupport,
    navigateToInsurance,
    navigateToMedicalProfile,
    navigateToNotifications,
    navigateToSettings,
} from "../../utils/navigationHelpers";

export const useMoreMenu = (router, isDarkMode, insets) => {
    const healthItems = useMemo(() => [
        {
            title: "Medical Profile",
            icon: "fitness-outline",
            description: "Blood type, allergies, conditions",
            action: () => navigateToMedicalProfile({ router }),
        },
        {
            title: "Emergency Contacts",
            icon: "people-outline",
            description: "Family & emergency responders",
            action: () => navigateToEmergencyContacts({ router }),
        },
        {
            title: "Insurance",
            icon: "shield-checkmark-outline",
            description: "Coverage & claims",
            action: () => navigateToInsurance({ router }),
        },
    ], [router]);

    const settingsItems = useMemo(() => [
        {
            title: "Notifications",
            icon: "notifications-outline",
            description: "Alerts & reminders",
            action: () => navigateToNotifications({ router }),
        },
        {
            title: "Settings",
            icon: "settings-outline",
            description: "App preferences",
            action: () => navigateToSettings({ router }),
        },
        {
            title: "Help & Support",
            icon: "help-circle-outline",
            description: "FAQs & contact us",
            action: () => navigateToHelpSupport({ router }),
        },
    ], [router]);

    const layout = {
        topPadding: STACK_TOP_PADDING,
        bottomPadding: (Platform.OS === "ios" ? 85 + insets.bottom : 70) + 20,
        colors: {
            text: isDarkMode ? "#FFFFFF" : "#0F172A",
            textMuted: isDarkMode ? "#94A3B8" : "#64748B",
            card: isDarkMode ? "#0B0F1A" : "#F3E7E7",
            backgrounds: isDarkMode ? ["#121826", "#0B0F1A", "#121826"] : ["#FFFFFF", "#F3E7E7", "#FFFFFF"],
        }
    };

    return { healthItems, settingsItems, layout };
};
