"use client"

/**
 * Global Registration Flow Context
 * Manages state across all registration steps for iVisit
 * Allows users to navigate back/forth while preserving data
 */

import { createContext, useContext, useState, useCallback } from "react"
import { REGISTRATION_STEPS } from "../constants/registrationSteps"

const RegistrationContext = createContext()

export function RegistrationProvider({ children }) {
  // Current step in the flow
  const [currentStep, setCurrentStep] = useState(REGISTRATION_STEPS.METHOD_SELECTION)

  // Registration data accumulated across steps
  const [registrationData, setRegistrationData] = useState({
    method: null, // "phone" | "email"
    countryCode: null,
    phoneNumber: null,
    email: null,
    otp: null,
    firstName: null,
    lastName: null,
    password: null,
    dateOfBirth: null,
    profileComplete: false,
  })

  const updateRegistrationData = useCallback((updates) => {
    console.log("[v0] Updating registration data:", updates)
    setRegistrationData((prev) => {
      const newData = { ...prev, ...updates }
      console.log("[v0] New registration data:", newData)
      return newData
    })
  }, [])

  // Navigate to a specific step
  const goToStep = useCallback((step) => {
    console.log("[v0] Going to step:", step)
    setCurrentStep(step)
  }, [])

  const nextStep = useCallback(() => {
    console.log("[v0] Current step:", currentStep, "Method:", registrationData.method)

    const stepOrder = [
      REGISTRATION_STEPS.METHOD_SELECTION,
      registrationData.method === "phone" ? REGISTRATION_STEPS.PHONE_INPUT : REGISTRATION_STEPS.EMAIL_INPUT,
      REGISTRATION_STEPS.OTP_VERIFICATION,
      REGISTRATION_STEPS.PROFILE_FORM,
      REGISTRATION_STEPS.PASSWORD_SETUP,
    ]

    const currentIndex = stepOrder.indexOf(currentStep)
    console.log("[v0] Current index:", currentIndex, "Step order:", stepOrder)

    if (currentIndex < stepOrder.length - 1) {
      const nextStepValue = stepOrder[currentIndex + 1]
      console.log("[v0] Moving to next step:", nextStepValue)
      setCurrentStep(nextStepValue)
    }
  }, [currentStep, registrationData.method])

  const previousStep = useCallback(() => {
    console.log("[v0] Going to previous step from:", currentStep)

    const stepOrder = [
      REGISTRATION_STEPS.METHOD_SELECTION,
      registrationData.method === "phone" ? REGISTRATION_STEPS.PHONE_INPUT : REGISTRATION_STEPS.EMAIL_INPUT,
      REGISTRATION_STEPS.OTP_VERIFICATION,
      REGISTRATION_STEPS.PROFILE_FORM,
      REGISTRATION_STEPS.PASSWORD_SETUP,
    ]

    const currentIndex = stepOrder.indexOf(currentStep)
    console.log("[v0] Current index:", currentIndex)

    if (currentIndex > 0) {
      const prevStepValue = stepOrder[currentIndex - 1]
      console.log("[v0] Moving to previous step:", prevStepValue)
      setCurrentStep(prevStepValue)
    }
  }, [currentStep, registrationData.method])

  // Reset entire registration flow
  const resetRegistration = useCallback(() => {
    setCurrentStep(REGISTRATION_STEPS.METHOD_SELECTION)
    setRegistrationData({
      method: null,
      countryCode: null,
      phoneNumber: null,
      email: null,
      otp: null,
      firstName: null,
      lastName: null,
      dateOfBirth: null,
      profileComplete: false,
    })
  }, [])

  // Check if user can navigate back
  const canGoBack = currentStep !== REGISTRATION_STEPS.METHOD_SELECTION

  // Get progress percentage
  const getProgress = useCallback(() => {
    const steps = [
      REGISTRATION_STEPS.METHOD_SELECTION,
      registrationData.method === "phone" ? REGISTRATION_STEPS.PHONE_INPUT : REGISTRATION_STEPS.EMAIL_INPUT,
      REGISTRATION_STEPS.OTP_VERIFICATION,
      REGISTRATION_STEPS.PROFILE_FORM,
      REGISTRATION_STEPS.PASSWORD_SETUP,
    ]
    const currentIndex = steps.indexOf(currentStep)
    return ((currentIndex + 1) / steps.length) * 100
  }, [currentStep, registrationData.method])

  const value = {
    currentStep,
    registrationData,
    updateRegistrationData,
    goToStep,
    nextStep,
    previousStep,
    resetRegistration,
    canGoBack,
    getProgress,
    STEPS: REGISTRATION_STEPS,
  }

  return <RegistrationContext.Provider value={value}>{children}</RegistrationContext.Provider>
}

export function useRegistration() {
  const context = useContext(RegistrationContext)
  if (!context) {
    throw new Error("useRegistration must be used within RegistrationProvider")
  }
  return context
}

export { REGISTRATION_STEPS }
