"use client"

import React, { createContext, useContext, useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useToast } from "./ToastContext";
import { useAuth } from "./AuthContext";
import { REGISTRATION_STEPS } from "../constants/registrationSteps";

const LoginContext = createContext();

const generateToken = () => Math.random().toString(36).slice(2) + Date.now().toString(36).slice(2);

export function LoginProvider({ children }) {
  const { showToast } = useToast();
  const { login } = useAuth();

  const [currentStep, setCurrentStep] = useState(REGISTRATION_STEPS.METHOD_SELECTION);
  const [method, setMethod] = useState(null);
  const [contact, setContact] = useState(null);
  const [loading, setLoading] = useState(false);

  const reset = useCallback(() => {
    setCurrentStep(REGISTRATION_STEPS.METHOD_SELECTION);
    setMethod(null);
    setContact(null);
    setLoading(false);
  }, []);

  const goBack = useCallback(() => {
    if (currentStep === REGISTRATION_STEPS.METHOD_SELECTION) return;
    if (currentStep === REGISTRATION_STEPS.PHONE_INPUT || currentStep === REGISTRATION_STEPS.EMAIL_INPUT) {
      setCurrentStep(REGISTRATION_STEPS.METHOD_SELECTION);
      setMethod(null);
      setContact(null);
      return;
    }
    if (currentStep === REGISTRATION_STEPS.OTP_VERIFICATION) {
      setCurrentStep(method === "phone" ? REGISTRATION_STEPS.PHONE_INPUT : REGISTRATION_STEPS.EMAIL_INPUT);
      return;
    }
    if (currentStep === REGISTRATION_STEPS.PASSWORD_SETUP) {
      setCurrentStep(REGISTRATION_STEPS.EMAIL_INPUT);
      return;
    }
    setCurrentStep(REGISTRATION_STEPS.METHOD_SELECTION);
  }, [currentStep, method]);

  const selectMethod = useCallback((m) => {
    setMethod(m);
    if (m === "phone") setCurrentStep(REGISTRATION_STEPS.PHONE_INPUT);
    else if (m === "email") setCurrentStep(REGISTRATION_STEPS.EMAIL_INPUT);
    else if (m === "password") setCurrentStep(REGISTRATION_STEPS.EMAIL_INPUT);
    else if (m === "social") setCurrentStep(REGISTRATION_STEPS.SOCIAL_SELECTION);
  }, []);

  const socialSignIn = useCallback(async (provider, profile) => {
    setLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 800));
      const usersData = await AsyncStorage.getItem("users");
      const users = usersData ? JSON.parse(usersData) : [];
      let user = users.find((u) => u.email && profile.email && u.email.toLowerCase() === profile.email.toLowerCase());
      if (!user) {
        user = { id: `social_${provider}_${Date.now()}`, fullName: profile.name || `${provider} user`, email: profile.email };
        users.push(user);
      }
      const token = generateToken();
      const loggedUser = { ...user, token };
      const updated = users.map((u) => (u.email && loggedUser.email && u.email.toLowerCase() === loggedUser.email.toLowerCase() ? loggedUser : u));
      await AsyncStorage.setItem("users", JSON.stringify(updated));
      await AsyncStorage.setItem("token", token);
      await login(loggedUser);
      showToast(`Signed in with ${provider}`, "success");
      reset();
      return true;
    } catch (err) {
      showToast(`Social sign-in failed: ${err?.message || err}`, "error");
      return false;
    } finally {
      setLoading(false);
    }
  }, [login, reset, showToast]);

  const submitPhone = useCallback(async (e164) => {
    setLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 600));
      setContact(e164);
      setCurrentStep(REGISTRATION_STEPS.OTP_VERIFICATION);
      showToast("OTP sent", "success");
      return true;
    } catch (err) {
      showToast("Failed to send OTP", "error");
      return false;
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const submitEmail = useCallback(async (email) => {
    setLoading(true);
    try {
      if (method === "password") {
        setContact(email);
        setCurrentStep(REGISTRATION_STEPS.PASSWORD_SETUP);
        return true;
      } else {
        await new Promise((r) => setTimeout(r, 600));
        setContact(email);
        setCurrentStep(REGISTRATION_STEPS.OTP_VERIFICATION);
        showToast("OTP sent to email", "success");
        return true;
      }
    } catch (err) {
      showToast("Failed to continue", "error");
      return false;
    } finally {
      setLoading(false);
    }
  }, [method, showToast]);

  const submitPassword = useCallback(async (password) => {
    setLoading(true);
    try {
      const usersData = await AsyncStorage.getItem("users");
      const users = usersData ? JSON.parse(usersData) : [];
      const user = users.find((u) => u.email && u.email.toLowerCase() === contact?.toLowerCase());
      if (!user) throw new Error("User not found");
      if (user.password !== password) throw new Error("Invalid credentials");
      const token = generateToken();
      const loggedUser = { ...user, token };
      const updated = users.map((u) => (u.email === user.email ? loggedUser : u));
      await AsyncStorage.setItem("users", JSON.stringify(updated));
      await AsyncStorage.setItem("token", token);
      await login(loggedUser);
      showToast("Logged in", "success");
      reset();
      return true;
    } catch (err) {
      showToast(err?.message || "Login failed", "error");
      return false;
    } finally {
      setLoading(false);
    }
  }, [contact, login, reset, showToast]);

  const verifyOTP = useCallback(async (otp) => {
    setLoading(true);
    try {
      const usersData = await AsyncStorage.getItem("users");
      const users = usersData ? JSON.parse(usersData) : [];
      const user = users.find((u) => (method === "phone" ? u.phone === contact : u.email && u.email.toLowerCase() === contact?.toLowerCase()));
      if (!user) throw new Error("User not found");
      const token = generateToken();
      const loggedUser = { ...user, token };
      const updated = users.map((u) => (u.email === user.email ? loggedUser : u));
      await AsyncStorage.setItem("users", JSON.stringify(updated));
      await AsyncStorage.setItem("token", token);
      await login(loggedUser);
      showToast("Logged in via OTP", "success");
      reset();
      return true;
    } catch (err) {
      showToast(err?.message || "OTP login failed", "error");
      return false;
    } finally {
      setLoading(false);
    }
  }, [contact, login, method, reset, showToast]);

  const resendOTP = useCallback(() => {
    showToast("OTP resent", "info");
  }, [showToast]);

  const value = {
    currentStep,
    method,
    contact,
    loading,
    reset,
    goBack,
    selectMethod,
    socialSignIn,
    submitPhone,
    submitEmail,
    submitPassword,
    verifyOTP,
    resendOTP,
  };

  return <LoginContext.Provider value={value}>{children}</LoginContext.Provider>;
}

export function useLogin() {
  const ctx = useContext(LoginContext);
  if (!ctx) throw new Error("useLogin must be used within LoginProvider");
  return ctx;
}

export { REGISTRATION_STEPS };
