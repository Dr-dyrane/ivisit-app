import { Redirect } from "expo-router";

// Deprecated compatibility bridge.
// Emergency request entry now lives in the /map sheet flow.

export default function RequestAmbulance() {
  return <Redirect href="/(user)" />;
}
