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
import logo from "../assets/logo.png"; // Replace with your actual logo

const ToastContext = createContext();

export const useToast = () => {
	return useContext(ToastContext);
};

const ToastProvider = ({ children }) => {
	const [toast, setToast] = useState({
		visible: false,
		message: "",
		type: "info",
		icon: null,
		position: "bottom",
		duration: 2000,
	});

	const opacity = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		if (toast.visible) {
			Animated.timing(opacity, {
				toValue: 1,
				duration: 500,
				useNativeDriver: true,
			}).start();

			const timer = setTimeout(() => hideToast(), toast.duration);
			return () => clearTimeout(timer);
		} else {
			Animated.timing(opacity, {
				toValue: 0,
				duration: 500,
				useNativeDriver: true,
			}).start();
		}
	}, [toast.visible]);

	const showToast = (
		message,
		type = "info",
		icon = null,
		position = "bottom",
		duration = 3000
	) => {
		setToast({
			visible: true,
			message,
			type,
			icon,
			position,
			duration,
		});
	};

	const hideToast = () => {
		setToast((prevToast) => ({
			...prevToast,
			visible: false,
		}));
	};

	const getBackgroundColor = () => {
		switch (toast.type) {
			case "success":
				return ["#008773", "#4CAF50"];
			case "error":
				return ["#F44336", "#E57373"];
			case "info":
				return ["#2196F3", "#64B5F6"];
			case "warning":
				return ["#FF9800", "#FFB74D"];
			default:
				return ["#333", "#555"];
		}
	};

	const getPositionStyle = () => {
		switch (toast.position) {
			case "top":
				return { top: 40, left: 20, right: 20 };
			case "center":
				return {
					top: "50%",
					left: 20,
					right: 20,
					transform: [{ translateY: -50 }],
				};
			case "bottom":
			default:
				return { bottom: 20, left: 20, right: 20 };
		}
	};

	const renderIcon = () => {
		let icon;

		if (toast.icon) {
			icon = toast.icon; // If a custom icon is passed
		} else {
			switch (toast.type) {
				case "success":
					icon = <Ionicons name="checkmark-circle" size={24} color="white" />;
					break;
				case "error":
					icon = <MaterialIcons name="error" size={24} color="white" />;
					break;
				case "info":
					icon = <Ionicons name="information-circle" size={24} color="white" />;
					break;
				case "warning":
					icon = <MaterialIcons name="warning" size={24} color="white" />;
					break;
				default:
					icon = null;
			}
		}

		return <Pressable onPress={hideToast}>{icon}</Pressable>;
	};

	return (
		<ToastContext.Provider value={{ showToast, hideToast }}>
			{children}
			{toast.visible && (
				<Animated.View
					style={[{ opacity, elevation: 5 }, getPositionStyle()]}
					className="absolute z-50 rounded-2xl"
				>
					<LinearGradient
						colors={getBackgroundColor()}
						className="rounded-2xl p-3 py-2"
					>
						<View className="flex-row items-center justify-between">
							<View
								style={{
									padding: 4,
									borderWidth: 1,
									borderColor: "rgba(192, 217, 90, 0.5)",
									borderRadius: 9999,
									marginRight: 12,
									backgroundColor: "rgba(255, 255, 255, 0.5)",
								}}
							>
								<Image
									source={logo}
									style={{ width: 24, height: 24 }}
									resizeMode="contain"
								/>
							</View>

							<Text className="text-white text-base font-semibold ml-2">
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
