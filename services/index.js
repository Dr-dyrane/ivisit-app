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

