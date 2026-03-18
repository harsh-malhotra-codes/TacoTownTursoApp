import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  interpolateColor,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { THEME } from "@/constants/colors";
import { tacoApi, Order } from "@/lib/tacoApi";

const SEEN_KEY = "tacotown_seen_orders";

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatRelative(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins === 1) return "1 min ago";
  if (diffMins < 60) return `${diffMins} mins ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs === 1) return "1 hr ago";
  return `${diffHrs} hrs ago`;
}

function getStatusConfig(status: string) {
  switch (status) {
    case "preparing":
      return { label: "Preparing", bg: THEME.preparingMuted, text: THEME.preparing };
    case "completed":
      return { label: "Completed", bg: THEME.completedMuted, text: THEME.completed };
    default:
      return { label: "Pending", bg: THEME.pendingMuted, text: THEME.pending };
  }
}

interface OrderCardProps {
  order: Order;
  isNew: boolean;
  onPress: () => void;
}

function OrderCard({ order, isNew, onPress }: OrderCardProps) {
  const highlight = useSharedValue(isNew ? 1 : 0);
  const statusConfig = getStatusConfig(order.status);

  useEffect(() => {
    if (isNew) {
      highlight.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 400 }),
          withTiming(0.3, { duration: 400 }),
        ),
        4,
        false,
        () => {
          highlight.value = withTiming(0, { duration: 300 });
        }
      );
    }
  }, [isNew]);

  const animatedBorder = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      highlight.value,
      [0, 1],
      [THEME.border, THEME.gold]
    ),
    shadowOpacity: highlight.value * 0.4,
  }));

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
      <Animated.View style={[styles.card, animatedBorder]}>
        {isNew && (
          <View style={styles.newBadge}>
            <Text style={styles.newBadgeText}>NEW</Text>
          </View>
        )}
        <View style={styles.cardTop}>
          <View style={styles.cardLeft}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>
                {order.customerName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.customerName} numberOfLines={1}>
                {order.customerName}
              </Text>
              <Text style={styles.cardMeta}>
                {order.items.length} item{order.items.length !== 1 ? "s" : ""} · {formatRelative(order.createdAt)}
              </Text>
            </View>
          </View>
          <View style={styles.cardRight}>
            <Text style={styles.totalPrice}>₹{order.totalPrice}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
              <Text style={[styles.statusText, { color: statusConfig.text }]}>
                {statusConfig.label}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.cardDivider} />
        <View style={styles.cardBottom}>
          <View style={styles.paymentRow}>
            <Ionicons
              name={order.paymentMethod === "Cash" ? "cash-outline" : "card-outline"}
              size={14}
              color={THEME.textSecondary}
            />
            <Text style={styles.paymentText}>{order.paymentMethod}</Text>
          </View>
          <Pressable
            onPress={onPress}
            style={({ pressed }) => [styles.prepareBtn, { opacity: pressed ? 0.8 : 1 }]}
          >
            <Text style={styles.prepareBtnText}>View Order</Text>
            <Ionicons name="chevron-forward" size={14} color={THEME.bg} />
          </Pressable>
        </View>
      </Animated.View>
    </Pressable>
  );
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newOrderIds, setNewOrderIds] = useState<Set<number>>(new Set());
  const seenIdsRef = useRef<Set<number>>(new Set());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadSeenIds = async () => {
    try {
      const raw = await AsyncStorage.getItem(SEEN_KEY);
      if (raw) {
        const arr: number[] = JSON.parse(raw);
        seenIdsRef.current = new Set(arr);
      }
    } catch {}
  };

  const saveSeenIds = async (ids: Set<number>) => {
    try {
      await AsyncStorage.setItem(SEEN_KEY, JSON.stringify([...ids]));
    } catch {}
  };

  const fetchOrders = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    try {
      const data = await tacoApi.getOrders();
      setError(null);
      const freshNew = new Set<number>();
      data.forEach((o) => {
        if (!seenIdsRef.current.has(o.id)) {
          freshNew.add(o.id);
        }
      });
      if (freshNew.size > 0) {
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }
        const allSeen = new Set([...seenIdsRef.current, ...freshNew]);
        seenIdsRef.current = allSeen;
        await saveSeenIds(allSeen);
        setNewOrderIds(freshNew);
        setTimeout(() => setNewOrderIds(new Set()), 4000);
      }
      setOrders(data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Network error";
      setError(msg);
    } finally {
      setLoading(false);
      if (isManualRefresh) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadSeenIds().then(() => fetchOrders());
    intervalRef.current = setInterval(() => fetchOrders(), 5000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchOrders]);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const pendingCount = orders.filter((o) => o.status === "pending").length;
  const preparingCount = orders.filter((o) => o.status === "preparing").length;

  const renderItem = ({ item }: { item: Order }) => (
    <OrderCard
      order={item}
      isNew={newOrderIds.has(item.id)}
      onPress={() => router.push({ pathname: "/order/[id]", params: { id: item.id.toString() } })}
    />
  );

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerEyebrow}>Kitchen Dashboard</Text>
          <Text style={styles.headerTitle}>TacoTown</Text>
        </View>
        <View style={styles.headerRight}>
          <MaterialCommunityIcons name="silverware-fork-knife" size={28} color={THEME.gold} />
        </View>
      </View>

      {orders.length > 0 && (
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: THEME.pendingMuted }]}>
            <Text style={[styles.statNum, { color: THEME.gold }]}>{pendingCount}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: THEME.preparingMuted }]}>
            <Text style={[styles.statNum, { color: THEME.preparing }]}>{preparingCount}</Text>
            <Text style={styles.statLabel}>Preparing</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: "#161616" }]}>
            <Text style={[styles.statNum, { color: THEME.white }]}>{orders.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
        </View>
      )}

      {loading && orders.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={THEME.gold} />
          <Text style={styles.loadingText}>Loading orders...</Text>
        </View>
      ) : error && orders.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="wifi-outline" size={52} color={THEME.textMuted} />
          <Text style={styles.errorTitle}>Connection Error</Text>
          <Text style={styles.errorMsg}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={() => fetchOrders(true)}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: bottomPad + 16 },
          ]}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="silverware-fork-knife" size={64} color={THEME.textMuted} />
              <Text style={styles.emptyTitle}>No Active Orders</Text>
              <Text style={styles.emptySubtitle}>New orders will appear here automatically</Text>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchOrders(true)}
              tintColor={THEME.gold}
              colors={[THEME.gold]}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    paddingTop: 8,
  },
  headerEyebrow: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: THEME.textSecondary,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  headerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 32,
    color: THEME.gold,
    letterSpacing: -0.5,
  },
  headerRight: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: THEME.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: THEME.border,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: "center",
  },
  statNum: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    lineHeight: 32,
  },
  statLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: THEME.textSecondary,
    marginTop: 2,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    gap: 12,
  },
  card: {
    backgroundColor: THEME.surface,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: THEME.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 12,
    elevation: 4,
    overflow: "hidden",
  },
  newBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: THEME.gold,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    zIndex: 10,
  },
  newBadgeText: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    color: THEME.bg,
    letterSpacing: 1,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    gap: 12,
  },
  cardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: THEME.goldMuted,
    borderWidth: 1.5,
    borderColor: THEME.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: THEME.gold,
  },
  cardInfo: {
    flex: 1,
  },
  customerName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: THEME.white,
  },
  cardMeta: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: THEME.textSecondary,
    marginTop: 2,
  },
  cardRight: {
    alignItems: "flex-end",
    gap: 6,
  },
  totalPrice: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: THEME.gold,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    letterSpacing: 0.3,
  },
  cardDivider: {
    height: 1,
    backgroundColor: THEME.border,
    marginHorizontal: 16,
  },
  cardBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  paymentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  paymentText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: THEME.textSecondary,
  },
  prepareBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: THEME.gold,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  prepareBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: THEME.bg,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 32,
  },
  loadingText: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: THEME.textSecondary,
  },
  errorTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 20,
    color: THEME.white,
    marginTop: 8,
  },
  errorMsg: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: THEME.textSecondary,
    textAlign: "center",
  },
  retryBtn: {
    marginTop: 8,
    backgroundColor: THEME.gold,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  retryBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: THEME.bg,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 12,
  },
  emptyTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 22,
    color: THEME.white,
  },
  emptySubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: THEME.textSecondary,
    textAlign: "center",
  },
});
