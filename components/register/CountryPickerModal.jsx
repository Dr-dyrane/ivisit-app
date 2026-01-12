// components/register/CountryPickerModal.jsx
import { useMemo, useState, useRef, useEffect } from "react";
import {
	Modal,
	View,
	Text,
	FlatList,
	Pressable,
	TextInput,
	Animated,
	Dimensions,
	Keyboard,
} from "react-native";
import { useTheme } from "../../contexts/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import countries from "../../data/countries";
import * as Haptics from "expo-haptics";
import { useAndroidKeyboardAwareModal } from "../../hooks/ui/useAndroidKeyboardAwareModal";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function CountryPickerModal({ visible, onClose, onSelect }) {
	const { isDarkMode } = useTheme();
	const [query, setQuery] = useState("");

	const { modalHeight } = useAndroidKeyboardAwareModal({ 
		defaultHeight: SCREEN_HEIGHT * 0.75 
	});

	const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
	const bgOpacity = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		if (visible) {
			Animated.parallel([
				Animated.spring(slideAnim, {
					toValue: 0,
					tension: 50,
					friction: 10,
					useNativeDriver: true,
				}),
				Animated.timing(bgOpacity, {
					toValue: 1,
					duration: 300,
					useNativeDriver: true,
				}),
			]).start();
		} else {
			setQuery("");
			slideAnim.setValue(SCREEN_HEIGHT);
			bgOpacity.setValue(0);
		}
	}, [visible]);

	const colors = {
		bg: isDarkMode ? "#0D1117" : "#FFFFFF",
		inputBg: isDarkMode ? "#161B22" : "#F3F4F6",
		text: isDarkMode ? "#FFFFFF" : "#0F172A",
		border: isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
		primary: "#86100E",
	};

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return countries;

		return countries.filter((c) => {
			const nameMatch = c.name.toLowerCase().includes(q);
			const codeMatch = c.code.toLowerCase().includes(q);
			const dialMatch = c.dial_code
				.replace(/\s/g, "")
				.includes(q.replace(/\s/g, ""));

			return nameMatch || codeMatch || dialMatch;
		});
	}, [query]);

	const handleClose = () => {
		Keyboard.dismiss();
		Animated.parallel([
			Animated.timing(slideAnim, {
				toValue: SCREEN_HEIGHT,
				duration: 250,
				useNativeDriver: true,
			}),
			Animated.timing(bgOpacity, {
				toValue: 0,
				duration: 200,
				useNativeDriver: true,
			}),
		]).start(() => onClose());
	};

	return (
		<Modal
			visible={visible}
			transparent
			animationType="none"
			onRequestClose={handleClose}
		>
			<View className="flex-1 justify-end">
				<Animated.View
					style={{ opacity: bgOpacity }}
					className="absolute inset-0 bg-black/60"
				>
					<Pressable className="flex-1" onPress={handleClose} />
				</Animated.View>

				<Animated.View
					style={{
						height: modalHeight,
						backgroundColor: colors.bg,
						transform: [{ translateY: slideAnim }],
					}}
					className="rounded-t-[40px] px-6 pt-4"
				>
					<View className="w-12 h-1.5 bg-gray-500/20 rounded-full self-center mb-6" />

					<View className="flex-row items-center justify-between mb-4">
						<Text
							className="text-2xl font-black tracking-tighter"
							style={{ color: colors.text }}
						>
							Select Region
						</Text>
						<Pressable
							onPress={handleClose}
							className="p-2 bg-gray-500/10 rounded-full"
						>
							<Ionicons name="close" size={20} color={colors.text} />
						</Pressable>
					</View>

					<View
						style={{ backgroundColor: colors.inputBg }}
						className="flex-row items-center px-4 rounded-2xl h-14 mb-4"
					>
						<Ionicons name="search" size={18} color="#666" />
						<TextInput
							value={query}
							onChangeText={setQuery}
							placeholder="Search country or code"
							placeholderTextColor="#666"
							autoCapitalize="none"
							autoCorrect={false}
							className="flex-1 ml-3 font-bold text-base"
							style={{ color: colors.text }}
						/>
						{query.length > 0 && (
							<Pressable onPress={() => setQuery("")}>
								<Ionicons name="close-circle" size={18} color="#666" />
							</Pressable>
						)}
					</View>

					{query.length > 0 && (
						<Text
							className="text-xs font-medium mb-2"
							style={{ color: "#666" }}
						>
							{filtered.length} {filtered.length === 1 ? "result" : "results"}
						</Text>
					)}

					<FlatList
						data={filtered}
						keyExtractor={(item) => item.code}
						showsVerticalScrollIndicator={false}
						contentContainerStyle={{ paddingBottom: 40 }}
						keyboardShouldPersistTaps="handled"
						renderItem={({ item }) => (
							<Pressable
								onPress={() => {
									Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
									onSelect(item);
									handleClose();
								}}
								style={{
									borderBottomWidth: 1,
									borderBottomColor: colors.border,
								}}
								className="py-4 flex-row items-center justify-between active:bg-gray-500/5"
							>
								<View className="flex-row items-center flex-1">
									<Text className="text-2xl mr-4">{item.flag}</Text>
									<View className="flex-1">
										<Text
											className="text-base font-bold"
											style={{ color: colors.text }}
											numberOfLines={1}
										>
											{item.name}
										</Text>
									</View>
								</View>
								<Text
									className="font-black text-base ml-2"
									style={{ color: colors.primary }}
								>
									{item.dial_code}
								</Text>
							</Pressable>
						)}
						ListEmptyComponent={
							<View className="items-center py-8">
								<Ionicons name="search-outline" size={48} color="#666" />
								<Text
									className="mt-4 text-sm font-medium"
									style={{ color: "#666" }}
								>
									No countries found
								</Text>
							</View>
						}
					/>
				</Animated.View>
			</View>
		</Modal>
	);
}
