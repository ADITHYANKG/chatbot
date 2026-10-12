import axios from "axios";

export const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || "http://localhost:8000").replace(/\/$/, "");

let refreshPromise = null;

export function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE_URL}/auth/refresh/`, {
      method: "POST",
      credentials: "include",
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Refresh session expired");
        const data = await response.json();
        localStorage.setItem("token", data.access_token);
        window.dispatchEvent(new Event("auth-token-updated"));
        return data.access_token;
      })
      .catch((error) => {
        localStorage.removeItem("token");
        window.dispatchEvent(new Event("auth-token-updated"));
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

export async function authenticatedFetch(input, options = {}) {
  const headers = new Headers(options.headers || {});
  const token = localStorage.getItem("token");
  if (token && !headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(input, { ...options, headers, credentials: "include" });
  if (response.status !== 401 || String(input).includes("/auth/refresh/")) return response;

  try {
    const refreshedToken = await refreshAccessToken();
    headers.set("Authorization", `Bearer ${refreshedToken}`);
    return await fetch(input, { ...options, headers, credentials: "include" });
  } catch {
    return response;
  }
}

axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const request = error.config;
    if (error.response?.status !== 401 || !request || request._authRetry || request.url?.includes("/auth/refresh/")) {
      return Promise.reject(error);
    }

    request._authRetry = true;
    try {
      const token = await refreshAccessToken();
      request.headers = request.headers || {};
      request.headers.Authorization = `Bearer ${token}`;
      return axios(request);
    } catch {
      return Promise.reject(error);
    }
  }
);

export async function postAuthForm(path, fields, token) {
  const headers = { "Content-Type": "application/x-www-form-urlencoded" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const request = token ? authenticatedFetch : fetch;
  const response = await request(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers,
    body: new URLSearchParams(fields),
    credentials: "include",
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || "Request failed");
  }
  return data;
}
