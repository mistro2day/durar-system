import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// Change this to your local IP address for development
// e.g., http://192.168.1.X:3000
const DEV_API_URL = "http://192.168.1.21:8080";

const BASE_URL = __DEV__
    ? DEV_API_URL
    : "https://api.durar.com"; // Production URL

const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

// Add a request interceptor to attach the token
api.interceptors.request.use(
    async (config) => {
        try {
            const token = await SecureStore.getItemAsync("token");
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        } catch (error) {
            console.error("Error reading token", error);
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default api;
