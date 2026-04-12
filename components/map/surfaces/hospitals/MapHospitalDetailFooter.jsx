import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { styles } from "./mapHospitalDetail.styles";

export default function MapHospitalDetailFooter({ model }) {
	const {
		canCallHospital,
		dockAction,
		handleCallHospital,
		rowSurface,
		titleColor,
	} = model;

	return (
		<View style={styles.actionDock}>
			<View style={styles.compactActionRow}>
				{canCallHospital ? (
					<Pressable onPress={handleCallHospital} style={styles.callActionPressable}>
						{({ pressed }) => (
							<View
								style={[
									styles.callActionButton,
									{
										backgroundColor: rowSurface,
										opacity: pressed ? 0.86 : 1,
									},
								]}
							>
								<Ionicons
									name="call"
									size={20}
									color={titleColor}
									style={styles.callActionIcon}
								/>
							</View>
						)}
					</Pressable>
				) : null}

				<Pressable onPress={dockAction.onPress} style={styles.inlinePrimaryPressable}>
					{({ pressed }) => (
						<View
							style={[
								styles.inlinePrimaryAction,
								pressed ? styles.inlinePrimaryActionPressed : null,
							]}
						>
							<Text style={styles.inlinePrimaryText}>{dockAction.label}</Text>
							<Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
						</View>
					)}
				</Pressable>
			</View>
		</View>
	);
}
