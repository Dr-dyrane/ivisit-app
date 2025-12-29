// components/PostLoginCard.js
import React, { useState } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { useTheme } from "../contexts/ThemeContext";
import SlideButton from "./ui/SlideButton";

const PostLoginCard = ({ title, description, placeholder, onNext }) => {
  const { isDarkMode } = useTheme();
  const [val, setVal] = useState("");

  return (
    <View className="px-8">
      <Text className={`text-[36px] font-black tracking-tighter mb-2 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
        {title}
      </Text>
      <Text className="text-gray-500 text-lg mb-10 leading-6">
        {description}
      </Text>

      <TextInput
        placeholder={placeholder}
        placeholderTextColor="#666"
        value={val}
        onChangeText={setVal}
        className={`text-xl font-medium p-5 rounded-2xl mb-8 ${
            isDarkMode ? "bg-[#161B22] text-white" : "bg-white text-slate-900 shadow-sm"
        }`}
      />

      <SlideButton onPress={() => onNext(val)}>SAVE & NEXT</SlideButton>
      
      <Pressable onPress={() => onNext("")} className="mt-6">
        <Text className="text-center text-gray-500 font-bold">Skip for now</Text>
      </Pressable>
    </View>
  );
};

export default PostLoginCard;