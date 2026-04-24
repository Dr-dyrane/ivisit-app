import React from "react";
import { View, Text, Pressable, Modal, ScrollView, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ProfileField from "../../form/ProfileField";
import { COLORS } from "../../../constants/colors";

// PULLBACK NOTE: ProfileModals - Modular modal components
// Extracted from ProfileScreen to follow /map module pattern
// REASON: Separation of concerns, easier debugging and maintenance

export default function ProfileModals({
	isPersonalInfoModalOpen,
	setIsPersonalInfoModalOpen,
	isDeleteAccountModalOpen,
	setIsDeleteAccountModalOpen,
	colors,
	formState,
	saveProfile,
	deleteAccount,
	isDeleting,
}) {
	const {
		fullName, setFullName,
		username, setUsername,
		gender, setGender,
		email, setEmail,
		phone, setPhone,
		address, setAddress,
		dateOfBirth, setDateOfBirth,
	} = formState;

	return (
		<>
			{/* Personal Information Modal */}
			<Modal
				visible={isPersonalInfoModalOpen}
				animationType="slide"
				transparent={true}
				onRequestClose={() => setIsPersonalInfoModalOpen(false)}
			>
				<View style={styles.modalOverlay}>
					<View style={[styles.modalContent, { backgroundColor: colors.card }]}>
						<View style={styles.modalHeader}>
							<Text style={[styles.modalTitle, { color: colors.text }]}>
								Personal Information
							</Text>
							<Pressable onPress={() => setIsPersonalInfoModalOpen(false)}>
								<Ionicons name="close" size={24} color={colors.text} />
							</Pressable>
						</View>
						<ScrollView style={styles.modalBody}>
							<ProfileField
								label="Full Name"
								value={fullName}
								onChange={setFullName}
								iconName="person-outline"
							/>
							<ProfileField
								label="Username"
								value={username}
								onChange={setUsername}
								iconName="at-outline"
							/>
							<ProfileField
								label="Gender"
								value={gender}
								onChange={setGender}
								iconName="transgender-outline"
							/>
							<ProfileField
								label="Email Address"
								value={email}
								onChange={setEmail}
								iconName="mail-outline"
								keyboardType="email-address"
							/>
							<ProfileField
								label="Phone Number"
								value={phone}
								onChange={setPhone}
								iconName="call-outline"
								keyboardType="phone-pad"
							/>
							<ProfileField
								label="Address"
								value={address}
								onChange={setAddress}
								iconName="location-outline"
							/>
							<ProfileField
								label="Date of Birth"
								value={dateOfBirth}
								onChange={setDateOfBirth}
								iconName="calendar-outline"
							/>
						</ScrollView>
						<View style={styles.modalFooter}>
							<Pressable
								style={[styles.modalButton, { backgroundColor: COLORS.brandPrimary }]}
								onPress={async () => {
									await saveProfile();
									setIsPersonalInfoModalOpen(false);
								}}
							>
								<Text style={styles.modalButtonText}>Save</Text>
							</Pressable>
						</View>
					</View>
				</View>
			</Modal>

			{/* Delete Account Modal */}
			<Modal
				visible={isDeleteAccountModalOpen}
				animationType="fade"
				transparent={true}
				onRequestClose={() => setIsDeleteAccountModalOpen(false)}
			>
				<View style={styles.modalOverlay}>
					<View style={[styles.modalContent, styles.smallModalContent, { backgroundColor: colors.card }]}>
						<View style={styles.modalHeader}>
							<Text style={[styles.modalTitle, { color: colors.text }]}>
								Delete Account
							</Text>
							<Pressable onPress={() => setIsDeleteAccountModalOpen(false)}>
								<Ionicons name="close" size={24} color={colors.text} />
							</Pressable>
						</View>
						<Text style={[styles.modalText, { color: colors.text }]}>
							This action cannot be undone. Your data will be permanently removed.
						</Text>
						<View style={styles.modalFooter}>
							<Pressable
								style={[styles.modalButton, styles.cancelButton, { borderColor: colors.text }]}
								onPress={() => setIsDeleteAccountModalOpen(false)}
							>
								<Text style={[styles.modalButtonText, styles.cancelButtonText, { color: colors.text }]}>
									Cancel
								</Text>
							</Pressable>
							<Pressable
								style={[styles.modalButton, styles.deleteButton, { backgroundColor: COLORS.error }]}
								onPress={async () => {
									await deleteAccount();
									setIsDeleteAccountModalOpen(false);
								}}
								disabled={isDeleting}
							>
								<Text style={styles.modalButtonText}>
									{isDeleting ? "Deleting..." : "Delete"}
								</Text>
							</Pressable>
						</View>
					</View>
				</View>
			</Modal>
		</>
	);
}

const styles = StyleSheet.create({
	modalOverlay: {
		flex: 1,
		backgroundColor: "rgba(0, 0, 0, 0.5)",
		justifyContent: "center",
		alignItems: "center",
		padding: 20,
	},
	modalContent: {
		width: "100%",
		maxHeight: "80%",
		borderRadius: 24,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.15,
		shadowRadius: 12,
		elevation: 8,
	},
	smallModalContent: {
		maxHeight: null,
	},
	modalHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		padding: 20,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: "rgba(0, 0, 0, 0.1)",
	},
	modalTitle: {
		fontSize: 20,
		fontWeight: "900",
		letterSpacing: -0.5,
	},
	modalBody: {
		padding: 20,
		maxHeight: "60%",
	},
	modalFooter: {
		padding: 20,
		borderTopWidth: StyleSheet.hairlineWidth,
		borderTopColor: "rgba(0, 0, 0, 0.1)",
	},
	modalButton: {
		padding: 16,
		borderRadius: 16,
		alignItems: "center",
	},
	modalButtonText: {
		color: "#FFFFFF",
		fontSize: 16,
		fontWeight: "900",
		letterSpacing: -0.5,
	},
	cancelButton: {
		backgroundColor: "transparent",
		borderWidth: 1,
		marginRight: 8,
		flex: 1,
	},
	cancelButtonText: {
		color: "#0F172A",
	},
	deleteButton: {
		flex: 1,
	},
	modalText: {
		fontSize: 15,
		lineHeight: 22,
		padding: 20,
		textAlign: "center",
	},
});
