/**
 * User Service - Collection-specific API layer
 * 
 * Handles all user-related database operations
 * Replaces userStore.js with proper abstraction
 */

import { database, StorageKeys, DatabaseError } from '../database';

const generateToken = () => {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
};

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const userService = {
  /**
   * Get all users (internal use only)
   */
  async getAllUsers() {
    return database.read(StorageKeys.USERS, []);
  },

  /**
   * Find user by email or phone
   */
  async findUser(email, phone) {
    const users = await this.getAllUsers();
    return users.find(
      (u) =>
        (email && u.email?.toLowerCase() === email.toLowerCase()) ||
        (phone && u.phone === phone)
    );
  },

  /**
   * Get user by ID
   */
  async getUserById(userId) {
    return database.findOne(
      StorageKeys.USERS,
      (u) => u.id === userId
    );
  },

  /**
   * Create new user (signup)
   */
  async createUser(userData) {
    const { email, phone, username, password } = userData;

    if (!username || (!email && !phone)) {
      throw new DatabaseError(
        'Username and either email or phone are required',
        'VALIDATION_ERROR'
      );
    }

    const existingUser = await this.findUser(email, phone);
    if (existingUser) {
      throw new DatabaseError(
        email
          ? 'Email already exists'
          : 'Phone number already exists',
        'USER_EXISTS'
      );
    }

    const newUser = {
      id: generateToken(),
      email: email || null,
      phone: phone || null,
      username,
      password: password || null,
      firstName: userData.firstName || null,
      lastName: userData.lastName || null,
      fullName: userData.fullName || null,
      imageUri: userData.imageUri || null,
      dateOfBirth: userData.dateOfBirth || null,
      gender: userData.gender || null,
      address: userData.address || null,
      token: generateToken(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await database.createOne(StorageKeys.USERS, newUser);
    return newUser;
  },

  /**
   * Update user profile
   */
  async updateUser(userId, updates) {
    const user = await this.getUserById(userId);
    if (!user) {
      throw new DatabaseError('User not found', 'NOT_FOUND');
    }

    return database.updateOne(
      StorageKeys.USERS,
      (u) => u.id === userId,
      {
        ...updates,
        updatedAt: new Date().toISOString(),
      }
    );
  },

  /**
   * Delete user account
   */
  async deleteUser(userId) {
    return database.deleteOne(
      StorageKeys.USERS,
      (u) => u.id === userId
    );
  },

  /**
   * Verify user password
   */
  async verifyPassword(userId, password) {
    const user = await this.getUserById(userId);
    if (!user) {
      throw new DatabaseError('User not found', 'NOT_FOUND');
    }
    if (!user.password) {
      throw new DatabaseError('No password set', 'NO_PASSWORD');
    }
    if (user.password !== password) {
      throw new DatabaseError('Invalid password', 'INVALID_PASSWORD');
    }
    return true;
  },

  /**
   * Initiate password reset
   */
  async initiatePasswordReset(email) {
    const user = await this.findUser(email, null);
    if (!user) {
      throw new DatabaseError('User not found', 'NOT_FOUND');
    }

    const resetToken = generateOTP();
    const resetTokenExpiry = Date.now() + 3600000; // 1 hour

    await this.updateUser(user.id, {
      resetToken,
      resetTokenExpiry,
    });

    return { resetToken, user };
  },

  /**
   * Complete password reset
   */
  async completePasswordReset(email, resetToken, newPassword) {
    const user = await this.findUser(email, null);
    if (!user) {
      throw new DatabaseError('User not found', 'NOT_FOUND');
    }

    if (String(user.resetToken) !== String(resetToken)) {
      throw new DatabaseError('Invalid reset token', 'INVALID_TOKEN');
    }

    if (Date.now() > user.resetTokenExpiry) {
      throw new DatabaseError('Reset token expired', 'TOKEN_EXPIRED');
    }

    await this.updateUser(user.id, {
      password: newPassword,
      resetToken: null,
      resetTokenExpiry: null,
    });

    return { success: true };
  },

  /**
   * Set password for users who registered without one
   */
  async setPassword(userId, password) {
    const user = await this.getUserById(userId);
    if (!user) {
      throw new DatabaseError('User not found', 'NOT_FOUND');
    }

    return this.updateUser(userId, { password });
  },

  /**
   * Login user
   */
  async loginUser(email, phone, password, otp) {
    const user = await this.findUser(email, phone);
    if (!user) {
      throw new DatabaseError(
        'No account found. Please sign up first.',
        'USER_NOT_FOUND'
      );
    }

    if (otp) {
      // OTP login
      return this.updateUser(user.id, {
        token: generateToken(),
        lastLoginAt: new Date().toISOString(),
      });
    }

    // Password login
    if (!user.password) {
      throw new DatabaseError(
        'No password set. Use OTP login.',
        'NO_PASSWORD'
      );
    }

    if (user.password !== password) {
      throw new DatabaseError('Invalid password', 'INVALID_PASSWORD');
    }

    return this.updateUser(user.id, {
      token: generateToken(),
      lastLoginAt: new Date().toISOString(),
    });
  },

  /**
   * Get current user by token
   */
  async getCurrentUserByToken(token) {
    return database.findOne(
      StorageKeys.USERS,
      (u) => u.token === token
    );
  },

  /**
   * Logout user (clear token)
   */
  async logoutUser(userId) {
    return this.updateUser(userId, { token: null });
  },
};

export default userService;
