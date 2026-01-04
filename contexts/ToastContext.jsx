import React, {
	createContext,
	useState,
	useContext,
	useEffect,
	useRef,
} from "react";
import { Text, View, Animated, Image, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import logo from "../assets/logo.png";

const ToastContext = createContext();

export const useToast = () => useContext(ToastContext);

const COLORS = {
	primaryDark: "#0F3D2E",
	primary: "#1E6F5C",
	accent: "#C0D95A",
	success: "#2E7D32",
	error: "#C62828",
	warning: "#ED6C02",
	info: "#1565C0",
};

const ToastProvider = ({ children }) => {
	const [toast, setToast] = useState({
		visible: false,
		message: "",
		type: "info",
		icon: null,
		position: "bottom",
		duration: 2500,
	});

	const opacity = useRef(new Animated.Value(0)).current;

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
	}, [toast.visible]);

	const showToast = (
		message,
		type = "info",
		icon = null,
		position = "bottom",
		duration = 2500
	) => {
		setToast({ visible: true, message, type, icon, position, duration });
	};

	const hideToast = () =>
		setToast((prev) => ({ ...prev, visible: false }));

	const getGradient = () => {
		switch (toast.type) {
			case "success":
				return [COLORS.success, COLORS.primary];
			case "error":
				return [COLORS.error, "#8E0000"];
			case "warning":
				return [COLORS.warning, "#F9A825"];
			case "info":
			default:
				return [COLORS.primaryDark, COLORS.primary];
		}
	};

	const getPositionStyle = () => {
		switch (toast.position) {
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

	const renderIcon = () => {
		if (toast.icon) {
			return <Pressable onPress={hideToast}>{toast.icon}</Pressable>;
		}

		const iconProps = { size: 22, color: COLORS.accent };

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
		<ToastContext.Provider value={{ showToast, hideToast }}>
			{children}

			{toast.visible && (
				<Animated.View
					style={[
						{
							opacity,
							position: "absolute",
							zIndex: 50,
							elevation: 6,
						},
						getPositionStyle(),
					]}
				>
					<LinearGradient
						colors={getGradient()}
						start={{ x: 0, y: 0 }}
						end={{ x: 1, y: 1 }}
						className="rounded-2xl px-4 py-3"
					>
						<View className="flex-row items-center">
							<View
								style={{
									width: 36,
									height: 36,
									borderRadius: 9999,
									alignItems: "center",
									justifyContent: "center",
									backgroundColor: "rgba(255,255,255,0.15)",
									borderWidth: 1,
									borderColor: COLORS.accent,
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
									color: "#FFFFFF",
									fontSize: 15,
									fontWeight: "600",
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

export default ToastProvider;
