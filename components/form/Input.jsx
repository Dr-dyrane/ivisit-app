import React, { useState } from 'react';
import { View, TextInput, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { COLORS } from '../../constants/colors';

const Input = ({ label, placeholder, onChangeText, value, error, secureTextEntry = false, icon }) => {
  const [isPasswordVisible, setPasswordVisible] = useState(secureTextEntry);
  const [isFocused, setIsFocused] = useState(false);
  const { isDarkMode } = useTheme();

  const colors = {
    bg: isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
    activeBG: isDarkMode ? "#1E293B" : "#FFFFFF",
    text: isDarkMode ? "#FFFFFF" : "#0F172A",
    muted: isDarkMode ? "#94A3B8" : "#64748B",
  };

  return (
    <View style={styles.container}>
      {label && (
        <Text style={[styles.label, { color: colors.muted }]}>
          {label.toUpperCase()}
        </Text>
      )}
      <View style={styles.inputWrapper}>
        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: isFocused ? colors.activeBG : colors.bg,
              shadowColor: isFocused ? COLORS.brandPrimary : "#000",
              shadowOpacity: isFocused ? 0.15 : 0.03,
              shadowRadius: isFocused ? 15 : 8,
              elevation: isFocused ? 6 : 2,
            },
          ]}
        >
          {icon && (
            <Ionicons 
              name={icon} 
              size={22} 
              color={isFocused ? COLORS.brandPrimary : colors.muted} 
              style={styles.icon} 
            />
          )}
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder={placeholder}
            placeholderTextColor={colors.muted}
            onChangeText={onChangeText}
            value={value}
            secureTextEntry={isPasswordVisible}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            selectionColor={COLORS.brandPrimary}
          />
          {secureTextEntry && (
            <Pressable
              onPress={() => setPasswordVisible(!isPasswordVisible)}
              style={styles.toggleBtn}
            >
              <Ionicons
                name={isPasswordVisible ? 'eye-off' : 'eye'}
                size={22}
                color={colors.muted}
              />
            </Pressable>
          )}
        </View>
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 20,
  },
  label: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrapper: {
    zIndex: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 60,
    borderRadius: 24, // Widget Layer
    paddingHorizontal: 16,
  },
  icon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  toggleBtn: {
    padding: 8,
  },
  errorText: {
    marginTop: 6,
    color: COLORS.error,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
});

export default Input;
