const TOKEN_STORAGE_KEY = "token";

export function getToken() {
  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setToken(token) {
  window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function clearToken() {
  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
}

export async function api(path, { method = "GET", body = null, auth = false } = {}) {
  const headers = new Headers();

  if (auth) {
    const token = getToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  let payload = null;
  if (body instanceof FormData) {
    payload = body;
  } else if (body !== null) {
    headers.set("Content-Type", "application/json");
    payload = JSON.stringify(body);
  }

  const response = await fetch(path, {
    method,
    headers,
    body: payload,
  });

  const contentType = response.headers.get("content-type") ?? "";
  const data = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : await response.text().then((text) => (text ? { detail: text } : null)).catch(() => null);

  if (!response.ok) {
    const error = new Error(data?.detail || `Request failed with status ${response.status}`);
    error.status = response.status;
    error.payload = data;
    throw error;
  }

  return data;
}

export function resolveMediaUrl(url) {
  if (!url) {
    return "";
  }

  return new URL(url, window.location.origin).toString();
}

export function formatPostDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) {
    return "";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
