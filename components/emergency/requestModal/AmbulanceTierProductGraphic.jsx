import React, { useMemo } from "react";
import { Image, View } from "react-native";
import Svg, {
	Circle,
	Defs,
	Ellipse,
	LinearGradient,
	Path,
	Rect,
	Stop,
} from "react-native-svg";
import { getAmbulanceVisualProfile } from "./ambulanceTierVisuals";

export default function AmbulanceTierProductGraphic({
	type,
	width = 136,
	height = 92,
	style,
	showBackdrop = true,
}) {
	const visualProfile = getAmbulanceVisualProfile(type);
	const { accent, secondaryAccent } = visualProfile;
	const safeWidth = Number.isFinite(width) ? width : 136;
	const safeHeight = Number.isFinite(height) ? height : 92;
	const gradientSeed = useMemo(
		() => `ambulance-${visualProfile.key}-${Math.round(safeWidth)}-${Math.round(safeHeight)}-${Math.random().toString(36).slice(2, 8)}`,
		[visualProfile.key, safeHeight, safeWidth],
	);
	const backgroundGradientId = `${gradientSeed}-bg`;
	const bodyGradientId = `${gradientSeed}-body`;
	const windowGradientId = `${gradientSeed}-window`;
	const stripeGradientId = `${gradientSeed}-stripe`;

	if (visualProfile.source) {
		return (
			<View style={style}>
				<Image
					source={visualProfile.source}
					style={{ width: safeWidth, height: safeHeight }}
					resizeMode="contain"
				/>
			</View>
		);
	}

	return (
		<View style={style}>
			<Svg width={safeWidth} height={safeHeight} viewBox="0 0 180 112" fill="none">
				<Defs>
					<LinearGradient id={backgroundGradientId} x1="16" y1="10" x2="164" y2="102" gradientUnits="userSpaceOnUse">
						<Stop offset="0" stopColor={`${accent}16`} />
						<Stop offset="1" stopColor={`${secondaryAccent}10`} />
					</LinearGradient>
					<LinearGradient id={bodyGradientId} x1="42" y1="28" x2="130" y2="88" gradientUnits="userSpaceOnUse">
						<Stop offset="0" stopColor="#FFFFFF" />
						<Stop offset="1" stopColor="#E2E8F0" />
					</LinearGradient>
					<LinearGradient id={windowGradientId} x1="72" y1="36" x2="116" y2="66" gradientUnits="userSpaceOnUse">
						<Stop offset="0" stopColor="#E0F2FE" />
						<Stop offset="1" stopColor="#BFDBFE" />
					</LinearGradient>
					<LinearGradient id={stripeGradientId} x1="46" y1="58" x2="128" y2="74" gradientUnits="userSpaceOnUse">
						<Stop offset="0" stopColor={accent} />
						<Stop offset="1" stopColor={secondaryAccent} />
					</LinearGradient>
				</Defs>

				{showBackdrop ? (
					<>
						<Rect x="8" y="10" width="164" height="92" rx="28" fill={`url(#${backgroundGradientId})`} />
						<Ellipse cx="89" cy="83" rx="48" ry="8" fill="rgba(15,23,42,0.10)" />
					</>
				) : null}
				<Path
					d="M36 66V49C36 43.477 40.477 39 46 39H92C95.866 39 99.447 41.014 101.438 44.312L112.5 62.5H128C133.523 62.5 138 66.977 138 72.5V74H36V66Z"
					fill={`url(#${bodyGradientId})`}
					stroke="#CBD5E1"
					strokeWidth="1.3"
				/>
				<Rect x="61" y="45" width="18" height="14" rx="4" fill={`url(#${windowGradientId})`} />
				<Rect x="82" y="45" width="18" height="14" rx="4" fill={`url(#${windowGradientId})`} />
				<Rect x="103" y="52" width="12" height="9" rx="3.5" fill={`url(#${windowGradientId})`} />
				<Rect x="45" y="59" width="73" height="8" rx="4" fill={`url(#${stripeGradientId})`} />
				<Rect x="72.5" y="49" width="7" height="18" rx="2.5" fill="#FFFFFF" opacity="0.9" />
				<Rect x="67" y="54.5" width="18" height="7" rx="2.5" fill="#FFFFFF" opacity="0.9" />
				<Rect x="92" y="34" width="15" height="6" rx="3" fill={accent} />
				<Rect x="108" y="34" width="9" height="6" rx="3" fill={secondaryAccent} />
				<Circle cx="57" cy="76" r="9.5" fill="#0F172A" />
				<Circle cx="57" cy="76" r="4.2" fill="#CBD5E1" />
				<Circle cx="118" cy="76" r="9.5" fill="#0F172A" />
				<Circle cx="118" cy="76" r="4.2" fill="#CBD5E1" />
			</Svg>
		</View>
	);
}
