import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { THEME } from "@/constants/colors";
import { tacoApi, Order } from "@/lib/tacoApi";

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
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

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workerName, setWorkerName] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadOrder();
  }, [id]);

  const loadOrder = async () => {
    setLoading(true);
    setError(null);
    try {
      const orders = await tacoApi.getOrders();
      const found = orders.find((o) => o.id.toString() === id);
      if (!found) {
        setError("Order not found.");
      } else {
        setOrder(found);
        setWorkerName(found.workerName ?? "");
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load order.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (status: string, label: string) => {
    if (!order) return;
    setActionLoading(status);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    try {
      if (workerName.trim()) {
        await tacoApi.updateWorker(order.id, workerName.trim());
      }
      await tacoApi.updateStatus(order.id, status);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      router.back();
    } catch (e: unknown) {
      setActionLoading(null);
      const msg = e instanceof Error ? e.message : "Failed to update order.";
      Alert.alert("Error", msg);
    }
  };

  const handleDelete = () => {
    if (!order) return;
    Alert.alert(
      "Delete Order",
      `Remove order #${order.id} for ${order.customerName}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setActionLoading("delete");
            if (Platform.OS !== "web") {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            }
            try {
              await tacoApi.deleteOrder(order.id);
              if (Platform.OS !== "web") {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
              router.back();
            } catch (e: unknown) {
              setActionLoading(null);
              const msg = e instanceof Error ? e.message : "Failed to delete order.";
              Alert.alert("Error", msg);
            }
          },
        },
      ]
    );
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: topPad }]}>
        <View style={styles.navBar}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color={THEME.gold} />
          </Pressable>
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={THEME.gold} />
          <Text style={styles.loadingText}>Loading order...</Text>
        </View>
      </View>
    );
  }

  if (error || !order) {
    return (
      <View style={[styles.container, { paddingTop: topPad }]}>
        <View style={styles.navBar}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color={THEME.gold} />
          </Pressable>
        </View>
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={52} color={THEME.textMuted} />
          <Text style={styles.errorTitle}>Order Not Found</Text>
          <Text style={styles.errorMsg}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={loadOrder}>
            <Text style={styles.retryBtnText}>Try Again</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const statusConfig = getStatusConfig(order.status);
  const isAnyLoading = actionLoading !== null;

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.navBar}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={THEME.gold} />
          <Text style={styles.backText}>Orders</Text>
        </Pressable>
        <Text style={styles.navTitle}>Order #{order.id}</Text>
        <Pressable
          style={styles.deleteIconBtn}
          onPress={handleDelete}
          disabled={isAnyLoading}
        >
          {actionLoading === "delete" ? (
            <ActivityIndicator size="small" color={THEME.danger} />
          ) : (
            <Ionicons name="trash-outline" size={22} color={THEME.danger} />
          )}
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad + 24 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.statusSection}>
          <View style={[styles.statusPill, { backgroundColor: statusConfig.bg }]}>
            <View style={[styles.statusDot, { backgroundColor: statusConfig.text }]} />
            <Text style={[styles.statusPillText, { color: statusConfig.text }]}>
              {statusConfig.label}
            </Text>
          </View>
          <Text style={styles.orderTime}>
            {formatDate(order.createdAt)} · {formatTime(order.createdAt)}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Customer</Text>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="person-outline" size={18} color={THEME.gold} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Name</Text>
                <Text style={styles.infoValue}>{order.customerName}</Text>
              </View>
            </View>
            <View style={styles.cardDivider} />
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="call-outline" size={18} color={THEME.gold} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Phone</Text>
                <Text style={styles.infoValue}>{order.phone}</Text>
              </View>
            </View>
            <View style={styles.cardDivider} />
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="location-outline" size={18} color={THEME.gold} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Address</Text>
                <Text style={styles.infoValue}>{order.address}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Order Items</Text>
          <View style={styles.card}>
            {order.items.map((item, index) => (
              <View key={`${item.name}-${index}`}>
                {index > 0 && <View style={styles.cardDivider} />}
                <View style={styles.itemRow}>
                  <View style={styles.itemLeft}>
                    <View style={styles.qtyBadge}>
                      <Text style={styles.qtyText}>{item.quantity}</Text>
                    </View>
                    <Text style={styles.itemName}>{item.name}</Text>
                  </View>
                  <Text style={styles.itemPrice}>₹{item.price * item.quantity}</Text>
                </View>
              </View>
            ))}
            <View style={styles.totalDivider} />
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>₹{order.totalPrice}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Payment</Text>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons
                  name={order.paymentMethod === "Cash" ? "cash-outline" : "card-outline"}
                  size={18}
                  color={THEME.gold}
                />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Method</Text>
                <Text style={styles.infoValue}>{order.paymentMethod}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Prepared By</Text>
          <View style={styles.inputCard}>
            <MaterialCommunityIcons name="chef-hat" size={20} color={THEME.gold} />
            <TextInput
              style={styles.workerInput}
              placeholder="Enter worker/chef name..."
              placeholderTextColor={THEME.textMuted}
              value={workerName}
              onChangeText={setWorkerName}
              returnKeyType="done"
              autoCorrect={false}
            />
          </View>
        </View>

        <View style={styles.actionsSection}>
          <Pressable
            style={({ pressed }) => [
              styles.actionBtn,
              styles.preparingBtn,
              { opacity: pressed || isAnyLoading ? 0.75 : 1 },
            ]}
            onPress={() => handleUpdateStatus("preparing", "Preparing")}
            disabled={isAnyLoading || order.status === "preparing"}
          >
            {actionLoading === "preparing" ? (
              <ActivityIndicator size="small" color={THEME.bg} />
            ) : (
              <>
                <MaterialCommunityIcons name="fire" size={22} color={THEME.bg} />
                <Text style={styles.actionBtnText}>Start Preparing</Text>
              </>
            )}
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.actionBtn,
              styles.doneBtn,
              { opacity: pressed || isAnyLoading ? 0.75 : 1 },
            ]}
            onPress={() => handleUpdateStatus("completed", "Completed")}
            disabled={isAnyLoading}
          >
            {actionLoading === "completed" ? (
              <ActivityIndicator size="small" color={THEME.bg} />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={22} color={THEME.bg} />
                <Text style={styles.actionBtnText}>Done</Text>
              </>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.bg,
  },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minWidth: 80,
  },
  backText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: THEME.gold,
  },
  navTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    color: THEME.white,
  },
  deleteIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.dangerMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 0,
  },
  statusSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusPillText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  orderTime: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: THEME.textSecondary,
  },
  section: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: THEME.textSecondary,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: THEME.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.border,
    overflow: "hidden",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: THEME.goldMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: THEME.textSecondary,
    marginBottom: 2,
  },
  infoValue: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: THEME.white,
  },
  cardDivider: {
    height: 1,
    backgroundColor: THEME.border,
    marginHorizontal: 14,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
  },
  itemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  qtyBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: THEME.goldMuted,
    borderWidth: 1,
    borderColor: THEME.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyText: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    color: THEME.gold,
  },
  itemName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: THEME.white,
    flex: 1,
  },
  itemPrice: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: THEME.textSecondary,
  },
  totalDivider: {
    height: 1.5,
    backgroundColor: THEME.border,
    marginHorizontal: 14,
  },
  totalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
  },
  totalLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: THEME.white,
  },
  totalValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: THEME.gold,
  },
  inputCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: THEME.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  workerInput: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: THEME.white,
  },
  actionsSection: {
    marginTop: 8,
    gap: 12,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 18,
    borderRadius: 16,
  },
  preparingBtn: {
    backgroundColor: THEME.preparing,
  },
  doneBtn: {
    backgroundColor: THEME.success,
  },
  actionBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
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
});
