/**
 * Services Module - Main Export
 *
 * This is the main entry point for all business logic services.
 *
 * Usage:
 *   import { authService, imageService } from '../services';
 *
 *   // Login user
 *   const result = await authService.login({ email, password });
 *
 *   // Upload image
 *   const imageKey = await imageService.uploadImage(uri);
 */

// Auth service
export { authService, AuthErrors, createAuthError } from "./authService";

// Image service
export { imageService, createImageError } from "./imageService";

// Preferences service
export { preferencesService } from "./preferencesService";

// Visits service
export { visitsService } from "./visitsService";

// Notifications service
export { notificationsService } from "./notificationsService";

// Medical Profile service (Still local)
export { medicalProfileService } from "./medicalProfileService";

// Emergency Contacts service (Still local)
export { emergencyContactsService } from "./emergencyContactsService";

// Profile Completion service
export { profileCompletionService } from "./profileCompletionService";
