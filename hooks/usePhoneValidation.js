"use client"

import { useState, useEffect } from "react"
import { AsYouType, parsePhoneNumberFromString } from "libphonenumber-js"

/**
 * usePhoneValidation Hook
 *
 * Handles phone number formatting and validation
 * Separates concerns: raw input → formatting → validation
 *
 * @param {Object} country - Selected country object with code
 * @returns {Object} - Phone validation state and methods
 */
export default function usePhoneValidation(country) {
  const [rawInput, setRawInput] = useState("")
  const [formattedNumber, setFormattedNumber] = useState("")
  const [isValid, setIsValid] = useState(false)
  const [e164Format, setE164Format] = useState(null)

  useEffect(() => {
    if (!country || !rawInput) {
      setFormattedNumber("")
      setIsValid(false)
      setE164Format(null)
      return
    }

    try {
      // Format as user types
      const asYouType = new AsYouType(country.code)
      const formatted = asYouType.input(rawInput)
      setFormattedNumber(formatted)

      // Validate complete number
      const phoneNumber = parsePhoneNumberFromString(rawInput, country.code)

      if (phoneNumber?.isValid()) {
        setIsValid(true)
        setE164Format(phoneNumber.format("E.164"))
      } else {
        setIsValid(false)
        setE164Format(null)
      }
    } catch (error) {
      console.error("[v0] Phone validation error:", error)
      setFormattedNumber(rawInput)
      setIsValid(false)
      setE164Format(null)
    }
  }, [rawInput, country])

  const clear = () => {
    setRawInput("")
    setFormattedNumber("")
    setIsValid(false)
    setE164Format(null)
  }

  return {
    rawInput,
    setRawInput,
    formattedNumber,
    isValid,
    e164Format,
    clear,
  }
}
