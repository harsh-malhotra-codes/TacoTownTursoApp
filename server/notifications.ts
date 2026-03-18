
import { Expo, ExpoPushMessage, ExpoPushTicket } from "expo-server-sdk";
import { LibSQLDatabase } from "drizzle-orm/libsql";
import { eq } from "drizzle-orm";
import { pushTokens } from "../shared/schema";

// Expo client
const expo = new Expo();

/**
 * Fetch tokens from database
 */
export async function getAllPushTokens(db: LibSQLDatabase): Promise<string[]> {
  try {
    const tokens = await db.select({ token: pushTokens.token }).from(pushTokens);
    return tokens.map((t) => t.token);
  } catch (error) {
    console.error("Error fetching tokens:", error);
    return [];
  }
}

/**
 * Register token
 */
export async function registerPushToken(
  db: LibSQLDatabase,
  token: string
) {
  try {
    await db
      .insert(pushTokens)
      .values({ token })
      .onConflictDoNothing({ target: pushTokens.token });

    console.log("Token registered:", token);
    return { success: true };
  } catch (error) {
    console.error("Token registration error:", error);
    return { success: false };
  }
}

/**
 * Send notification when order created
 */
export async function sendNewOrderNotification(
  db: LibSQLDatabase,
  orderDetails: { id: number }
) {
  const tokens = await getAllPushTokens(db);

  if (tokens.length === 0) {
    console.log("No push tokens available.");
    return;
  }

  const messages: ExpoPushMessage[] = [];
  const receiptTokenMap = new Map<string, string>();

  for (const token of tokens) {
    if (!Expo.isExpoPushToken(token)) {
      console.warn("Invalid token:", token);
      continue;
    }

    messages.push({
      to: token,
      sound: "default",
      title: "🌮 New Order Received!",
      body: `Order #${orderDetails.id} placed.`,
      data: {
        orderId: orderDetails.id,
        type: "new_order",
      },
    });
  }

  const chunks = expo.chunkPushNotifications(messages);
  const tickets: ExpoPushTicket[] = [];

  for (const chunk of chunks) {
    try {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);

      for (let i = 0; i < ticketChunk.length; i++) {
        const ticket = ticketChunk[i];
        const message = chunk[i];
        const token = message?.to;

        if (ticket.status === "ok" && ticket.id && typeof token === "string") {
          receiptTokenMap.set(ticket.id, token);
        }

        if (
          ticket.status === "error" &&
          ticket.details?.error === "DeviceNotRegistered" &&
          typeof token === "string"
        ) {
          console.warn("Removing invalid token:", token);

          await db
            .delete(pushTokens)
            .where(eq(pushTokens.token, token));
        }
      }

      console.log("Notification chunk sent");
    } catch (error) {
      console.error("Push send error:", error);
    }
  }

  /**
   * Collect receipt IDs
   */
  const receiptIds: string[] = [];

  for (const ticket of tickets) {
    if (ticket.status === "ok" && ticket.id) {
      receiptIds.push(ticket.id);
    }
  }

  /**
   * Check receipts
   */
  const receiptChunks = expo.chunkPushNotificationReceiptIds(receiptIds);

  for (const chunk of receiptChunks) {
    try {
      const receipts = await expo.getPushNotificationReceiptsAsync(chunk);

      for (const receiptId in receipts) {
        const receipt = receipts[receiptId];
        const token = receiptTokenMap.get(receiptId);

        if (receipt.status === "error") {
          console.error("Push receipt error:", receipt.message);

          if (receipt.details?.error === "DeviceNotRegistered" && token) {
            console.warn("Removing invalid token:", token);

            await db
              .delete(pushTokens)
              .where(eq(pushTokens.token, token));
          }
        }
      }
    } catch (error) {
      console.error("Receipt check error:", error);
    }
  }
}
