import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql"; // Import drizzle
import { registerPushToken, sendNewOrderNotification } from "./notifications"; // Import notification functions

function getDb() {
  const url = process.env.TURSO_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) throw new Error("TURSO_URL is not set");
  if (!authToken) throw new Error("TURSO_AUTH_TOKEN is not set");

  return createClient({ url, authToken });
}

export async function registerRoutes(app: Express): Promise<Server> {
  const drizzleDb = drizzle(getDb()); // Initialize Drizzle DB once
  app.get("/api/orders", async (req: Request, res: Response) => {
    try {
      const db = getDb();
      const result = await db.execute("SELECT * FROM orders ORDER BY createdAt DESC");
      const orders = result.rows.map((row) => ({
        id: row.id,
        customerName: row.customerName,
        phone: row.phone,
        address: row.address,
        items: typeof row.items === "string" ? JSON.parse(row.items) : row.items,
        totalPrice: row.totalPrice,
        paymentMethod: row.paymentMethod,
        status: row.status,
        createdAt: row.createdAt,
        workerName: row.workerName ?? null,
      }));
      res.json(orders);
    } catch (err: unknown) {
      console.error("GET /api/orders error:", err);
      res.status(500).json({ message: err instanceof Error ? err.message : "Database error" });
    }
  });

  // New endpoint to create an order
  app.post("/api/orders", async (req: Request, res: Response) => {
    const { customerName, phone, address, items, totalPrice, paymentMethod } = req.body;

    if (!customerName || !phone || !address || !items || !totalPrice || !paymentMethod) {
      return res.status(400).json({ message: "Missing required order fields." });
    }

    try {
      const db = getDb();
      const stringifiedItems = JSON.stringify(items);
      const status = "pending"; // Default status for new orders
      const createdAt = new Date().toISOString(); // Server-side timestamp

      const result = await db.execute({
        sql: `INSERT INTO orders (customerName, phone, address, items, totalPrice, paymentMethod, status, createdAt)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [customerName, phone, address, stringifiedItems, totalPrice, paymentMethod, status, createdAt],
      });

      // Assuming the lastInsertRowid is the new order's ID
      const newOrderId = result.lastInsertRowid;
      const newOrderDetails = {
        id: Number(newOrderId), // Convert BigInt to Number if necessary
        customerName, phone, address, items, totalPrice, paymentMethod, status, createdAt
      };

      // Trigger push notification for the new order
      await sendNewOrderNotification(drizzleDb, newOrderDetails);
      console.log(`New order created and notification sent for Order ID: ${newOrderId}`);

      res.status(201).json({ success: true, order: newOrderDetails });
    } catch (err: unknown) {
      console.error("POST /api/orders error:", err);
      res.status(500).json({ message: err instanceof Error ? err.message : "Failed to create order." });
    }
  });



  app.put("/api/orders/:id/status", async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body as { status: string };

    const allowed = ["pending", "preparing", "completed"];
    if (!status || !allowed.includes(status)) {
      return res.status(400).json({ message: `status must be one of: ${allowed.join(", ")}` });
    }

    try {
      const db = getDb();
      await db.execute({
        sql: "UPDATE orders SET status = ? WHERE id = ?",
        args: [status, Number(id)],
      });
      res.json({ success: true });
    } catch (err: unknown) {
      console.error(`PUT /api/orders/${id}/status error:`, err);
      res.status(500).json({ message: err instanceof Error ? err.message : "Database error" });
    }
  });

  app.put("/api/orders/:id/worker", async (req: Request, res: Response) => {
    const { id } = req.params;
    const { workerName } = req.body as { workerName: string };

    if (!workerName || typeof workerName !== "string") {
      return res.status(400).json({ message: "workerName is required" });
    }

    try {
      const db = getDb();
      await db.execute({
        sql: "UPDATE orders SET workerName = ? WHERE id = ?",
        args: [workerName.trim(), Number(id)],
      });
      res.json({ success: true });
    } catch (err: unknown) {
      console.error(`PUT /api/orders/${id}/worker error:`, err);
      res.status(500).json({ message: err instanceof Error ? err.message : "Database error" });
    }
  });

  app.delete("/api/orders/:id", async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
      const db = getDb();
      await db.execute({
        sql: "DELETE FROM orders WHERE id = ?",
        args: [Number(id)],
      });
      res.json({ success: true });
    } catch (err: unknown) {
      console.error(`DELETE /api/orders/${id} error:`, err);
      res.status(500).json({ message: err instanceof Error ? err.message : "Database error" });
    }
  });

  // New endpoint to register push tokens
  app.post("/api/register-push-token", async (req: Request, res: Response) => {
    const { token } = req.body as { token: string };

    if (!token) {
      return res.status(400).json({ success: false, message: "Push token is required." });
    }

    try {
      const result = await registerPushToken(drizzleDb, token);
      res.status(result.success ? 200 : 500).json(result);
    } catch (err: unknown) {
      console.error("POST /api/register-push-token error:", err);
      res.status(500).json({ success: false, message: err instanceof Error ? err.message : "Failed to register push token." });
    }
  });


  const httpServer = createServer(app);
  return httpServer;
}
