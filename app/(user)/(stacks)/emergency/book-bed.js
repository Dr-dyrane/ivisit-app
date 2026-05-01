import { Redirect } from "expo-router";

// Deprecated compatibility bridge.
// Bed booking entry now lives in the /map sheet flow.

export default function BookBedRequest() {
  return <Redirect href="/(user)" />;
}
