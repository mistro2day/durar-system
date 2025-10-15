import axios from "axios";

// Use env URL if provided; otherwise use relative URLs and rely on Vite dev proxy
const baseURL = import.meta.env.VITE_API_URL || "";

export const api = axios.create({ baseURL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers = config.headers || {};
    (config.headers as any).Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
