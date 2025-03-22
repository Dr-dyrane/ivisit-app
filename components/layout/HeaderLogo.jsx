// components/layout/HeaderLogo.js

import React from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";

const HeaderLogo = () => {
	const router = useRouter();
	const handleLogoPress = () => {
		if (router.canGoBack()) {
			// Go back to the previous screen
			router.back();
		} else {
			// Navigate to a default route, e.g., home
			router.push("/welcome"); // Change '/' to the appropriate route if needed
		}
	};
	return (
		<TouchableOpacity
			onPress={handleLogoPress}
			accessible={true}
			accessibilityLabel="Back to previous screen"
			className="flex flex-row items-center justify-center"
		>
			<View className="flex flex-row items-center justify-center max-w-[40vw]">
				<Image
					source={require("../../assets/logo.png")}
					className="ml-1 w-5 h-5"
					resizeMode="contain"
				/>
				<Text numberOfLines={2} className="text-2xl text-primary font-bold max-w-[160px]">
					iVisit
				</Text>
			</View>
		</TouchableOpacity>
	);
};

export default HeaderLogo;
