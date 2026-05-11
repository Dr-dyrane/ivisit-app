import React, { useCallback, useMemo, useState } from "react";
import {
	ActivityIndicator,
	Platform,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import CountryFlagGlyph from "../../../register/CountryFlagGlyph";
import countries from "../../../../data/countries";

// -- Country row ---------------------------------------------------------------

function CountryRow({ item, isSelected, onSelect, titleColor, mutedColor, accentColor }) {
	return (
		<Pressable
			onPress={() => onSelect(item)}
			accessibilityRole="button"
			accessibilityLabel={item.name}
			accessibilityState={{ selected: isSelected }}
			style={({ pressed }) => [
				styles.resultRow,
				pressed ? styles.resultRowPressed : null,
			]}
		>
			<CountryFlagGlyph flag={item.flag} code={item.code} size={22} />
			<Text numberOfLines={1} style={[styles.resultPrimary, { color: titleColor }]}>
				{item.name}
			</Text>
			{isSelected ? (
				<MaterialCommunityIcons name="check-circle" size={18} color={accentColor || titleColor} />
			) : null}
		</Pressable>
	);
}

// -- Country select-search -----------------------------------------------------

function SelectSearchDrop({
	step,
	draftCountryCode,
	onSelect,
	titleColor,
	mutedColor,
	infoSurfaceColor,
	accentColor,
}) {
	const [query, setQuery] = useState("");

	const list = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return countries;
		return countries.filter(
			(c) =>
				c.name.toLowerCase().includes(q) ||
				c.code.toLowerCase().includes(q),
		);
	}, [query]);

	const handleSelect = useCallback(
		(item) => {
			onSelect({ name: item.name, code: item.code, flag: item.flag });
			setQuery("");
		},
		[onSelect],
	);

	const handleClear = useCallback(() => setQuery(""), []);

	return (
		<View style={styles.fieldBlock}>
			{/* Search bar */}
			<View style={[styles.searchBar, { backgroundColor: infoSurfaceColor }]}>
				<MaterialCommunityIcons name="magnify" size={17} color={mutedColor} />
				<TextInput
					value={query}
					onChangeText={setQuery}
					placeholder={step.placeholder}
					placeholderTextColor={mutedColor}
					autoFocus
					autoCapitalize={step.autoCapitalize || "words"}
					autoCorrect={false}
					keyboardAppearance={Platform.OS === "ios" ? "default" : undefined}
					returnKeyType="search"
					blurOnSubmit={false}
					style={[styles.searchInput, { color: titleColor }]}
				/>
				{query.length > 0 ? (
					<Pressable onPress={handleClear} hitSlop={10}>
						<MaterialCommunityIcons name="close-circle" size={17} color={mutedColor} />
					</Pressable>
				) : null}
			</View>

			{/* Results */}
			<ScrollView
				style={styles.resultList}
				keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={false}
				nestedScrollEnabled
			>
				{list.map((item, idx) => (
					<View key={item.code}>
						<CountryRow
							item={item}
							isSelected={Boolean(draftCountryCode && item.code === draftCountryCode)}
							onSelect={handleSelect}
							titleColor={titleColor}
							mutedColor={mutedColor}
							accentColor={accentColor}
						/>
						{idx < list.length - 1 ? (
							<View style={[styles.divider, { backgroundColor: mutedColor + "18" }]} />
						) : null}
					</View>
				))}
				{list.length === 0 ? (
					<View style={styles.emptyState}>
						<Text style={[styles.emptyText, { color: mutedColor }]}>No countries match</Text>
					</View>
				) : null}
			</ScrollView>
		</View>
	);
}

// -- Mapbox search-drop (state / city / street) -------------------------------

function PlaceRow({ item, onSelect, titleColor, mutedColor }) {
	const primary = item.primaryText || item.name || "";
	const secondary = item.secondaryText || item.description || "";

	return (
		<Pressable
			onPress={() => onSelect(item)}
			accessibilityRole="button"
			accessibilityLabel={primary}
			style={({ pressed }) => [
				styles.resultRow,
				pressed ? styles.resultRowPressed : null,
			]}
		>
			<View style={[styles.resultIconWrap, { backgroundColor: mutedColor + "18" }]}>
				<MaterialCommunityIcons name="map-marker-outline" size={15} color={mutedColor} />
			</View>
			<View style={styles.resultCopy}>
				<Text numberOfLines={1} style={[styles.resultPrimary, { color: titleColor }]}>
					{primary}
				</Text>
				{secondary ? (
					<Text numberOfLines={1} style={[styles.resultSecondary, { color: mutedColor }]}>
						{secondary}
					</Text>
				) : null}
			</View>
		</Pressable>
	);
}

