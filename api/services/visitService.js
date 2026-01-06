/**
 * Visit Service - Medical visits collection
 * 
 * Manages all visit-related operations
 */

import { database, StorageKeys, DatabaseError } from '../database';

const visitService = {
  /**
   * Get all visits for a user
   */
  async getUserVisits(userId) {
    return database.query(StorageKeys.VISITS, (v) => v.userId === userId);
  },

  /**
   * Get visit by ID
   */
  async getVisitById(visitId) {
    return database.findOne(StorageKeys.VISITS, (v) => v.id === visitId);
  },

  /**
   * Create new visit
   */
  async createVisit(userId, visitData) {
    const newVisit = {
      id: Math.random().toString(36).substring(2),
      userId,
      ...visitData,
      createdAt: new Date().toISOString(),
      status: 'scheduled',
    };

    return database.createOne(StorageKeys.VISITS, newVisit);
  },

  /**
   * Update visit details
   */
  async updateVisit(visitId, updates) {
    const visit = await this.getVisitById(visitId);
    if (!visit) {
      throw new DatabaseError('Visit not found', 'NOT_FOUND');
    }

    return database.updateOne(
      StorageKeys.VISITS,
      (v) => v.id === visitId,
      {
        ...updates,
        updatedAt: new Date().toISOString(),
      }
    );
  },

  /**
   * Cancel visit
   */
  async cancelVisit(visitId, reason) {
    return this.updateVisit(visitId, {
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
      cancellationReason: reason,
    });
  },

  /**
   * Complete visit
   */
  async completeVisit(visitId) {
    return this.updateVisit(visitId, {
      status: 'completed',
      completedAt: new Date().toISOString(),
    });
  },

  /**
   * Get visits by status
   */
  async getVisitsByStatus(userId, status) {
    return database.query(
      StorageKeys.VISITS,
      (v) => v.userId === userId && v.status === status
    );
  },

  /**
   * Get visits in date range
   */
  async getVisitsInDateRange(userId, startDate, endDate) {
    return database.query(StorageKeys.VISITS, (v) => {
      if (v.userId !== userId) return false;
      const visitDate = new Date(v.visitDate);
      return visitDate >= startDate && visitDate <= endDate;
    });
  },

  /**
   * Delete visit
   */
  async deleteVisit(visitId) {
    return database.deleteOne(StorageKeys.VISITS, (v) => v.id === visitId);
  },
};

export default visitService;
