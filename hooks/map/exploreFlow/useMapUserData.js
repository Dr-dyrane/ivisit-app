// hooks/map/exploreFlow/useMapUserData.js
// PULLBACK NOTE: Pass 14c — extracted from useMapExploreFlow.js
// OLD: isSignedIn, profileImageSource declared inline in orchestrator
// NEW: owned here, derived from user object

/**
 * useMapUserData
 *
 * Derives user-facing display data from the auth user object.
 * Pure derivation — no state, no effects.
 */
export function useMapUserData({ user }) {
  const isSignedIn = Boolean(user?.isLoggedIn || user?.id);
  const profileImageSource = user?.imageUri
    ? { uri: user.imageUri }
    : require("../../../assets/profile.jpg");

  return {
    isSignedIn,
    profileImageSource,
  };
}
