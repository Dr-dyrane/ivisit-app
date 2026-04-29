// PULLBACK NOTE: EmergencyContacts theme tokens.
// Owns: the surface palette shared by compact and wide variants so new layouts do not drift from the same visual contract.

export const createEmergencyContactsTheme = ({ isDarkMode }) => ({
  background: isDarkMode
    ? ["#121826", "#0B0F1A", "#121826"]
    : ["#FFFFFF", "#F3E7E7", "#FFFFFF"],
  text: isDarkMode ? "#FFFFFF" : "#0F172A",
  muted: isDarkMode ? "#94A3B8" : "#64748B",
  card: isDarkMode ? "#0B0F1A" : "#FFFFFF",
  panel: isDarkMode ? "rgba(11,15,26,0.94)" : "rgba(255,255,255,0.96)",
  border: isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)",
  accentSoft: isDarkMode ? "rgba(134,16,14,0.16)" : "rgba(134,16,14,0.08)",
  successSoft: isDarkMode ? "rgba(16,185,129,0.16)" : "rgba(16,185,129,0.1)",
  warningSoft: isDarkMode ? "rgba(245,158,11,0.18)" : "rgba(245,158,11,0.12)",
  ghostSurface: isDarkMode ? "rgba(8,15,27,0.74)" : "rgba(248,250,252,0.76)",
});

export default createEmergencyContactsTheme;
