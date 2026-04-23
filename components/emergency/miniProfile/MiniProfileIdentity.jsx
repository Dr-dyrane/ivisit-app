import { Image, Pressable, StyleSheet, Text, View } from "react-native";

export default function MiniProfileIdentity({
	user,
	titleText,
	subtitleText,
	colors,
	layout,
	onPress,
}) {
	return (
		<Pressable
			onPress={onPress}
			style={({ pressed }) => [
				styles.identityBlock,
				{
					marginBottom: layout.identity.marginBottom,
					backgroundColor: pressed ? colors.pressBg : "transparent",
					borderRadius: 24, // restored squircle
					paddingVertical: 12,

 // restored from 8

					paddingHorizontal: 16,
				},

				pressed ? styles.identityPressed : null,
			]}
		>

			<View
				style={[
					styles.avatarWrap,
					{
						width: layout.identity.avatarSize,
						height: layout.identity.avatarSize,
						marginBottom: layout.identity.avatarMarginBottom,
						backgroundColor: colors.cardStrong,
					},
				]}
			>
				<Image
					source={
						user?.imageUri
							? { uri: user.imageUri }
							: require("../../../assets/profile.jpg")
					}
					style={[
						styles.avatarImage,
						{
							width: layout.identity.avatarSize,
							height: layout.identity.avatarSize,
						},
					]}
				/>
			</View>
			<Text
				style={[
					styles.userName,
					{
						color: colors.text,
						fontSize: layout.identity.nameSize,
						lineHeight: layout.identity.nameLineHeight,
						fontWeight: layout.identity.nameWeight,
					},
				]}
				numberOfLines={1}
			>
				{titleText}
			</Text>
			<Text
				style={[
					styles.userEmail,
					{
						color: colors.muted,
						fontSize: layout.identity.emailSize,
						lineHeight: layout.identity.emailLineHeight,
						fontWeight: layout.identity.emailWeight,
					},
				]}
				numberOfLines={1}
			>
				{subtitleText}
			</Text>
		</Pressable>
	);
}

const styles = StyleSheet.create({
	identityBlock: {
		alignItems: "center",
	},
	identityPressed: {
		opacity: 0.92,
		transform: [{ scale: 0.99 }],
	},


	avatarWrap: {
		borderRadius: 999,
		alignItems: "center",
		justifyContent: "center",
	},
	avatarImage: {
		borderRadius: 999,
	},
	userName: {
		maxWidth: "92%",
		letterSpacing: -0.58,
		textAlign: "center",
	},
	userEmail: {
		maxWidth: "86%",
		marginTop: 4,
		textAlign: "center",
	},
});
