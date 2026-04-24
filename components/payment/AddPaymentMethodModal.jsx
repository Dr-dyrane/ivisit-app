import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Keyboard,
  Alert
} from 'react-native';
import { useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { CardField, useConfirmSetupIntent } from '@stripe/stripe-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { COLORS } from '../../constants/colors';
import { paymentService } from '../../services/paymentService';
import { getStackViewportVariant, getStackViewportSurfaceConfig } from '../../utils/ui/stackViewportConfig';

const AddPaymentMethodModal = ({ onClose, onAdd, loading }) => {
  const { isDarkMode } = useTheme();
  const [cardDetails, setCardDetails] = useState(null);
  const [step, setStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const { width } = useWindowDimensions();

  // Viewport config — resolve variant and surface config for modal sizing
  const viewportVariant = useMemo(
    () => getStackViewportVariant({ platform: Platform.OS, width }),
    [width],
  );
  const surfaceConfig = useMemo(
    () => getStackViewportSurfaceConfig(viewportVariant),
    [viewportVariant],
  );

  const { confirmSetupIntent } = useConfirmSetupIntent();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);

  const textColor = isDarkMode ? COLORS.textLight : COLORS.textPrimary;
  const mutedColor = isDarkMode ? "#94A3B8" : "#64748B";
  const OverlayContainer = Platform.OS === 'ios' ? BlurView : View;
  const overlayProps = Platform.OS === 'ios' ? { intensity: isDarkMode ? 40 : 80 } : {};
  const overlayStyle = [
    styles.overlay,
    Platform.OS === 'android' && {
      backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.86)' : 'rgba(255, 255, 255, 0.84)',
    },
  ];

  const handleSecureAdd = async () => {
    if (!cardDetails?.complete) {
      Alert.alert("Incomplete Details", "Please fill in all card information.");
      return;
    }

    setIsProcessing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // 1. Create SetupIntent via Edge Function
      const { clientSecret } = await paymentService.createSetupIntent();

      // 2. Confirm SetupIntent on Client (Securely via Stripe SDK)
      const { setupIntent, error } = await confirmSetupIntent(clientSecret, {
        paymentMethodType: 'Card',
      });

      if (error) {
        throw new Error(error.message);
      }

      if (setupIntent.status === 'Succeeded') {
        // 3. Add to our DB (Only safe metadata)
        const stripeMethodId = setupIntent.paymentMethodId;

        // We need to fetch the PM details from Stripe to get brand/last4
        // Or we can just use what's in cardDetails (which Stripe SDK provides as metadata)

        const paymentMethod = {
          id: stripeMethodId,
          last4: cardDetails.last4,
          brand: cardDetails.brand,
          expiry_month: cardDetails.expiryMonth,
          expiry_year: cardDetails.expiryYear,
          metadata: { secure: true }
        };

        await onAdd(paymentMethod);
      }
    } catch (err) {
      console.error('Secure Card Add Error:', err);
      Alert.alert("Security Error", err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <OverlayContainer {...overlayProps} style={overlayStyle}>
      <Pressable onPress={Keyboard.dismiss} style={StyleSheet.absoluteFill} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalContentWrapper}
      >
        <View style={[styles.modalContent, { backgroundColor: isDarkMode ? "rgba(10,15,26,0.95)" : "rgba(255,255,255,0.95)", maxWidth: surfaceConfig.modalMaxWidth, width: '100%', alignSelf: 'center' }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
              <Ionicons name="close" size={24} color={textColor} />
            </TouchableOpacity>
            <View style={styles.securityTitle}>
              <Ionicons name="shield-checkmark" size={14} color={COLORS.brandPrimary} />
              <Text style={[styles.securityLabel, { color: mutedColor }]}>ENCRYPTED CHANNEL</Text>
            </View>
            <View style={{ width: 44 }} />
          </View>

          <Animated.View style={[styles.formContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <View style={styles.wizardStep}>
              <Text style={[styles.wizardLabel, { color: mutedColor }]}>SECURE CARD ENTRY</Text>
              <View style={[
                styles.cardContainer,
                {
                  backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC', // Explicit bg for contrast
                  borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
                }
              ]}>
                <CardField
                  postalCodeEnabled={false}
                  cardStyle={{
                    backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC',
                    textColor: isDarkMode ? '#FFFFFF' : '#0F172A',
                    borderColor: isDarkMode ? '#1E293B' : '#F8FAFC', // Hide internal border
                    borderWidth: 0,
                    borderRadius: 8,
                    fontSize: 16,
                    placeholderColor: isDarkMode ? '#94A3B8' : '#64748B',
                  }}
                  style={{
                    width: '100%',
                    height: 50,
                  }}
                  onCardChange={(details) => setCardDetails(details)}
                />
              </View>
              <Text style={styles.pciNote}>
                Your card data is sent directly to Stripe and never touches our servers.
              </Text>
            </View>
          </Animated.View>

          <TouchableOpacity
            style={[styles.nextButton, { backgroundColor: cardDetails?.complete ? COLORS.brandPrimary : (isDarkMode ? '#1E293B' : '#E2E8F0') }]}
            onPress={handleSecureAdd}
            disabled={loading || isProcessing || !cardDetails?.complete}
          >
            {loading || isProcessing ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={[styles.nextText, { color: cardDetails?.complete ? '#FFF' : mutedColor }]}>VERIFY & ATTACH</Text>
                <Ionicons name="lock-closed" size={18} color={cardDetails?.complete ? '#FFF' : mutedColor} />
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </OverlayContainer>
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
    width: '100%',
    borderRadius: 48,
    padding: 24,
    borderWidth: 0,
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
  securityTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  securityLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  formContainer: {
    minHeight: 180,
    justifyContent: 'center',
  },
  wizardStep: {
    gap: 16,
  },
  wizardLabel: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 4,
  },
  cardContainer: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 0,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  cardField: {
    width: '100%',
    height: 50,
  },
  pciNote: {
    fontSize: 10,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '600',
    lineHeight: 14,
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
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  }
});

export default AddPaymentMethodModal;
