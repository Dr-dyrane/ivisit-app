export function shouldDeferProfileCompletion(user) {
  return Boolean(user?.deferProfileCompletion);
}

export function isProfileComplete(user) {
  // PULLBACK NOTE: Keep the helper name for backwards compatibility only.
  // OLD: "complete" required verified contact plus full name plus username.
  // NEW: the operational minimum is a working phone number; username is auto-derived and the app no longer force-gates on legacy setup.
  if (user?.role === "admin" || user?.role === "org_admin") {
    return true;
  }

  return Boolean(
    typeof user?.phone === "string" && user.phone.trim().length > 0,
  );
}
