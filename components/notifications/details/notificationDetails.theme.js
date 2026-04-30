import { createNotificationsScreenTheme } from "../notificationsScreen.theme";

export function createNotificationDetailsTheme({ isDarkMode }) {
  const base = createNotificationsScreenTheme({ isDarkMode });
  return {
    ...base,
    heroSurface: isDarkMode
      ? "rgba(255,255,255,0.05)"
      : "rgba(15,23,42,0.04)",
    actionSurface: isDarkMode
      ? "rgba(134,16,14,0.16)"
      : "rgba(134,16,14,0.08)",
  };
}

export default createNotificationDetailsTheme;
