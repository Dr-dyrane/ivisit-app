import { Redirect } from "expo-router";

// Deprecated compatibility bridge.
// The old More hub is replaced by MiniProfileModal on /map and dedicated stack pages.
// Stale links now land on Profile instead of rendering the retired More surface.

export default function More() {
  return <Redirect href="/(user)/(stacks)/profile" />;
}
