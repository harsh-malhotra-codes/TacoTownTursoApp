import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useOrders } from './lib/useOrders';
import { Order, OrderStatus } from './lib/orders';
import { Colors } from './theme';
import { RootStackParamList } from './AppNavigator';

type DashboardScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Dashboard'>;

const DashboardScreen: React.FC = () => {
  const navigation = useNavigation<DashboardScreenNavigationProp>();
  const { data: orders, isLoading, isError, error, refetch, isRefetching } = useOrders();

  const [newOrderIds, setNewOrderIds] = useState<Set<number>>(new Set());
  const previousOrderIds = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (orders) {
      const currentOrderIds = new Set(orders.map(order => order.id));
      const newlyArrivedOrderIds = new Set<number>();

      orders.forEach(order => {
        if (!previousOrderIds.current.has(order.id)) {
          newlyArrivedOrderIds.add(order.id);
        }
      });

      if (newlyArrivedOrderIds.size > 0) {
        setNewOrderIds(prev => new Set([...Array.from(prev), ...Array.from(newlyArrivedOrderIds)]));
        // Clear highlight after 3 seconds
        newlyArrivedOrderIds.forEach(id => {
          setTimeout(() => {
            setNewOrderIds(prev => {
              const next = new Set(prev);
              next.delete(id);
              return next;
            });
          }, 3000);
        });
      }
      previousOrderIds.current = currentOrderIds;
    }
  }, [orders]);

  // Temporary debugging log
  console.log("Orders request URL:", process.env.EXPO_PUBLIC_API_URL + "/orders");

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return Colors.statusPending;
      case 'preparing':
        return Colors.statusPreparing;
      case 'completed':
        return Colors.statusCompleted;
      default:
        return Colors.text;
    }
  };

  const renderOrderItem = ({ item }: { item: Order }) => {
    const isNew = newOrderIds.has(item.id);
    const createdAt = new Date(item.createdAt);
    const timeString = createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
      <TouchableOpacity
        style={[styles.card, isNew && styles.newOrderHighlight]}
        onPress={() => navigation.navigate('OrderDetails', { orderId: item.id })}
      >
        <View style={styles.cardContent}>
          <View>
            <Text style={styles.customerName}>{item.customerName}</Text>
            <Text style={styles.orderTime}>{timeString}</Text>
          </View>
          <View style={styles.rightSection}>
            <Text style={styles.totalPrice}>${item.totalPrice.toFixed(2)}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
              <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
            </View>
            <TouchableOpacity
              style={styles.prepareButton}
              onPress={() => navigation.navigate('OrderDetails', { orderId: item.id })}
            >
              <Text style={styles.prepareButtonText}>Prepare</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading && !isRefetching) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.accent} />
        <Text style={styles.loadingText}>Loading Orders...</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Error fetching orders: {error?.message}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.noOrdersText}>No Orders</Text>
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderOrderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.accent} />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  listContent: {
    padding: 10,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    color: Colors.text,
    marginTop: 10,
    fontSize: 16,
  },
  errorText: {
    color: Colors.danger,
    fontSize: 16,
    textAlign: 'center',
    marginHorizontal: 20,
  },
  retryButton: {
    marginTop: 15,
    backgroundColor: Colors.accent,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    color: Colors.buttonText,
    fontSize: 16,
    fontWeight: 'bold',
  },
  noOrdersText: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 10,
    padding: 15,
    marginVertical: 8,
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  newOrderHighlight: {
    borderColor: Colors.highlight,
    borderWidth: 2,
  },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  customerName: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: 'bold',
  },
  orderTime: {
    color: Colors.text,
    fontSize: 14,
    opacity: 0.7,
    marginTop: 4,
  },
  rightSection: {
    alignItems: 'flex-end',
  },
  totalPrice: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 5,
    marginTop: 5,
  },
  statusText: {
    color: Colors.buttonText,
    fontSize: 12,
    fontWeight: 'bold',
  },
  prepareButton: {
    backgroundColor: Colors.accent,
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginTop: 10,
  },
  prepareButtonText: {
    color: Colors.buttonText,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default DashboardScreen;