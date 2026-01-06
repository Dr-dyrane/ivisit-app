import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  Animated,
  ScrollView,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../contexts/ThemeContext';
import { COLORS } from '../../constants/colors';
import { AMBULANCE_TYPES, MOCK_API_RESPONSES } from '../../data/emergencyServices';
import StatusIndicator from '../ui/StatusIndicator';
import IconButton from '../ui/IconButton';

const { height } = Dimensions.get('window');

const EmergencyRequestModal = ({
  visible,
  onClose,
  selectedHospital,
  onRequestComplete,
}) => {
  const { isDarkMode } = useTheme();
  const [step, setStep] = useState('select'); // 'select', 'confirming', 'dispatched'
  const [selectedAmbulanceType, setSelectedAmbulanceType] = useState('advanced');
  const [isRequesting, setIsRequesting] = useState(false);
  const [requestData, setRequestData] = useState(null);

  const slideAnim = useRef(new Animated.Value(height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const colors = {
    background: isDarkMode ? COLORS.bgDark : COLORS.bgLight,
    card: isDarkMode ? COLORS.bgDarkAlt : COLORS.bgLightAlt,
    text: isDarkMode ? COLORS.textLight : COLORS.textPrimary,
    textMuted: isDarkMode ? COLORS.textMutedDark : COLORS.textMuted,
  };

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: height,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleRequestEmergency = async () => {
    setIsRequesting(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    // Simulate API call
    setTimeout(() => {
      const response = {
        ...MOCK_API_RESPONSES.requestAmbulance,
        hospitalName: selectedHospital?.name,
        ambulanceType: selectedAmbulanceType,
      };
      
      setRequestData(response);
      setStep('dispatched');
      setIsRequesting(false);
      
      if (onRequestComplete) {
        onRequestComplete(response);
      }
    }, 2000);
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep('select');
    setRequestData(null);
    onClose();
  };

  const renderSelectStep = () => (
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          Request Emergency Service
        </Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          {selectedHospital?.name}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Select Ambulance Type
        </Text>
        
        {AMBULANCE_TYPES.map((type) => (
          <Pressable
            key={type.id}
            onPress={() => {
              setSelectedAmbulanceType(type.id);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            style={[
              styles.ambulanceCard,
              {
                backgroundColor: selectedAmbulanceType === type.id 
                  ? `${COLORS.brandPrimary}15` 
                  : colors.card,
                borderColor: selectedAmbulanceType === type.id 
                  ? COLORS.brandPrimary 
                  : 'transparent',
              },
            ]}
          >
            <View style={styles.ambulanceHeader}>
              <Ionicons
                name={type.icon}
                size={24}
                color={selectedAmbulanceType === type.id ? COLORS.brandPrimary : colors.text}
              />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.ambulanceName, { color: colors.text }]}>
                  {type.name}
                </Text>
                <Text style={[styles.ambulancePrice, { color: COLORS.brandPrimary }]}>
                  {type.price}
                </Text>
              </View>
              <StatusIndicator
                status="available"
                text={type.eta}
                size="small"
              />
            </View>
            
            <Text style={[styles.ambulanceDescription, { color: colors.textMuted }]}>
              {type.description}
            </Text>
            
            <View style={styles.featuresList}>
              {type.features.map((feature, index) => (
                <View key={index} style={styles.feature}>
                  <Ionicons name="checkmark" size={12} color="#10B981" />
                  <Text style={[styles.featureText, { color: colors.textMuted }]}>
                    {feature}
                  </Text>
                </View>
              ))}
            </View>
          </Pressable>
        ))}
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={handleRequestEmergency}
          disabled={isRequesting}
          style={[
            styles.requestButton,
            { backgroundColor: COLORS.brandPrimary },
            isRequesting && { opacity: 0.7 },
          ]}
        >
          <Ionicons name="medical" size={20} color="#FFFFFF" />
          <Text style={styles.requestButtonText}>
            {isRequesting ? 'Requesting...' : 'Request Emergency Service'}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );

  const renderDispatchedStep = () => (
    <View style={styles.successContainer}>
      <View style={styles.successIcon}>
        <Ionicons name="checkmark-circle" size={60} color="#10B981" />
      </View>
      
      <Text style={[styles.successTitle, { color: colors.text }]}>
        Emergency Service Dispatched
      </Text>
      
      <Text style={[styles.successSubtitle, { color: colors.textMuted }]}>
        Help is on the way
      </Text>

      <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Request ID:</Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>{requestData?.requestId}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: colors.textMuted }]}>ETA:</Text>
          <Text style={[styles.infoValue, { color: COLORS.brandPrimary }]}>
            {requestData?.estimatedArrival}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Hospital:</Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>{requestData?.hospitalName}</Text>
        </View>
      </View>

      <Pressable
        onPress={handleClose}
        style={[styles.doneButton, { backgroundColor: colors.card }]}
      >
        <Text style={[styles.doneButtonText, { color: colors.text }]}>
          Done
        </Text>
      </Pressable>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <Animated.View
        style={[
          styles.overlay,
          { opacity: fadeAnim },
        ]}
      >
        <Pressable style={styles.backdrop} onPress={handleClose} />
        
        <Animated.View
          style={[
            styles.modal,
            {
              backgroundColor: colors.background,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.handle} />
          
          <IconButton
            icon="close"
            onPress={handleClose}
            style={styles.closeButton}
            variant="ghost"
          />

          {step === 'select' && renderSelectStep()}
          {step === 'dispatched' && renderDispatchedStep()}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  backdrop: {
    flex: 1,
  },
  modal: {
    height: height * 0.85,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#D1D5DB',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  ambulanceCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 2,
  },
  ambulanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ambulanceName: {
    fontSize: 16,
    fontWeight: '700',
  },
  ambulancePrice: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  ambulanceDescription: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  featuresList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 4,
  },
  featureText: {
    fontSize: 12,
    marginLeft: 4,
  },
  actions: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  requestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
  },
  requestButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  successIcon: {
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
  },
  infoCard: {
    width: '100%',
    padding: 20,
    borderRadius: 16,
    marginBottom: 32,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  doneButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default EmergencyRequestModal;
