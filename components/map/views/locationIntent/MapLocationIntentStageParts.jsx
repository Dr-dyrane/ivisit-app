import React, { useMemo } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import MapVisitDetailCollapsedRow from "../visitDetail/MapVisitDetailCollapsedRow";
import { MapTrackingTopSlot } from "../tracking/parts/MapTrackingParts";
import styles from "./mapLocationIntent.styles";
import {
	LOCATION_INTENT_MODES,
	MANUAL_LOCATION_STEPS,
} from "./mapLocationIntent.model";

function buildCollapsedAction({
	showToggle,
	onToggle,
	toggleAccessibilityLabel,
	toggleIconName,
}) {
	if (!showToggle || typeof onToggle !== "function") {
		return null;
	}

	return {
		onPress: onToggle,
		accessibilityLabel: toggleAccessibilityLabel,
		icon: toggleIconName,
		primary: false,
	};
}

export function MapLocationIntentCollapsedTopRow({
	model,
	titleColor,
	mutedColor,
	actionSurfaceColor,
	onToggle,
	toggleAccessibilityLabel,
	toggleIconName,
	onClose,
	showToggle = true,
}) {
	const action = useMemo(
		() =>
			buildCollapsedAction({
				showToggle,
				onToggle,
				toggleAccessibilityLabel,
				toggleIconName,
			}),
		[onToggle, showToggle, toggleAccessibilityLabel, toggleIconName],
	);

	return (
		<MapVisitDetailCollapsedRow
			action={action}
			title={model.headerTitle}
			subtitle={model.headerSubtitle}
			onExpand={onToggle}
			onClose={onClose}
			titleColor={titleColor}
			mutedColor={mutedColor}
			iconSurfaceColor={actionSurfaceColor}
		/>
	);
}

export function MapLocationIntentActiveTopRow({
	model,
	titleColor,
	mutedColor,
	actionSurfaceColor,
	onToggle,
	toggleAccessibilityLabel,
	toggleIconName,
	onClose,
	showToggle = true,
}) {
	return (
		<MapTrackingTopSlot
			title={model.headerTitle}
			subtitle={model.headerSubtitle}
			titleColor={titleColor}
			mutedColor={mutedColor}
			actionSurfaceColor={actionSurfaceColor}
			onToggle={onToggle}
			showToggle={showToggle}
			toggleIconName={toggleIconName}
			toggleAccessibilityLabel={toggleAccessibilityLabel}
			showClose
			onClose={onClose}
			closeAccessibilityLabel="Close location sheet"
		/>
	);
}

