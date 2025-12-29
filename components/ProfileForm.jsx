// components/ProfileForm.js
import React from "react";
import { View, Text, TextInput } from "react-native";
import { useTheme } from "../contexts/ThemeContext";
import SlideButton from "./ui/SlideButton";

const ProfileForm = ({ profileData, onChange, onSubmit }) => {
  const { isDarkMode } = useTheme();

  return (
    <View className="px-8">
      <Text className={`text-[36px] font-black tracking-tighter mb-2 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
        The basics.
      </Text>
      <Text className="text-gray-500 text-lg mb-10 leading-6">
        Let’s start with your legal name for medical records.
      </Text>

      <TextInput
        placeholder="Full Name"
        placeholderTextColor="#666"
        value={profileData.fullName}
        onChangeText={(val) => onChange("fullName", val)}
        autoFocus
        className={`text-2xl font-bold py-4 mb-8 border-b-2 ${
            isDarkMode ? "text-white border-white/10" : "text-slate-900 border-black/10"
        }`}
      />

      <SlideButton onPress={onSubmit}>CONTINUE</SlideButton>
    </View>
  );
};

export default ProfileForm;