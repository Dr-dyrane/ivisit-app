import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Animated,
  Platform,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { COLORS } from '../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import EmergencyMap from '../components/map/EmergencyMap';
import HospitalCard from '../components/emergency/HospitalCard';
import { HOSPITALS } from '../data/hospitals';

export default function BookBedScreen() {
  const { isDarkMode } = useTheme();
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [viewMode, setViewMode] = useState('map');
  const [bedType, setBedType] = useState('general'); // general, icu, emergency
  const insets = useSafeAreaInsets();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const colors = {
    background: isDarkMode ? COLORS.bgDark : COLORS.bgLight,
    card: isDarkMode ? COLORS.bgDarkAlt : COLORS.bgLightAlt,
    text: isDarkMode ? COLORS.textLight : COLORS.textPrimary,
    textMuted: isDarkMode ? COLORS.textMutedDark : COLORS.textMuted,
  };

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleHospitalSelect = (hospital) => {
    setSelectedHospital(hospital.id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleBookBed = (hospitalId) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    console.log(`[v0] Bed booking requested at hospital ${hospitalId}`);
  };

  const toggleViewMode = () => {
    setViewMode(viewMode === 'map' ? 'list' : 'map');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const bedTypes = [
    { id: 'general', label: 'General', icon: 'bed-outline' },
    { id: 'icu', label: 'ICU', icon: 'medical-outline' },
    { id: 'emergency', label: 'Emergency', icon: 'flash-outline' },
  ];

  const tabBarHeight = Platform.OS === 'ios' ? 85 + insets.bottom : 70;
  const bottomPadding = tabBarHeight + 20;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
          paddingHorizontal: 20,
          paddingTop: 20,
          paddingBottom: 10,
          backgroundColor: colors.background,
          zIndex: 10,
        }}
      >
        <View style={{ marginBottom: 16 }}>
          <Text style={{
            fontSize: 24,
            fontWeight: '800',
            color: colors.text,
            marginBottom: 4,
          }}>
            Book Hospital Bed
          </Text>
          <Text style={{
            fontSize: 14,
            color: colors.textMuted,
          }}>
            Reserve your bed before arrival
          </Text>
        </View>

        {/* Bed Type Selector */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 16 }}
        >
          {bedTypes.map((type) => (
            <Pressable
              key={type.id}
              onPress={() => {
                setBedType(type.id);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              style={{
                backgroundColor: bedType === type.id ? COLORS.brandPrimary : colors.card,
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 20,
                marginRight: 12,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <Ionicons
                name={type.icon}
                size={16}
                color={bedType === type.id ? '#FFFFFF' : colors.text}
              />
              <Text style={{
                color: bedType === type.id ? '#FFFFFF' : colors.text,
                fontSize: 14,
                fontWeight: '600',
                marginLeft: 6,
              }}>
                {type.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* View Toggle */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{
            fontSize: 16,
            fontWeight: '600',
            color: colors.text,
          }}>
            Available Beds
          </Text>
          
          <Pressable
            onPress={toggleViewMode}
            style={{
              backgroundColor: colors.card,
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 20,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <Ionicons 
              name={viewMode === 'map' ? 'list' : 'map'} 
              size={16} 
              color={colors.text} 
            />
            <Text style={{ 
              color: colors.text, 
              fontSize: 12, 
              fontWeight: '600', 
              marginLeft: 6 
            }}>
              {viewMode === 'map' ? 'List' : 'Map'}
            </Text>
          </Pressable>
        </View>
      </Animated.View>

      {/* Main Content */}
      {viewMode === 'map' ? (
        <EmergencyMap
          onHospitalSelect={handleHospitalSelect}
          selectedHospitalId={selectedHospital}
          style={{ flex: 1 }}
        />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: bottomPadding, paddingHorizontal: 20 }}
        >
          {HOSPITALS.filter(h => h.availableBeds > 0).map((hospital) => (
            <HospitalCard
              key={hospital.id}
              hospital={hospital}
              isSelected={selectedHospital === hospital.id}
              onSelect={setSelectedHospital}
              onCall={handleBookBed}
              mode="booking"
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}
