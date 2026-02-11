import * as authLogin from './authLogin';
import * as authSignup from './authSignup';
import * as authSession from './authSession';
import * as authLogout from './authLogout';
import * as authProfile from './authProfile';
import * as authPassword from './authPassword';
import * as authOtp from './authOtp';
import * as oauthService from './oauthService';
import * as authStorage from './authStorage';
import { formatUser } from '../mappers/userMapper';
import { AuthErrors, createAuthError } from '../../utils/authErrorUtils';

// Aggregate everything into a single service object for backward compatibility
const authService = {
    // Spread oauthService BEFORE authSession so authSession's handleOAuthCallback wins
    ...oauthService,
    ...authLogin,
    ...authSignup,
    ...authSession,
    ...authLogout,
    ...authProfile,
    ...authPassword,
    ...authOtp,
    ...authStorage,
    
    // Utilities
    formatUser,
    _formatUser: formatUser, // Alias for backward compatibility
    AuthErrors,
    createAuthError,
};

// Named exports
export {
    authLogin,
    authSignup,
    authSession,
    authLogout,
    authProfile,
    authPassword,
    authOtp,
    oauthService,
    authStorage,
    authService,
    AuthErrors,
    createAuthError,
};
