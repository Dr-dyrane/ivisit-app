import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../contexts/ThemeContext";
import { useToast } from "../../contexts/ToastContext";
import { COLORS } from "../../constants/colors";
import SetPasswordCard from "../../components/login/SetPasswordCard";
import { authService } from "../../services/authService";

export default function ResetPasswordRoute() {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const { showToast } = useToast();
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const bootstrapReset = async () => {
      try {
        const currentUrl =
          typeof window !== "undefined" ? window.location.href : await Linking.getInitialURL();

        if (currentUrl && (currentUrl.includes("code=") || currentUrl.includes("access_token="))) {
          await authService.handleOAuthCallback(currentUrl);
        }

        if (isMounted) {
          setReady(true);
        }
      } catch (bootstrapError) {
        if (isMounted) {
          setError("Reset link expired. Request a new password reset.");
        }
      }
    };

    bootstrapReset();
    return () => {
      isMounted = false;
    };
  }, []);

  const handlePasswordSet = async (password) => {
    setLoading(true);
    setError(null);

    try {
      await authService.resetPassword({ newPassword: password });
      showToast("Password updated", "success");
      router.replace("/(user)/(tabs)");
    } catch (resetError) {
      setError(resetError?.message || "Unable to update password");
      showToast(resetError?.message || "Unable to update password", "error");
    } finally {
      setLoading(false);
    }
  };

  const colors = {
    bg: isDarkMode ? COLORS.bgDark : "#F5F7FB",
    surface: isDarkMode ? COLORS.bgDarkAlt : "#FFFFFF",
    text: isDarkMode ? COLORS.bgLight : COLORS.textPrimary,
    muted: isDarkMode ? COLORS.textMutedDark : COLORS.textMuted,
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bg,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 24,
      }}
    >
      <View
        style={{
          width: "100%",
          maxWidth: 520,
          backgroundColor: colors.surface,
          borderRadius: 32,
          padding: 28,
          shadowColor: "#0F172A",
          shadowOpacity: 0.1,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 18 },
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 20 }}>
          <Ionicons
            name="shield-checkmark-outline"
            size={22}
            color={COLORS.brandPrimary}
            style={{ marginRight: 10 }}
          />
          <Text style={{ color: COLORS.brandPrimary, fontSize: 13, fontWeight: "800", letterSpacing: 1.4 }}>
            SECURE ACCESS
          </Text>
        </View>

        <Text style={{ color: colors.text, fontSize: 34, fontWeight: "900", letterSpacing: -1.2, marginBottom: 12 }}>
          Set a new password
        </Text>
        <Text style={{ color: colors.muted, fontSize: 16, lineHeight: 24, marginBottom: 24 }}>
          Finish recovery and continue to iVisit.
        </Text>

        {!ready ? (
          <View style={{ paddingVertical: 40, alignItems: "center" }}>
            <ActivityIndicator size="large" color={COLORS.brandPrimary} />
            <Text style={{ marginTop: 16, color: colors.muted, fontSize: 15 }}>
              Preparing secure reset...
            </Text>
          </View>
        ) : (
          <>
            {error ? (
              <View
                style={{
                  backgroundColor: `${COLORS.error}12`,
                  borderRadius: 20,
                  padding: 16,
                  marginBottom: 18,
                }}
              >
                <Text style={{ color: COLORS.error, fontSize: 14, lineHeight: 20 }}>{error}</Text>
              </View>
            ) : null}

            <SetPasswordCard onPasswordSet={handlePasswordSet} loading={loading} />

            <Pressable onPress={() => router.replace("/(auth)/login")} style={{ marginTop: 20 }}>
              <Text style={{ color: COLORS.brandPrimary, fontSize: 14, fontWeight: "700", textAlign: "center" }}>
                Back to sign in
              </Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}
