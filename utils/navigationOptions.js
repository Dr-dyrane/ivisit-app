// utils/navigationOptions.js
import HeaderBackButton from "../components/navigation/HeaderBackButton";
import { useTheme } from "../contexts/ThemeContext";

export const commonScreenOptions = ({ title, headerRight }) => {
	// Use a hook inside a function that returns a component
	const ThemeWrapper = () => {
		const { isDarkMode } = useTheme();

		return {
			title,
			headerLeft: () => <HeaderBackButton />,
			headerTintColor: isDarkMode ? "#fff" : "#000", // Text & icons
			headerShadowVisible: false,
			headerTitleStyle: {
				fontWeight: "bold",
				fontSize: 20,
			},
			headerTitle: "",
			headerStyle: {
				backgroundColor: isDarkMode ? "#0B0F1A" : "#fff", // Dynamic header bg
			},
			headerRight,
			gestureEnabled: true,
			gestureDirection: "horizontal",
		};
	};

	return ThemeWrapper();
};
