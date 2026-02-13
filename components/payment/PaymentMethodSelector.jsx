/**
 * Payment Method Selector Component
 * Uber-like payment method selection interface
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../contexts/ThemeContext';
import { COLORS } from '../../constants/colors';
import { paymentService, PAYMENT_METHODS } from '../../services/paymentService';
import AddPaymentMethodModal from './AddPaymentMethodModal';

const PaymentMethodSelector = ({
  selectedMethod,
  onMethodSelect,
  cost,
  showAddButton = true,
  style
}) => {
  const { isDarkMode } = useTheme();
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addingMethod, setAddingMethod] = useState(false);

  const colors = React.useMemo(() => ({
    text: isDarkMode ? "#FFFFFF" : "#0F172A",
    muted: isDarkMode ? "#94A3B8" : "#64748B",
    cardBg: isDarkMode ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
    activeRing: COLORS.brandPrimary,
  }), [isDarkMode]);

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    try {
      setLoading(true);
      const methods = await paymentService.getPaymentMethods();
      setPaymentMethods(methods);

      if (!selectedMethod && methods.length > 0) {
        const defaultMethod = methods.find(m => m.is_default) || methods[0];
        onMethodSelect(defaultMethod);
      }
    } catch (error) {
      console.error('Error loading methods:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPaymentMethod = async (paymentMethod) => {
    try {
      setAddingMethod(true);
      const newMethod = await paymentService.addPaymentMethod(paymentMethod);
      setPaymentMethods(prev => [newMethod, ...prev]);
      setShowAddModal(false);
      onMethodSelect(newMethod);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Alert.alert('System Error', error.message);
    } finally {
      setAddingMethod(false);
    }
  };

  const renderPaymentMethod = (method) => {
    const isSelected = selectedMethod?.id === method.id;

    return (
      <TouchableOpacity
        key={method.id}
        activeOpacity={0.8}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onMethodSelect(method);
        }}
        style={[
          styles.methodCard,
          {
            backgroundColor: colors.cardBg,
            borderColor: isSelected ? colors.activeRing : 'rgba(255,255,255,0.05)',
            borderWidth: 1,
          }
        ]}
      >
        <View style={styles.methodMain}>
          <View style={[styles.iconBox, { backgroundColor: isSelected ? colors.activeRing : 'rgba(255,255,255,0.05)' }]}>
            <Ionicons
              name={method.brand?.toLowerCase() === 'visa' ? "card" : "card-outline"}
              size={20}
              color={isSelected ? "#FFF" : colors.text}
            />
          </View>
          <View style={styles.methodMeta}>
            <Text style={[styles.methodLabel, { color: colors.text }]}>
              {method.brand} •••• {method.last4}
            </Text>
            <Text style={[styles.methodSub, { color: colors.muted }]}>
              EXPIRES {method.expiry_month}/{method.expiry_year}
            </Text>
          </View>
        </View>
        {isSelected && (
          <Ionicons name="checkmark-circle" size={22} color={COLORS.brandPrimary} />
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return <ActivityIndicator color={COLORS.brandPrimary} style={{ margin: 20 }} />;
  }

  return (
    <View style={[styles.container, style]}>
      <ScrollView
        style={styles.methodsList}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      >
        {paymentMethods.map(renderPaymentMethod)}

        {showAddButton && (
          <TouchableOpacity
            activeOpacity={0.7}
            style={[styles.addCard, { borderColor: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)" }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setShowAddModal(true);
            }}
          >
            <View style={styles.addCardContent}>
              <Ionicons name="add-circle" size={24} color={COLORS.brandPrimary} />
              <Text style={styles.addCardText}>ADD PAYMENT METHOD</Text>
            </View>
          </TouchableOpacity>
        )}
      </ScrollView>

      <Modal
        visible={showAddModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddModal(false)}
      >
        <AddPaymentMethodModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddPaymentMethod}
          loading={addingMethod}
        />
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    gap: 12,
  },
  methodCard: {
    borderRadius: 24,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  methodMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodMeta: {
    gap: 2,
  },
  methodLabel: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  methodSub: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  addCard: {
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  addCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addCardText: {
    color: COLORS.brandPrimary,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
  },
});

export default PaymentMethodSelector;
