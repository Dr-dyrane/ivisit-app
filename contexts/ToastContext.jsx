import React, {
	createContext,
	useState,
	useContext,
	useEffect,
	useRef,
	useCallback,
	useMemo,
} from "react";
import { Text, View, Animated, Image, Platform, Pressable, StyleSheet } from "react-native";

import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import logo from "../assets/logo.png";
import { COLORS } from "../constants/colors";
import { useTheme } from "../contexts/ThemeContext";
import useWebViewportMetrics from "../hooks/ui/useWebViewportMetrics";

const ToastContext = createContext();

export const useToast = () => useContext(ToastContext);

const ToastProvider = ({ children }) => {
	const [toast, setToast] = useState({
		visible: false,
		message: "",
		type: "info",
		icon: null,
		position: "auto",
		duration: 2500,
	});

	const opacity = useRef(new Animated.Value(0)).current;
	const { isDarkMode } = useTheme();
	const webViewport = useWebViewportMetrics();
	const isWeb = Platform.OS === "web";
	const webWidth = webViewport.visibleWidth || webViewport.layoutWidth || 390;
	const isWebDesktop = isWeb && webWidth >= 768;

	const hideToast = useCallback(() => {
		setToast((prev) => ({ ...prev, visible: false }));
	}, []);

	useEffect(() => {
		Animated.timing(opacity, {
			toValue: toast.visible ? 1 : 0,
			duration: 300,
			useNativeDriver: true,
		}).start();

		if (toast.visible) {
			const timer = setTimeout(hideToast, toast.duration);
			return () => clearTimeout(timer);
		}
	}, [hideToast, opacity, toast.duration, toast.visible]);

	const showToast = useCallback((
		message,
		type = "info",
		icon = null,
		position = "auto",
		duration = 2500
	) => {
		setToast({ visible: true, message, type, icon, position, duration });
	}, []);

	const getStyleForType = () => {
		switch (toast.type) {
			case "success":
				return {
					gradient: [COLORS.success, "#1B5E20"],
					iconColor: "#FFFFFF",
					circleBg: isDarkMode ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.15)",
					circleBorder: COLORS.success,
					textColor: "#FFFFFF",
				};
			case "error":
				return {
					gradient: [COLORS.error, "#8E0000"],
					iconColor: "#FFFFFF",
					circleBg: isDarkMode ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.15)",
					circleBorder: COLORS.error,
					textColor: "#FFFFFF",
				};
			case "warning":
				return {
					gradient: [COLORS.warning, "#D97706"],
					iconColor: "#111827",
					circleBg: isDarkMode ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.15)",
					circleBorder: COLORS.warning,
					textColor: isDarkMode ? "#FFFFFF" : "#111827",
				};
			case "info":
			default:
				return {
					gradient: [COLORS.brandPrimary, COLORS.brandSecondary],
					iconColor: "#FFFFFF",
					circleBg: isDarkMode ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.15)",
					circleBorder: COLORS.brandSecondary,
					textColor: "#FFFFFF",
				};
		}
	};
	const STYLE = getStyleForType();

	const getPositionStyle = () => {
		const resolvedPosition =
			toast.position === "auto"
				? isWebDesktop
					? "top"
					: "bottom"
				: toast.position;

		if (isWeb) {
			const leftInset = Math.max(14, webViewport.leftInset + 14);
			const rightInset = Math.max(16, webViewport.rightInset + 18);
			const bottomInset = Math.max(18, webViewport.bottomInset + 18);
			const topInset = Math.max(18, webViewport.topInset + 18);
			const availableWidth = Math.max(0, webWidth - leftInset - rightInset);
			const webToastWidth = Math.min(420, availableWidth);

			if (resolvedPosition === "center") {
				return {
					top: "50%",
					left: "50%",
					width: webToastWidth,
					transform: [
						{ translateX: -(webToastWidth / 2) },
						{ translateY: -40 },
					],
				};
			}

			if (isWebDesktop) {
				return {
					top: resolvedPosition === "top" ? topInset : undefined,
					bottom: resolvedPosition === "bottom" ? bottomInset : undefined,
					right: rightInset,
					width: webToastWidth,
				};
			}

			return {
				top: resolvedPosition === "top" ? topInset : undefined,
				bottom: resolvedPosition === "bottom" ? bottomInset : undefined,
				left: leftInset,
				right: rightInset,
			};
		}

		switch (resolvedPosition) {
			case "top":
				return { top: 48, left: 16, right: 16 };
			case "center":
				return {
					top: "50%",
					left: 16,
					right: 16,
					transform: [{ translateY: -40 }],
				};
			case "bottom":
			default:
				return { bottom: 32, left: 16, right: 16 };
		}
	};

	const containerStyle = useMemo(
		() => [
			styles.toastHost,
			isWeb ? { position: "fixed" } : styles.nativeToastHost,
			{ opacity },
			getPositionStyle(),
		],
		[
			isWeb,
			isWebDesktop,
			opacity,
			toast.position,
			webWidth,
			webViewport.bottomInset,
			webViewport.leftInset,
			webViewport.rightInset,
			webViewport.topInset,
		],
	);

	const contextValue = useMemo(
		() => ({ showToast, hideToast }),
		[hideToast, showToast],
	);

	const renderIcon = () => {
		if (toast.icon) {
			return <Pressable onPress={hideToast}>{toast.icon}</Pressable>;
		}

		const iconProps = { size: 22, color: STYLE.iconColor }; // Use dynamic icon color

		switch (toast.type) {
			case "success":
				return (
					<Pressable onPress={hideToast}>
						<Ionicons name="checkmark-circle" {...iconProps} />
					</Pressable>
				);
			case "error":
				return (
					<Pressable onPress={hideToast}>
						<MaterialIcons name="error" {...iconProps} />
					</Pressable>
				);
			case "warning":
				return (
					<Pressable onPress={hideToast}>
						<MaterialIcons name="warning" {...iconProps} />
					</Pressable>
				);
			default:
				return (
					<Pressable onPress={hideToast}>
						<Ionicons name="information-circle" {...iconProps} />
					</Pressable>
				);
		}
	};

	return (
		<ToastContext.Provider value={contextValue}>
			{children}

			{toast.visible && (
				<Animated.View
					accessibilityLiveRegion="polite"
					accessibilityRole="alert"
					pointerEvents="box-none"
					style={containerStyle}
				>
					<LinearGradient
						colors={STYLE.gradient}
						start={{ x: 0, y: 0 }}
						end={{ x: 1, y: 1 }}
						style={styles.toastSurface}
					>
						<View style={styles.toastContent}>
							<View
								style={{
									width: 36,
									height: 36,
									borderRadius: 9999,
									alignItems: "center",
									justifyContent: "center",
									backgroundColor: STYLE.circleBg,
									borderWidth: 1,
									borderColor: STYLE.circleBorder,
									marginRight: 12,
								}}
							>
								<Image
									source={logo}
									style={{ width: 22, height: 22 }}
									resizeMode="contain"
								/>
							</View>

							<Text
								style={{
									flex: 1,
									color: STYLE.textColor,
									fontSize: 15,
									fontWeight:'400',
									lineHeight: 20,
								}}
							>
								{toast.message}
							</Text>

							{renderIcon()}
						</View>
					</LinearGradient>
				</Animated.View>
			)}
		</ToastContext.Provider>
	);
};

const styles = StyleSheet.create({
	toastHost: {
		zIndex: 2147483000,
	},
	nativeToastHost: {
		position: "absolute",
		elevation: 6,
	},
	toastSurface: {
		borderRadius: 20,
		overflow: "hidden",
		paddingHorizontal: 16,
		paddingVertical: 12,
	},
	toastContent: {
		flexDirection: "row",
		alignItems: "center",
	},
});

export default ToastProvider;
