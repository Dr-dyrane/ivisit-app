/**
 * API Services Index
 * 
 * Centralized export of all database services
 * Each service is a collection-specific CRUD + business logic layer
 */

import userService from './userService';
import visitService from './visitService';

export { userService, visitService };
