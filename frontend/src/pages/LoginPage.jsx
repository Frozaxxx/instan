import { useEffect, useState } from "react";

import { AuthCard } from "../components/AuthCard.jsx";
import { api, clearToken, getRole, getToken, setRole, setToken } from "../lib/api.js";

export function LoginPage({ navigate, routes }) {
  const [form, setForm] = useState({
    username: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      return undefined;
    }

    let active = true;

    if (getRole() === "admin") {
      navigate(routes.adminLogin, { replace: true });
      return () => {
        active = false;
      };
    }

    api("/me", { auth: true })
      .then(() => {
        if (active) {
          navigate(routes.feed, { replace: true });
        }
      })
      .catch(() => {
        clearToken();
      });

    return () => {
      active = false;
    };
  }, [navigate, routes.adminLogin, routes.feed]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await api("/login", {
        method: "POST",
        body: {
          username: form.username.trim(),
          password: form.password,
        },
      });

      setToken(response.access_token);
      setRole(response.role || "user");
      navigate(response.role === "admin" ? routes.adminLogin : routes.feed, { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthCard
      title="Вход"
      description="Войди в приложение, чтобы смотреть ленту, публиковать посты и работать с комментариями."
      footer={(
        <>
          <button className="text-link" type="button" onClick={() => navigate(routes.register)}>
            Нет аккаунта? Перейти к регистрации
          </button>
          <button className="text-link" type="button" onClick={() => navigate(routes.adminLogin)}>
            Вход для администратора
          </button>
        </>
      )}
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        <label className="form-field">
          <span className="form-field__label">Username</span>
          <input
            className="form-field__input"
            name="username"
            autoComplete="username"
            value={form.username}
            onChange={handleChange}
            required
          />
        </label>

        <label className="form-field">
          <span className="form-field__label">Password</span>
          <input
            className="form-field__input"
            name="password"
            type="password"
            autoComplete="current-password"
            value={form.password}
            onChange={handleChange}
            required
          />
        </label>

        <div className="form-error" aria-live="polite">
          {error}
        </div>

        <button className="button button--primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Входим..." : "Войти"}
        </button>
      </form>
    </AuthCard>
  );
}
