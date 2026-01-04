"use client"

import { useState, useEffect } from "react"
import * as Location from "expo-location"
import countries from "../components/register/countries"

/**
 * useCountryDetection Hook
 *
 * Detects user's country via location with fallback
 * Separates location logic from UI
 *
 * @returns {Object} - Country detection state
 */
export default function useCountryDetection() {
  const [country, setCountry] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    detectCountry()
  }, [])

  const detectCountry = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()

      if (status === "granted") {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Low,
        })
        const geocode = await Location.reverseGeocodeAsync(location.coords)

        if (geocode[0]?.isoCountryCode) {
          const found = countries.find((c) => c.code === geocode[0].isoCountryCode)
          if (found) {
            setCountry(found)
            setLoading(false)
            return
          }
        }
      }
    } catch (err) {
      console.error("[v0] Country detection error:", err)
      setError(err)
    }

    // Fallback to US
    const fallback = countries.find((c) => c.code === "US") || countries[0]
    setCountry(fallback)
    setLoading(false)
  }

  return { country, setCountry, loading, error }
}
