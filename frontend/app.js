const API = "http://127.0.0.1:8000";
const APP_ORIGIN = new URL(API).origin;

if (window.location.origin !== APP_ORIGIN) {
  let target = "/login_page";
  if (window.location.pathname.includes("register")) target = "/register_page";
  if (window.location.pathname.includes("feed")) target = "/feed_page";
  window.location.replace(`${APP_ORIGIN}${target}`);
}

function setToken(token) {
  localStorage.setItem("token", token);
}

async function api(path, { method = "GET", body = null, auth = false } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = localStorage.getItem("token");
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.detail || `Error ${res.status}`);
  return data;
}

async function handleLogin(e) {
  e.preventDefault();

  const username = document.querySelector("#username").value.trim();
  const password = document.querySelector("#password").value;

  try {
    const resp = await api("/login", {
      method: "POST",
      body: { username, password },
    });

    setToken(resp.access_token);
    window.location.assign(`${APP_ORIGIN}/feed_page`);
  } catch (err) {
    alert(err.message);
  }
}

async function handleRegister(e) {
  e.preventDefault();

  const username = document.querySelector("#username").value.trim();
  const email = document.querySelector("#email").value.trim();
  const password = document.querySelector("#password").value;
  const fullName = document.querySelector("#full_name").value.trim();

  try {
    await api("/register", {
      method: "POST",
      body: { username, email, password, full_name: fullName },
    });

    window.location.assign(`${APP_ORIGIN}/login_page`);
  } catch (err) {
    alert(err.message);
  }
}

async function requireAuth() {
  try {
    const me = await api("/me", { auth: true });
    return me;
  } catch (e) {
    localStorage.removeItem("token");
    window.location.href = `${APP_ORIGIN}/login_page`;
  }
}

function logout() {
  localStorage.removeItem("token");
  window.location.href = `${APP_ORIGIN}/login_page`;
}

window.app = { handleLogin, handleRegister, requireAuth, logout };
