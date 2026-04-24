"use client";

import React from 'react';
import PaymentScreenOrchestrator from '../components/payment/PaymentScreenOrchestrator';

// PULLBACK NOTE: Refactor PaymentScreen to minimal orchestrator
// OLD: Monolithic 618-line component with all logic inline
// NEW: Minimal screen that delegates to PaymentScreenOrchestrator
// REASON: Adopt modular implementation style from map/welcome screens

const PaymentScreen = () => {
  return <PaymentScreenOrchestrator />;
};

export default PaymentScreen;