function SearchDrop({
	step,
	dropQuery,
	dropResults,
	isDropLoading,
	onQueryChange,
	onSelect,
	onUseTypedQuery,
	contextHint,
	titleColor,
	mutedColor,
	infoSurfaceColor,
	accentColor,
}) {
	const trimmedQuery = String(dropQuery || "").trim();
	const placeholder = step.placeholder;

	const handleClear = useCallback(() => onQueryChange(""), [onQueryChange]);
	const handleUseTypedQuery = useCallback(() => {
		if (!trimmedQuery || typeof onUseTypedQuery !== "function") return;
		onUseTypedQuery(trimmedQuery);
	}, [onUseTypedQuery, trimmedQuery]);

	return (
		<View style={styles.fieldBlock}>
			{/* Search bar */}
			<View style={[styles.searchBar, { backgroundColor: infoSurfaceColor }]}>
				<MaterialCommunityIcons name="magnify" size={17} color={mutedColor} />
				<TextInput
					value={dropQuery}
					onChangeText={onQueryChange}
					placeholder={placeholder}
					placeholderTextColor={mutedColor}
					autoFocus
					autoCapitalize={step.autoCapitalize || "words"}
					autoCorrect={false}
					keyboardAppearance={Platform.OS === "ios" ? "default" : undefined}
					returnKeyType="search"
					blurOnSubmit={false}
					onSubmitEditing={handleUseTypedQuery}
					style={[styles.searchInput, { color: titleColor }]}
				/>
				{isDropLoading ? (
					<ActivityIndicator size="small" color={mutedColor} />
				) : dropQuery.length > 0 ? (
					<Pressable onPress={handleClear} hitSlop={10}>
						<MaterialCommunityIcons name="close-circle" size={17} color={mutedColor} />
					</Pressable>
				) : null}
			</View>

			{/* Results */}
			{isDropLoading && dropResults.length === 0 ? (
				<View style={styles.loadingState}>
					<ActivityIndicator size="small" color={mutedColor} />
					<Text style={[styles.emptyText, { color: mutedColor }]}>
						Searching nearby matches
					</Text>
				</View>
			) : null}
			{dropResults.length > 0 ? (
				<ScrollView
					style={styles.resultList}
					keyboardShouldPersistTaps="handled"
					showsVerticalScrollIndicator={false}
					nestedScrollEnabled
				>
					{dropResults.map((item, idx) => (
						<View key={item.placeId || item.key || idx}>
							<PlaceRow
								item={item}
								onSelect={onSelect}
								titleColor={titleColor}
								mutedColor={mutedColor}
							/>
							{idx < dropResults.length - 1 ? (
								<View style={[styles.divider, { backgroundColor: mutedColor + "18" }]} />
							) : null}
						</View>
					))}
				</ScrollView>
			) : trimmedQuery.length >= 2 && !isDropLoading ? (
				<View style={styles.emptyState}>
					<Text style={[styles.emptyText, { color: mutedColor }]}>
						No exact match yet.
					</Text>
				</View>
			) : null}
			{trimmedQuery.length >= 2 && !isDropLoading ? (
				<Pressable
					onPress={handleUseTypedQuery}
					accessibilityRole="button"
					accessibilityLabel={`Continue with ${trimmedQuery}`}
					style={({ pressed }) => [
						styles.useTypedRow,
						{
							backgroundColor:
								dropResults.length > 0 ? "transparent" : infoSurfaceColor,
						},
						pressed ? styles.resultRowPressed : null,
					]}
				>
					<View style={[styles.resultIconWrap, { backgroundColor: (accentColor || mutedColor) + "18" }]}>
						<MaterialCommunityIcons name="pencil-outline" size={15} color={accentColor || mutedColor} />
					</View>
					<View style={styles.resultCopy}>
						<Text numberOfLines={1} style={[styles.resultPrimary, { color: titleColor }]}>
							Continue with "{trimmedQuery}"
						</Text>
						<Text numberOfLines={1} style={[styles.resultSecondary, { color: mutedColor }]}>
							We will check the pickup area next
						</Text>
					</View>
				</Pressable>
			) : null}
		</View>
	);
}

