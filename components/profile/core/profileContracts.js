// PULLBACK NOTE: Profile contracts and presentation models
// Following /map module pattern for type safety and data contracts
// REASON: Centralized contracts for easier debugging and type checking

export const PROFILE_CONTRACTS = {
	// Form field contracts
	FIELDS: {
		FULL_NAME: "fullName",
		USERNAME: "username",
		GENDER: "gender",
		EMAIL: "email",
		PHONE: "phone",
		ADDRESS: "address",
		DATE_OF_BIRTH: "dateOfBirth",
		IMAGE_URI: "imageUri",
	},
	
	// Modal states
	MODAL_STATES: {
		PERSONAL_INFO: "personalInfoModalOpen",
		DELETE_ACCOUNT: "deleteAccountModalOpen",
	},
	
	// Action types
	ACTIONS: {
		PERSONAL_INFO: "personal-info",
		EMERGENCY_CONTACTS: "emergency-contacts",
		HEALTH_INFO: "health-info",
		COVERAGE: "coverage",
		DELETE_ACCOUNT: "delete-account",
	},
	
	// Validation rules
	VALIDATION: {
		EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
		PHONE_MIN_LENGTH: 10,
		USERNAME_MIN_LENGTH: 3,
	},
};

export const PROFILE_PRESENTATION = {
	// Animation durations
	ANIMATION: {
		FADE_DURATION: 600,
		SPRING_FRICTION: 8,
		SPRING_TENSION: 50,
	},
	
	// Layout constants
	LAYOUT: {
		HERO_IMAGE_SIZE: 120,
		HERO_IMAGE_BORDER_RADIUS: 60,
		CAMERA_BUTTON_SIZE: 36,
		CAMERA_BUTTON_BORDER_RADIUS: 18,
		ID_BADGE_BORDER_RADIUS: 20,
		SECTION_GAP: 16,
		DELETE_ACCOUNT_SPACING: 32,
	},
	
	// Typography
	TYPOGRAPHY: {
		HERO_NAME_SIZE: 26,
		HERO_NAME_WEIGHT: "900",
		HERO_NAME_LETTER_SPACING: -1.0,
		HERO_EMAIL_SIZE: 15,
		HERO_EMAIL_LETTER_SPACING: -0.3,
		ID_BADGE_SIZE: 13,
		ID_BADGE_WEIGHT: "600",
		ID_BADGE_LETTER_SPACING: -0.2,
	},
};
