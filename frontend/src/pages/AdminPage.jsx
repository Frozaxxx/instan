import { useEffect, useState } from "react";

import { api, clearToken, getRole, resolveMediaUrl } from "../lib/api.js";

function MetricCard({ label, value }) {
  return (
    <div className="admin-metric">
      <div className="admin-metric__value">{value}</div>
      <div className="admin-metric__label">{label}</div>
    </div>
  );
}

function AdminPostModal({ post, open, onClose, onDelete, isDeletePending }) {
  if (!open || !post) {
    return null;
  }

  return (
    <>
      <div className="modal-backdrop profile-modal__backdrop is-visible" onClick={onClose} />
      <section className="admin-post-modal" role="dialog" aria-modal="true" aria-labelledby={`admin-post-${post.id}`}>
        <header className="admin-post-modal__header">
          <div id={`admin-post-${post.id}`} className="admin-post-modal__title">
            Пост #{post.id} от @{post.username}
          </div>
          <button className="icon-button" type="button" aria-label="Закрыть пост" onClick={onClose}>
            ×
          </button>
        </header>

        <div className="admin-post-modal__body">
          <img
            className="admin-post-modal__image"
            src={resolveMediaUrl(post.image_url)}
            alt={`Пост пользователя ${post.username}`}
          />

          <div className="admin-post-modal__meta">
            <span>Лайки: {post.likes_count}</span>
            <span>Комментарии: {post.comments_count}</span>
            <span>{new Date(post.created_at).toLocaleString("ru-RU")}</span>
          </div>

          <div className="admin-post-modal__caption">{post.caption || "Без описания"}</div>

          <button
            className="button button--secondary admin-danger"
            type="button"
            disabled={isDeletePending}
            onClick={() => onDelete?.(post.id)}
          >
            {isDeletePending ? "..." : "Удалить пост"}
          </button>
        </div>
      </section>
    </>
  );
}