// -- Main export ---------------------------------------------------------------

export default function ManualStepActiveField({
	step,
	draftValue,
	draftCountryCode,
	dropQuery,
	dropResults,
	isDropLoading,
	contextHint,
	onQueryChange,
	onDropSelect,
	onUseTypedQuery,
	onCountrySelect,
	onTextChange,
	onSubmitEditing,
	titleColor,
	mutedColor,
	infoSurfaceColor,
	accentColor,
}) {
	const affordance = step?.affordance;

	if (affordance === "select-search") {
		return (
			<SelectSearchDrop
				step={step}
				draftCountryCode={draftCountryCode}
				onSelect={onCountrySelect}
				titleColor={titleColor}
				mutedColor={mutedColor}
				infoSurfaceColor={infoSurfaceColor}
				accentColor={accentColor}
			/>
		);
	}

	if (affordance === "search-drop") {
		return (
			<SearchDrop
				step={step}
				dropQuery={dropQuery}
				dropResults={dropResults}
				isDropLoading={isDropLoading}
				onQueryChange={onQueryChange}
				onSelect={onDropSelect}
				onUseTypedQuery={onUseTypedQuery}
				contextHint={contextHint}
				titleColor={titleColor}
				mutedColor={mutedColor}
				infoSurfaceColor={infoSurfaceColor}
				accentColor={accentColor}
			/>
		);
	}

	// text / textarea
	return (
		<TextInput
			key={step.key}
			value={draftValue || ""}
			onChangeText={onTextChange}
			placeholder={step.placeholder}
			placeholderTextColor={mutedColor}
			autoCapitalize={step.autoCapitalize || "sentences"}
			autoCorrect={false}
			autoFocus
			keyboardAppearance={Platform.OS === "ios" ? "default" : undefined}
			multiline={Boolean(step.multiline)}
			returnKeyType={step.multiline ? "default" : "next"}
			blurOnSubmit={!step.multiline}
			onSubmitEditing={step.multiline ? undefined : onSubmitEditing}
			style={[
				styles.freeInput,
				step.multiline ? styles.freeInputMultiline : null,
				{ backgroundColor: infoSurfaceColor, color: titleColor },
			]}
		/>
	);
}

const styles = StyleSheet.create({
	fieldBlock: {
		gap: 6,
	},
	searchBar: {
		height: 48,
		borderRadius: 999,
		borderCurve: "continuous",
		paddingHorizontal: 16,
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
	},
	searchInput: {
		flex: 1,
		minWidth: 0,
		fontSize: 16,
		lineHeight: 21,
		fontWeight: "400",
	},
	resultList: {
		flexGrow: 1,
	},
	loadingState: {
		minHeight: 48,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 8,
		paddingVertical: 10,
	},
	useTypedRow: {
		minHeight: 50,
		borderRadius: 16,
		borderCurve: "continuous",
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
		paddingHorizontal: 10,
		paddingVertical: 8,
	},
	resultRow: {
		minHeight: 56,
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
		paddingHorizontal: 4,
		paddingVertical: 10,
	},
	resultRowPressed: {
		opacity: 0.6,
	},
	resultIconWrap: {
		width: 30,
		height: 30,
		borderRadius: 15,
		alignItems: "center",
		justifyContent: "center",
		flexShrink: 0,
	},
	resultCopy: {
		flex: 1,
		minWidth: 0,
	},
	resultPrimary: {
		fontSize: 15,
		lineHeight: 20,
		fontWeight: "600",
	},
	resultSecondary: {
		marginTop: 2,
		fontSize: 12,
		lineHeight: 16,
		fontWeight: "400",
	},
	divider: {
		height: StyleSheet.hairlineWidth,
		marginLeft: 46,
	},
	emptyState: {
		paddingVertical: 20,
		paddingHorizontal: 4,
		alignItems: "center",
	},
	emptyText: {
		fontSize: 14,
		lineHeight: 19,
		fontWeight: "400",
	},
	freeInput: {
		minHeight: 50,
		borderRadius: 22,
		borderCurve: "continuous",
		paddingHorizontal: 16,
		paddingVertical: 13,
		fontSize: 16,
		lineHeight: 21,
		fontWeight: "400",
	},
	freeInputMultiline: {
		minHeight: 96,
		textAlignVertical: "top",
	},
});
