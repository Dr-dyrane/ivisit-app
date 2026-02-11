// services/authService.js
// Re-export from the modularized auth service
import { authService, AuthErrors, createAuthError } from './auth';

export { authService, AuthErrors, createAuthError };
export default authService;
