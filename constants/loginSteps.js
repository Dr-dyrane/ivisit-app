// constants/loginSteps.js
export const LOGIN_STEPS = {
  METHOD_SELECTION: "method_selection",
  PHONE_INPUT: "phone_input",
  EMAIL_INPUT: "email_input",
  PASSWORD_INPUT: "password_input",
  OTP_VERIFICATION: "otp_verification",
  SET_PASSWORD: "set_password",
  FORGOT_PASSWORD: "forgot_password",
  RESET_PASSWORD: "reset_password",
}

// Flow definitions for different login methods
export const LOGIN_FLOWS = {
  phone: [
    LOGIN_STEPS.METHOD_SELECTION,
    LOGIN_STEPS.PHONE_INPUT,
    LOGIN_STEPS.OTP_VERIFICATION,
    LOGIN_STEPS.PASSWORD_INPUT,
  ],
  email: [LOGIN_STEPS.METHOD_SELECTION, LOGIN_STEPS.EMAIL_INPUT, LOGIN_STEPS.PASSWORD_INPUT],
}
