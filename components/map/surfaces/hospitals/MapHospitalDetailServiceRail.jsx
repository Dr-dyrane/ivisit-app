import React, { useEffect, useMemo, useState } from "react";
import { Image, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { getHospitalDetailServiceImageSource } from "./mapHospitalDetail.content";
import { styles } from "./mapHospitalDetail.styles";

function resolveRailImageSource(source) {
	if (!source || Platform.OS !== "web") return source;

	if (typeof source === "number") {
		try {
			const resolveAssetSource =
				(typeof Image?.resolveAssetSource === "function" && Image.resolveAssetSource) ||
				(typeof Image?.default?.resolveAssetSource === "function" &&
					Image.default.resolveAssetSource) ||
				null;
			const asset = resolveAssetSource?.(source);
			if (asset?.uri) {
				return asset;
			}
		} catch (_error) {
			return source;
		}
	}

	return source;
}

function ServiceSkeletonCard({ surfaceColor, compact = false }) {
	return (
		<View
			style={[
				styles.serviceCard,
				compact ? styles.serviceCardCompact : null,
				styles.serviceCardMuted,
				{ backgroundColor: surfaceColor },
			]}
		>
			<LinearGradient
				colors={["rgba(255,255,255,0.08)", "rgba(15,23,42,0.14)"]}
				start={{ x: 0.12, y: 0.08 }}
				end={{ x: 0.86, y: 0.92 }}
				style={styles.serviceSkeletonCardInner}
			>
				<View style={[styles.serviceCardHeader, compact ? styles.serviceCardHeaderCompact : null]}>
					<View style={[styles.serviceTopPillSkeleton, compact ? styles.serviceTopPillSkeletonCompact : null]} />
				</View>
				<View style={[styles.serviceCardContent, compact ? styles.serviceCardContentCompact : null]}>
					<View style={styles.serviceSkeletonLineWide} />
					<View style={styles.serviceSkeletonLine} />
				</View>
			</LinearGradient>
		</View>
	);
}

function ServiceValueBlock({ item, compact = false, color = "rgba(248,250,252,0.84)" }) {
	return item.showPriceSkeleton ? (
		<View style={[styles.serviceInlineSkeleton, styles.serviceInlineSkeletonMeta]} />
	) : item.priceText ? (
		<Text
			numberOfLines={1}
			style={[
				styles.serviceCardMeta,
				compact ? styles.serviceCardMetaCompact : null,
				{ color },
			]}
		>
			{item.priceText}
		</Text>
	) : null;
}

export default function MapHospitalDetailServiceRail({
	items,
	type,
	rowSurface,
	compact = false,
	selectedId: controlledSelectedId = null,
	onSelectId = null,
	selectionEnabled: selectionEnabledProp = null,
}) {
	const [uncontrolledSelectedId, setUncontrolledSelectedId] = useState(null);
	if (!Array.isArray(items) || items.length === 0) return null;
	const selectionEnabled =
		typeof selectionEnabledProp === "boolean" ? selectionEnabledProp : compact;
	const isControlledSelection = typeof onSelectId === "function" || controlledSelectedId !== null;
	const selectedId = isControlledSelection ? controlledSelectedId : uncontrolledSelectedId;
	const selectableIds = useMemo(
		() =>
			items
				.filter((item) => !item?.isSkeleton && item?.enabled !== false)
				.map((item, index) => item.id || item.title || `${type}-${index}`),
		[items, type],
	);

	useEffect(() => {
		if (!selectionEnabled && uncontrolledSelectedId !== null) {
			setUncontrolledSelectedId(null);
			return;
		}
		if (uncontrolledSelectedId && !selectableIds.includes(uncontrolledSelectedId)) {
			setUncontrolledSelectedId(null);
		}
	}, [selectableIds, uncontrolledSelectedId, selectionEnabled]);

	const handleSelectId = (itemId) => {
		if (!selectionEnabled) return;
		const nextSelectedId = selectedId === itemId ? null : itemId;
		if (typeof onSelectId === "function") {
			onSelectId(nextSelectedId);
			return;
		}
		setUncontrolledSelectedId(nextSelectedId);
	};

	return (
		<View style={[styles.serviceRail, compact ? styles.serviceRailCompact : null]}>
			<ScrollView
				horizontal
				showsHorizontalScrollIndicator={false}
				style={styles.serviceRailScroller}
				contentContainerStyle={[
					styles.serviceRailContent,
					compact ? styles.serviceRailContentCompact : null,
				]}
			>
				{items.map((item, index) => {
					if (item.isSkeleton) {
						return (
							<ServiceSkeletonCard
								key={item.id || `skeleton-${index}`}
								surfaceColor={rowSurface}
								compact={compact}
							/>
						);
					}

					const imageSource = resolveRailImageSource(
						getHospitalDetailServiceImageSource(item, type),
					);
					const itemId = item.id || item.title || `${type}-${index}`;
					const isDisabled = item.enabled === false;
					const isSelected = selectionEnabled && selectedId === itemId;
					const isPreviewMuted = selectionEnabled && !isSelected;
					const overlayColors = isPreviewMuted
						? ["rgba(8,15,27,0.16)", "rgba(8,15,27,0.34)", "rgba(8,15,27,0.88)"]
						: ["rgba(8,15,27,0.04)", "rgba(8,15,27,0.18)", "rgba(8,15,27,0.74)"];
					const titleColor = isPreviewMuted ? "rgba(248,250,252,0.82)" : "#F8FAFC";
					const metaColor = isPreviewMuted ? "rgba(248,250,252,0.68)" : "rgba(248,250,252,0.84)";
					const isReadyAmbulance = type === "ambulance" && item.metaText === "Ready";
					const isReadyAmbulanceSelected = isReadyAmbulance && isSelected;
					const isReadyRoom = type === "room" && typeof item.metaText === "string" && item.metaText.trim().length > 0;
					const isReadyRoomSelected = isReadyRoom && isSelected;
					return (
						<Pressable
							key={`${item.id || item.title}-${index}`}
							onPress={
								selectionEnabled && !isDisabled
									? () => handleSelectId(itemId)
									: undefined
							}
							disabled={!selectionEnabled || isDisabled}
							accessibilityRole={selectionEnabled && !isDisabled ? "button" : undefined}
							accessibilityState={
								selectionEnabled && !isDisabled ? { selected: isSelected } : undefined
							}
							style={({ pressed }) => [
								styles.serviceCard,
								compact ? styles.serviceCardCompact : null,
								{ backgroundColor: rowSurface },
								isDisabled ? styles.serviceCardMuted : null,
								isPreviewMuted ? styles.serviceCardPreviewMuted : null,
								isSelected ? styles.serviceCardSelected : null,
								pressed ? (isSelected ? styles.serviceCardSelectedPressed : styles.serviceCardPressed) : null,
							]}
						>
							<Image
								source={imageSource}
								resizeMode="contain"
								fadeDuration={0}
								style={[
									styles.serviceCardMedia,
									type === "room"
										? styles.serviceCardMediaRoom
										: styles.serviceCardMediaAmbulance,
								]}
							/>
							<LinearGradient
								colors={overlayColors}
								style={styles.serviceCardOverlay}
							/>
							<View style={[styles.serviceCardHeader, compact ? styles.serviceCardHeaderCompact : null]}>
								{item.showMetaSkeleton ? (
									<View
										style={[
											styles.serviceTopPillSkeleton,
											compact ? styles.serviceTopPillSkeletonCompact : null,
										]}
									/>
								) : item.metaText ? (
									<View
										style={[
											styles.serviceTopPill,
											compact ? styles.serviceTopPillCompact : null,
											isReadyAmbulanceSelected || isReadyRoomSelected
												? styles.serviceTopPillReady
												: null,
										]}
									>
										<Text
											numberOfLines={1}
											style={[
												styles.serviceTopPillText,
												compact ? styles.serviceTopPillTextCompact : null,
												isReadyAmbulanceSelected || isReadyRoomSelected
													? styles.serviceTopPillReadyText
													: null,
											]}
										>
											{item.metaText}
										</Text>
									</View>
								) : null}
							</View>
							<View style={[styles.serviceCardContent, compact ? styles.serviceCardContentCompact : null]}>
								<Text
									numberOfLines={2}
									style={[
										styles.serviceTitle,
										compact ? styles.serviceTitleCompact : null,
										{ color: titleColor },
									]}
								>
									{item.title}
								</Text>
								<ServiceValueBlock item={item} compact={compact} color={metaColor} />
							</View>
						</Pressable>
					);
				})}
			</ScrollView>
		</View>
	);
}
