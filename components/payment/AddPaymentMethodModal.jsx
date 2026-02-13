/**
 * Payment Method Setup Wizard
 * Focused, multi-step data collection for secure checkout and billing.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Keyboard
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../contexts/ThemeContext';
import { COLORS } from '../../constants/colors';
import { PAYMENT_METHODS } from '../../services/paymentService';

const { width } = Dimensions.get('window');

const AddPaymentMethodModal = ({ onClose, onAdd, loading }) => {
  const { isDarkMode } = useTheme();
  const [step, setStep] = useState(1); // 1: Number, 2: Expiry/CVV, 3: Name
  const [formData, setFormData] = useState({
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
    holderName: '',
  });

  // Refs for auto-navigation
  const cardRef = useRef(null);
  const monthRef = useRef(null);
  const yearRef = useRef(null);
  const cvvRef = useRef(null);
  const nameRef = useRef(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 8, useNativeDriver: true }),
    ]).start();
  }, [step]);

  const textColor = isDarkMode ? COLORS.textLight : COLORS.textPrimary;
  const mutedColor = isDarkMode ? "#94A3B8" : "#64748B";

  // Validation Helpers
  const isValidLuhn = (number) => {
    let sum = 0;
    let isEven = false;
    // Loop through values starting at the rightmost side
    for (let i = number.length - 1; i >= 0; i--) {
      let digit = parseInt(number.charAt(i), 10);
      if (isEven) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
      isEven = !isEven;
    }
    return (sum % 10) === 0;
  };

  const getCardBrand = (number) => {
    const patterns = {
      visa: /^4/,
      mastercard: /^5[1-5]/,
      amex: /^3[47]/,
      discover: /^6(?:011|5)/,
    };
    if (patterns.visa.test(number)) return 'Visa';
    if (patterns.mastercard.test(number)) return 'Mastercard';
    if (patterns.amex.test(number)) return 'Amex';
    if (patterns.discover.test(number)) return 'Discover';
    return 'Card';
  };

  const handleNext = () => {
    if (step === 1) {
      // Validate Card Number
      const cleanNumber = formData.cardNumber.replace(/\s/g, '');
      if (cleanNumber.length < 13 || !isValidLuhn(cleanNumber)) {
        triggerError();
        Alert.alert("Invalid Card", "Please check your card number.");
        return;
      }
    } else if (step === 2) {
      // Validate Expiry
      const month = parseInt(formData.expiryMonth);
      const year = parseInt(formData.expiryYear);
      const now = new Date();
      const currentYear = parseInt(now.getFullYear().toString().slice(-2));
      const currentMonth = now.getMonth() + 1; // 1-indexed

      if (
        isNaN(month) || month < 1 || month > 12 ||
        isNaN(year) || year < currentYear ||
        (year === currentYear && month < currentMonth)
      ) {
        triggerError();
        Alert.alert("Invalid Expiry", "Please check the expiry date.");
        return;
      }

      // Validate CVV
      const brand = getCardBrand(formData.cardNumber.replace(/\s/g, ''));
      const requiredLength = brand === 'Amex' ? 4 : 3;
      if (formData.cvv.length !== requiredLength) {
        triggerError();
        Alert.alert("Invalid CVV", `CVV for ${brand} must be ${requiredLength} digits.`);
        return;
      }

    } else if (step === 3) {
      if (formData.holderName.length < 3) {
        triggerError();
        return;
      }
    }

    if (step < 3) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setStep(step + 1);
    } else {
      submitMethod();
    }
  };

  const triggerError = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    Animated.sequence([
      Animated.timing(slideAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 50, useNativeDriver: true })
    ]).start();
  };

  const submitMethod = () => {
    Keyboard.dismiss();
    const cleanNumber = formData.cardNumber.replace(/\s/g, '');
    const paymentMethod = {
      type: PAYMENT_METHODS.CARD,
      provider: getCardBrand(cleanNumber),
      last4: cleanNumber.slice(-4),
      brand: getCardBrand(cleanNumber),
      expiry_month: parseInt(formData.expiryMonth),
      expiry_year: parseInt(formData.expiryYear),
      metadata: { holderName: formData.holderName }
    };
    onAdd(paymentMethod);
  };

  const handleInputChange = (field, value) => {
    const cleanValue = value.replace(/\D/g, '');

    setFormData(prev => ({ ...prev, [field]: value }));

    // Auto-focus logic
    if (field === 'cardNumber') {
      const brand = getCardBrand(cleanValue);
      const maxLen = brand === 'Amex' ? 15 : 16;

      if (cleanValue.length >= maxLen) {
        // Optional: Auto-validate here or wait for user
      }
    } else if (field === 'expiryMonth' && cleanValue.length === 2) {
      yearRef.current?.focus();
    } else if (field === 'expiryYear' && cleanValue.length === 2) {
      cvvRef.current?.focus();
    } else if (field === 'cvv') {
      // CVV logic handled in validation step
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        const brand = getCardBrand(formData.cardNumber.replace(/\s/g, ''));
        const isAmex = brand === 'Amex';

        return (
          <View style={styles.wizardStep}>
            <View style={styles.row}>
              <Text style={[styles.wizardLabel, { color: mutedColor }]}>{brand === 'Card' ? 'CARD NUMBER' : brand.toUpperCase()}</Text>
              {brand !== 'Card' && (
                <View style={{ marginLeft: 8, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: COLORS.brandPrimary + '20', borderRadius: 4 }}>
                  <Ionicons name={brand === 'Visa' ? 'card' : 'card-outline'} size={12} color={COLORS.brandPrimary} />
                </View>
              )}
            </View>
            <TextInput
              ref={cardRef}
              autoFocus
              style={[styles.wizardInput, { color: textColor }]}
              placeholder={isAmex ? "0000 000000 00000" : "0000 0000 0000 0000"}
              placeholderTextColor={isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}
              value={formData.cardNumber} // Spacing handled in onChange
              onChangeText={(t) => {
                // Custom formatting for Amex vs others
                const raw = t.replace(/\D/g, '');
                let formatted = raw;
                if (getCardBrand(raw) === 'Amex') {
                  // 4-6-5
                  if (raw.length > 4) formatted = raw.slice(0, 4) + ' ' + raw.slice(4);
                  if (raw.length > 10) formatted = formatted.slice(0, 11) + ' ' + raw.slice(10);
                } else {
                  // 4-4-4-4
                  formatted = raw.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
                }
                handleInputChange('cardNumber', formatted);
              }}
              keyboardType="numeric"
              maxLength={isAmex ? 17 : 19}
              returnKeyType="next"
              onSubmitEditing={handleNext}
            />
          </View>
        );
      case 2:
        return (
          <View style={styles.wizardStep}>
            <Text style={[styles.wizardLabel, { color: mutedColor }]}>EXPIRY & SECURITY</Text>
            <View style={styles.row}>
              <TextInput
                ref={monthRef}
                autoFocus
                style={[styles.wizardInput, { color: textColor, width: 80 }]}
                placeholder="MM"
                placeholderTextColor={isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}
                value={formData.expiryMonth}
                onChangeText={(t) => handleInputChange('expiryMonth', t)}
                keyboardType="numeric"
                maxLength={2}
              />
              <Text style={[styles.wizardInput, { color: mutedColor, marginHorizontal: 8 }]}>/</Text>
              <TextInput
                ref={yearRef}
                style={[styles.wizardInput, { color: textColor, width: 80 }]}
                placeholder="YY"
                placeholderTextColor={isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}
                value={formData.expiryYear}
                onChangeText={(t) => handleInputChange('expiryYear', t)}
                keyboardType="numeric"
                maxLength={2}
              />
              <View style={{ width: 40 }} />
              <TextInput
                ref={cvvRef}
                style={[styles.wizardInput, { color: textColor, width: 100 }]}
                placeholder="CVV"
                placeholderTextColor={isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}
                value={formData.cvv}
                onChangeText={(t) => handleInputChange('cvv', t)}
                keyboardType="numeric"
                maxLength={4}
                secureTextEntry
                returnKeyType="next"
                onSubmitEditing={handleNext}
              />
            </View>
          </View>
        );
      case 3:
        return (
          <View style={styles.wizardStep}>
            <Text style={[styles.wizardLabel, { color: mutedColor }]}>CARDHOLDER NAME</Text>
            <TextInput
              ref={nameRef}
              autoFocus
              style={[styles.wizardInput, { color: textColor }]}
              placeholder="e.g. JOHN DOE"
              placeholderTextColor={isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}
              value={formData.holderName}
              onChangeText={(t) => setFormData(p => ({ ...p, holderName: t.toUpperCase() }))}
              autoCapitalize="characters"
              returnKeyType="done"
              onSubmitEditing={handleNext}
            />
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <BlurView intensity={isDarkMode ? 40 : 80} style={styles.overlay}>
      <Pressable onPress={Keyboard.dismiss} style={StyleSheet.absoluteFill} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalContentWrapper}
      >
        <View style={[styles.modalContent, { backgroundColor: isDarkMode ? "rgba(10,15,26,0.9)" : "rgba(255,255,255,0.9)" }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
              <Ionicons name="close" size={24} color={textColor} />
            </TouchableOpacity>
            <View style={styles.stepIndicator}>
              {[1, 2, 3].map(s => (
                <View key={s} style={[styles.dot, { backgroundColor: s === step ? COLORS.brandPrimary : (isDarkMode ? "#2D3748" : "#E2E8F0") }]} />
              ))}
            </View>
            <View style={{ width: 44 }} />
          </View>

          <Animated.View style={[styles.formContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            {renderStep()}
          </Animated.View>

          <TouchableOpacity
            style={[styles.nextButton, { backgroundColor: COLORS.brandPrimary }]}
            onPress={handleNext}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.nextText}>{step === 3 ? "ADD CARD" : "CONTINUE"}</Text>
                <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </BlurView>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContentWrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    width: width * 0.9,
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.4,
    shadowRadius: 30,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 40,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIndicator: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  formContainer: {
    minHeight: 180,
    justifyContent: 'center',
  },
  wizardStep: {
    gap: 12,
  },
  wizardLabel: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 8,
  },
  wizardInput: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1,
    padding: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nextButton: {
    height: 64,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 40,
  },
  nextText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  }
});

export default AddPaymentMethodModal;
