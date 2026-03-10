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
  const headers = {};
  if (auth) {
    const token = localStorage.getItem("token");
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  let payload = null;
  if (body instanceof FormData) {
    payload = body;
  } else if (body !== null) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: payload,
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

function resolveMediaUrl(url) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return `${APP_ORIGIN}${url}`;
  return `${APP_ORIGIN}/${url}`;
}

function initFeedUI() {
  const drawer = document.getElementById("drawer");
  const overlay = document.getElementById("overlay");

  const closeDrawerBtn = document.getElementById("closeDrawerBtn");
  const openProfileBtn = document.getElementById("openProfileBtn");
  const profileBtn = document.getElementById("profileBtn");
  const profilePanel = document.getElementById("profilePanel");
  const brandBtn = document.getElementById("brandBtn");
  const addPostBtn = document.getElementById("addPostBtn");

  const postModal = document.getElementById("postModal");
  const postModalOverlay = document.getElementById("postModalOverlay");
  const closePostModalBtn = document.getElementById("closePostModalBtn");
  const createPostForm = document.getElementById("createPostForm");
  const postImageInput = document.getElementById("postImage");
  const postImagePreview = document.getElementById("postImagePreview");
  const postCaptionInput = document.getElementById("postCaption");
  const postError = document.getElementById("postError");
  const submitPostBtn = document.getElementById("submitPostBtn");

  const openDrawer = () => {
    drawer?.classList.add("open");
    overlay?.classList.add("open");
  };

  const closeDrawer = () => {
    drawer?.classList.remove("open");
    overlay?.classList.remove("open");
  };

  closeDrawerBtn?.addEventListener("click", closeDrawer);
  overlay?.addEventListener("click", closeDrawer);

  const toggleProfile = () => {
    profilePanel?.classList.toggle("open");
  };

  openProfileBtn?.addEventListener("click", toggleProfile);
  profileBtn?.addEventListener("click", () => {
    if (drawer?.classList.contains("open")) {
      closeDrawer();
      return;
    }
    openDrawer();
    profilePanel?.classList.add("open");
  });

  brandBtn?.addEventListener("click", () => {
    window.location.assign(`${APP_ORIGIN}/feed_page`);
  });

  let previewUrl = null;

  const clearPreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      previewUrl = null;
    }
    postImagePreview?.removeAttribute("src");
    postImagePreview?.classList.remove("visible");
  };

  const resetPostForm = () => {
    createPostForm?.reset();
    if (postError) postError.textContent = "";
    clearPreview();
  };

  const openPostModal = () => {
    closeDrawer();
    postModal?.classList.add("open");
    postModalOverlay?.classList.add("open");
    postModal?.setAttribute("aria-hidden", "false");
  };

  const closePostModal = () => {
    postModal?.classList.remove("open");
    postModalOverlay?.classList.remove("open");
    postModal?.setAttribute("aria-hidden", "true");
    resetPostForm();
  };

  const setPostingState = (isPosting) => {
    if (!submitPostBtn) return;
    submitPostBtn.disabled = isPosting;
    submitPostBtn.textContent = isPosting ? "Публикуем..." : "Опубликовать";
  };

  addPostBtn?.addEventListener("click", openPostModal);
  closePostModalBtn?.addEventListener("click", closePostModal);
  postModalOverlay?.addEventListener("click", closePostModal);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && postModal?.classList.contains("open")) {
      closePostModal();
    }
  });

  postImageInput?.addEventListener("change", () => {
    const file = postImageInput.files?.[0];
    if (!file) {
      clearPreview();
      return;
    }

    if (!file.type.startsWith("image/")) {
      postImageInput.value = "";
      clearPreview();
      if (postError) postError.textContent = "Нужно выбрать файл изображения.";
      return;
    }

    if (postError) postError.textContent = "";
    clearPreview();
    previewUrl = URL.createObjectURL(file);
    if (postImagePreview) {
      postImagePreview.src = previewUrl;
      postImagePreview.classList.add("visible");
    }
  });

  createPostForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const file = postImageInput?.files?.[0];
    if (!file) {
      if (postError) postError.textContent = "Добавь фото перед публикацией.";
      return;
    }

    const formData = new FormData();
    formData.append("image", file);
    formData.append("caption", postCaptionInput?.value ?? "");

    if (postError) postError.textContent = "";
    setPostingState(true);

    try {
      await api("/posts", {
        method: "POST",
        body: formData,
        auth: true,
      });
      closePostModal();
      await loadFeed();
    } catch (err) {
      if (postError) postError.textContent = err.message;
    } finally {
      setPostingState(false);
    }
  });
}

async function loadFeed() {
  const posts = await api("/posts", { auth: true });
  renderFeed(posts);
}

function renderFeed(posts) {
  const feed = document.getElementById("feed");
  if (!feed) return;

  const list = Array.isArray(posts) ? posts : [];
  if (list.length === 0) {
    feed.innerHTML = `<div class="feed-empty">Пока нет постов. Нажми на + и добавь первый.</div>`;
    return;
  }

  feed.innerHTML = list
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

        <img class="post-img" src="${escapeAttr(resolveMediaUrl(p.image_url))}" alt="post image" loading="lazy" />

        <div class="actions">❤ 💬</div>
        <div class="caption">${escapeHtml(p.caption)}</div>
      </div>
    `
    )
    .join("");
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(str) {
  return escapeHtml(str);
}

window.app = {
  handleLogin,
  handleRegister,
  requireAuth,
  logout,
  initFeedUI,
  loadFeed,
  renderFeed,
};
