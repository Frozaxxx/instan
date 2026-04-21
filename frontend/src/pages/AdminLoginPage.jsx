import { useState } from "react";

import { AuthCard } from "../components/AuthCard.jsx";
import { api, setRole, setToken } from "../lib/api.js";

export function AdminLoginPage({ navigate, routes }) {
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

      if (response.role !== "admin") {
        throw new Error("Нужны учётные данные администратора");
      }

      setToken(response.access_token);
      setRole("admin");
      navigate(routes.adminLogin, { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthCard
      title="Админ-панель"
      description="Вход для администратора. После авторизации откроется панель управления пользователями, постами и комментариями."
      footer={(
        <button className="text-link" type="button" onClick={() => navigate(routes.login)}>
          Вернуться к обычному входу
        </button>
      )}
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        <label className="form-field">
          <span className="form-field__label">Admin Username</span>
          <input
            className="form-field__input"
            name="username"
            value={form.username}
            onChange={handleChange}
            required
          />
        </label>

        <label className="form-field">
          <span className="form-field__label">Admin Password</span>
          <input
            className="form-field__input"
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            required
          />
        </label>

        <div className="form-error" aria-live="polite">
          {error}
        </div>

        <button className="button button--primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Проверяем..." : "Открыть панель"}
        </button>
      </form>
    </AuthCard>
  );
}
