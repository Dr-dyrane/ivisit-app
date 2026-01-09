import React from "react";
import { View, Image, Pressable } from "react-native";
import EmergencySearchBar from "../EmergencySearchBar";
import MiniProfileModal from "../MiniProfileModal";
import { COLORS } from "../../../constants/colors";

export default function EmergencySheetTopRow({
	searchValue,
	onSearchChange,
	onSearchFocus,
	onSearchClear,
	placeholder,
	avatarSource,
	onAvatarPress,
	showProfileModal,
	onCloseProfileModal,
}) {
	return (
		<>
			<View style={{ flexDirection: "row", alignItems: "flex-start" }}>
				<EmergencySearchBar
					value={searchValue}
					onChangeText={onSearchChange}
					onFocus={onSearchFocus}
					onClear={onSearchClear}
					placeholder={placeholder}
					style={{ flex: 1 }}
				/>
				<Pressable
					onPress={onAvatarPress}
					style={({ pressed }) => ({
						width: 52,
						height: 52,
						marginLeft: 10,
						alignItems: "center",
						justifyContent: "center",
						transform: [{ scale: pressed ? 0.95 : 1 }],
					})}
				>
					<Image
						source={avatarSource}
						style={{
							width: 48,
							height: 48,
							borderRadius: 24,
							borderWidth: 2,
							borderColor: COLORS.brandPrimary,
						}}
					/>
				</Pressable>
			</View>

			<MiniProfileModal visible={showProfileModal} onClose={onCloseProfileModal} />
		</>
	);
}

