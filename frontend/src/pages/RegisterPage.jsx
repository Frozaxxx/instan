import { useEffect, useState } from "react";

import { AuthCard } from "../components/AuthCard.jsx";
import { api, clearToken, getToken } from "../lib/api.js";

export function RegisterPage({ navigate, routes }) {
  const [form, setForm] = useState({
    username: "",
    email: "",
    full_name: "",
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
  }, [navigate, routes.feed]);

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
      await api("/register", {
        method: "POST",
        body: {
          username: form.username.trim(),
          email: form.email.trim(),
          full_name: form.full_name.trim(),
          password: form.password,
        },
      });

      navigate(routes.login, { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthCard
      title="Регистрация"
      description="Создай аккаунт, чтобы войти в приложение и работать с лентой уже из React-фронта."
      footer={(
        <button className="text-link" type="button" onClick={() => navigate(routes.login)}>
          Уже есть аккаунт? Вернуться ко входу
        </button>
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
          <span className="form-field__label">Email</span>
          <input
            className="form-field__input"
            name="email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={handleChange}
            required
          />
        </label>

        <label className="form-field">
          <span className="form-field__label">Полное имя</span>
          <input
            className="form-field__input"
            name="full_name"
            autoComplete="name"
            value={form.full_name}
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
            autoComplete="new-password"
            value={form.password}
            onChange={handleChange}
            required
          />
        </label>

        <div className="form-error" aria-live="polite">
          {error}
        </div>

        <button className="button button--primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Создаем..." : "Зарегистрироваться"}
        </button>
      </form>
    </AuthCard>
  );
}
