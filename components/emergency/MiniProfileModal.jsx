import { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import { useVisits } from "../../contexts/VisitsContext";
import { useToast } from "../../contexts/ToastContext";
import { useEmergencyContacts } from "../../hooks/emergency/useEmergencyContacts";
import useResponsiveSurfaceMetrics from "../../hooks/ui/useResponsiveSurfaceMetrics";
import MapModalShell from "../map/surfaces/MapModalShell";
import MiniProfileIdentity from "./miniProfile/MiniProfileIdentity";
import MiniProfileShortcutGroup from "./miniProfile/MiniProfileShortcutGroup";
import MiniProfileSignOutButton from "./miniProfile/MiniProfileSignOutButton";
import {
	buildDisplayName,
	formatCountBadge,
	getMiniProfileColors,
	getMiniProfileLayout,
	getMiniProfileTones,
} from "./miniProfile/miniProfile.model";
import {
	navigateToEmergencyContacts,
	navigateToPayment,
	navigateToProfile,
	navigateToSettings,
	navigateToVisits,
} from "../../utils/navigationHelpers";
import { waitForMinimumPending } from "../../utils/ui/apiInteractionFeedback";

export default function MiniProfileModal({
	visible,
	onClose,
	onSignOut,
	onOpenRecentVisits,
	showMapShortcut = true,
	preferDrawerPresentation = false,
}) {
	const { isDarkMode } = useTheme();
	const { user } = useAuth();
	const { showToast } = useToast();
	const { visitCounts } = useVisits();
	const { contacts = [], isLoading: contactsLoading } = useEmergencyContacts();
	const router = useRouter();
	const viewportMetrics = useResponsiveSurfaceMetrics({
		presentationMode: preferDrawerPresentation ? "modal" : "sheet",
	});
	const [isSigningOut, setIsSigningOut] = useState(false);

	useEffect(() => {
		if (!visible) {
			setIsSigningOut(false);
		}
	}, [visible]);

	const requestClose = useCallback(
		({ withHaptic = true, afterClose = null, force = false } = {}) => {
			if (isSigningOut && !force) return;
			if (withHaptic) {
				Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
			}
			onClose?.();
			if (typeof afterClose === "function") {
				setTimeout(afterClose, 260);
			}
		},
		[isSigningOut, onClose],
	);

	const executeNav = useCallback(
		(navFn) => {
			if (isSigningOut) return;
			Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
			requestClose({
				withHaptic: false,
				afterClose: () => navFn({ router }),
			});
		},
		[isSigningOut, requestClose, router],
	);

	const executeRecentVisits = useCallback(() => {
		if (isSigningOut) return;
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
		requestClose({
			withHaptic: false,
			afterClose: () => {
				if (typeof onOpenRecentVisits === "function") {
					onOpenRecentVisits();
					return;
				}
				navigateToVisits({ router });
			},
		});
	}, [isSigningOut, onOpenRecentVisits, requestClose, router]);

	const handleOpenMap = useCallback(() => {
		if (isSigningOut) return;
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
		requestClose({
			withHaptic: false,
			afterClose: () => router.replace("/(user)"),
		});
	}, [isSigningOut, requestClose, router]);

	const handleSignOut = useCallback(async () => {
		if (isSigningOut || typeof onSignOut !== "function") return;

		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
		setIsSigningOut(true);

		try {
			const result = await waitForMinimumPending(Promise.resolve(onSignOut()));
			if (result?.success === false) {
				setIsSigningOut(false);
				return;
			}
			requestClose({ withHaptic: false, force: true });
		} catch (error) {
			showToast(error?.message || "Could not sign out right now.", "error");
			setIsSigningOut(false);
		}
	}, [isSigningOut, onSignOut, requestClose, showToast]);

	const displayName = useMemo(() => buildDisplayName(user), [user]);
	const hasName = Boolean(displayName);
	const titleText = hasName ? displayName : "What's your name?";
	const subtitleText =
		user?.email || (hasName ? "Manage your care profile" : "Add your details");
	const visitsTotal = Number(visitCounts?.all || 0);
	const contactsCount = Array.isArray(contacts) ? contacts.length : 0;

	const colors = useMemo(
		() => getMiniProfileColors(isDarkMode),
		[isDarkMode],
	);
	const tones = useMemo(
		() => getMiniProfileTones(isDarkMode),
		[isDarkMode],
	);
	const layout = useMemo(
		() => getMiniProfileLayout(viewportMetrics, { preferDrawerPresentation }),
		[preferDrawerPresentation, viewportMetrics],
	);

	const shortcutGroups = useMemo(() => {
		const careRows = [
			{
				key: "recent-visits",
				label: "Recent Visits",
				icon: "time",
				tone: tones.care,
				badge: formatCountBadge(visitsTotal, "None"),
				onPress: executeRecentVisits,
			},
		];

		if (showMapShortcut) {
			careRows.push({
				key: "map",
				label: "Emergency Map",
				icon: "navigate",
				tone: tones.map,
				badge: "Open",
				onPress: handleOpenMap,
			});
		}

		return [
			careRows,
			[
				{
					key: "profile",
					label: "Profile",
					icon: "person",
					tone: tones.profile,
					badge: hasName ? "Open" : "Add name",
					onPress: () => executeNav(navigateToProfile),
				},
			],
			[
				{
					key: "payment",
					label: "Payment",
					icon: "card",
					tone: tones.payment,
					badge: "Wallet",
					onPress: () => executeNav(navigateToPayment),
				},
				{
					key: "contacts",
					label: "Emergency Contacts",
					icon: "people",
					tone: tones.contacts,
					badge: contactsLoading ? "..." : formatCountBadge(contactsCount, "Add"),
					onPress: () => executeNav(navigateToEmergencyContacts),
				},
			],
			[
				{
					key: "settings",
					label: "Settings",
					icon: "settings",
					tone: tones.system,
					badge: "System",
					onPress: () => executeNav(navigateToSettings),
				},
			],
		];
	}, [
		contactsCount,
		contactsLoading,
		executeNav,
		executeRecentVisits,
		handleOpenMap,
		hasName,
		showMapShortcut,
		tones,
		visitsTotal,
	]);

	return (
		<MapModalShell
			visible={visible}
			onClose={requestClose}
			enableSnapDetents={false}
			matchExpandedSheetHeight={false}
			minHeightRatio={0.6}
			maxHeightRatio={0.88}
			presentationModeOverride={
				preferDrawerPresentation ? "left-drawer" : "bottom-sheet"
			}
			contentContainerStyle={[
				styles.scrollContent,
				{
					paddingHorizontal: layout.content.paddingHorizontal,
					paddingTop: layout.content.paddingTop,
					paddingBottom: layout.content.paddingBottom,
				},
			]}
		>
			<MiniProfileIdentity
				user={user}
				titleText={titleText}
				subtitleText={subtitleText}
				colors={colors}
				layout={layout}
				onPress={() => executeNav(navigateToProfile)}
			/>

			<View style={[styles.groupsWrap, { gap: layout.groups.gap }]}>
				{shortcutGroups.map((rows, groupIndex) => (
					<MiniProfileShortcutGroup
						key={`group-${groupIndex}`}
						rows={rows}
						colors={colors}
						layout={layout}
					/>
				))}
			</View>

			<MiniProfileSignOutButton
				visible={typeof onSignOut === "function"}
				isSigningOut={isSigningOut}
				colors={colors}
				layout={layout}
				onPress={handleSignOut}
			/>
		</MapModalShell>
	);
}

const styles = StyleSheet.create({
	scrollContent: {
		flexGrow: 1,
	},
	groupsWrap: {},
});
