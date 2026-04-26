COPY public.comment_likes (id, comment_id, user_id, created_at) FROM stdin;
1	11	7	2026-04-14 10:15:47.813197+05
2	11	11	2026-04-14 18:35:30.350135+05
\.


--
-- Data for Name: comments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.comments (id, post_id, user_id, text, likes_count, is_deleted, author_id, parent_id, body, created_at, reply_to_user_id) FROM stdin;
10	8	\N	\N	0	f	7	\N	Красивая машина	2026-04-14 10:15:32.5288+05	\N
11	8	\N	\N	0	f	7	10	сыкс сееевен	2026-04-14 10:15:41.179834+05	\N
18	9	\N	\N	0	f	12	\N	Классная схема	2026-04-14 18:39:06.380438+05	\N
19	9	\N	\N	0	f	11	18	привет как дела	2026-04-21 10:38:38.376568+05	\N
20	9	\N	\N	0	f	11	\N	Хорошая схема Ивашко будет рад	2026-04-21 10:38:54.713454+05	\N
21	9	\N	\N	0	f	11	18	Супер делаешь	2026-04-21 10:39:06.962698+05	\N
22	9	\N	\N	0	f	11	18	4к4 д5лкаъ	2026-04-21 10:47:54.51218+05	12
\.


--
-- Data for Name: follows; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.follows (id, follower_id, following_id, created_at) FROM stdin;
2	11	12	2026-04-21 10:37:51.341222+05
3	11	10	2026-04-21 10:38:08.553721+05
4	11	9	2026-04-21 10:48:16.407969+05
\.


--
-- Data for Name: likes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.likes (id, user_id, post_id, comment_id, reaction_type) FROM stdin;
\.


--
-- Data for Name: post_likes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.post_likes (id, post_id, user_id, created_at) FROM stdin;
3	5	7	2026-03-30 11:19:52.959835+05
4	5	10	2026-03-30 11:21:05.793585+05
7	7	10	2026-03-30 17:58:11.923184+05
13	7	7	2026-04-14 09:55:55.824297+05
14	8	7	2026-04-14 09:55:58.275683+05
15	7	11	2026-04-14 18:23:45.859805+05
16	8	11	2026-04-14 18:23:47.48424+05
17	9	12	2026-04-14 18:38:56.117068+05
18	9	11	2026-04-21 10:47:59.630739+05
\.


--
-- Data for Name: posts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.posts (id, user_id, content_type, caption, location, likes_count, comments_count, is_deleted, author_id, image_path, created_at, delete_scheduled_at) FROM stdin;
5	7	\N	Хорошо заставка экрана	\N	0	0	f	7	uploads/f27038d196da458a8c7d87b58f07e68a.png	2026-03-09 20:15:25.384042+05	\N
6	7	\N	Необычная машина банан	\N	0	0	f	7	uploads/20b0d402681b4380a05fbd055f3c1851.jpg	2026-03-10 09:18:56.465961+05	\N
7	9	\N	додж отличный автомобиль	\N	0	0	f	9	uploads/6a474adb0dff46d5a619335b69e391aa.webp	2026-03-10 09:20:48.123413+05	\N
8	10	\N		\N	0	0	f	10	uploads/b625f858ca524a93bad10788e3241b90.webp	2026-03-30 17:58:46.439808+05	\N
9	12	\N	Приммер	\N	0	0	f	12	uploads/c912b017ecaa4ccbb47cdb3aebd8f3f6.png	2026-04-14 18:38:49.858798+05	\N
\.


--
-- Data for Name: subscriptions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.subscriptions (id, follower_id, following_id) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, username, email, password_hash, full_name, followers_count, following_count, avatar_path, is_blocked) FROM stdin;
1	test_user_999	test999@mail.com	DEBUG_HASH_123456	Test User	0	0	\N	0
2	test_user_1001	test1001@mail.com	$2b$12$Bffc2iLIQGswU8zihxVIde8KvZt6UAUPagFF0AAo6XjvJBo5Y6HTe	Test User	0	0	\N	0
3	chotko	user12123@example.com	$2b$12$3XyfUtT2QlYWPLIZ1GhiR.2qb7kgZvLQSopQUYN6KqHs0h3Lmfeii	Andrey	0	0	\N	0
4	chotko12	user11122@example.com	$2b$12$BBKZN3J/p83F84JEicz7aeoa6TOsm9faIBiRm1Cqr4f892kAt.iFu	anton	0	0	\N	0
5	frozaxx	andrey@google.com	57030001347c9ba3a9db17a07fae8e629b78d2295cf63a19a30d15de739e969e	Andrey	0	0	\N	0
6	andrey	andrey.laptev.2004@mail.ru	5994471abb01112afcc18159f6cc74b4f511b99806da59b3caf5a9c173cacfc5	Андрей	0	0	\N	0
11	andrey12345	andrey.xam.200@mail.ru	5994471abb01112afcc18159f6cc74b4f511b99806da59b3caf5a9c173cacfc5	Fly	0	3	uploads/avatars/f32ba9a82d624f47851cc0dcb598ad7d.png	1
9	frozaxxx	andrey.laptev1221@mail.ru	5994471abb01112afcc18159f6cc74b4f511b99806da59b3caf5a9c173cacfc5	Андрей Петров	1	0	\N	0
10	frozaxxxxx	andrey.lapteva.2004@mail.ru	5994471abb01112afcc18159f6cc74b4f511b99806da59b3caf5a9c173cacfc5	андрей лаптев	1	0	uploads/avatars/cff57ddb4eef4937a700efb291f1b1c7.png	0
12	andrey45	andrey.laptev.2012@mail.ru	5994471abb01112afcc18159f6cc74b4f511b99806da59b3caf5a9c173cacfc5	andrey	1	0	\N	0
7	andrey1	andrey.laptev228228@gmail.com	5994471abb01112afcc18159f6cc74b4f511b99806da59b3caf5a9c173cacfc5	андрей Лаптев	0	0	uploads/avatars/989a00212ffc40ef8801d332f1818769.png	0
\.


--
-- Name: comment_likes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

