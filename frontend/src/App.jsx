import { useEffect, useState } from "react";

import { clearToken, getRole } from "./lib/api.js";
import { AdminLoginPage } from "./pages/AdminLoginPage.jsx";
import { AdminPage } from "./pages/AdminPage.jsx";
import { FeedPage } from "./pages/FeedPage.jsx";
import { LoginPage } from "./pages/LoginPage.jsx";
import { RegisterPage } from "./pages/RegisterPage.jsx";

export const ROUTES = {
  login: "/login_page",
  register: "/register_page",
  feed: "/feed_page",
  adminLogin: "/admin_page",
};

const KNOWN_PATHS = new Set(["/", ROUTES.login, ROUTES.register, ROUTES.feed, ROUTES.adminLogin]);

function normalizePath(pathname) {
  if (pathname === "/") {
    return ROUTES.login;
  }

  return KNOWN_PATHS.has(pathname) ? pathname : ROUTES.login;
}

function applyHistory(pathname, replace = false) {
  const method = replace ? "replaceState" : "pushState";
  window.history[method](null, "", pathname);
}

export function App() {
  const [route, setRoute] = useState(() => normalizePath(window.location.pathname));

  useEffect(() => {
    const syncRoute = () => {
      const nextRoute = normalizePath(window.location.pathname);
      if (nextRoute !== window.location.pathname) {
        applyHistory(nextRoute, true);
      }
      setRoute(nextRoute);
    };

    syncRoute();
    window.addEventListener("popstate", syncRoute);
    return () => window.removeEventListener("popstate", syncRoute);
  }, []);

  const navigate = (pathname, { replace = false } = {}) => {
    const nextRoute = normalizePath(pathname);
    if (window.location.pathname !== nextRoute || replace) {
      applyHistory(nextRoute, replace);
    }
    window.scrollTo({ top: 0 });
    setRoute(nextRoute);
  };

  const handleLogout = () => {
    clearToken();
    navigate(ROUTES.login, { replace: true });
  };

  if (route === ROUTES.adminLogin && getRole() === "admin") {
    return <AdminPage navigate={navigate} routes={ROUTES} />;
  }

  if (route === ROUTES.register) {
    return <RegisterPage navigate={navigate} routes={ROUTES} />;
  }

  if (route === ROUTES.feed) {
    return <FeedPage navigate={navigate} routes={ROUTES} onLogout={handleLogout} />;
  }

  if (route === ROUTES.adminLogin) {
    return <AdminLoginPage navigate={navigate} routes={ROUTES} />;
  }

  return <LoginPage navigate={navigate} routes={ROUTES} />;
}
