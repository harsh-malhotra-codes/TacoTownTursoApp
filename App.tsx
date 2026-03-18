import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppNavigator from './AppNavigator';
import { Colors } from './theme';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { registerForPushNotificationsAsync, setupNotificationHandlers } from './notifications';

const queryClient = new QueryClient();

export default function App() {
  useEffect(() => {
    setupNotificationHandlers();
    registerForPushNotificationsAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <NavigationContainer>
          <StatusBar style="light" backgroundColor={Colors.background} />
          <AppNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
