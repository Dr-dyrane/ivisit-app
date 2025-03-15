import React, { useState } from 'react';
import { View, TextInput, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // Using Expo icons

const Input = ({ label, placeholder, onChangeText, value, error, secureTextEntry = false, icon }) => {
  const [isPasswordVisible, setPasswordVisible] = useState(secureTextEntry);

  return (
    <View className="w-full mb-4">
      <Text className="mb-2 text-gray-700">{label}</Text>
      <View className="relative flex-row items-center">
        {icon && (
          <Ionicons name={icon} size={24} color="#0087736a" style={{ marginHorizontal: 10 }} />
        )}
        <TextInput
          className={`flex-1 p-4 py-3 bg-[#f0fff4] border rounded-lg ${error ? 'border-red-500' : 'border-gray-300'}`}
          placeholder={placeholder}
          onChangeText={onChangeText}
          value={value}
          secureTextEntry={isPasswordVisible}
        />
        {/* Password Toggle Icon */}
        {secureTextEntry && (
          <Pressable
            className="absolute right-4 top-4"
            onPress={() => setPasswordVisible(!isPasswordVisible)}
          >
            <Ionicons
              name={isPasswordVisible ? 'eye-off' : 'eye'}
              size={24}
              color="gray"
            />
          </Pressable>
        )}
      </View>
      {error && <Text className="mt-1 text-red-500 text-xs">{error}</Text>}
    </View>
  );
};

export default Input;
