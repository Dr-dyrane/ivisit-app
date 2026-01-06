"use client"

/**
 * useLoginMutation
 * Handles login API calls and AuthContext integration
 * Separated from LoginContext to follow the same pattern as registration
 */

import { useContext } from "react"
import { AuthContext } from "../../contexts/AuthContext"
import { loginUserAPI } from "../../api/auth"

const useLoginMutation = () => {
  const { login } = useContext(AuthContext)

  const loginUser = async (credentials) => {
    try {
      const response = await loginUserAPI(credentials)
      const { token, ...userData } = response.data

      const loginSuccess = await login({ ...userData, token })

      if (loginSuccess) {
        return { success: true, data: userData }
      } else {
        throw new Error("Login failed")
      }
    } catch (error) {
      throw error
    }
  }

  return { loginUser }
}

export default useLoginMutation
