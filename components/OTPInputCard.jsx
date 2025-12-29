import React from "react";
import { View, TextInput, Button } from "react-native";

const OTPInputCard = ({ value, onChange, onSubmit, otpSent }) => {
  return (
    <View style={{ flex: 1, justifyContent: "center", padding: 24 }}>
      <TextInput
        placeholder="Enter OTP"
        keyboardType="number-pad"
        value={value}
        onChangeText={onChange}
        style={{
          borderWidth: 1,
          borderColor: "#ccc",
          padding: 16,
          borderRadius: 12,
          marginBottom: 20,
        }}
      />
      <Button title={otpSent ? "Verify OTP" : "Send OTP"} onPress={onSubmit} />
    </View>
  );
};

export default OTPInputCard;
