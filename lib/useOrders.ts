import { useQuery } from "@tanstack/react-query";
import { getOrders } from "./orders";

export function useOrders() {
  return useQuery({
    queryKey: ["orders"],
    queryFn: getOrders,
    refetchInterval: 5000, // Auto refresh every 5 seconds
    staleTime: 1000, // Data is considered fresh for 1 second
  });
}