export function MapLocationIntentBodyContent({
	model,
	titleColor,
	mutedColor,
	heroSurfaceColor,
	groupSurfaceColor,
	infoSurfaceColor,
	onUseCurrentLocation,
	onOpenSearch,
	onSelectSavedPlace,
	onSelectRecentLocation,
	onOpenManualIntro,
	onStartPinAdjust,
	onConfirmSelection,
	searchQuery,
	onSearchQueryChange,
	searchResults,
	selectedLocation,
	onPickSearchResult,
	recents,
	savedPlaces,
	mode,
	manualDraft,
	onManualDraftChange,
	onNextManualStep,
	onPrevManualStep,
	manualStepIndex,
	isExpanded,
	isDarkMode,
}) {
	const currentManualStep = MANUAL_LOCATION_STEPS[manualStepIndex] || null;
	const permissionLabel = model?.sourceLabel || "Location state";
	const isSearching = mode === LOCATION_INTENT_MODES.ADDRESS_SEARCH;
	const isManualIntro = mode === LOCATION_INTENT_MODES.MANUAL_INTRO;
	const isManualStep = mode === LOCATION_INTENT_MODES.MANUAL_STEP;
	const isConfirming =
		mode === LOCATION_INTENT_MODES.CONFIRM ||
		mode === LOCATION_INTENT_MODES.PLACE_SELECTED ||
		mode === LOCATION_INTENT_MODES.PIN_ADJUST;
	const showDefaultSections = !isManualIntro && !isManualStep && !isConfirming;
	const visibleResults = isExpanded ? searchResults.slice(0, 7) : searchResults.slice(0, 4);

	return (
		<View style={styles.bodyScrollContent}>
			<View style={[styles.searchInputShell, { backgroundColor: groupSurfaceColor }]}>
				<Ionicons name="search-outline" size={18} color={mutedColor} />
				<TextInput
					value={searchQuery}
					onChangeText={onSearchQueryChange}
					placeholder={model.searchPlaceholder}
					placeholderTextColor={mutedColor}
					style={[styles.searchInput, { color: titleColor }]}
				/>
				<Pressable
					onPress={onOpenManualIntro}
					accessibilityRole="button"
					accessibilityLabel="Enter address manually"
					hitSlop={8}
					style={({ pressed }) => [
						styles.searchInputIconButton,
						pressed ? styles.pressedScale : null,
					]}
				>
					<Ionicons name="create-outline" size={19} color={titleColor} />
				</Pressable>
			</View>
			{isSearching && visibleResults.length > 0 ? (
				<View style={[styles.listCard, { backgroundColor: groupSurfaceColor }]}>
					{visibleResults.map((item, index) => (
						<View key={`${item.placeId || item.primaryText}-${index}`}>
							<Pressable
								onPress={() => onPickSearchResult(item)}
								style={({ pressed }) => [
									styles.listRow,
									pressed ? styles.rowPressed : null,
								]}
							>
								<View style={styles.listRowTextWrap}>
									<Text
										style={[styles.listRowTitle, { color: titleColor }]}
										numberOfLines={1}
									>
										{item.primaryText || "Selected place"}
									</Text>
									<Text
										style={[styles.listRowSubtitle, { color: mutedColor }]}
										numberOfLines={1}
									>
										{item.secondaryText || item.formattedAddress || ""}
									</Text>
								</View>
								<Ionicons name="chevron-forward" size={16} color={mutedColor} />
							</Pressable>
							{index < visibleResults.length - 1 ? (
								<View
									style={[
										styles.rowDivider,
										{ backgroundColor: mutedColor + "35" },
									]}
								/>
							) : null}
						</View>
					))}
				</View>
			) : null}

			{showDefaultSections ? (
				<>
					<View style={[styles.currentCard, { backgroundColor: heroSurfaceColor }]}>
						<View style={styles.currentCardRow}>
							<Text style={[styles.currentCardLabel, { color: titleColor }]}>
								Current location
							</Text>
							<Text style={[styles.currentCardBadge, { color: mutedColor }]}>
								{permissionLabel}
							</Text>
						</View>
						<Text style={[styles.currentCardAddress, { color: titleColor }]}>
							{model.headerTitle}
						</Text>
						<Text style={[styles.currentCardBody, { color: mutedColor }]}>
							{model.headerSubtitle}
						</Text>
						<View style={styles.currentCardActions}>
							<Pressable
								onPress={onUseCurrentLocation}
								style={({ pressed }) => [
									styles.currentCardAction,
									{ backgroundColor: groupSurfaceColor },
									pressed ? styles.rowPressed : null,
								]}
							>
								<Ionicons name="locate-outline" size={16} color={titleColor} />
								<Text
									style={[styles.currentCardActionLabel, { color: titleColor }]}
								>
									Use current location
								</Text>
							</Pressable>
							<Pressable
								onPress={onStartPinAdjust}
								style={({ pressed }) => [
									styles.currentCardAction,
									{ backgroundColor: groupSurfaceColor },
									pressed ? styles.rowPressed : null,
								]}
							>
								<Ionicons name="navigate-outline" size={16} color={titleColor} />
								<Text
									style={[styles.currentCardActionLabel, { color: titleColor }]}
								>
									Adjust on map
								</Text>
							</Pressable>
						</View>
					</View>

					<Text style={[styles.sectionTitle, { color: mutedColor }]}>
						{model.placesTitle}
					</Text>
					<View style={styles.orbRow}>
						{savedPlaces.slice(0, 3).map((place) => (
							<Pressable
								key={place.key}
								onPress={() => onSelectSavedPlace(place)}
								style={({ pressed }) => [
									styles.orbItem,
									pressed ? styles.pressedScale : null,
								]}
							>
								<View
									style={[
										styles.orbCircle,
										{ backgroundColor: groupSurfaceColor },
									]}
								>
									<Ionicons
										name={
											place.key === "home"
												? "home-outline"
												: place.key === "work"
													? "briefcase-outline"
													: "add-outline"
										}
										size={18}
										color={titleColor}
									/>
								</View>
								<Text style={[styles.orbLabelBelow, { color: titleColor }]}>
									{place.label}
								</Text>
							</Pressable>
						))}
					</View>

					<Pressable
						onPress={onOpenManualIntro}
						style={({ pressed }) => [
							styles.manualIntroCard,
							{ backgroundColor: groupSurfaceColor },
							pressed ? styles.rowPressed : null,
						]}
					>
						<Text style={[styles.manualTitle, { color: titleColor }]}>
							{model.manualIntroTitle}
						</Text>
						<Text style={[styles.manualBody, { color: mutedColor }]}>
							{model.manualIntroBody}
						</Text>
						<View style={styles.manualAction}>
							<Text style={[styles.manualStepButtonLabel, { color: titleColor }]}>
								{model.manualActionLabel}
							</Text>
							<Ionicons name="chevron-forward" size={16} color={mutedColor} />
						</View>
					</Pressable>
				</>
			) : null}

			{isExpanded && showDefaultSections ? (
				<>
					<Text style={[styles.sectionTitle, { color: mutedColor }]}>
						{model.recentsTitle}
					</Text>
					<View style={[styles.listCard, { backgroundColor: groupSurfaceColor }]}>
						{recents.length === 0 ? (
							<View style={styles.listRow}>
								<Text style={[styles.listRowSubtitle, { color: mutedColor }]}>
									No recent locations yet.
								</Text>
							</View>
						) : (
							recents.slice(0, 6).map((recent, index) => (
								<View key={`${recent.address || recent.label}-${index}`}>
									<Pressable
										onPress={() => onSelectRecentLocation(recent)}
										style={({ pressed }) => [
											styles.listRow,
											pressed ? styles.rowPressed : null,
										]}
									>
										<View style={styles.listRowTextWrap}>
											<Text
												style={[styles.listRowTitle, { color: titleColor }]}
												numberOfLines={1}
											>
												{recent.label || "Recent location"}
											</Text>
											<Text
												style={[styles.listRowSubtitle, { color: mutedColor }]}
												numberOfLines={1}
											>
												{recent.address || ""}
											</Text>
										</View>
										<Ionicons
											name="chevron-forward"
											size={16}
											color={mutedColor}
										/>
									</Pressable>
									{index < Math.min(6, recents.length) - 1 ? (
										<View
											style={[
												styles.rowDivider,
												{ backgroundColor: mutedColor + "35" },
											]}
										/>
									) : null}
								</View>
							))
						)}
					</View>
				</>
			) : null}

			{isManualIntro ? (
				<View style={[styles.manualStepCard, { backgroundColor: groupSurfaceColor }]}>
					<Text style={[styles.manualTitle, { color: titleColor }]}>
						{model.manualIntroTitle}
					</Text>
					<Text style={[styles.manualBody, { color: mutedColor }]}>
						{model.manualIntroBody}
					</Text>
					<View style={styles.manualStepActions}>
						<Pressable
							onPress={onPrevManualStep}
							style={({ pressed }) => [
								styles.manualStepButton,
								{ backgroundColor: infoSurfaceColor },
								pressed ? styles.rowPressed : null,
							]}
						>
							<Text
								style={[styles.manualStepButtonLabel, { color: titleColor }]}
							>
								Back
							</Text>
						</Pressable>
						<Pressable
							onPress={onNextManualStep}
							style={({ pressed }) => [
								styles.manualStepButton,
								{ backgroundColor: infoSurfaceColor },
								pressed ? styles.rowPressed : null,
							]}
						>
							<Text
								style={[styles.manualStepButtonLabel, { color: titleColor }]}
							>
								Start
							</Text>
						</Pressable>
					</View>
				</View>
			) : null}

			{isManualStep && currentManualStep ? (
				<View
					style={[
						styles.manualStepCard,
						{ backgroundColor: groupSurfaceColor },
					]}
				>
					<Text style={[styles.manualStepProgress, { color: mutedColor }]}>
						Step {manualStepIndex + 1} of {MANUAL_LOCATION_STEPS.length}
					</Text>
					<Text style={[styles.manualStepLabel, { color: titleColor }]}>
						{currentManualStep.label}
					</Text>
					<TextInput
						value={manualDraft[currentManualStep.key] || ""}
						onChangeText={(value) =>
							onManualDraftChange(currentManualStep.key, value)
						}
						placeholder={currentManualStep.placeholder}
						placeholderTextColor={mutedColor}
						style={[
							styles.manualTextInput,
							{ backgroundColor: infoSurfaceColor, color: titleColor },
						]}
					/>
					<View style={styles.manualStepActions}>
						<Pressable
							style={[
								styles.manualStepButton,
								{ backgroundColor: infoSurfaceColor },
							]}
							onPress={onPrevManualStep}
						>
							<Text
								style={[styles.manualStepButtonLabel, { color: titleColor }]}
							>
								Back
							</Text>
						</Pressable>
						<Pressable
							style={[
								styles.manualStepButton,
								{ backgroundColor: infoSurfaceColor },
							]}
							onPress={onNextManualStep}
						>
							<Text
								style={[styles.manualStepButtonLabel, { color: titleColor }]}
							>
								{manualStepIndex >= MANUAL_LOCATION_STEPS.length - 1
									? "Confirm on map"
									: "Next"}
							</Text>
						</Pressable>
					</View>
				</View>
			) : null}

			{mode === LOCATION_INTENT_MODES.CONFIRM ||
			mode === LOCATION_INTENT_MODES.PLACE_SELECTED ||
			mode === LOCATION_INTENT_MODES.PIN_ADJUST ? (
				<Pressable
					onPress={onConfirmSelection}
					style={({ pressed }) => [
						styles.manualStepCard,
						{ backgroundColor: groupSurfaceColor },
						pressed ? styles.rowPressed : null,
					]}
				>
					<Text style={[styles.manualTitle, { color: titleColor }]}>
						Confirm selected location
					</Text>
					<Text style={[styles.manualBody, { color: mutedColor }]}>
						{selectedLocation?.address ||
							selectedLocation?.label ||
							"Use this location for pickup, nearby care, and pricing."}
					</Text>
					<View style={styles.manualAction}>
						<Text style={[styles.manualStepButtonLabel, { color: titleColor }]}>
							Use this location
						</Text>
						<Ionicons name="checkmark-circle" size={17} color={titleColor} />
					</View>
				</Pressable>
			) : null}
		</View>
	);
}
