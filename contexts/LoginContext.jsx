"use client"

/**
 * Global Login Flow Context
 * Manages state across all login steps for iVisit
 * Mirrors RegistrationContext structure for consistency
 */

import { createContext, useContext, useState, useCallback } from "react"
import { LOGIN_STEPS, LOGIN_FLOWS } from "../constants/loginSteps"

const LoginContext = createContext()

const initialLoginData = {
  method: null, // "phone" | "email"
  phoneNumber: null,
  email: null,
  password: null,
  otp: null,
  resetEmail: null,
  resetToken: null,
  newPassword: null,
}

export function LoginProvider({ children }) {
  const [currentStep, setCurrentStep] = useState(LOGIN_STEPS.METHOD_SELECTION)

  const [loginData, setLoginData] = useState(initialLoginData)

  const updateLoginData = useCallback((updates) => {
    setLoginData((prev) => ({ ...prev, ...updates }))
  }, [])

  const goToStep = useCallback((step) => setCurrentStep(step), [])

  const nextStep = useCallback(() => {
    const flow = LOGIN_FLOWS[loginData.method]
    if (!flow) return

    const index = flow.indexOf(currentStep)
    if (index !== -1 && index < flow.length - 1) {
      setCurrentStep(flow[index + 1])
    }
  }, [currentStep, loginData.method])

  const previousStep = useCallback(() => {
    const flow = LOGIN_FLOWS[loginData.method]
    if (!flow) return

    const index = flow.indexOf(currentStep)
    if (index > 0) {
      setCurrentStep(flow[index - 1])
    }
  }, [currentStep, loginData.method])

  const resetLoginFlow = useCallback(() => {
    setCurrentStep(LOGIN_STEPS.METHOD_SELECTION)
    setLoginData(initialLoginData)
  }, [])

  const resetLogin = useCallback(() => {
    setLoginData(initialLoginData)
  }, [])

  const canGoBack = currentStep !== LOGIN_STEPS.METHOD_SELECTION

  const getProgress = useCallback(() => {
    const flow = LOGIN_FLOWS[loginData.method]
    if (!flow) return 0

    const currentIndex = flow.indexOf(currentStep)
    return ((currentIndex + 1) / flow.length) * 100
  }, [currentStep, loginData.method])

  const value = {
    currentStep,
    loginData,
    updateLoginData,
    goToStep,
    nextStep,
    previousStep,
    resetLoginFlow,
    resetLogin,
    canGoBack,
    getProgress,
    STEPS: LOGIN_STEPS,
  }

  return <LoginContext.Provider value={value}>{children}</LoginContext.Provider>
}

export function useLogin() {
  const context = useContext(LoginContext)
  if (!context) throw new Error("useLogin must be used within LoginProvider")
  return context
}

export { LOGIN_STEPS }
