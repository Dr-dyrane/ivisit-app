// PULLBACK NOTE: Extract theme config following map sheets pattern
// OLD: Colors defined inline in orchestrator
// NEW: Centralized theme config file
// REASON: Separate config/theme from orchestrator logic

export function createPaymentScreenTheme({ isDarkMode }) {
  return {
    text: isDarkMode ? "#FFFFFF" : "#0F172A",
    textMuted: isDarkMode ? "#94A3B8" : "#64748B",
    card: isDarkMode ? "rgba(30, 41, 59, 0.7)" : "rgba(255, 255, 255, 0.8)",
    inputBg: isDarkMode ? "#0B0F1A" : "#F3F4F6",
    background: isDarkMode ? ["#0B0F1A", "#1E1B4B", "#0B0F1A"] : ["#FFFFFF", "#F3F4F6", "#FFFFFF"],
    border: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)"
  };
}
