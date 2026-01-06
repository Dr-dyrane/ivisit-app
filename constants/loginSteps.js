// constants/loginSteps.js
export const LOGIN_STEPS = {
  AUTH_METHOD: "auth_method", // Choose OTP or Password
  CONTACT_INPUT: "contact_input", // Enter email or phone
  OTP_VERIFICATION: "otp_verification", // Verify OTP if chosen
  PASSWORD_INPUT: "password_input", // Enter password if chosen
  FORGOT_PASSWORD: "forgot_password",
  RESET_PASSWORD: "reset_password",
}

// No complex flows - simple linear progression
export const LOGIN_AUTH_METHODS = {
  OTP: "otp",
  PASSWORD: "password",
}
