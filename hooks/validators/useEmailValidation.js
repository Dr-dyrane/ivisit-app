"use client"

import { useState, useEffect } from "react"

/**
 * useEmailValidation Hook
 *
 * Simple email validation with regex
 * No complex logic to avoid stack overflow issues
 *
 * @returns {Object} - Email validation state and methods
 */
export default function useEmailValidation() {
  const [email, setEmail] = useState("")
  const [isValid, setIsValid] = useState(false)

  // Simple, safe regex pattern
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  useEffect(() => {
    if (!email) {
      setIsValid(false)
      return
    }

    // Validate email format
    setIsValid(EMAIL_REGEX.test(email.trim()))
  }, [email])

  const clear = () => {
    setEmail("")
    setIsValid(false)
  }

  return {
    email,
    setEmail,
    isValid,
    clear,
  }
}
