import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import DashboardScreen from './DashboardScreen';
import OrderDetailsScreen from './OrderDetailsScreen';
import { Colors } from './theme';

// Define types for navigation params
export type RootStackParamList = {
  Dashboard: undefined;
  OrderDetails: { orderId: number };
};

const Stack = createStackNavigator<RootStackParamList>();

const AppNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="Dashboard"
      screenOptions={{
        headerStyle: { backgroundColor: Colors.background },
        headerTintColor: Colors.accent,
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Sahil\'s Kitchen Orders' }} />
      <Stack.Screen name="OrderDetails" component={OrderDetailsScreen} options={{ title: 'Order Details' }} />
    </Stack.Navigator>
  );
};

export default AppNavigator;