SELECT pg_catalog.setval('public.comment_likes_id_seq', 2, true);


--
-- Name: comments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.comments_id_seq', 22, true);


--
-- Name: follows_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.follows_id_seq', 4, true);


--
-- Name: likes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.likes_id_seq', 1, false);


--
-- Name: post_likes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.post_likes_id_seq', 19, true);


--
-- Name: posts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.posts_id_seq', 10, true);


--
-- Name: subscriptions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.subscriptions_id_seq', 1, false);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_id_seq', 12, true);


--
-- Name: comment_likes comment_likes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comment_likes
    ADD CONSTRAINT comment_likes_pkey PRIMARY KEY (id);


--
-- Name: comments comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_pkey PRIMARY KEY (id);


--
-- Name: follows follows_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.follows
    ADD CONSTRAINT follows_pkey PRIMARY KEY (id);


--
-- Name: likes likes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.likes
    ADD CONSTRAINT likes_pkey PRIMARY KEY (id);


--
-- Name: post_likes post_likes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_likes
    ADD CONSTRAINT post_likes_pkey PRIMARY KEY (id);


--
-- Name: posts posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: ix_comment_likes_comment_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_comment_likes_comment_id ON public.comment_likes USING btree (comment_id);


--
-- Name: ix_comment_likes_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_comment_likes_id ON public.comment_likes USING btree (id);


--
-- Name: ix_comment_likes_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_comment_likes_user_id ON public.comment_likes USING btree (user_id);


--
-- Name: ix_comments_author_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_comments_author_id ON public.comments USING btree (author_id);


--
-- Name: ix_comments_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_comments_created_at ON public.comments USING btree (created_at);


--
-- Name: ix_comments_parent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_comments_parent_id ON public.comments USING btree (parent_id);


--
-- Name: ix_comments_post_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_comments_post_id ON public.comments USING btree (post_id);


--
-- Name: ix_comments_reply_to_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_comments_reply_to_user_id ON public.comments USING btree (reply_to_user_id);


--
-- Name: ix_follows_follower_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_follows_follower_id ON public.follows USING btree (follower_id);


--
-- Name: ix_follows_following_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_follows_following_id ON public.follows USING btree (following_id);


--
-- Name: ix_follows_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_follows_id ON public.follows USING btree (id);


--
-- Name: ix_post_likes_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_post_likes_id ON public.post_likes USING btree (id);


--
-- Name: ix_post_likes_post_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_post_likes_post_id ON public.post_likes USING btree (post_id);


--
-- Name: ix_post_likes_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_post_likes_user_id ON public.post_likes USING btree (user_id);


--
-- Name: ix_posts_author_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_posts_author_id ON public.posts USING btree (author_id);


--
-- Name: ix_posts_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_posts_created_at ON public.posts USING btree (created_at);


--
-- Name: ix_posts_delete_scheduled_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_posts_delete_scheduled_at ON public.posts USING btree (delete_scheduled_at);


--
-- Name: uq_comment_likes_comment_user; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_comment_likes_comment_user ON public.comment_likes USING btree (comment_id, user_id);


--
-- Name: uq_follows_follower_following; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_follows_follower_following ON public.follows USING btree (follower_id, following_id);


--
-- Name: uq_post_likes_post_user; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_post_likes_post_user ON public.post_likes USING btree (post_id, user_id);


--
-- Name: comment_likes comment_likes_comment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comment_likes
    ADD CONSTRAINT comment_likes_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES public.comments(id) ON DELETE CASCADE;


--
-- Name: comment_likes comment_likes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comment_likes
    ADD CONSTRAINT comment_likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: comments comments_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- Name: comments comments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: follows follows_follower_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.follows
    ADD CONSTRAINT follows_follower_id_fkey FOREIGN KEY (follower_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: follows follows_following_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.follows
    ADD CONSTRAINT follows_following_id_fkey FOREIGN KEY (following_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: likes likes_comment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.likes
    ADD CONSTRAINT likes_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES public.comments(id) ON DELETE CASCADE;


--
-- Name: likes likes_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.likes
    ADD CONSTRAINT likes_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- Name: likes likes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.likes
    ADD CONSTRAINT likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: post_likes post_likes_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_likes
    ADD CONSTRAINT post_likes_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- Name: post_likes post_likes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_likes
    ADD CONSTRAINT post_likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: posts posts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: subscriptions subscriptions_follower_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_follower_id_fkey FOREIGN KEY (follower_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: subscriptions subscriptions_following_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_following_id_fkey FOREIGN KEY (following_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

