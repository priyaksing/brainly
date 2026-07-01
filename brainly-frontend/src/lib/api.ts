import axios from "axios";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

if (!BACKEND_URL) {
  console.error("VITE_BACKEND_URL is not set. Check your .env file.");
}

export const api = axios.create({
  baseURL: BACKEND_URL,
});

// Attach the JWT to every outgoing request.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = token;
  }
  return config;
});

// Globally handle expired/invalid sessions.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url: string = error.config?.url ?? "";

    // Don't bounce to /login for failed sign-in/sign-up attempts —
    // those 401s mean "wrong credentials", not "session expired".
    const isAuthRoute = url.includes("/signin") || url.includes("/signup");

    if (status === 401 && !isAuthRoute) {
      localStorage.removeItem("token");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export function getErrorMessage(error: unknown, fallback = "Something went wrong"): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | {
          message?: string;
          errors?: Record<string, string[]>;
        }
      | undefined;

    if (data?.errors) {
      const firstField = Object.values(data.errors)[0];
      if (Array.isArray(firstField) && firstField.length > 0) {
        return firstField[0];
      }
    }

    if (data?.message) return data.message;
    if (error?.message) return error.message;
  }
  return fallback;
}
