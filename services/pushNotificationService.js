import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Push Notification Service
 * Handles registration, permissions, and local notification scheduling.
 */

// Configure how notifications behave when the app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const pushNotificationService = {
  /**
   * Register for Push Notifications
   * @returns {Promise<string|null>} The Expo Push Token or null if failed
   */
  async registerForPushNotificationsAsync() {
    let token;

    if (!Constants.isDevice) {
      console.log('Must use a physical device for push notifications');
      return null;
    }

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        alert('Failed to get push token for push notification!');
        return null;
      }

      // Get the token
      // Note: In bare workflow or custom dev client, you might need projectId
      const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
      
      token = (await Notifications.getExpoPushTokenAsync({
        projectId,
      })).data;
      
      console.log('Expo Push Token:', token);
    } catch (error) {
      console.error("Error getting push token:", error);
      return null;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    return token;
  },

  /**
   * Schedule a local notification (simulates a push)
   * @param {string} title 
   * @param {string} body 
   * @param {Object} data 
   */
  async scheduleLocalNotification(title, body, data = {}) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
      },
      trigger: null, // null means show immediately
    });
  },
  
  /**
   * Add listener for received notifications
   */
  addNotificationReceivedListener(callback) {
      return Notifications.addNotificationReceivedListener(callback);
  },

  /**
   * Add listener for response (user tapped notification)
   */
  addNotificationResponseReceivedListener(callback) {
      return Notifications.addNotificationResponseReceivedListener(callback);
  },
  
  /**
   * Remove subscription
   */
  removeSubscription(subscription) {
      if (subscription && typeof subscription.remove === 'function') {
          subscription.remove();
      }
  }
};
