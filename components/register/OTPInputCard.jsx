// components/register/OTPInputCard.jsx

import React from "react";
import { View } from "react-native";
import { useTheme } from "../../contexts/ThemeContext";
import { useOTPInputLogic } from "../../hooks/auth/useOTPInputLogic";
import {
    OTPHeader,
    OTPFields,
    ResendTimer,
    VerifyButton
} from "./OTPInputUI";

/**
 * OTPInputCard - iVisit
 * 6-digit OTP input with auto-focus and resend functionality
 * Used in both registration and login flows
 */
export default function OTPInputCard({ method, contact, onVerified, onResend, loading }) {
    const { isDarkMode } = useTheme();
    const { state, actions, refs } = useOTPInputLogic({ 
        method, 
        contact, 
        onVerified, 
        onResend, 
        loading 
    });

    return (
        <View>
            <OTPHeader 
                contact={contact} 
                method={method} 
                colors={state.colors} 
            />

            <OTPFields 
                otp={state.otp} 
                inputRefs={refs.inputRefs} 
                shakeAnim={refs.shakeAnim} 
                onChange={actions.handleOTPChange} 
                onKeyPress={actions.handleKeyPress} 
                colors={state.colors} 
            />

            <ResendTimer 
                canResend={state.canResend} 
                timer={state.timer} 
                onResend={actions.handleResend} 
            />

            <VerifyButton 
                isComplete={state.isComplete} 
                loading={loading} 
                onPress={() => actions.handleVerify()} 
                buttonScale={refs.buttonScale} 
                isDarkMode={isDarkMode} 
            />
        </View>
    );
}
