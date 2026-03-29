export const API_URL = import.meta.env.VITE_API_URL;

export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem("ontrip_token");
  const isFormData = options.body instanceof FormData;

  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
}

export function saveAuth(data) {
  localStorage.setItem("ontrip_token", data.token);
  localStorage.setItem("ontrip_user", JSON.stringify(data.user));
  window.dispatchEvent(new Event("ontrip-auth-changed"));
}

export function saveUserOnly(user) {
  localStorage.setItem("ontrip_user", JSON.stringify(user));
  window.dispatchEvent(new Event("ontrip-auth-changed"));
}

export function clearAuth() {
  localStorage.removeItem("ontrip_token");
  localStorage.removeItem("ontrip_user");
  window.dispatchEvent(new Event("ontrip-auth-changed"));
}

export function getUser() {
  const raw = localStorage.getItem("ontrip_user");
  return raw ? JSON.parse(raw) : null;
}

export function getToken() {
  return localStorage.getItem("ontrip_token") || "";
}

export function isLoggedIn() {
  return !!localStorage.getItem("ontrip_token");
}