export function AdminPage({ navigate, routes }) {
  const [metrics, setMetrics] = useState(null);
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [comments, setComments] = useState([]);
  const [selectedPost, setSelectedPost] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [pendingKeys, setPendingKeys] = useState({});

  const handleAdminLogout = () => {
    clearToken();
    navigate(routes.login, { replace: true });
  };

  const loadAdminData = async () => {
    setLoading(true);
    setError("");
    try {
      const [nextMetrics, nextUsers, nextPosts, nextComments] = await Promise.all([
        api("/admin/metrics", { auth: true }),
        api("/admin/users", { auth: true }),
        api("/admin/posts", { auth: true }),
        api("/admin/comments", { auth: true }),
      ]);
      setMetrics(nextMetrics);
      setUsers(Array.isArray(nextUsers) ? nextUsers : []);
      setPosts(Array.isArray(nextPosts) ? nextPosts : []);
      setComments(Array.isArray(nextComments) ? nextComments : []);
      setSelectedPost((current) => {
        if (!current) {
          return current;
        }
        return (Array.isArray(nextPosts) ? nextPosts : []).find((post) => post.id === current.id) || null;
      });
    } catch (requestError) {
      if (requestError.status === 401 || requestError.status === 403) {
        clearToken();
        navigate(routes.adminLogin, { replace: true });
        return;
      }
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (getRole() !== "admin") {
      navigate(routes.adminLogin, { replace: true });
      return;
    }
    loadAdminData();
  }, [navigate, routes.adminLogin]);

  const withPending = async (key, action) => {
    if (pendingKeys[key]) {
      return;
    }

    setPendingKeys((current) => ({ ...current, [key]: true }));
    setError("");

    try {
      await action();
      await loadAdminData();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setPendingKeys((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
    }
  };

  return (
    <div className="admin-screen">
      <div className="ambient-backdrop" aria-hidden="true" />

      <div className="admin-frame">
        <header className="admin-topbar">
          <div>
            <div className="admin-topbar__title">Админ-панель</div>
            <div className="admin-topbar__subtitle">Управление пользователями, постами и комментариями</div>
          </div>

          <div className="admin-topbar__actions">
            <button className="button button--secondary" type="button" onClick={loadAdminData}>
              Обновить
            </button>
            <button className="button button--secondary" type="button" onClick={handleAdminLogout}>
              Выйти
            </button>
          </div>
        </header>

        {error ? <div className="feed-inline-error">{error}</div> : null}

        {loading ? (
          <div className="feed-state">
            <div className="feed-state__title">Загружаем админ-данные...</div>
          </div>
        ) : (
          <main className="admin-content">
            <section className="admin-section">
              <div className="admin-section__title">Метрики</div>
              <div className="admin-metrics">
                <MetricCard label="пользователи" value={metrics?.users_count ?? 0} />
                <MetricCard label="заблокированы" value={metrics?.blocked_users_count ?? 0} />
                <MetricCard label="посты" value={metrics?.posts_count ?? 0} />
                <MetricCard label="комментарии" value={metrics?.comments_count ?? 0} />
                <MetricCard label="лайки постов" value={metrics?.post_likes_count ?? 0} />
                <MetricCard label="лайки комментариев" value={metrics?.comment_likes_count ?? 0} />
              </div>
            </section>

            <section className="admin-section">
              <div className="admin-section__title">Пользователи</div>
              <div className="admin-table">
                {users.map((user) => (
                  <div key={user.id} className="admin-row">
                    <div className="admin-row__main">
                      <div className="admin-row__title">
                        @{user.username} {user.is_blocked ? "(заблокирован)" : ""}
                      </div>
                      <div className="admin-row__meta">
                        {user.full_name} • {user.email} • посты: {user.posts_count} • комментарии: {user.comments_count}
                      </div>
                    </div>

                    <button
                      className="button button--secondary"
                      type="button"
                      disabled={Boolean(pendingKeys[`user-${user.id}`])}
                      onClick={() =>
                        withPending(`user-${user.id}`, () =>
                          api(`/admin/users/${user.id}/${user.is_blocked ? "unblock" : "block"}`, {
                            method: "POST",
                            auth: true,
                          }),
                        )
                      }
                    >
                      {user.is_blocked ? "Разблокировать" : "Заблокировать"}
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <section className="admin-section">
              <div className="admin-section__title">Посты</div>
              <div className="admin-table">
                {posts.map((post) => (
                  <div key={post.id} className="admin-row admin-row--interactive" onClick={() => setSelectedPost(post)} role="button" tabIndex={0}>
                    <div className="admin-row__main">
                      <div className="admin-row__title">Пост #{post.id} от @{post.username}</div>
                      <div className="admin-row__meta">
                        лайки: {post.likes_count} • комментарии: {post.comments_count}
                      </div>
                      <div className="admin-row__body admin-row__body--clamped">{post.caption || "Без описания"}</div>
                    </div>

                    <button
                      className="button button--secondary admin-danger"
                      type="button"
                      disabled={Boolean(pendingKeys[`post-${post.id}`])}
                      onClick={(event) => {
                        event.stopPropagation();
                        withPending(`post-${post.id}`, () =>
                          api(`/admin/posts/${post.id}`, {
                            method: "DELETE",
                            auth: true,
                          }),
                        );
                      }}
                    >
                      Удалить пост
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <section className="admin-section">
              <div className="admin-section__title">Комментарии</div>
              <div className="admin-table">
                {comments.map((comment) => (
                  <div key={comment.id} className="admin-row">
                    <div className="admin-row__main">
                      <div className="admin-row__title">Комментарий #{comment.id} от @{comment.username}</div>
                      <div className="admin-row__meta">
                        пост: {comment.post_id} • ответов: {comment.replies_count}
                      </div>
                      <div className="admin-row__body">{comment.body}</div>
                    </div>

                    <button
                      className="button button--secondary admin-danger"
                      type="button"
                      disabled={Boolean(pendingKeys[`comment-${comment.id}`])}
                      onClick={() =>
                        withPending(`comment-${comment.id}`, () =>
                          api(`/admin/comments/${comment.id}`, {
                            method: "DELETE",
                            auth: true,
                          }),
                        )
                      }
                    >
                      Удалить комментарий
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </main>
        )}
      </div>

      <AdminPostModal
        post={selectedPost}
        open={Boolean(selectedPost)}
        isDeletePending={Boolean(selectedPost && pendingKeys[`post-${selectedPost.id}`])}
        onClose={() => setSelectedPost(null)}
        onDelete={(postId) =>
          withPending(`post-${postId}`, () =>
            api(`/admin/posts/${postId}`, {
              method: "DELETE",
              auth: true,
            }),
          ).then(() => setSelectedPost(null))
        }
      />
    </div>
  );
}
