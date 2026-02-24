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

/* ===== НОВОЕ: UI для feed + бургер ===== */

function initFeedUI() {
  const drawer = document.getElementById("drawer");
  const overlay = document.getElementById("overlay");

  const burgerBtn = document.getElementById("burgerBtn");
  const closeDrawerBtn = document.getElementById("closeDrawerBtn");
  const openProfileBtn = document.getElementById("openProfileBtn");
  const profileBtn = document.getElementById("profileBtn");
  const profilePanel = document.getElementById("profilePanel");

  const openDrawer = () => {
    drawer?.classList.add("open");
    overlay?.classList.add("open");
  };

  const closeDrawer = () => {
    drawer?.classList.remove("open");
    overlay?.classList.remove("open");
  };

  burgerBtn?.addEventListener("click", openDrawer);
  closeDrawerBtn?.addEventListener("click", closeDrawer);
  overlay?.addEventListener("click", closeDrawer);

  const toggleProfile = () => {
    profilePanel?.classList.toggle("open");
  };

  openProfileBtn?.addEventListener("click", toggleProfile);
  profileBtn?.addEventListener("click", () => {
    openDrawer();
    profilePanel?.classList.add("open");
  });
}

/* ===== НОВОЕ: рендер ленты (пока мок) ===== */

function renderFeed(me) {
  const feed = document.getElementById("feed");
  if (!feed) return;

  // пока моковые посты (потом заменим запросом к backend)
  const posts = [
    {
      id: 1,
      username: me.username,
      caption: "Машина на заправке",
      image: "/static/images/post1.jpg",
    },
    {
      id: 2,
      username: "test_user",
      caption: "Закат в городе",
      image: "/static/images/post2.jpg",
    },
    {
      id: 3,
      username: "andrey",
      caption: "Просто фото",
      image: "/static/images/post1.jpg",
    },
  ];

  feed.innerHTML = posts
    .map(
      (p) => `
      <div class="post" data-id="${p.id}">
        <div class="post-header">
          <div class="userline">
            <div class="avatar"></div>
            <div>${escapeHtml(p.username)}</div>
          </div>
          <div>•••</div>
        </div>

        <div class="post-img" style="background-image:url('${p.image}')"></div>

        <div class="actions">❤ 💬</div>
        <div class="caption">${escapeHtml(p.caption)}</div>
      </div>
    `
    )
    .join("");
}

// маленькая защита от вставки html в caption/username
function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

window.app = {
  handleLogin,
  handleRegister,
  requireAuth,
  logout,
  initFeedUI,
  renderFeed,
};