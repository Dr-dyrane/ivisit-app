import { Redirect } from "expo-router";

// Deprecated compatibility bridge.
// App entry is OTP/social first, so password creation no longer has a live stack surface.

export default function CreatePassword() {
  return <Redirect href="/(user)" />;
}
