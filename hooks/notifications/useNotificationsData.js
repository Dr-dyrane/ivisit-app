import { useState, useEffect, useCallback } from 'react';
import { NOTIFICATION_TYPES, NOTIFICATION_PRIORITY } from '../../constants/notifications';

// Mock data for development - replace with actual API calls
const mockNotifications = [
  {
    id: '1',
    type: NOTIFICATION_TYPES.EMERGENCY,
    title: 'Emergency Response',
    message: 'Ambulance dispatched to your location',
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 minutes ago
    read: false,
    priority: NOTIFICATION_PRIORITY.URGENT,
    data: {
      ambulanceId: 'amb-001',
      eta: 8,
    },
  },
  {
    id: '2',
    type: NOTIFICATION_TYPES.APPOINTMENT,
    title: 'Appointment Reminder',
    message: 'Your appointment is scheduled for tomorrow at 2:00 PM',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    read: false,
    priority: NOTIFICATION_PRIORITY.HIGH,
    data: {
      appointmentId: 'apt-001',
      hospitalName: 'General Hospital',
    },
  },
  {
    id: '3',
    type: NOTIFICATION_TYPES.VISIT,
    title: 'Visit Completed',
    message: 'Your visit to City Medical Center has been completed',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    read: true,
    priority: NOTIFICATION_PRIORITY.NORMAL,
    data: {
      visitId: 'visit-001',
      hospitalName: 'City Medical Center',
    },
  },
  {
    id: '4',
    type: NOTIFICATION_TYPES.SYSTEM,
    title: 'System Update',
    message: 'New features have been added to the app',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 days ago
    read: true,
    priority: NOTIFICATION_PRIORITY.LOW,
  },
];

export function useNotificationsData() {
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load notifications on mount
  useEffect(() => {
    const loadNotifications = async () => {
      try {
        setIsLoading(true);
        // In a real app, this would be an API call
        // const response = await notificationsService.getNotifications();
        // setNotifications(response.data);
        
        // For now, use mock data
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
        setNotifications(mockNotifications);
      } catch (error) {
        console.error('Failed to load notifications:', error);
        setNotifications([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadNotifications();
  }, []);

  // Add a new notification
  const addNotification = useCallback(async (notificationData) => {
    try {
      const newNotification = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        read: false,
        priority: notificationData.priority || NOTIFICATION_PRIORITY.NORMAL,
        ...notificationData,
      };

      // In a real app, this would be an API call
      // const response = await notificationsService.createNotification(newNotification);
      
      setNotifications(prev => [newNotification, ...prev]);
      return newNotification;
    } catch (error) {
      console.error('Failed to add notification:', error);
      throw error;
    }
  }, []);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId) => {
    try {
      // In a real app, this would be an API call
      // await notificationsService.markAsRead(notificationId);
      
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, read: true }
            : notification
        )
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      throw error;
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      // In a real app, this would be an API call
      // await notificationsService.markAllAsRead();
      
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, read: true }))
      );
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      throw error;
    }
  }, []);

  // Clear/delete a notification
  const clearNotification = useCallback(async (notificationId) => {
    try {
      // In a real app, this would be an API call
      // await notificationsService.deleteNotification(notificationId);
      
      setNotifications(prev => 
        prev.filter(notification => notification.id !== notificationId)
      );
    } catch (error) {
      console.error('Failed to clear notification:', error);
      throw error;
    }
  }, []);

  // Clear all notifications
  const clearAllNotifications = useCallback(async () => {
    try {
      // In a real app, this would be an API call
      // await notificationsService.clearAllNotifications();
      
      setNotifications([]);
    } catch (error) {
      console.error('Failed to clear all notifications:', error);
      throw error;
    }
  }, []);

  // Refetch notifications
  const refetch = useCallback(async () => {
    try {
      setIsLoading(true);
      // In a real app, this would be an API call
      // const response = await notificationsService.getNotifications();
      // setNotifications(response.data);
      
      // For now, just reload mock data
      await new Promise(resolve => setTimeout(resolve, 300));
      setNotifications(mockNotifications);
    } catch (error) {
      console.error('Failed to refetch notifications:', error);
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    notifications,
    isLoading,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAllNotifications,
    refetch,
  };
}
