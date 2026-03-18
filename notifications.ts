import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform, Alert } from 'react-native';
import { apiRequest } from './lib/api';

// ==============================
// Notification Handlers
// ==============================

export const setupNotificationHandlers = () => {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });

  Notifications.addNotificationReceivedListener(notification => {
    console.log('Notification received in foreground:', notification);
    Alert.alert(
      notification.request.content.title || "Notification",
      notification.request.content.body || ""
    );
  });

  Notifications.addNotificationResponseReceivedListener(response => {
    console.log('Notification tapped:', response);
  });
};

// ==============================
// Register Push Notifications
// ==============================

export async function registerForPushNotificationsAsync(): Promise<string | undefined> {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (!Device.isDevice) {
    Alert.alert(
      "Push Notification Error",
      "Push notifications only work on physical devices."
    );
    return;
  }

  try {
    // Check existing permission
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Ask permission if not granted
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      Alert.alert(
        "Permission Denied",
        "Push notifications permission was not granted."
      );
      return;
    }

    // ==============================
    // GET EXPO PUSH TOKEN
    // ==============================

    const pushTokenData = await Notifications.getExpoPushTokenAsync({
      projectId:
        Constants.easConfig?.projectId ??
        Constants.expoConfig?.extra?.eas?.projectId,
    });

    token = pushTokenData.data;

    console.log("Expo Push Token:", token);

    // ==============================
    // SEND TOKEN TO BACKEND
    // ==============================

    try {
      const response = await apiRequest('/api/register-push-token', 'POST', { token });

      console.log("Backend response:", response);

      if (response?.success) {
        console.log("Push token stored successfully.");
      } else {
        console.log("Backend did not confirm token storage.");
      }

    } catch (apiError) {
      console.error("Error sending push token to backend:", apiError);
      Alert.alert(
        "API Error",
        "Failed to send push token to server."
      );
    }

  } catch (error) {
    console.error("Push registration error:", error);
    Alert.alert(
      "Registration Error",
      "Push notification setup failed."
    );
  }

  return token;
}