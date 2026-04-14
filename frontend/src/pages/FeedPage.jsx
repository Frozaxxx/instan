import { useEffect, useState } from "react";

import { AvatarCropModal } from "../components/AvatarCropModal.jsx";
import { CreatePostModal } from "../components/CreatePostModal.jsx";
import { PostCard } from "../components/PostCard.jsx";
import { ProfileDrawer } from "../components/ProfileDrawer.jsx";
import { api } from "../lib/api.js";

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

export function FeedPage({ navigate, routes, onLogout }) {
  const [me, setMe] = useState(null);
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [feedError, setFeedError] = useState("");
  const [interactionError, setInteractionError] = useState("");
  const [pendingLikeIds, setPendingLikeIds] = useState({});
  const [pendingCommentPostIds, setPendingCommentPostIds] = useState({});
  const [pendingReplyIds, setPendingReplyIds] = useState({});
  const [pendingCommentLikeIds, setPendingCommentLikeIds] = useState({});
  const [pendingCommentDeleteIds, setPendingCommentDeleteIds] = useState({});

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [profileExpanded, setProfileExpanded] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [caption, setCaption] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [postError, setPostError] = useState("");
  const [isPosting, setIsPosting] = useState(false);

  const [avatarEditorOpen, setAvatarEditorOpen] = useState(false);
  const [avatarDraftUrl, setAvatarDraftUrl] = useState("");
  const [avatarError, setAvatarError] = useState("");
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);

  const releasePostPreview = () => {
    setPreviewUrl((currentUrl) => {
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl);
      }
      return "";
    });
  };

  const releaseAvatarDraft = () => {
    setAvatarDraftUrl((currentUrl) => {
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl);
      }
      return "";
    });
  };

  const resetComposer = () => {
    setCaption("");
    setSelectedFile(null);
    setPostError("");
    releasePostPreview();
  };

  const closeAvatarEditor = () => {
    setAvatarEditorOpen(false);
    setAvatarError("");
    releaseAvatarDraft();
  };

  const handleUnauthorized = () => {
    onLogout();
  };

  const refreshPosts = async () => {
    try {
      const feedItems = await api("/posts", { auth: true });
      setPosts(Array.isArray(feedItems) ? feedItems : []);
      setFeedError("");
      setInteractionError("");
    } catch (requestError) {
      if (requestError.status === 401) {
        handleUnauthorized();
        return;
      }

      setFeedError(requestError.message);
    }
  };

  const updatePostLikeState = (postId, nextLikeState) => {
    setPosts((currentPosts) =>
      currentPosts.map((post) =>
        post.id === postId
          ? {
              ...post,
              likes_count: nextLikeState.likes_count,
              liked_by_me: nextLikeState.liked_by_me,
            }
          : post,
      ),
    );
  };

  const appendComment = (comments, nextComment) =>
    comments.map((comment) =>
      comment.id === nextComment.parent_id
        ? {
            ...comment,
            replies: [...(comment.replies || []), nextComment],
          }
        : {
            ...comment,
            replies: appendComment(comment.replies || [], nextComment),
          },
    );

  const updateCommentLike = (comments, nextLikeState) =>
    comments.map((comment) => ({
      ...comment,
      likes_count: comment.id === nextLikeState.comment_id ? nextLikeState.likes_count : comment.likes_count,
      liked_by_me: comment.id === nextLikeState.comment_id ? nextLikeState.liked_by_me : comment.liked_by_me,
      replies: updateCommentLike(comment.replies || [], nextLikeState),
    }));

  const removeComments = (comments, deletedCommentIds) =>
    comments
      .filter((comment) => !deletedCommentIds.has(comment.id))
      .map((comment) => ({
        ...comment,
        replies: removeComments(comment.replies || [], deletedCommentIds),
      }));

  const addCommentToPost = (postId, nextComment) => {
    setPosts((currentPosts) =>
      currentPosts.map((post) => {
        if (post.id !== postId) {
          return post;
        }

        const comments = Array.isArray(post.comments) ? post.comments : [];
        const nextComments = nextComment.parent_id ? appendComment(comments, nextComment) : [...comments, nextComment];

        return {
          ...post,
          comments: nextComments,
          comments_count: (Number(post.comments_count) || 0) + 1,
        };
      }),
    );
  };

  const updateCommentLikeState = (nextLikeState) => {
    setPosts((currentPosts) =>
      currentPosts.map((post) => ({
        ...post,
        comments: updateCommentLike(post.comments || [], nextLikeState),
      })),
    );
  };

  const deleteCommentsFromPost = (nextDeleteState) => {
    const deletedCommentIds = new Set(nextDeleteState.deleted_comment_ids || []);

    setPosts((currentPosts) =>
      currentPosts.map((post) =>
        post.id === nextDeleteState.post_id
          ? {
              ...post,
              comments: removeComments(post.comments || [], deletedCommentIds),
              comments_count: nextDeleteState.comments_count,
            }
          : post,
      ),
    );
  };

  useEffect(() => {
    let active = true;

    const loadFeed = async () => {
      setIsLoading(true);

      try {
        const [profile, feedItems] = await Promise.all([
          api("/me", { auth: true }),
          api("/posts", { auth: true }),
        ]);

        if (!active) {
          return;
        }

        setMe(profile);
        setPosts(Array.isArray(feedItems) ? feedItems : []);
        setFeedError("");
        setInteractionError("");
      } catch (requestError) {
        if (!active) {
          return;
        }

        if (requestError.status === 401) {
          handleUnauthorized();
          return;
        }

        setFeedError(requestError.message);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    loadFeed();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    return () => {
      if (avatarDraftUrl) {
        URL.revokeObjectURL(avatarDraftUrl);
      }
    };
  }, [avatarDraftUrl]);

  const closeComposer = () => {
    setModalOpen(false);
    resetComposer();
  };

  const openComposer = () => {
    setDrawerOpen(false);
    setModalOpen(true);
  };

  const handlePostFileChange = (file) => {
    setPostError("");

    if (!file) {
      setSelectedFile(null);
      releasePostPreview();
      return;
    }

    if (!file.type.startsWith("image/")) {
      setSelectedFile(null);
      releasePostPreview();
      setPostError("Нужен файл изображения.");
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setSelectedFile(null);
      releasePostPreview();
      setPostError("Изображение должно быть не больше 10 МБ.");
      return;
    }

    setSelectedFile(file);
    setPreviewUrl((currentUrl) => {
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl);
      }
      return URL.createObjectURL(file);
    });
  };

  const handleAvatarSelect = (file) => {
    setAvatarError("");

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setAvatarError("Для аватарки нужен файл изображения.");
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setAvatarError("Файл аватарки должен быть не больше 10 МБ.");
      return;
    }

    setAvatarDraftUrl((currentUrl) => {
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl);
      }
      return URL.createObjectURL(file);
    });
    setAvatarEditorOpen(true);
  };

  const handleCreatePost = async (event) => {
    event.preventDefault();

    if (!selectedFile) {
      setPostError("Добавь изображение перед публикацией.");
      return;
    }

    const formData = new FormData();
    formData.append("image", selectedFile);
    formData.append("caption", caption);

    setPostError("");
    setIsPosting(true);

    try {
      await api("/posts", {
        method: "POST",
        body: formData,
        auth: true,
      });

      closeComposer();
      await refreshPosts();
    } catch (requestError) {
      if (requestError.status === 401) {
        handleUnauthorized();
        return;
      }

      setPostError(requestError.message);
    } finally {
      setIsPosting(false);
    }
  };

  const handleSaveAvatar = async (avatarBlob) => {
    const formData = new FormData();
    formData.append("avatar", new File([avatarBlob], "avatar.png", { type: "image/png" }));

    setAvatarError("");
    setIsAvatarUploading(true);

    try {
      const updatedProfile = await api("/me/avatar", {
        method: "POST",
        body: formData,
        auth: true,
      });

      setMe(updatedProfile);
      await refreshPosts();
      closeAvatarEditor();
    } catch (requestError) {
      if (requestError.status === 401) {
        handleUnauthorized();
        return;
      }

      setAvatarError(requestError.message);
    } finally {
      setIsAvatarUploading(false);
    }
  };

  const handleLikeToggle = async (postId, likedByMe) => {
    if (pendingLikeIds[postId]) {
      return;
    }

    setInteractionError("");
    setPendingLikeIds((current) => ({
      ...current,
      [postId]: true,
    }));

    try {
      const nextLikeState = await api(`/posts/${postId}/like`, {
        method: likedByMe ? "DELETE" : "POST",
        auth: true,
      });

      updatePostLikeState(postId, nextLikeState);
    } catch (requestError) {
      if (requestError.status === 401) {
        handleUnauthorized();
        return;
      }

      setInteractionError(requestError.message);
    } finally {
      setPendingLikeIds((current) => {
        const nextState = { ...current };
        delete nextState[postId];
        return nextState;
      });
    }
  };

  const handleCommentSubmit = async (postId, body, parentId = null) => {
    const pendingKey = parentId ?? postId;
    const isReply = parentId !== null;
    const pendingState = isReply ? pendingReplyIds : pendingCommentPostIds;

    if (pendingState[pendingKey]) {
      return false;
    }

    setInteractionError("");
    const setPendingState = isReply ? setPendingReplyIds : setPendingCommentPostIds;
    setPendingState((current) => ({
      ...current,
      [pendingKey]: true,
    }));

    try {
      const nextComment = await api(`/posts/${postId}/comments`, {
        method: "POST",
        body: {
          body,
          parent_id: parentId,
        },
        auth: true,
      });

      addCommentToPost(postId, nextComment);
      return true;
    } catch (requestError) {
      if (requestError.status === 401) {
        handleUnauthorized();
        return false;
      }

      setInteractionError(requestError.message);
      return false;
    } finally {
      setPendingState((current) => {
        const nextState = { ...current };
        delete nextState[pendingKey];
        return nextState;
      });
    }
  };

  const handleCommentLikeToggle = async (commentId, likedByMe) => {
    if (pendingCommentLikeIds[commentId]) {
      return;
    }

    setInteractionError("");
    setPendingCommentLikeIds((current) => ({
      ...current,
      [commentId]: true,
    }));

    try {
      const nextLikeState = await api(`/comments/${commentId}/like`, {
        method: likedByMe ? "DELETE" : "POST",
        auth: true,
      });

      updateCommentLikeState(nextLikeState);
    } catch (requestError) {
      if (requestError.status === 401) {
        handleUnauthorized();
        return;
      }

      setInteractionError(requestError.message);
    } finally {
      setPendingCommentLikeIds((current) => {
        const nextState = { ...current };
        delete nextState[commentId];
        return nextState;
      });
    }
  };

  const handleCommentDelete = async (commentId) => {
    if (pendingCommentDeleteIds[commentId]) {
      return;
    }

    setInteractionError("");
    setPendingCommentDeleteIds((current) => ({
      ...current,
      [commentId]: true,
    }));

    try {
      const nextDeleteState = await api(`/comments/${commentId}`, {
        method: "DELETE",
        auth: true,
      });

      deleteCommentsFromPost(nextDeleteState);
    } catch (requestError) {
      if (requestError.status === 401) {
        handleUnauthorized();
        return;
      }

      setInteractionError(requestError.message);
    } finally {
      setPendingCommentDeleteIds((current) => {
        const nextState = { ...current };
        delete nextState[commentId];
        return nextState;
      });
    }
  };

  const renderFeedState = () => {
    if (isLoading) {
      return (
        <div className="feed-state">
          <div className="feed-state__title">Загружаем ленту...</div>
          <div className="feed-state__text">Получаем профиль, посты и медиафайлы.</div>
        </div>
      );
    }

    if (feedError) {
      return (
        <div className="feed-state feed-state--error">
          <div className="feed-state__title">Не удалось загрузить ленту</div>
          <div className="feed-state__text">{feedError}</div>
          <button className="button button--secondary" type="button" onClick={refreshPosts}>
            Повторить
          </button>
        </div>
      );
    }

    if (posts.length === 0) {
      return (
        <div className="feed-state">
          <div className="feed-state__title">Пока пусто</div>
          <div className="feed-state__text">Нажми на кнопку добавления и опубликуй первый пост.</div>
        </div>
      );
    }

    return posts.map((post) => (
      <PostCard
        key={post.id}
        post={post}
        isLikePending={Boolean(pendingLikeIds[post.id])}
        isCommentPending={Boolean(pendingCommentPostIds[post.id])}
        pendingCommentLikeIds={pendingCommentLikeIds}
        pendingReplyIds={pendingReplyIds}
        pendingCommentDeleteIds={pendingCommentDeleteIds}
        onLikeToggle={handleLikeToggle}
        onCommentSubmit={handleCommentSubmit}
        onCommentLikeToggle={handleCommentLikeToggle}
        onCommentDelete={handleCommentDelete}
      />
    ));
  };

  const avatarFeedback = isAvatarUploading ? "Сохраняем аватар..." : avatarError;

  return (
    <div className="feed-screen">
      <div className="ambient-backdrop" aria-hidden="true" />

      <div className="feed-frame">
        <header className="topbar">
          <button className="brand-button" type="button" onClick={() => navigate(routes.feed, { replace: true })}>
            instan
          </button>
          <div className="topbar__meta">@{me?.username || "user"}</div>
        </header>

        {interactionError ? <div className="feed-inline-error">{interactionError}</div> : null}

        <main className="feed-list">{renderFeedState()}</main>

        <nav className="bottom-nav" aria-label="Основная навигация">
          <button className="bottom-nav__button" type="button" onClick={openComposer}>
            + Пост
          </button>
          <button className="bottom-nav__button" type="button" onClick={() => setDrawerOpen(true)}>
            Профиль
          </button>
        </nav>
      </div>

      <ProfileDrawer
        me={me}
        open={drawerOpen}
        postCount={posts.length}
        profileExpanded={profileExpanded}
        avatarFeedback={avatarFeedback}
        isAvatarUploading={isAvatarUploading}
        onAvatarSelect={handleAvatarSelect}
        onClose={() => setDrawerOpen(false)}
        onToggleProfile={() => setProfileExpanded((current) => !current)}
        onLogout={onLogout}
      />

      <CreatePostModal
        open={modalOpen}
        caption={caption}
        previewUrl={previewUrl}
        error={postError}
        isSubmitting={isPosting}
        onCaptionChange={setCaption}
        onClose={closeComposer}
        onFileChange={handlePostFileChange}
        onSubmit={handleCreatePost}
      />

      <AvatarCropModal
        open={avatarEditorOpen}
        sourceUrl={avatarDraftUrl}
        error={avatarError}
        isSubmitting={isAvatarUploading}
        onClose={closeAvatarEditor}
        onSave={handleSaveAvatar}
      />
    </div>
  );
}
