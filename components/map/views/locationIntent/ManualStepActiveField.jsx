import React, { useCallback, useMemo, useState } from "react";
import {
	ActivityIndicator,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CountryFlagGlyph from "../../../register/CountryFlagGlyph";
import countries from "../../../../data/countries";

// ── Country inline select-search ─────────────────────────────────────────────

function CountryRow({ item, isSelected, onSelect, titleColor, mutedColor, infoSurfaceColor }) {
	return (
		<Pressable
			onPress={() => onSelect(item)}
			accessibilityRole="button"
			accessibilityLabel={item.name}
			accessibilityState={{ selected: isSelected }}
			style={({ pressed }) => [
				styles.dropItem,
				{ backgroundColor: pressed || isSelected ? infoSurfaceColor : "transparent" },
			]}
		>
			<CountryFlagGlyph flag={item.flag} code={item.code} size={20} />
			<Text numberOfLines={1} style={[styles.dropItemLabel, { color: titleColor }]}>
				{item.name}
			</Text>
			{isSelected ? (
				<Ionicons name="checkmark-circle" size={16} color={titleColor} />
			) : null}
		</Pressable>
	);
}

function SelectSearchDrop({
	step,
	draftCountryCode,
	onSelect,
	titleColor,
	mutedColor,
	infoSurfaceColor,
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

	return (
		<View style={styles.dropContainer}>
			<View style={[styles.dropSearch, { backgroundColor: infoSurfaceColor }]}>
				<Ionicons name="search-outline" size={16} color={mutedColor} />
				<TextInput
					value={query}
					onChangeText={setQuery}
					placeholder={step.placeholder}
					placeholderTextColor={mutedColor}
					autoFocus
					autoCapitalize="none"
					autoCorrect={false}
					style={[styles.dropSearchInput, { color: titleColor }]}
				/>
				{query.length > 0 ? (
					<Pressable onPress={() => setQuery("")} hitSlop={8}>
						<Ionicons name="close-circle" size={16} color={mutedColor} />
					</Pressable>
				) : null}
			</View>
			<ScrollView
				style={styles.dropList}
				keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={false}
				nestedScrollEnabled
			>
				{list.map((item) => (
					<CountryRow
						key={item.code}
						item={item}
						isSelected={Boolean(draftCountryCode && item.code === draftCountryCode)}
						onSelect={handleSelect}
						titleColor={titleColor}
						mutedColor={mutedColor}
						infoSurfaceColor={infoSurfaceColor}
					/>
				))}
				{list.length === 0 ? (
					<Text style={[styles.dropEmpty, { color: mutedColor }]}>No results</Text>
				) : null}
			</ScrollView>
		</View>
	);
}

// ── Mapbox search-drop (state / city / street) ───────────────────────────────

function SearchDropResult({ item, onSelect, titleColor, mutedColor, infoSurfaceColor }) {
	const primary = item.primaryText || item.name || "";
	const secondary = item.secondaryText || item.description || "";

	return (
		<Pressable
			onPress={() => onSelect(item)}
			accessibilityRole="button"
			accessibilityLabel={primary}
			style={({ pressed }) => [
				styles.dropItem,
				{ backgroundColor: pressed ? infoSurfaceColor : "transparent" },
			]}
		>
			<Ionicons name="location-outline" size={16} color={mutedColor} style={styles.resultIcon} />
			<View style={styles.dropItemCopy}>
				<Text numberOfLines={1} style={[styles.dropItemLabel, { color: titleColor }]}>
					{primary}
				</Text>
				{secondary ? (
					<Text numberOfLines={1} style={[styles.dropItemSub, { color: mutedColor }]}>
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
	contextHint,
	titleColor,
	mutedColor,
	infoSurfaceColor,
}) {
	// Placeholder shows "Search states…  · Nigeria" so user knows it's scoped
	const placeholder = contextHint
		? `${step.placeholder}  ·  ${contextHint}`
		: step.placeholder;

	return (
		<View style={styles.dropContainer}>
			<View style={[styles.dropSearch, { backgroundColor: infoSurfaceColor }]}>
				<Ionicons name="search-outline" size={16} color={mutedColor} />
				<TextInput
					value={dropQuery}
					onChangeText={onQueryChange}
					placeholder={placeholder}
					placeholderTextColor={mutedColor}
					autoFocus
					autoCapitalize="none"
					autoCorrect={false}
					style={[styles.dropSearchInput, { color: titleColor }]}
				/>
				{isDropLoading ? (
					<ActivityIndicator size="small" color={mutedColor} />
				) : dropQuery.length > 0 ? (
					<Pressable onPress={() => onQueryChange("")} hitSlop={8}>
						<Ionicons name="close-circle" size={16} color={mutedColor} />
					</Pressable>
				) : null}
			</View>

			{dropResults.length > 0 ? (
				<ScrollView
					style={styles.dropList}
					keyboardShouldPersistTaps="handled"
					showsVerticalScrollIndicator={false}
					nestedScrollEnabled
				>
					{dropResults.map((item, idx) => (
						<View key={item.placeId || item.key || idx}>
							<SearchDropResult
								item={item}
								onSelect={onSelect}
								titleColor={titleColor}
								mutedColor={mutedColor}
								infoSurfaceColor={infoSurfaceColor}
							/>
							{idx < dropResults.length - 1 ? (
								<View
									style={[styles.dropDivider, { backgroundColor: mutedColor + "22" }]}
								/>
							) : null}
						</View>
					))}
				</ScrollView>
			) : dropQuery.length >= 2 && !isDropLoading ? (
				<Text style={[styles.dropEmpty, { color: mutedColor }]}>
					No results — try a different search.
				</Text>
			) : null}
		</View>
	);
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * ManualStepActiveField
 *
 * Renders the correct affordance for the active manual step:
 *   select-search  → inline searchable country list
 *   search-drop    → Mapbox live suggestion drop (state/city/street)
 *   text           → auto-focused TextInput
 *   textarea       → auto-focused multiline TextInput
 *
 * Props
 * ─────
 * step              MANUAL_LOCATION_STEPS[index] with .affordance
 * draftValue        string — current field value in manualDraft
 * draftCountryCode  string — for country selection highlight
 * dropQuery         string — live query for search-drop
 * dropResults       array  — Mapbox results for search-drop
 * isDropLoading     bool
 * contextHint       string — e.g. "Nigeria" or "Lagos, Nigeria" shown in placeholder
 * onQueryChange     (query) => void
 * onDropSelect      (item) => void
 * onCountrySelect   ({ name, code, flag }) => void
 * onTextChange      (value) => void
 * onSubmitEditing   () => void
 */
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
	onCountrySelect,
	onTextChange,
	onSubmitEditing,
	titleColor,
	mutedColor,
	infoSurfaceColor,
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
				contextHint={contextHint}
				titleColor={titleColor}
				mutedColor={mutedColor}
				infoSurfaceColor={infoSurfaceColor}
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
			multiline={Boolean(step.multiline)}
			returnKeyType={step.multiline ? "default" : "next"}
			onSubmitEditing={step.multiline ? undefined : onSubmitEditing}
			style={[
				styles.textInput,
				step.multiline ? styles.textInputMultiline : null,
				{ backgroundColor: infoSurfaceColor, color: titleColor },
			]}
		/>
	);
}

const styles = StyleSheet.create({
	dropContainer: {
		gap: 4,
	},
	dropSearch: {
		minHeight: 46,
		borderRadius: 14,
		borderCurve: "continuous",
		paddingHorizontal: 12,
		paddingVertical: 10,
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},
	dropSearchInput: {
		flex: 1,
		minWidth: 0,
		fontSize: 15,
		lineHeight: 20,
		fontWeight: "500",
	},
	dropList: {
		maxHeight: 220,
	},
	dropItem: {
		minHeight: 48,
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
		paddingHorizontal: 4,
		paddingVertical: 10,
		borderRadius: 10,
		borderCurve: "continuous",
	},
	resultIcon: {
		flexShrink: 0,
	},
	dropItemCopy: {
		flex: 1,
		minWidth: 0,
	},
	dropItemLabel: {
		fontSize: 15,
		lineHeight: 20,
		fontWeight: "600",
	},
	dropItemSub: {
		marginTop: 2,
		fontSize: 12,
		lineHeight: 16,
		fontWeight: "400",
	},
	dropDivider: {
		height: StyleSheet.hairlineWidth,
		marginLeft: 36,
	},
	dropEmpty: {
		paddingVertical: 14,
		paddingHorizontal: 4,
		fontSize: 13,
		lineHeight: 17,
		fontWeight: "400",
	},
	textInput: {
		minHeight: 46,
		borderRadius: 14,
		borderCurve: "continuous",
		paddingHorizontal: 14,
		paddingVertical: 10,
		fontSize: 15,
		fontWeight: "500",
	},
	textInputMultiline: {
		minHeight: 84,
		textAlignVertical: "top",
	},
});
