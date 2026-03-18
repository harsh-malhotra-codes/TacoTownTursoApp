
import Constants from "expo-constants";

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL ||
  "https://taco-town-qqro.onrender.com";

console.log("API URL:", API_URL);

async function apiRequest(
  path: string,
  method: string = "GET",
  body?: any
) {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await res.json();
    return data;
  } catch (err) {
    console.log("API ERROR:", err);
    throw err;
  }
}

export const apiGet = (path: string) => apiRequest(path, "GET");
export const apiPut = (path: string, data: any) => apiRequest(path, "PUT", data);
export const apiDelete = (path: string) => apiRequest(path, "DELETE");
export { apiRequest };