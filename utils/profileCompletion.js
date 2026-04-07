export function shouldDeferProfileCompletion(user) {
	return Boolean(user?.deferProfileCompletion);
}

export function isProfileComplete(user) {
	// [AUTH-GUARD-RELAX] Allow admins and org admins to bypass profile completion
	// This allows them to access the dashboard and finance pages immediately.
	if (user?.role === 'admin' || user?.role === 'org_admin') {
		return true;
	}

	const hasVerifiedContact =
		(typeof user?.email === "string" &&
			user.email.trim().length > 0 &&
			user?.emailVerified === true) ||
		(typeof user?.phone === "string" &&
			user.phone.trim().length > 0 &&
			user?.phoneVerified === true);

	const hasName =
		typeof user?.fullName === "string"
			? user.fullName.trim().length > 0
			: typeof user?.firstName === "string" &&
			user.firstName.trim().length > 0 &&
			typeof user?.lastName === "string" &&
			user.lastName.trim().length > 0;

	const hasUsername =
		typeof user?.username === "string" && user.username.trim().length > 0;

	return Boolean(hasName && hasUsername && hasVerifiedContact);
}

