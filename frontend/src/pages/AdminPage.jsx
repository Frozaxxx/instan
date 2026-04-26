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

function formatChartDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) {
    return value;
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

function ActivityChart({ title, subtitle, points }) {
  const safePoints = Array.isArray(points) ? points.slice(-7) : [];
  const maxValue = safePoints.reduce((max, point) => Math.max(max, point.value || 0), 0);

  return (
    <section className="admin-chart-card">
      <div className="admin-chart-card__header">
        <div className="admin-chart-card__title">{title}</div>
        <div className="admin-chart-card__subtitle">{subtitle}</div>
      </div>

      {safePoints.length ? (
        <div className="admin-chart">
          {safePoints.map((point) => {
            const value = point.value || 0;
            const height = maxValue > 0 ? Math.max((value / maxValue) * 100, value > 0 ? 12 : 0) : 0;
            return (
              <div key={`${title}-${point.date}`} className="admin-chart__item">
                <div className="admin-chart__value">{value}</div>
                <div className="admin-chart__bar-shell">
                  <div className="admin-chart__bar" style={{ height: `${height}%` }} />
                </div>
                <div className="admin-chart__label">{formatChartDate(point.date)}</div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="admin-chart__empty">No data yet.</div>
      )}
    </section>
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
            {`\u041f\u043e\u0441\u0442 #${post.id} \u043e\u0442 @${post.username}`}
          </div>
          <button className="icon-button" type="button" aria-label={"Close post"} onClick={onClose}>
            ×
          </button>
        </header>

        <div className="admin-post-modal__body">
          <img
            className="admin-post-modal__image"
            src={resolveMediaUrl(post.image_url)}
            alt={`Post by ${post.username}`}
          />

          <div className="admin-post-modal__meta">
            <span>{`\u041b\u0430\u0439\u043a\u0438: ${post.likes_count}`}</span>
            <span>{`\u041a\u043e\u043c\u043c\u0435\u043d\u0442\u0430\u0440\u0438\u0438: ${post.comments_count}`}</span>
            <span>{new Date(post.created_at).toLocaleString("ru-RU")}</span>
          </div>

          <div className="admin-post-modal__caption">
            {post.caption || "\u0411\u0435\u0437 \u043e\u043f\u0438\u0441\u0430\u043d\u0438\u044f"}
          </div>

          <button
            className="button button--secondary admin-danger"
            type="button"
            disabled={isDeletePending}
            onClick={() => onDelete?.(post.id)}
          >
            {isDeletePending ? "..." : "\u0423\u0434\u0430\u043b\u0438\u0442\u044c \u043f\u043e\u0441\u0442"}
          </button>
        </div>
      </section>
    </>
  );
}

export function AdminPage({ navigate, routes }) {
  const [metrics, setMetrics] = useState(null);
  const [activity, setActivity] = useState({ posts_by_day: [], posting_users_by_day: [] });
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
      const [nextMetrics, nextActivity, nextUsers, nextPosts, nextComments] = await Promise.all([
        api("/admin/metrics", { auth: true }),
        api("/admin/activity", { auth: true }),
        api("/admin/users", { auth: true }),
        api("/admin/posts", { auth: true }),
        api("/admin/comments", { auth: true }),
      ]);

      setMetrics(nextMetrics);
      setActivity({
        posts_by_day: Array.isArray(nextActivity?.posts_by_day) ? nextActivity.posts_by_day : [],
        posting_users_by_day: Array.isArray(nextActivity?.posting_users_by_day) ? nextActivity.posting_users_by_day : [],
      });
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
            <div className="admin-topbar__title">{"\u0410\u0434\u043c\u0438\u043d-\u043f\u0430\u043d\u0435\u043b\u044c"}</div>
            <div className="admin-topbar__subtitle">
              {"\u0423\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u0438\u0435 \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044f\u043c\u0438, \u043f\u043e\u0441\u0442\u0430\u043c\u0438 \u0438 \u043a\u043e\u043c\u043c\u0435\u043d\u0442\u0430\u0440\u0438\u044f\u043c\u0438"}
            </div>
          </div>

          <div className="admin-topbar__actions">
            <button className="button button--secondary" type="button" onClick={loadAdminData}>
              {"\u041e\u0431\u043d\u043e\u0432\u0438\u0442\u044c"}
            </button>
            <button className="button button--secondary" type="button" onClick={handleAdminLogout}>
              {"\u0412\u044b\u0439\u0442\u0438"}
            </button>
          </div>
        </header>

        {error ? <div className="feed-inline-error">{error}</div> : null}

        {loading ? (
          <div className="feed-state">
            <div className="feed-state__title">
              {"\u0417\u0430\u0433\u0440\u0443\u0436\u0430\u0435\u043c \u0430\u0434\u043c\u0438\u043d-\u0434\u0430\u043d\u043d\u044b\u0435..."}
            </div>
          </div>
        ) : (
          <main className="admin-content">
            <section className="admin-section">
              <div className="admin-overview">
                <div className="admin-overview__metrics">
                  <div className="admin-section__title">{"\u041c\u0435\u0442\u0440\u0438\u043a\u0438"}</div>
                  <div className="admin-metrics">
                    <MetricCard label={"\u041f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u0438"} value={metrics?.users_count ?? 0} />
                    <MetricCard label={"\u0417\u0430\u0431\u043b\u043e\u043a\u0438\u0440\u043e\u0432\u0430\u043d\u044b"} value={metrics?.blocked_users_count ?? 0} />
                    <MetricCard label={"\u041f\u043e\u0441\u0442\u044b"} value={metrics?.posts_count ?? 0} />
                    <MetricCard label={"\u041a\u043e\u043c\u043c\u0435\u043d\u0442\u0430\u0440\u0438\u0438"} value={metrics?.comments_count ?? 0} />
                    <MetricCard label={"\u041b\u0430\u0439\u043a\u0438 \u043f\u043e\u0441\u0442\u043e\u0432"} value={metrics?.post_likes_count ?? 0} />
                    <MetricCard label={"\u041b\u0430\u0439\u043a\u0438 \u043a\u043e\u043c\u043c\u0435\u043d\u0442\u0430\u0440\u0438\u0435\u0432"} value={metrics?.comment_likes_count ?? 0} />
                  </div>
                </div>

                <aside className="admin-overview__charts">
                  <ActivityChart
                    title={"\u0410\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c \u043f\u043e\u0441\u0442\u043e\u0432"}
                    subtitle={"How many posts were published each day"}
                    points={activity.posts_by_day}
                  />
                  <ActivityChart
                    title={"\u0410\u0432\u0442\u043e\u0440\u044b \u043f\u043e\u0441\u0442\u043e\u0432"}
                    subtitle={"How many unique users published posts each day"}
                    points={activity.posting_users_by_day}
                  />
                </aside>
              </div>
            </section>

            <section className="admin-section">
              <div className="admin-section__title">{"\u041f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u0438"}</div>
              <div className="admin-table">
                {users.map((user) => (
                  <div key={user.id} className="admin-row">
                    <div className="admin-row__main">
                      <div className="admin-row__title">
                        @{user.username} {user.is_blocked ? `(${"\u0437\u0430\u0431\u043b\u043e\u043a\u0438\u0440\u043e\u0432\u0430\u043d"})` : ""}
                      </div>
                      <div className="admin-row__meta">
                        {`${user.full_name} • ${user.email} • ${"\u043f\u043e\u0441\u0442\u044b"}: ${user.posts_count} • ${"\u043a\u043e\u043c\u043c\u0435\u043d\u0442\u0430\u0440\u0438\u0438"}: ${user.comments_count}`}
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
                      {user.is_blocked
                        ? "\u0420\u0430\u0437\u0431\u043b\u043e\u043a\u0438\u0440\u043e\u0432\u0430\u0442\u044c"
                        : "\u0417\u0430\u0431\u043b\u043e\u043a\u0438\u0440\u043e\u0432\u0430\u0442\u044c"}
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <section className="admin-section">
              <div className="admin-section__title">{"\u041f\u043e\u0441\u0442\u044b"}</div>
              <div className="admin-table">
                {posts.map((post) => (
                  <div
                    key={post.id}
                    className="admin-row admin-row--interactive"
                    onClick={() => setSelectedPost(post)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="admin-row__main">
                      <div className="admin-row__title">{`\u041f\u043e\u0441\u0442 #${post.id} \u043e\u0442 @${post.username}`}</div>
                      <div className="admin-row__meta">
                        {`\u043b\u0430\u0439\u043a\u0438: ${post.likes_count} • \u043a\u043e\u043c\u043c\u0435\u043d\u0442\u0430\u0440\u0438\u0438: ${post.comments_count}`}
                      </div>
                      <div className="admin-row__body admin-row__body--clamped">
                        {post.caption || "\u0411\u0435\u0437 \u043e\u043f\u0438\u0441\u0430\u043d\u0438\u044f"}
                      </div>
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
                      {"\u0423\u0434\u0430\u043b\u0438\u0442\u044c \u043f\u043e\u0441\u0442"}
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <section className="admin-section">
              <div className="admin-section__title">{"\u041a\u043e\u043c\u043c\u0435\u043d\u0442\u0430\u0440\u0438\u0438"}</div>
              <div className="admin-table">
                {comments.map((comment) => (
                  <div key={comment.id} className="admin-row">
                    <div className="admin-row__main">
                      <div className="admin-row__title">{`\u041a\u043e\u043c\u043c\u0435\u043d\u0442\u0430\u0440\u0438\u0439 #${comment.id} \u043e\u0442 @${comment.username}`}</div>
                      <div className="admin-row__meta">
                        {`\u043f\u043e\u0441\u0442: ${comment.post_id} • \u043e\u0442\u0432\u0435\u0442\u043e\u0432: ${comment.replies_count}`}
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
                      {"\u0423\u0434\u0430\u043b\u0438\u0442\u044c \u043a\u043e\u043c\u043c\u0435\u043d\u0442\u0430\u0440\u0438\u0439"}
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
