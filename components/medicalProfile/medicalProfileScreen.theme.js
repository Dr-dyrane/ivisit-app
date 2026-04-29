export function createMedicalProfileScreenTheme({ isDarkMode }) {
  return {
    background: isDarkMode ? ["#08111D", "#111827"] : ["#FFF9F7", "#F3E7E7"],
    card: isDarkMode ? "rgba(10,15,26,0.9)" : "rgba(255,255,255,0.94)",
    cardMuted: isDarkMode ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.05)",
    border: isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)",
    text: isDarkMode ? "#FFFFFF" : "#0F172A",
    textMuted: isDarkMode ? "#94A3B8" : "#64748B",
    skeletonBase: isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.07)",
    skeletonSoft: isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.05)",
  };
}
