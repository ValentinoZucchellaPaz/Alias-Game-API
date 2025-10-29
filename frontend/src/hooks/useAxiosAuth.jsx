import { useEffect } from "react";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function useAxiosAuth() {
  const { token, refreshAccessToken } = useAuth();

  useEffect(() => {
    // ✅ Interceptor de request: agrega el token a todas las request
    console.log("en el middleware de auth");
    const requestInterceptor = api.interceptors.request.use(
      (config) => {
        if (token) config.headers.Authorization = `Bearer ${token}`;
        return config;
      },
      (error) => Promise.reject(error)
    );

    // ⚙️ Interceptor de respuesta: intenta refrescar si hay 401
    const responseInterceptor = api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          try {
            const newAccessToken = await refreshAccessToken();
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            return api(originalRequest); // reintenta
          } catch (refreshError) {
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );

    // Limpieza de interceptores al desmontar
    return () => {
      api.interceptors.request.eject(requestInterceptor);
      api.interceptors.response.eject(responseInterceptor);
    };
  }, [token, refreshAccessToken]);

  return api;
}
