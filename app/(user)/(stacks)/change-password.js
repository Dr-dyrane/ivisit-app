import { Redirect } from "expo-router";

// Deprecated compatibility bridge.
// App entry is OTP/social first, so password mutation no longer has a live stack surface.

export default function ChangePassword() {
  return <Redirect href="/(user)" />;
}
