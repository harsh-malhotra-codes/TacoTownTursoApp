// import { apiGet, apiPut, apiDelete } from "../lib/api";

// // Define types for clarity and type safety
// export type OrderStatus = 'pending' | 'preparing' | 'completed' | 'cancelled';

// export interface OrderItem {
//   name: string;
//   price: number;
//   quantity: number;
// }

// export interface Order {
//   id: number;
//   customerName: string;
//   phone: string;
//   address: string;
//   items: OrderItem[];
//   totalPrice: number;
//   paymentMethod: string;
//   status: OrderStatus;
//   createdAt: string; // ISO date string
//   workerName?: string; 
// }

// export function getOrders(): Promise<Order[]> {
//   return apiGet("/orders");
// }

// export function updateOrder(id: number, data: Partial<Order>): Promise<Order> {
//   return apiPut(`/orders/${id}`, data);
// }

// export function deleteOrder(id: number): Promise<void> {
//   return apiDelete(`/orders/${id}`);
// }

import { apiGet, apiPut, apiDelete } from "../lib/api";

// ================= TYPES =================

// Order status types
export type OrderStatus = 'pending' | 'preparing' | 'completed' | 'cancelled';

// Item inside an order
export interface OrderItem {
  name: string;
  price: number;
  quantity: number;
}

// Main order object coming from backend
export interface Order {
  id: number;
  customerName: string;
  phone: string;
  address: string;
  items: OrderItem[];
  totalPrice: number;
  paymentMethod: string;
  status: OrderStatus;
  createdAt: string; // ISO date string
  workerName?: string;   // ✅ backend returns this (VERY IMPORTANT)
}


// ================= API CALLS =================

// Get all orders (Dashboard screen)
export function getOrders(): Promise<Order[]> {
  return apiGet("/orders");
}

// Update order status (Preparing / Completed)
export function updateOrder(id: number, data: Partial<Order>): Promise<Order> {
  return apiPut(`/orders/${id}/status`, data);
}

// Assign worker/chef to order  ⭐ NEW (CRITICAL FIX)
export function updateWorker(id: number, workerName: string): Promise<any> {
  return apiPut(`/orders/${id}/worker`, { workerName });
}

// Delete order
export function deleteOrder(id: number): Promise<void> {
  return apiDelete(`/orders/${id}`);
}