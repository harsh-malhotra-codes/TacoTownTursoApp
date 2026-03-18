// import { fetch } from "expo/fetch";
// import { getApiUrl } from "@/lib/query-client";

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
//   status: "pending" | "preparing" | "completed";
//   createdAt: string;
//   workerName?: string | null;
// }

// async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
//   const baseUrl = getApiUrl();
//   const url = new URL(path, baseUrl).toString();

//   const res = await fetch(url, {
//     method,
//     headers: body ? { "Content-Type": "application/json" } : {},
//     body: body ? JSON.stringify(body) : undefined,
//     credentials: "include",
//   });

//   if (!res.ok) {
//     const text = await res.text().catch(() => res.statusText);
//     throw new Error(`${res.status}: ${text}`);
//   }

//   if (method === "DELETE" || res.status === 204) {
//     return undefined as T;
//   }

//   return res.json() as Promise<T>;
// }

// export const tacoApi = {
//   getOrders: () => request<Order[]>("GET", "/api/orders"),
//   updateStatus: (id: number, status: string) =>
//     request<{ success: boolean }>("PUT", `/api/orders/${id}/status`, { status }),
//   updateWorker: (id: number, workerName: string) =>
//     request<{ success: boolean }>("PUT", `/api/orders/${id}/worker`, { workerName }),
//   deleteOrder: (id: number) =>
//     request<{ success: boolean }>("DELETE", `/api/orders/${id}`),
// };
/*
  TacoTown API client
  Directly talks to Render backend.
  NO /api prefix anymore.
*/

const BASE_URL = "https://taco-town-qqro.onrender.com";

export interface OrderItem {
  name: string;
  price: number;
  quantity: number;
}

export interface Order {
  id: number;
  customerName: string;
  phone: string;
  address: string;
  items: OrderItem[];
  totalPrice: number;
  paymentMethod: string;
  status: "pending" | "preparing" | "completed";
  createdAt: string;
  workerName?: string | null;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(BASE_URL + path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status}: ${text}`);
  }

  if (method === "DELETE" || res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

export const tacoApi = {
  // ✔ correct endpoint
  getOrders: () => request<Order[]>("GET", "/orders"),

  updateStatus: (id: number, status: string) =>
    request<{ success: boolean }>("PUT", `/orders/${id}/status`, { status }),

  updateWorker: (id: number, workerName: string) =>
    request<{ success: boolean }>("PUT", `/orders/${id}/worker`, { workerName }),

  deleteOrder: (id: number) =>
    request<{ success: boolean }>("DELETE", `/orders/${id}`),
};