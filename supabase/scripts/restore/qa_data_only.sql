SET session_replication_role = replica;

COPY auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, id) FROM stdin;
de892c1b-349d-4050-af72-e1c9c3099395	de892c1b-349d-4050-af72-e1c9c3099395	{"sub": "de892c1b-349d-4050-af72-e1c9c3099395", "email": "doughill1000@gmail.com", "email_verified": true, "phone_verified": false}	email	2025-09-17 04:22:26.972506+00	2025-09-17 04:22:26.972567+00	2025-09-17 04:22:26.972567+00	1a6d8031-edbd-4b12-b927-df46fbef9fe7
2c02017b-a9c4-4f38-917c-effb78305842	2c02017b-a9c4-4f38-917c-effb78305842	{"sub": "2c02017b-a9c4-4f38-917c-effb78305842", "email": "test1@test.com", "email_verified": false, "phone_verified": false}	email	2025-09-19 01:13:33.094141+00	2025-09-19 01:13:33.094207+00	2025-09-19 01:13:33.094207+00	24e331e1-bd56-4c6a-ab74-8c4c000312a3
90de745e-55e3-4261-946a-98741e5e3b9f	90de745e-55e3-4261-946a-98741e5e3b9f	{"sub": "90de745e-55e3-4261-946a-98741e5e3b9f", "email": "test3@test.com", "email_verified": false, "phone_verified": false}	email	2025-09-19 01:14:22.767063+00	2025-09-19 01:14:22.767117+00	2025-09-19 01:14:22.767117+00	d809cc67-2eb2-49bf-8430-28c976f9e953
fe9c2ab9-08e4-448f-a306-ecc2b0f9855e	fe9c2ab9-08e4-448f-a306-ecc2b0f9855e	{"sub": "fe9c2ab9-08e4-448f-a306-ecc2b0f9855e", "email": "test@test.com", "email_verified": false, "phone_verified": false}	email	2025-10-23 19:25:23.665317+00	2025-10-23 19:25:23.665381+00	2025-10-23 19:25:23.665381+00	3b8c92db-ef2c-4cc9-9a18-4b8092eb1302
\.
COPY auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, invited_at, confirmation_token, confirmation_sent_at, recovery_token, recovery_sent_at, email_change_token_new, email_change, email_change_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at, phone, phone_confirmed_at, phone_change, phone_change_token, phone_change_sent_at, email_change_token_current, email_change_confirm_status, banned_until, reauthentication_token, reauthentication_sent_at, is_sso_user, deleted_at, is_anonymous) FROM stdin;
00000000-0000-0000-0000-000000000000	2c02017b-a9c4-4f38-917c-effb78305842	authenticated	authenticated	test1@test.com	$2a$10$JTrdrzwpFc/kmY9brAGBde8YOkdezldcvpIFmJL5fHWCrrHqMWkKe	2025-09-19 01:13:33.116971+00	\N		\N		\N			\N	\N	{"provider": "email", "providers": ["email"]}	{"email_verified": true}	\N	2025-09-19 01:13:33.061247+00	2025-09-19 01:13:33.125949+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	90de745e-55e3-4261-946a-98741e5e3b9f	authenticated	authenticated	test3@test.com	$2a$10$j.wTi3w4Ur3VOnvqB2Sqs.5/eKn72qJUdMEwuVh2l/B1SD.jUX.d.	2025-09-19 01:14:22.772545+00	\N		\N		\N			\N	\N	{"provider": "email", "providers": ["email"]}	{"email_verified": true}	\N	2025-09-19 01:14:22.761781+00	2025-09-19 01:14:22.779115+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	de892c1b-349d-4050-af72-e1c9c3099395	authenticated	authenticated	doughill1000@gmail.com	$2a$10$CKgEGRRqnilOocRtR1VWLO./Qr4mmLCLRmGhwTX6biruvrFTtQKD.	2025-09-18 18:01:48.379372+00	2025-09-17 04:22:26.98037+00		\N	pkce_560daf605a6fd699456dc895a7faa0453314fdc4874f25f5d7d59c85	2025-12-21 17:45:55.602578+00			\N	2025-11-03 01:27:48.861901+00	{"role": "admin", "provider": "email", "providers": ["email"]}	{"email_verified": true}	\N	2025-09-17 04:22:26.95511+00	2025-12-21 17:45:55.900813+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	fe9c2ab9-08e4-448f-a306-ecc2b0f9855e	authenticated	authenticated	test@test.com	$2a$10$X3vv7Qp3ZrtGop4ls6Vn8.2VodNeK5ov/8rxA.IEr.dtwm872wfya	2025-10-23 19:25:23.672737+00	\N		\N		\N			\N	2025-10-23 19:26:43.317015+00	{"provider": "email", "providers": ["email"]}	{"email_verified": true}	\N	2025-10-23 19:25:23.653049+00	2025-10-23 19:26:43.318794+00	\N	\N			\N		0	\N		\N	f	\N	f
\.
COPY public.audit_log (id, actor, action, details, created_at) FROM stdin;
1	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	unlock_pick	{"weight": "M", "game_id": "7e68fe65-8ae9-4e71-ac41-ae6b9a3a7d62", "locked_at": "2025-09-11T23:26:55.499838+00:00", "locked_line_id": 49, "picked_team_id": 32, "locked_spread_value": 3, "locked_spread_team_id": 12}	2025-09-11 23:27:08.743861+00
2	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	unlock_pick	{"weight": "M", "game_id": "7e68fe65-8ae9-4e71-ac41-ae6b9a3a7d62", "locked_at": "2025-09-11T23:27:10.169727+00:00", "locked_line_id": 49, "picked_team_id": 12, "locked_spread_value": 3, "locked_spread_team_id": 12}	2025-09-11 23:27:11.252898+00
3	93abda42-cf85-4c5f-bd90-81210369b2dc	unlock_pick	{"weight": "M", "game_id": "a9ade8e0-8fb2-4c2b-917b-7191424388e7", "locked_at": "2025-09-14T11:31:35.342892+00:00", "locked_line_id": 53, "picked_team_id": 22, "locked_spread_value": 1.5, "locked_spread_team_id": 20}	2025-09-14 11:31:35.932186+00
4	93abda42-cf85-4c5f-bd90-81210369b2dc	unlock_pick	{"weight": "M", "game_id": "3cd1d025-e2d8-463e-80ef-6385fc746582", "locked_at": "2025-09-14T11:34:20.47556+00:00", "locked_line_id": 60, "picked_team_id": 14, "locked_spread_value": 2.5, "locked_spread_team_id": 10}	2025-09-14 11:34:22.602651+00
5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	unlock_pick	{"weight": "M", "game_id": "5635fb7e-2185-479c-90b1-b46de7a4f4b3", "locked_at": "2025-09-21T14:05:45.544529+00:00", "locked_line_id": 66, "picked_team_id": 2, "locked_spread_value": 4.5, "locked_spread_team_id": 2}	2025-09-21 14:05:46.780113+00
6	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	unlock_pick	{"weight": "L", "game_id": "5635fb7e-2185-479c-90b1-b46de7a4f4b3", "locked_at": "2025-09-21T14:05:48.22938+00:00", "locked_line_id": 66, "picked_team_id": 2, "locked_spread_value": 4.5, "locked_spread_team_id": 2}	2025-09-21 14:05:49.921825+00
7	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	unlock_pick	{"weight": "M", "game_id": "5635fb7e-2185-479c-90b1-b46de7a4f4b3", "locked_at": "2025-09-21T14:05:50.840067+00:00", "locked_line_id": 66, "picked_team_id": 2, "locked_spread_value": 4.5, "locked_spread_team_id": 2}	2025-09-21 14:05:52.175678+00
8	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	unlock_pick	{"weight": "M", "game_id": "0318ac4a-51fa-4197-9a58-d5a066c5c7cd", "locked_at": "2025-09-21T14:07:10.909562+00:00", "locked_line_id": 67, "picked_team_id": 7, "locked_spread_value": 3, "locked_spread_team_id": 21}	2025-09-21 14:07:13.957055+00
9	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	unlock_pick	{"weight": "M", "game_id": "f27eeec6-0e15-4c22-81c6-5c4b143adfe8", "locked_at": "2025-09-21T14:06:58.415188+00:00", "locked_line_id": 70, "picked_team_id": 32, "locked_spread_value": 3, "locked_spread_team_id": 32}	2025-09-21 14:07:15.453045+00
10	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	unlock_pick	{"weight": "M", "game_id": "0318ac4a-51fa-4197-9a58-d5a066c5c7cd", "locked_at": "2025-09-21T14:08:45.407559+00:00", "locked_line_id": 67, "picked_team_id": 21, "locked_spread_value": 3, "locked_spread_team_id": 21}	2025-09-21 14:08:46.16981+00
11	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	unlock_pick	{"weight": "M", "game_id": "2954f2b9-b9ae-4d88-8c86-1be1a49f6f8a", "locked_at": "2025-09-21T14:08:59.102869+00:00", "locked_line_id": 68, "picked_team_id": 8, "locked_spread_value": 7.5, "locked_spread_team_id": 12}	2025-09-21 14:08:59.986436+00
12	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	unlock_pick	{"weight": "H", "game_id": "31e6b9ac-abc1-402e-bed5-2961e9bc8a02", "locked_at": "2025-09-21T14:09:58.808545+00:00", "locked_line_id": 77, "picked_team_id": 6, "locked_spread_value": 1.5, "locked_spread_team_id": 9}	2025-09-21 14:10:02.946695+00
13	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	unlock_pick	{"weight": "L", "game_id": "5635fb7e-2185-479c-90b1-b46de7a4f4b3", "locked_at": "2025-09-21T14:10:35.570126+00:00", "locked_line_id": 66, "picked_team_id": 5, "locked_spread_value": 4.5, "locked_spread_team_id": 2}	2025-09-21 14:10:36.728907+00
14	93abda42-cf85-4c5f-bd90-81210369b2dc	unlock_pick	{"weight": "M", "game_id": "1211281f-ad14-48b6-86e4-a4eb98d667d0", "locked_at": "2025-09-21T14:18:08.578327+00:00", "locked_line_id": 74, "picked_team_id": 26, "locked_spread_value": 3.5, "locked_spread_team_id": 26}	2025-09-21 14:18:12.669902+00
15	b75858d9-3f6f-46b7-be49-6884b28493f6	unlock_pick	{"weight": "H", "game_id": "0318ac4a-51fa-4197-9a58-d5a066c5c7cd", "locked_at": "2025-09-21T14:26:03.113561+00:00", "locked_line_id": 67, "picked_team_id": 21, "locked_spread_value": 3, "locked_spread_team_id": 21}	2025-09-21 14:26:10.104122+00
16	b75858d9-3f6f-46b7-be49-6884b28493f6	unlock_pick	{"weight": "M", "game_id": "b92f4877-3642-4dad-8a58-cbbc33acaa27", "locked_at": "2025-09-21T14:27:58.113394+00:00", "locked_line_id": 72, "picked_team_id": 30, "locked_spread_value": 6.5, "locked_spread_team_id": 30}	2025-09-21 14:28:02.571805+00
17	b75858d9-3f6f-46b7-be49-6884b28493f6	unlock_pick	{"weight": "L", "game_id": "0ba7b515-e8f9-4a04-8790-990094e4c9cf", "locked_at": "2025-09-21T14:29:01.382771+00:00", "locked_line_id": 75, "picked_team_id": 18, "locked_spread_value": 3, "locked_spread_team_id": 18}	2025-09-21 14:29:07.502873+00
18	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	unlock_pick	{"weight": "L", "game_id": "0318ac4a-51fa-4197-9a58-d5a066c5c7cd", "locked_at": "2025-09-21T16:38:03.251766+00:00", "locked_line_id": 67, "picked_team_id": 7, "locked_spread_value": 3, "locked_spread_team_id": 21}	2025-09-21 16:38:51.272653+00
19	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	unlock_pick	{"weight": "L", "game_id": "31e6b9ac-abc1-402e-bed5-2961e9bc8a02", "locked_at": "2025-09-21T14:10:04.93568+00:00", "locked_line_id": 77, "picked_team_id": 6, "locked_spread_value": 1.5, "locked_spread_team_id": 9}	2025-09-21 20:22:34.761444+00
20	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	unlock_pick	{"weight": "L", "game_id": "a6646dac-f8d6-473f-96fc-0e711dd92011", "locked_at": "2025-09-21T14:10:22.485914+00:00", "locked_line_id": 80, "picked_team_id": 11, "locked_spread_value": 5.5, "locked_spread_team_id": 3}	2025-09-22 16:47:56.500273+00
21	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	unlock_pick	{"weight": "L", "game_id": "13a5b004-d94d-4fef-9586-6a0af5dfedec", "locked_at": "2025-09-28T01:31:56.365679+00:00", "locked_line_id": 118, "picked_team_id": 27, "locked_spread_value": 2.5, "locked_spread_team_id": 21}	2025-09-28 04:29:07.137706+00
22	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	unlock_pick	{"weight": "M", "game_id": "13a5b004-d94d-4fef-9586-6a0af5dfedec", "locked_at": "2025-09-28T04:29:10.08389+00:00", "locked_line_id": 118, "picked_team_id": 21, "locked_spread_value": 2.5, "locked_spread_team_id": 21}	2025-09-28 04:29:21.86592+00
23	93abda42-cf85-4c5f-bd90-81210369b2dc	unlock_pick	{"weight": "L", "game_id": "8417d24a-a09d-4f23-ab21-40f016ed3bd3", "locked_at": "2025-09-28T12:12:57.160086+00:00", "locked_line_id": 119, "picked_team_id": 11, "locked_spread_value": 9.5, "locked_spread_team_id": 11}	2025-09-28 12:12:58.301404+00
24	93abda42-cf85-4c5f-bd90-81210369b2dc	unlock_pick	{"weight": "M", "game_id": "8417d24a-a09d-4f23-ab21-40f016ed3bd3", "locked_at": "2025-09-28T12:13:02.734038+00:00", "locked_line_id": 119, "picked_team_id": 11, "locked_spread_value": 9.5, "locked_spread_team_id": 11}	2025-09-28 12:13:05.562603+00
25	93abda42-cf85-4c5f-bd90-81210369b2dc	unlock_pick	{"weight": "H", "game_id": "8417d24a-a09d-4f23-ab21-40f016ed3bd3", "locked_at": "2025-09-28T12:13:06.556096+00:00", "locked_line_id": 119, "picked_team_id": 11, "locked_spread_value": 9.5, "locked_spread_team_id": 11}	2025-09-28 12:13:14.504058+00
26	93abda42-cf85-4c5f-bd90-81210369b2dc	unlock_pick	{"weight": "M", "game_id": "8417d24a-a09d-4f23-ab21-40f016ed3bd3", "locked_at": "2025-09-28T12:13:26.843367+00:00", "locked_line_id": 119, "picked_team_id": 11, "locked_spread_value": 9.5, "locked_spread_team_id": 11}	2025-09-28 12:13:36.633671+00
27	93abda42-cf85-4c5f-bd90-81210369b2dc	unlock_pick	{"weight": "M", "game_id": "0efcb2cd-b1dd-46bd-bc97-4b1af61b2154", "locked_at": "2025-09-28T12:14:45.132085+00:00", "locked_line_id": 131, "picked_team_id": 20, "locked_spread_value": 2.5, "locked_spread_team_id": 20}	2025-09-28 12:14:47.334977+00
28	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	unlock_pick	{"weight": "H", "game_id": "2b45efe0-31db-4e09-868e-5ab5549e0b0a", "locked_at": "2025-09-23T12:58:27.617155+00:00", "locked_line_id": 120, "picked_team_id": 32, "locked_spread_value": 2.5, "locked_spread_team_id": 32}	2025-09-28 14:09:02.222886+00
29	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	unlock_pick	{"weight": "M", "game_id": "a72be0b6-d553-4389-aee5-8c2fd70c58cc", "locked_at": "2025-09-28T15:11:27.779284+00:00", "locked_line_id": 128, "picked_team_id": 3, "locked_spread_value": 2.5, "locked_spread_team_id": 3}	2025-09-28 15:11:29.51436+00
30	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	unlock_pick	{"weight": "H", "game_id": "49a0b7ea-6fc3-45d1-848a-6b0e079f13a2", "locked_at": "2025-09-28T14:28:07.815549+00:00", "locked_line_id": 124, "picked_team_id": 24, "locked_spread_value": 6.5, "locked_spread_team_id": 18}	2025-09-28 15:13:21.18435+00
31	b75858d9-3f6f-46b7-be49-6884b28493f6	unlock_pick	{"weight": "L", "game_id": "49a0b7ea-6fc3-45d1-848a-6b0e079f13a2", "locked_at": "2025-09-28T15:27:07.626503+00:00", "locked_line_id": 124, "picked_team_id": 18, "locked_spread_value": 6.5, "locked_spread_team_id": 18}	2025-09-28 15:27:11.912836+00
32	61183ed6-88ce-418b-8bdf-f16c57a350f7	unlock_pick	{"weight": "M", "game_id": "380e817d-fcde-418f-9eb1-a97bb993e03e", "locked_at": "2025-10-03T00:11:40.063507+00:00", "locked_line_id": 192, "picked_team_id": 10, "locked_spread_value": 4.5, "locked_spread_team_id": 26}	2025-10-03 00:11:40.643162+00
33	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	unlock_pick	{"weight": "M", "game_id": "0b349bf3-4672-4285-9a9a-8330f11f8c22", "locked_at": "2025-10-05T01:36:49.630557+00:00", "locked_line_id": 194, "picked_team_id": 24, "locked_spread_value": 1.5, "locked_spread_team_id": 23}	2025-10-05 01:36:52.863953+00
34	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	unlock_pick	{"weight": "L", "game_id": "8d1ac3c2-a669-4274-9d81-20e1f51b9bae", "locked_at": "2025-10-05T01:40:19.306825+00:00", "locked_line_id": 199, "picked_team_id": 4, "locked_spread_value": 8.5, "locked_spread_team_id": 4}	2025-10-05 01:40:21.996218+00
35	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	unlock_pick	{"weight": "M", "game_id": "ebba52ce-db32-4ea8-909d-eaf8c90105be", "locked_at": "2025-10-05T01:37:21.433654+00:00", "locked_line_id": 204, "picked_team_id": 17, "locked_spread_value": 7, "locked_spread_team_id": 14}	2025-10-05 13:44:08.12321+00
36	93abda42-cf85-4c5f-bd90-81210369b2dc	unlock_pick	{"weight": "L", "game_id": "0b349bf3-4672-4285-9a9a-8330f11f8c22", "locked_at": "2025-10-05T13:46:09.86828+00:00", "locked_line_id": 194, "picked_team_id": 23, "locked_spread_value": 1.5, "locked_spread_team_id": 23}	2025-10-05 13:46:11.832682+00
37	93abda42-cf85-4c5f-bd90-81210369b2dc	unlock_pick	{"weight": "L", "game_id": "0b349bf3-4672-4285-9a9a-8330f11f8c22", "locked_at": "2025-10-05T13:46:12.277694+00:00", "locked_line_id": 194, "picked_team_id": 23, "locked_spread_value": 1.5, "locked_spread_team_id": 23}	2025-10-05 13:46:13.291194+00
38	93abda42-cf85-4c5f-bd90-81210369b2dc	unlock_pick	{"weight": "L", "game_id": "bde2234a-6b87-4b5e-85dd-37c092bc3047", "locked_at": "2025-10-05T13:46:50.111627+00:00", "locked_line_id": 205, "picked_team_id": 29, "locked_spread_value": 3.5, "locked_spread_team_id": 29}	2025-10-05 13:46:52.373839+00
39	93abda42-cf85-4c5f-bd90-81210369b2dc	unlock_pick	{"weight": "M", "game_id": "8d1ac3c2-a669-4274-9d81-20e1f51b9bae", "locked_at": "2025-10-05T13:47:21.543433+00:00", "locked_line_id": 199, "picked_team_id": 22, "locked_spread_value": 8.5, "locked_spread_team_id": 4}	2025-10-05 13:47:23.124559+00
40	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	unlock_pick	{"weight": "L", "game_id": "7cb87419-fddd-4928-a943-391bd5227e2e", "locked_at": "2025-10-12T12:13:06.769247+00:00", "locked_line_id": 233, "picked_team_id": 3, "locked_spread_value": 7, "locked_spread_team_id": 19}	2025-10-12 12:13:13.69475+00
41	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	unlock_pick	{"weight": "L", "game_id": "7cb87419-fddd-4928-a943-391bd5227e2e", "locked_at": "2025-10-12T12:13:15.226898+00:00", "locked_line_id": 233, "picked_team_id": 19, "locked_spread_value": 7, "locked_spread_team_id": 19}	2025-10-12 12:13:17.223297+00
42	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	unlock_pick	{"weight": "L", "game_id": "e5b67945-f649-42a4-a3e8-2b8f21b8a88f", "locked_at": "2025-10-12T12:14:25.589915+00:00", "locked_line_id": 220, "picked_team_id": 7, "locked_spread_value": 14.5, "locked_spread_team_id": 12}	2025-10-12 12:14:31.542146+00
43	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	unlock_pick	{"weight": "M", "game_id": "4c912b18-1027-4560-9cb6-3b20c73ac4d1", "locked_at": "2025-10-12T12:14:59.101539+00:00", "locked_line_id": 227, "picked_team_id": 11, "locked_spread_value": 2.5, "locked_spread_team_id": 16}	2025-10-12 12:15:07.061031+00
44	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	unlock_pick	{"weight": "L", "game_id": "6cce17a8-edfb-4c7f-b706-3ae198691439", "locked_at": "2025-10-12T12:14:04.283313+00:00", "locked_line_id": 235, "picked_team_id": 1, "locked_spread_value": 9.5, "locked_spread_team_id": 14}	2025-10-12 14:21:26.921219+00
45	b75858d9-3f6f-46b7-be49-6884b28493f6	unlock_pick	{"weight": "M", "game_id": "7cb87419-fddd-4928-a943-391bd5227e2e", "locked_at": "2025-10-12T16:27:31.656299+00:00", "locked_line_id": 233, "picked_team_id": 3, "locked_spread_value": 7, "locked_spread_team_id": 19}	2025-10-12 16:32:32.50028+00
46	93abda42-cf85-4c5f-bd90-81210369b2dc	unlock_pick	{"weight": "L", "game_id": "2165e08b-e5aa-4f76-adf9-ab393a4baa89", "locked_at": "2025-10-12T16:34:16.448245+00:00", "locked_line_id": 229, "picked_team_id": 5, "locked_spread_value": 3, "locked_spread_team_id": 9}	2025-10-12 16:34:23.073399+00
47	93abda42-cf85-4c5f-bd90-81210369b2dc	unlock_pick	{"weight": "M", "game_id": "6cce17a8-edfb-4c7f-b706-3ae198691439", "locked_at": "2025-10-12T16:34:38.520033+00:00", "locked_line_id": 235, "picked_team_id": 14, "locked_spread_value": 9.5, "locked_spread_team_id": 14}	2025-10-12 16:34:39.661681+00
48	93abda42-cf85-4c5f-bd90-81210369b2dc	unlock_pick	{"weight": "H", "game_id": "e5b67945-f649-42a4-a3e8-2b8f21b8a88f", "locked_at": "2025-10-12T16:34:55.371133+00:00", "locked_line_id": 220, "picked_team_id": 12, "locked_spread_value": 14.5, "locked_spread_team_id": 12}	2025-10-12 16:34:56.536703+00
49	93abda42-cf85-4c5f-bd90-81210369b2dc	unlock_pick	{"weight": "L", "game_id": "6e5d4e91-b8ad-41df-9950-6d5fe79173b6", "locked_at": "2025-10-12T16:35:07.553625+00:00", "locked_line_id": 234, "picked_team_id": 30, "locked_spread_value": 3.5, "locked_spread_team_id": 30}	2025-10-12 16:35:12.297829+00
50	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	unlock_pick	{"weight": "L", "game_id": "85594600-e73f-49ee-a6bd-d52165c66b91", "locked_at": "2025-10-12T16:47:37.429776+00:00", "locked_line_id": 219, "picked_team_id": 22, "locked_spread_value": 3.5, "locked_spread_team_id": 22}	2025-10-12 16:47:41.772766+00
51	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	unlock_pick	{"weight": "L", "game_id": "6cce17a8-edfb-4c7f-b706-3ae198691439", "locked_at": "2025-10-12T16:48:58.16759+00:00", "locked_line_id": 235, "picked_team_id": 1, "locked_spread_value": 9.5, "locked_spread_team_id": 14}	2025-10-12 16:49:00.352792+00
52	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	unlock_pick	{"weight": "L", "game_id": "4c912b18-1027-4560-9cb6-3b20c73ac4d1", "locked_at": "2025-10-12T12:15:10.442085+00:00", "locked_line_id": 227, "picked_team_id": 16, "locked_spread_value": 2.5, "locked_spread_team_id": 16}	2025-10-12 23:44:24.010694+00
53	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	unlock_pick	{"weight": "L", "game_id": "06cc8eea-773e-43ae-b42f-4b8d732163f2", "locked_at": "2025-10-12T12:15:23.776848+00:00", "locked_line_id": 224, "picked_team_id": 6, "locked_spread_value": 4.5, "locked_spread_team_id": 32}	2025-10-13 20:36:04.45691+00
54	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	unlock_pick	{"weight": "L", "game_id": "b31c97c4-c4f1-4e44-8152-1e84c0d4b5d9", "locked_at": "2025-10-16T23:36:28.878865+00:00", "locked_line_id": 239, "picked_team_id": 27, "locked_spread_value": 5.5, "locked_spread_team_id": 27}	2025-10-16 23:36:32.684995+00
55	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	unlock_pick	{"weight": "M", "game_id": "a10d2e03-a21f-4d06-8752-a46f00fe648b", "locked_at": "2025-10-19T00:17:01.464806+00:00", "locked_line_id": 240, "picked_team_id": 15, "locked_spread_value": 3, "locked_spread_team_id": 19}	2025-10-19 00:17:03.375707+00
56	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	unlock_pick	{"weight": "L", "game_id": "a10d2e03-a21f-4d06-8752-a46f00fe648b", "locked_at": "2025-10-19T00:17:04.391274+00:00", "locked_line_id": 240, "picked_team_id": 15, "locked_spread_value": 3, "locked_spread_team_id": 19}	2025-10-19 00:21:47.836888+00
57	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	unlock_pick	{"weight": "L", "game_id": "a10d2e03-a21f-4d06-8752-a46f00fe648b", "locked_at": "2025-10-19T00:21:59.486001+00:00", "locked_line_id": 240, "picked_team_id": 15, "locked_spread_value": 3, "locked_spread_team_id": 19}	2025-10-19 00:22:49.196124+00
58	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	unlock_pick	{"weight": "M", "game_id": "a10d2e03-a21f-4d06-8752-a46f00fe648b", "locked_at": "2025-10-19T00:22:55.972548+00:00", "locked_line_id": 240, "picked_team_id": 15, "locked_spread_value": 3, "locked_spread_team_id": 19}	2025-10-19 00:22:56.853203+00
59	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	unlock_pick	{"weight": "M", "game_id": "b779443d-d9af-49d2-8259-6d8ed08ca2cb", "locked_at": "2025-10-19T00:17:46.015456+00:00", "locked_line_id": 254, "picked_team_id": 23, "locked_spread_value": 4.5, "locked_spread_team_id": 6}	2025-10-19 00:23:27.993175+00
60	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	unlock_pick	{"weight": "M", "game_id": "d021ef41-a018-46b2-a041-0e0ce8d684b8", "locked_at": "2025-10-19T00:18:03.39444+00:00", "locked_line_id": 242, "picked_team_id": 5, "locked_spread_value": 1.5, "locked_spread_team_id": 5}	2025-10-19 00:23:43.327943+00
61	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	unlock_pick	{"weight": "H", "game_id": "d021ef41-a018-46b2-a041-0e0ce8d684b8", "locked_at": "2025-10-19T00:23:45.678817+00:00", "locked_line_id": 242, "picked_team_id": 25, "locked_spread_value": 1.5, "locked_spread_team_id": 5}	2025-10-19 00:23:46.438036+00
62	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	unlock_pick	{"weight": "M", "game_id": "5f1076db-c38a-4250-8f63-b901fcd83cce", "locked_at": "2025-10-19T00:19:46.225144+00:00", "locked_line_id": 247, "picked_team_id": 10, "locked_spread_value": 7, "locked_spread_team_id": 10}	2025-10-19 00:25:16.250754+00
63	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	unlock_pick	{"weight": "L", "game_id": "5f1076db-c38a-4250-8f63-b901fcd83cce", "locked_at": "2025-10-19T00:25:20.199186+00:00", "locked_line_id": 247, "picked_team_id": 24, "locked_spread_value": 7, "locked_spread_team_id": 10}	2025-10-19 00:29:17.905929+00
64	93abda42-cf85-4c5f-bd90-81210369b2dc	unlock_pick	{"weight": "M", "game_id": "a3b2b894-f152-49e4-9a39-2accf094cd2c", "locked_at": "2025-10-19T12:14:27.778984+00:00", "locked_line_id": 258, "picked_team_id": 31, "locked_spread_value": 6.5, "locked_spread_team_id": 22}	2025-10-19 12:14:33.578507+00
65	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	unlock_pick	{"weight": "L", "game_id": "b779443d-d9af-49d2-8259-6d8ed08ca2cb", "locked_at": "2025-10-19T00:23:37.06333+00:00", "locked_line_id": 254, "picked_team_id": 6, "locked_spread_value": 4.5, "locked_spread_team_id": 6}	2025-10-19 15:19:26.813469+00
66	b75858d9-3f6f-46b7-be49-6884b28493f6	unlock_pick	{"weight": "H", "game_id": "a2115ef5-9262-4cb0-872f-8d9c26fad40d", "locked_at": "2025-10-19T15:34:06.45885+00:00", "locked_line_id": 252, "picked_team_id": 11, "locked_spread_value": 5.5, "locked_spread_team_id": 11}	2025-10-19 15:34:12.265112+00
67	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	unlock_pick	{"weight": "M", "game_id": "a3b2b894-f152-49e4-9a39-2accf094cd2c", "locked_at": "2025-10-19T00:19:25.505611+00:00", "locked_line_id": 258, "picked_team_id": 22, "locked_spread_value": 6.5, "locked_spread_team_id": 22}	2025-10-19 16:03:54.571178+00
68	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	unlock_pick	{"weight": "L", "game_id": "b5de4725-8056-4e20-8a2e-712260bf3e53", "locked_at": "2025-10-19T00:19:59.56569+00:00", "locked_line_id": 248, "picked_team_id": 14, "locked_spread_value": 1.5, "locked_spread_team_id": 18}	2025-10-19 17:24:01.417731+00
69	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	unlock_pick	{"weight": "M", "game_id": "8a1a95b1-e629-4e81-bbce-bcdea7b945bb", "locked_at": "2025-10-19T00:20:22.051852+00:00", "locked_line_id": 260, "picked_team_id": 32, "locked_spread_value": 1.5, "locked_spread_team_id": 9}	2025-10-19 20:22:06.719013+00
70	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	unlock_pick	{"weight": "L", "game_id": "25dd832e-7722-464a-b421-822312d3c78f", "locked_at": "2025-10-21T21:06:32.615101+00:00", "locked_line_id": 267, "picked_team_id": 21, "locked_spread_value": 3, "locked_spread_team_id": 18}	2025-10-21 21:06:36.054445+00
71	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	unlock_pick	{"weight": "L", "game_id": "25dd832e-7722-464a-b421-822312d3c78f", "locked_at": "2025-10-22T12:31:48.384806+00:00", "locked_line_id": 267, "picked_team_id": 18, "locked_spread_value": 3, "locked_spread_team_id": 18}	2025-10-23 20:00:48.253962+00
72	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	unlock_pick	{"weight": "L", "game_id": "25dd832e-7722-464a-b421-822312d3c78f", "locked_at": "2025-10-23T20:00:53.889157+00:00", "locked_line_id": 283, "picked_team_id": 18, "locked_spread_value": 3.5, "locked_spread_team_id": 18}	2025-10-23 20:01:27.697632+00
73	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	unlock_pick	{"weight": "L", "game_id": "25dd832e-7722-464a-b421-822312d3c78f", "locked_at": "2025-10-23T20:01:32.368248+00:00", "locked_line_id": 287, "picked_team_id": 18, "locked_spread_value": 3, "locked_spread_team_id": 18}	2025-10-23 20:25:07.470789+00
74	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	unlock_pick	{"weight": "M", "game_id": "25dd832e-7722-464a-b421-822312d3c78f", "locked_at": "2025-10-23T20:25:12.806955+00:00", "locked_line_id": 287, "picked_team_id": 18, "locked_spread_value": 3, "locked_spread_team_id": 18}	2025-10-23 21:03:15.953282+00
75	61183ed6-88ce-418b-8bdf-f16c57a350f7	unlock_pick	{"weight": "M", "game_id": "54bbb810-a9f6-429d-8566-74105f370675", "locked_at": "2025-10-26T03:26:48.738144+00:00", "locked_line_id": 289, "picked_team_id": 28, "locked_spread_value": 2.5, "locked_spread_team_id": 13}	2025-10-26 03:28:15.312619+00
76	61183ed6-88ce-418b-8bdf-f16c57a350f7	unlock_pick	{"weight": "A", "game_id": "54bbb810-a9f6-429d-8566-74105f370675", "locked_at": "2025-10-26T03:28:18.534338+00:00", "locked_line_id": 289, "picked_team_id": 28, "locked_spread_value": 2.5, "locked_spread_team_id": 13}	2025-10-26 03:28:24.890892+00
77	61183ed6-88ce-418b-8bdf-f16c57a350f7	unlock_pick	{"weight": "H", "game_id": "d40a4cd2-199d-4eb4-8f53-56280a7c2cea", "locked_at": "2025-10-26T03:26:59.277881+00:00", "locked_line_id": 292, "picked_team_id": 30, "locked_spread_value": 3.5, "locked_spread_team_id": 30}	2025-10-26 03:28:29.953908+00
78	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	unlock_pick	{"weight": "L", "game_id": "c4d0ce83-8c64-4335-a1c6-dbaef3dc437d", "locked_at": "2025-10-26T12:11:35.039363+00:00", "locked_line_id": 272, "picked_team_id": 22, "locked_spread_value": 7, "locked_spread_team_id": 22}	2025-10-26 12:11:35.520999+00
79	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	unlock_pick	{"weight": "L", "game_id": "efaf70eb-ea6d-4e22-8266-344f60da958b", "locked_at": "2025-10-26T12:51:16.037106+00:00", "locked_line_id": 286, "picked_team_id": 16, "locked_spread_value": 11.5, "locked_spread_team_id": 16}	2025-10-26 12:51:17.81787+00
80	b75858d9-3f6f-46b7-be49-6884b28493f6	unlock_pick	{"weight": "L", "game_id": "03dd600b-e67e-4366-aa83-4f8064d5e637", "locked_at": "2025-10-26T15:11:58.347984+00:00", "locked_line_id": 270, "picked_team_id": 5, "locked_spread_value": 7.5, "locked_spread_team_id": 4}	2025-10-26 15:12:00.187717+00
81	93abda42-cf85-4c5f-bd90-81210369b2dc	unlock_pick	{"weight": "L", "game_id": "046f08a3-ef04-4ded-8b18-b2515807cab2", "locked_at": "2025-10-26T15:49:25.167977+00:00", "locked_line_id": 290, "picked_team_id": 2, "locked_spread_value": 7, "locked_spread_team_id": 2}	2025-10-26 15:49:26.29155+00
82	93abda42-cf85-4c5f-bd90-81210369b2dc	unlock_pick	{"weight": "L", "game_id": "046f08a3-ef04-4ded-8b18-b2515807cab2", "locked_at": "2025-10-26T15:49:29.080867+00:00", "locked_line_id": 290, "picked_team_id": 2, "locked_spread_value": 7, "locked_spread_team_id": 2}	2025-10-26 15:49:30.564672+00
83	93abda42-cf85-4c5f-bd90-81210369b2dc	unlock_pick	{"weight": "M", "game_id": "5671a21f-0b89-492d-853d-59ae0cb71a52", "locked_at": "2025-10-26T15:49:35.735618+00:00", "locked_line_id": 284, "picked_team_id": 24, "locked_spread_value": 7.5, "locked_spread_team_id": 26}	2025-10-26 15:49:37.215927+00
84	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	unlock_pick	{"weight": "L", "game_id": "92b36759-ce64-498d-ba8b-a7f12943e57c", "locked_at": "2025-10-26T12:51:48.657217+00:00", "locked_line_id": 285, "picked_team_id": 27, "locked_spread_value": 3, "locked_spread_team_id": 12}	2025-10-26 23:35:37.104153+00
85	d8db1ea2-76a7-4cb1-8025-167bef10c724	unlock_pick	{"weight": "M", "game_id": "7892dd22-384d-420b-8ac9-b38f80357891", "locked_at": "2025-11-02T14:42:29.686593+00:00", "locked_line_id": 311, "picked_team_id": 5, "locked_spread_value": 13.5, "locked_spread_team_id": 12}	2025-11-02 14:42:31.277595+00
86	d8db1ea2-76a7-4cb1-8025-167bef10c724	unlock_pick	{"weight": "M", "game_id": "112270ae-a6ed-426b-adac-56a0afff3476", "locked_at": "2025-11-02T14:43:00.155307+00:00", "locked_line_id": 299, "picked_team_id": 10, "locked_spread_value": 1.5, "locked_spread_team_id": 13}	2025-11-02 14:43:03.229384+00
87	61183ed6-88ce-418b-8bdf-f16c57a350f7	unlock_pick	{"weight": "M", "game_id": "d1c9abe6-1923-41d8-b06b-cae30c9bd58f", "locked_at": "2025-11-02T14:43:13.672586+00:00", "locked_line_id": 312, "picked_team_id": 32, "locked_spread_value": 3, "locked_spread_team_id": 29}	2025-11-02 14:43:20.4502+00
88	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	unlock_pick	{"weight": "M", "game_id": "aec4a3ad-d44d-41e6-9406-ed365058f749", "locked_at": "2025-11-02T15:55:40.564082+00:00", "locked_line_id": 315, "picked_team_id": 2, "locked_spread_value": 4.5, "locked_spread_team_id": 22}	2025-11-02 15:55:43.554275+00
89	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	unlock_pick	{"weight": "M", "game_id": "f3676ad2-38c0-4af9-b8ae-f57be8657020", "locked_at": "2025-11-02T16:15:20.733958+00:00", "locked_line_id": 303, "picked_team_id": 28, "locked_spread_value": 2.5, "locked_spread_team_id": 28}	2025-11-02 16:15:21.137315+00
90	93abda42-cf85-4c5f-bd90-81210369b2dc	unlock_pick	{"weight": "M", "game_id": "7892dd22-384d-420b-8ac9-b38f80357891", "locked_at": "2025-11-02T16:21:40.5391+00:00", "locked_line_id": 311, "picked_team_id": 12, "locked_spread_value": 13.5, "locked_spread_team_id": 12}	2025-11-02 16:21:42.795475+00
91	93abda42-cf85-4c5f-bd90-81210369b2dc	unlock_pick	{"weight": "L", "game_id": "7892dd22-384d-420b-8ac9-b38f80357891", "locked_at": "2025-11-02T16:21:44.270911+00:00", "locked_line_id": 311, "picked_team_id": 12, "locked_spread_value": 13.5, "locked_spread_team_id": 12}	2025-11-02 16:21:45.201228+00
92	93abda42-cf85-4c5f-bd90-81210369b2dc	unlock_pick	{"weight": "L", "game_id": "95b479b5-7350-46eb-8d94-6b207de641c3", "locked_at": "2025-11-02T16:21:57.907182+00:00", "locked_line_id": 309, "picked_team_id": 31, "locked_spread_value": 9.5, "locked_spread_team_id": 18}	2025-11-02 16:22:04.223678+00
93	93abda42-cf85-4c5f-bd90-81210369b2dc	unlock_pick	{"weight": "L", "game_id": "95b479b5-7350-46eb-8d94-6b207de641c3", "locked_at": "2025-11-02T16:22:05.292113+00:00", "locked_line_id": 309, "picked_team_id": 31, "locked_spread_value": 9.5, "locked_spread_team_id": 18}	2025-11-02 16:22:10.920032+00
94	93abda42-cf85-4c5f-bd90-81210369b2dc	unlock_pick	{"weight": "M", "game_id": "e2a776f8-11a6-4a08-9c21-ee1a62e72176", "locked_at": "2025-11-02T16:22:37.530913+00:00", "locked_line_id": 310, "picked_team_id": 19, "locked_spread_value": 14.5, "locked_spread_team_id": 19}	2025-11-02 16:22:40.03985+00
95	93abda42-cf85-4c5f-bd90-81210369b2dc	unlock_pick	{"weight": "L", "game_id": "e488eb19-d62f-430e-9d7a-4e676413412e", "locked_at": "2025-11-02T16:22:58.254814+00:00", "locked_line_id": 319, "picked_team_id": 9, "locked_spread_value": 3, "locked_spread_team_id": 9}	2025-11-02 16:23:01.164685+00
96	61183ed6-88ce-418b-8bdf-f16c57a350f7	unlock_pick	{"weight": "M", "game_id": "73898b0c-165c-4160-8e2f-04fc60d929db", "locked_at": "2025-11-09T13:40:04.09678+00:00", "locked_line_id": 335, "picked_team_id": 8, "locked_spread_value": 2.5, "locked_spread_team_id": 8}	2025-11-09 13:40:04.624932+00
97	b75858d9-3f6f-46b7-be49-6884b28493f6	unlock_pick	{"weight": "M", "game_id": "b134cf70-c00d-45e0-95e1-8b400db16f9d", "locked_at": "2025-11-09T16:02:01.283259+00:00", "locked_line_id": 328, "picked_team_id": 30, "locked_spread_value": 2.5, "locked_spread_team_id": 30}	2025-11-09 16:02:01.69474+00
98	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	unlock_pick	{"weight": "M", "game_id": "cbc66c57-d654-486c-ae72-4ef57f0a3fe7", "locked_at": "2025-11-08T00:52:52.767386+00:00", "locked_line_id": 330, "picked_team_id": 11, "locked_spread_value": 8.5, "locked_spread_team_id": 11}	2025-11-09 19:22:38.700403+00
99	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	unlock_pick	{"weight": "M", "game_id": "cbc66c57-d654-486c-ae72-4ef57f0a3fe7", "locked_at": "2025-11-09T19:22:41.357039+00:00", "locked_line_id": 341, "picked_team_id": 32, "locked_spread_value": 7.5, "locked_spread_team_id": 11}	2025-11-09 19:22:48.316116+00
100	61183ed6-88ce-418b-8bdf-f16c57a350f7	unlock_pick	{"weight": "M", "game_id": "13f2fd71-3d1c-42e5-9f5c-99bb8f212547", "locked_at": "2025-11-09T21:25:00.569999+00:00", "locked_line_id": 340, "picked_team_id": 27, "locked_spread_value": 2.5, "locked_spread_team_id": 18}	2025-11-09 21:25:01.400843+00
101	61183ed6-88ce-418b-8bdf-f16c57a350f7	unlock_pick	{"weight": "M", "game_id": "41c027c6-fa5c-4a26-a7b6-3207cce3ebe6", "locked_at": "2025-11-16T01:03:28.441445+00:00", "locked_line_id": 350, "picked_team_id": 32, "locked_spread_value": 2.5, "locked_spread_team_id": 20}	2025-11-16 01:03:29.188118+00
102	61183ed6-88ce-418b-8bdf-f16c57a350f7	unlock_pick	{"weight": "M", "game_id": "af39c4f7-7bbc-445f-9596-0ee71f84d732", "locked_at": "2025-11-16T01:05:01.528948+00:00", "locked_line_id": 370, "picked_team_id": 11, "locked_spread_value": 2.5, "locked_spread_team_id": 26}	2025-11-16 01:05:06.565822+00
103	93abda42-cf85-4c5f-bd90-81210369b2dc	unlock_pick	{"weight": "L", "game_id": "7c66af18-7fe5-403b-8a74-fc66d3e13e5f", "locked_at": "2025-11-16T13:15:38.245945+00:00", "locked_line_id": 363, "picked_team_id": 9, "locked_spread_value": 3.5, "locked_spread_team_id": 9}	2025-11-16 13:15:39.408947+00
104	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	unlock_pick	{"weight": "L", "game_id": "41c027c6-fa5c-4a26-a7b6-3207cce3ebe6", "locked_at": "2025-11-13T01:19:04.209527+00:00", "locked_line_id": 350, "picked_team_id": 32, "locked_spread_value": 2.5, "locked_spread_team_id": 20}	2025-11-16 14:10:39.581097+00
105	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	unlock_pick	{"weight": "L", "game_id": "41c027c6-fa5c-4a26-a7b6-3207cce3ebe6", "locked_at": "2025-11-16T14:10:41.648389+00:00", "locked_line_id": 350, "picked_team_id": 20, "locked_spread_value": 2.5, "locked_spread_team_id": 20}	2025-11-16 14:11:02.838932+00
106	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	unlock_pick	{"weight": "L", "game_id": "f49a3914-1a2b-4bbd-bd90-58f3d43f2ca1", "locked_at": "2025-11-16T16:16:23.913801+00:00", "locked_line_id": 372, "picked_team_id": 13, "locked_spread_value": 5.5, "locked_spread_team_id": 13}	2025-11-16 16:16:24.392415+00
107	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	unlock_pick	{"weight": "L", "game_id": "358d48e8-bed8-4dc9-a3a2-a45116df0833", "locked_at": "2025-11-16T16:23:12.920569+00:00", "locked_line_id": 368, "picked_team_id": 19, "locked_spread_value": 3, "locked_spread_team_id": 19}	2025-11-16 16:32:00.398329+00
108	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	unlock_pick	{"weight": "L", "game_id": "c95835d4-c6eb-495c-9a7b-8549c0bb86e4", "locked_at": "2025-11-16T16:25:18.437258+00:00", "locked_line_id": 361, "picked_team_id": 16, "locked_spread_value": 3.5, "locked_spread_team_id": 16}	2025-11-16 16:32:22.93812+00
109	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	unlock_pick	{"weight": "L", "game_id": "7c66af18-7fe5-403b-8a74-fc66d3e13e5f", "locked_at": "2025-11-16T16:31:37.258464+00:00", "locked_line_id": 363, "picked_team_id": 9, "locked_spread_value": 3.5, "locked_spread_team_id": 9}	2025-11-16 16:34:37.045437+00
110	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	unlock_pick	{"weight": "L", "game_id": "af39c4f7-7bbc-445f-9596-0ee71f84d732", "locked_at": "2025-11-16T16:31:34.398961+00:00", "locked_line_id": 370, "picked_team_id": 26, "locked_spread_value": 2.5, "locked_spread_team_id": 26}	2025-11-16 16:34:41.262087+00
111	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	unlock_pick	{"weight": "M", "game_id": "45cc932e-b1d3-4204-aa65-372f0e48111a", "locked_at": "2025-11-23T00:09:37.115928+00:00", "locked_line_id": 395, "picked_team_id": 24, "locked_spread_value": 12.5, "locked_spread_team_id": 11}	2025-11-23 00:09:39.327857+00
112	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	unlock_pick	{"weight": "H", "game_id": "31e33109-b008-489b-a37a-e13202ed0927", "locked_at": "2025-11-23T00:10:51.194048+00:00", "locked_line_id": 397, "picked_team_id": 9, "locked_spread_value": 3, "locked_spread_team_id": 26}	2025-11-23 00:10:53.782121+00
113	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	unlock_pick	{"weight": "L", "game_id": "ecacbc7b-cc64-4ed6-8ab6-10c433fb3ce9", "locked_at": "2025-11-23T00:11:14.478668+00:00", "locked_line_id": 398, "picked_team_id": 19, "locked_spread_value": 7, "locked_spread_team_id": 19}	2025-11-23 00:11:16.852209+00
114	b75858d9-3f6f-46b7-be49-6884b28493f6	unlock_pick	{"weight": "L", "game_id": "45cc932e-b1d3-4204-aa65-372f0e48111a", "locked_at": "2025-11-23T16:28:13.326606+00:00", "locked_line_id": 395, "picked_team_id": 24, "locked_spread_value": 12.5, "locked_spread_team_id": 11}	2025-11-23 16:28:17.061995+00
115	61183ed6-88ce-418b-8bdf-f16c57a350f7	unlock_pick	{"weight": "M", "game_id": "45cc932e-b1d3-4204-aa65-372f0e48111a", "locked_at": "2025-11-22T01:47:51.604148+00:00", "locked_line_id": 382, "picked_team_id": 24, "locked_spread_value": 10.5, "locked_spread_team_id": 11}	2025-11-23 17:12:00.849321+00
116	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	unlock_pick	{"weight": "L", "game_id": "e4f9bc56-5420-4c15-8992-4feb8126e69a", "locked_at": "2025-11-23T00:09:48.557226+00:00", "locked_line_id": 380, "picked_team_id": 27, "locked_spread_value": 2.5, "locked_spread_team_id": 6}	2025-11-23 17:13:25.849579+00
117	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	unlock_pick	{"weight": "L", "game_id": "45cc932e-b1d3-4204-aa65-372f0e48111a", "locked_at": "2025-11-23T17:45:36.062705+00:00", "locked_line_id": 395, "picked_team_id": 24, "locked_spread_value": 12.5, "locked_spread_team_id": 11}	2025-11-23 17:45:36.543449+00
118	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	unlock_pick	{"weight": "L", "game_id": "ecacbc7b-cc64-4ed6-8ab6-10c433fb3ce9", "locked_at": "2025-11-23T17:47:48.653088+00:00", "locked_line_id": 398, "picked_team_id": 19, "locked_spread_value": 7, "locked_spread_team_id": 19}	2025-11-23 17:47:50.082649+00
119	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	unlock_pick	{"weight": "M", "game_id": "7bdfc892-5cad-43d2-b235-02afede1ecbd", "locked_at": "2025-11-23T00:11:22.692036+00:00", "locked_line_id": 391, "picked_team_id": 5, "locked_spread_value": 7, "locked_spread_team_id": 28}	2025-11-24 00:43:32.219138+00
120	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	unlock_pick	{"weight": "L", "game_id": "c4d15223-1220-412c-a372-c5d0b415fee2", "locked_at": "2025-11-26T01:01:58.00589+00:00", "locked_line_id": 402, "picked_team_id": 7, "locked_spread_value": 7, "locked_spread_team_id": 3}	2025-11-27 01:16:37.508589+00
121	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	unlock_pick	{"weight": "L", "game_id": "5cf03998-5733-4976-bd8d-f70cd50718fb", "locked_at": "2025-11-27T01:05:48.727593+00:00", "locked_line_id": 400, "picked_team_id": 12, "locked_spread_value": 2.5, "locked_spread_team_id": 11}	2025-11-27 01:16:44.485696+00
122	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	unlock_pick	{"weight": "L", "game_id": "b556dadc-16a2-4062-9e07-c4801a270aea", "locked_at": "2025-11-26T01:01:52.365245+00:00", "locked_line_id": 401, "picked_team_id": 16, "locked_spread_value": 3, "locked_spread_team_id": 16}	2025-11-27 01:16:53.57805+00
123	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	unlock_pick	{"weight": "M", "game_id": "b556dadc-16a2-4062-9e07-c4801a270aea", "locked_at": "2025-11-27T01:16:54.665712+00:00", "locked_line_id": 417, "picked_team_id": 9, "locked_spread_value": 3.5, "locked_spread_team_id": 16}	2025-11-27 01:16:55.485537+00
124	61183ed6-88ce-418b-8bdf-f16c57a350f7	unlock_pick	{"weight": "L", "game_id": "5cf03998-5733-4976-bd8d-f70cd50718fb", "locked_at": "2025-11-27T13:44:15.202089+00:00", "locked_line_id": 400, "picked_team_id": 11, "locked_spread_value": 2.5, "locked_spread_team_id": 11}	2025-11-27 13:44:15.986634+00
125	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	unlock_pick	{"weight": "M", "game_id": "cc3cd25a-c004-40fa-a591-d8bbbb2ea929", "locked_at": "2025-11-26T01:02:18.663928+00:00", "locked_line_id": 403, "picked_team_id": 26, "locked_spread_value": 7, "locked_spread_team_id": 26}	2025-11-28 12:55:48.387169+00
126	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	unlock_pick	{"weight": "L", "game_id": "cc3cd25a-c004-40fa-a591-d8bbbb2ea929", "locked_at": "2025-11-28T12:55:51.13111+00:00", "locked_line_id": 403, "picked_team_id": 26, "locked_spread_value": 7, "locked_spread_team_id": 26}	2025-11-28 19:42:42.65688+00
127	61183ed6-88ce-418b-8bdf-f16c57a350f7	unlock_pick	{"weight": "M", "game_id": "5d229b96-7da4-4fcb-a0d5-0bdcae77558e", "locked_at": "2025-11-30T14:09:44.30338+00:00", "locked_line_id": 410, "picked_team_id": 20, "locked_spread_value": 5.5, "locked_spread_team_id": 20}	2025-11-30 14:09:46.068976+00
128	61183ed6-88ce-418b-8bdf-f16c57a350f7	unlock_pick	{"weight": "A", "game_id": "3d891558-07e3-4160-b83c-5b4a7d5f63df", "locked_at": "2025-11-30T14:10:17.089648+00:00", "locked_line_id": 413, "picked_team_id": 18, "locked_spread_value": 9.5, "locked_spread_team_id": 18}	2025-11-30 14:10:19.953327+00
129	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	unlock_pick	{"weight": "M", "game_id": "bb418583-3bf5-46ba-beb3-f4257a017cb7", "locked_at": "2025-11-30T17:32:46.233761+00:00", "locked_line_id": 428, "picked_team_id": 2, "locked_spread_value": 3, "locked_spread_team_id": 2}	2025-11-30 17:34:06.532287+00
130	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	unlock_pick	{"weight": "L", "game_id": "3bf722b0-695a-428a-a9fc-f77cd0901e52", "locked_at": "2025-11-30T17:32:37.298861+00:00", "locked_line_id": 431, "picked_team_id": 15, "locked_spread_value": 5.5, "locked_spread_team_id": 15}	2025-11-30 17:34:46.749116+00
131	61183ed6-88ce-418b-8bdf-f16c57a350f7	unlock_pick	{"weight": "L", "game_id": "2ee03b3d-e61b-4633-b5ed-f234f3c51cd6", "locked_at": "2025-11-30T14:10:33.052717+00:00", "locked_line_id": 432, "picked_team_id": 32, "locked_spread_value": 6.5, "locked_spread_team_id": 10}	2025-11-30 21:39:52.829156+00
132	61183ed6-88ce-418b-8bdf-f16c57a350f7	unlock_pick	{"weight": "M", "game_id": "2ee03b3d-e61b-4633-b5ed-f234f3c51cd6", "locked_at": "2025-11-30T21:40:00.982672+00:00", "locked_line_id": 435, "picked_team_id": 10, "locked_spread_value": 5.5, "locked_spread_team_id": 10}	2025-12-01 01:10:14.735969+00
\.
COPY public.game_lines (id, game_id, source, spread_team_id, spread_value, fetched_at, is_active_line) FROM stdin;
72	b92f4877-3642-4dad-8a58-cbbc33acaa27	fanduel	30	6.5	2025-09-18 21:34:10.331+00	f
80	a6646dac-f8d6-473f-96fc-0e711dd92011	fanduel	3	4.5	2025-09-22 23:50:48.12273+00	f
145	b92f4877-3642-4dad-8a58-cbbc33acaa27	fanduel	30	6.5	2025-09-28 01:11:51.931+00	t
50	5334cd67-c846-4303-b979-4636a885b1b6	fanduel	11	6.5	2025-09-11 23:26:26.757+00	f
118	13a5b004-d94d-4fef-9586-6a0af5dfedec	fanduel	21	2.5	2025-09-23 12:55:45.925686+00	t
122	b0f2ec20-f691-43a1-a91b-549cdde8abd4	fanduel	22	5.5	2025-09-23 12:55:46.571411+00	t
123	ca15c000-5210-4eb0-9793-bda649720d4d	fanduel	13	7.5	2025-09-23 12:55:46.708142+00	t
124	49a0b7ea-6fc3-45d1-848a-6b0e079f13a2	fanduel	18	6.5	2025-09-23 12:55:46.831122+00	t
125	9b3c55d8-73f8-4a27-9f17-9d1d9fbd9350	fanduel	26	3.5	2025-09-23 12:55:46.945122+00	t
126	7d2cd926-d87c-49a2-ac4a-75992298fb33	fanduel	19	3.5	2025-09-23 12:55:47.063391+00	t
127	d26f58ed-1e7b-4e7f-9045-36b6a4072128	fanduel	28	3.5	2025-09-23 12:55:47.180499+00	t
128	a72be0b6-d553-4389-aee5-8c2fd70c58cc	fanduel	3	2.5	2025-09-23 12:55:47.289723+00	t
129	8c1fa576-2d49-4e8a-962d-259057938461	fanduel	17	1.5	2025-09-23 12:55:47.436947+00	t
130	91376266-40b6-4e41-aca0-0736c40c57f2	fanduel	12	6.5	2025-09-23 12:55:47.551297+00	t
131	0efcb2cd-b1dd-46bd-bc97-4b1af61b2154	fanduel	20	2.5	2025-09-23 12:55:47.650748+00	t
132	10340ef1-48a2-48c8-a50a-bb3d0eaa35fe	fanduel	10	7.5	2025-09-23 12:55:47.752444+00	t
67	0318ac4a-51fa-4197-9a58-d5a066c5c7cd	fanduel	21	3	2025-09-18 21:34:09.62+00	f
119	8417d24a-a09d-4f23-ab21-40f016ed3bd3	fanduel	11	9.5	2025-09-24 21:23:40.623023+00	t
146	0318ac4a-51fa-4197-9a58-d5a066c5c7cd	fanduel	21	3	2025-09-28 01:11:52.07+00	t
120	2b45efe0-31db-4e09-868e-5ab5549e0b0a	fanduel	2	2.5	2025-09-27 22:52:57.23762+00	t
117	242131ad-16bf-4fd6-8e5e-65b6d2e79cf1	fanduel	29	1.5	2025-09-24 21:23:40.25352+00	f
138	242131ad-16bf-4fd6-8e5e-65b6d2e79cf1	fanduel	29	1.5	2025-09-28 01:11:50.552+00	t
70	f27eeec6-0e15-4c22-81c6-5c4b143adfe8	fanduel	32	3	2025-09-21 11:05:43.926068+00	f
139	f27eeec6-0e15-4c22-81c6-5c4b143adfe8	fanduel	32	3	2025-09-28 01:11:50.742+00	t
66	5635fb7e-2185-479c-90b1-b46de7a4f4b3	fanduel	2	4.5	2025-09-21 14:05:29.120799+00	f
140	5635fb7e-2185-479c-90b1-b46de7a4f4b3	fanduel	2	4.5	2025-09-28 01:11:50.926+00	t
68	2954f2b9-b9ae-4d88-8c86-1be1a49f6f8a	fanduel	12	7.5	2025-09-18 21:34:09.76+00	f
141	2954f2b9-b9ae-4d88-8c86-1be1a49f6f8a	fanduel	12	7.5	2025-09-28 01:11:51.055+00	t
71	67abe3aa-726e-41ef-baeb-b1d0bbd94e2f	fanduel	27	1.5	2025-09-18 21:34:10.189+00	f
142	67abe3aa-726e-41ef-baeb-b1d0bbd94e2f	fanduel	27	1.5	2025-09-28 01:11:51.191+00	t
74	1211281f-ad14-48b6-86e4-a4eb98d667d0	fanduel	26	3.5	2025-09-18 21:34:10.651+00	f
143	1211281f-ad14-48b6-86e4-a4eb98d667d0	fanduel	26	3.5	2025-09-28 01:11:51.596+00	t
73	080e3432-5c2c-4228-8de9-48845f5b826d	fanduel	14	4.5	2025-09-18 21:34:10.498+00	f
144	080e3432-5c2c-4228-8de9-48845f5b826d	fanduel	14	6	2025-09-28 01:11:51.727+00	t
69	6e913449-02a1-41ef-9139-55aab1625913	fanduel	15	1.5	2025-09-18 21:34:09.919+00	f
147	6e913449-02a1-41ef-9139-55aab1625913	fanduel	15	1.5	2025-09-28 01:11:52.202+00	t
76	dc820270-eba7-46bf-b0ea-a266032ff812	fanduel	29	7.5	2025-09-18 21:34:10.917+00	f
148	dc820270-eba7-46bf-b0ea-a266032ff812	fanduel	29	7.5	2025-09-28 01:11:52.343+00	t
75	0ba7b515-e8f9-4a04-8790-990094e4c9cf	fanduel	18	3	2025-09-21 11:05:44.33236+00	f
149	0ba7b515-e8f9-4a04-8790-990094e4c9cf	fanduel	18	3	2025-09-28 01:11:52.469+00	t
77	31e6b9ac-abc1-402e-bed5-2961e9bc8a02	fanduel	9	1.5	2025-09-18 21:34:11.015+00	f
150	31e6b9ac-abc1-402e-bed5-2961e9bc8a02	fanduel	9	1.5	2025-09-28 01:11:52.603+00	t
78	509947e1-c9f4-4dea-869e-18f0ae6560b4	fanduel	28	2.5	2025-09-18 21:34:11.133+00	f
151	509947e1-c9f4-4dea-869e-18f0ae6560b4	fanduel	28	2.5	2025-09-28 01:11:52.76+00	t
65	250c968a-cb9d-4060-a785-2dfbce12c181	fanduel	4	11.5	2025-09-18 21:34:09.255+00	t
79	b3236d16-a2ac-49f8-97f9-347a9d64c8d1	fanduel	16	5.5	2025-09-18 21:34:11.288+00	f
152	b3236d16-a2ac-49f8-97f9-347a9d64c8d1	fanduel	16	5.5	2025-09-28 01:11:52.89+00	t
153	a6646dac-f8d6-473f-96fc-0e711dd92011	fanduel	3	4.5	2025-09-28 01:11:53.026+00	t
49	7e68fe65-8ae9-4e71-ac41-ae6b9a3a7d62	fanduel	12	3	2025-09-11 23:26:26.656+00	f
154	7e68fe65-8ae9-4e71-ac41-ae6b9a3a7d62	fanduel	12	3.5	2025-09-28 01:11:53.161+00	t
54	336dd0e8-7642-45af-a8a6-493dae1bedbc	fanduel	3	11.5	2025-09-11 23:26:27.16+00	f
155	336dd0e8-7642-45af-a8a6-493dae1bedbc	fanduel	3	11.5	2025-09-28 01:11:53.707+00	t
56	49926afd-6329-4124-9846-7a044272ac54	fanduel	19	5.5	2025-09-11 23:26:27.38+00	f
156	49926afd-6329-4124-9846-7a044272ac54	fanduel	19	5.5	2025-09-28 01:11:54.176+00	t
157	5334cd67-c846-4303-b979-4636a885b1b6	fanduel	11	6.5	2025-09-28 01:11:54.666+00	t
55	fa733f3c-4b1a-442c-a331-8d2651040165	fanduel	4	6.5	2025-09-11 23:26:27.27+00	f
158	fa733f3c-4b1a-442c-a331-8d2651040165	fanduel	4	6.5	2025-09-28 01:11:55.16+00	t
52	3c511a07-f80a-4dc2-bc49-40a3fbe5ddb3	fanduel	9	4.5	2025-09-11 23:26:26.982+00	f
159	3c511a07-f80a-4dc2-bc49-40a3fbe5ddb3	fanduel	9	4.5	2025-09-28 01:11:55.639+00	t
57	3ec70270-c7f5-42b0-9220-34405add51e7	fanduel	28	3	2025-09-11 23:26:27.48+00	f
160	3ec70270-c7f5-42b0-9220-34405add51e7	fanduel	28	3	2025-09-28 01:11:56.142+00	t
53	a9ade8e0-8fb2-4c2b-917b-7191424388e7	fanduel	20	1.5	2025-09-11 23:26:27.08+00	f
161	a9ade8e0-8fb2-4c2b-917b-7191424388e7	fanduel	20	2.5	2025-09-28 01:11:56.528+00	t
51	2c53b774-736f-410c-b671-9ec4f1493fbd	fanduel	7	3.5	2025-09-11 23:26:26.873+00	f
162	2c53b774-736f-410c-b671-9ec4f1493fbd	fanduel	7	3.5	2025-09-28 01:11:56.997+00	t
58	01b3a495-1daf-4b24-99e2-a903e786b1be	fanduel	27	3	2025-09-11 23:26:27.605+00	f
163	01b3a495-1daf-4b24-99e2-a903e786b1be	fanduel	27	3	2025-09-28 01:11:57.47+00	t
60	3cd1d025-e2d8-463e-80ef-6385fc746582	fanduel	10	2.5	2025-09-11 23:26:27.804+00	f
164	3cd1d025-e2d8-463e-80ef-6385fc746582	fanduel	10	2.5	2025-09-28 01:11:57.998+00	t
59	fdd4448f-e730-4933-89a9-f4d40456b4d7	fanduel	1	6.5	2025-09-11 23:26:27.707+00	f
165	fdd4448f-e730-4933-89a9-f4d40456b4d7	fanduel	1	6.5	2025-09-28 01:11:58.475+00	t
61	b42650fe-fa28-4feb-98d6-622cffa6eb2e	fanduel	26	1.5	2025-09-11 23:26:27.896+00	f
166	b42650fe-fa28-4feb-98d6-622cffa6eb2e	fanduel	26	1.5	2025-09-28 01:11:58.917+00	t
62	abd39ca3-bedd-4a14-942c-1871e3e9a85b	fanduel	21	3.5	2025-09-11 23:26:27.995+00	f
167	abd39ca3-bedd-4a14-942c-1871e3e9a85b	fanduel	21	3.5	2025-09-28 01:11:59.365+00	t
63	b0a3899d-dd50-487c-b759-826132a5af7d	fanduel	13	2.5	2025-09-11 23:26:28.093+00	f
64	105ee53e-1599-447f-8df2-04a8f0e03d2e	fanduel	18	3	2025-09-11 23:26:28.187+00	f
33	63be1bd1-8401-4d9c-850a-3c48a0aa2542	fanduel	9	8.5	2025-09-05 00:19:40.765+00	f
34	34aa22d9-a08f-4527-9c82-f7bb72317a90	fanduel	16	3	2025-09-05 00:19:40.914+00	f
38	d6ea14f2-b5c2-4ba7-b9cf-37a49c400434	fanduel	7	5.5	2025-09-05 00:19:41.584+00	f
40	d5e23358-9bcf-4a36-bd67-60364e49567a	fanduel	17	2.5	2025-09-05 00:19:41.832+00	f
37	3436f7cb-d383-468b-b676-6e76b51d01c4	fanduel	5	3.5	2025-09-05 00:19:41.438+00	f
36	f04d3d1d-2117-4f57-a099-0172487c75a8	fanduel	30	1.5	2025-09-05 00:19:41.257+00	f
39	36496369-7298-4ef1-a622-6ef72558e109	fanduel	20	1.5	2025-09-05 00:19:41.7+00	f
41	e30cf41d-c05f-48b8-bd5b-674138779e39	fanduel	24	5.5	2025-09-05 00:19:41.983+00	f
42	718b520f-2d47-4a41-b108-d0ac9faa34aa	fanduel	27	2.5	2025-09-05 00:19:42.119+00	f
35	35fae26e-9b57-4a1a-b750-2ee208cf10ce	fanduel	1	6.5	2025-09-05 00:19:41.079+00	f
44	ec0ec9d8-cc67-421e-803b-590bc9113f08	fanduel	28	1.5	2025-09-05 00:19:42.437+00	f
45	3afdd6f6-f374-4f39-8c50-84dfebe25813	fanduel	11	2.5	2025-09-05 00:19:42.567+00	f
43	97f057d9-d748-49ae-aa3a-837b3c5297ca	fanduel	31	8.5	2025-09-05 00:19:42.285+00	f
47	cddd40f9-a5e9-432d-8bfb-719361eab23b	fanduel	3	1.5	2025-09-05 00:19:42.825+00	f
48	b6e60bfc-587b-4409-b2e6-7dd034f8cbc1	fanduel	21	1.5	2025-09-05 00:19:42.949+00	f
121	bc9e35d8-20fa-44b4-be20-81e6c19c72e1	fanduel	4	15.5	2025-09-24 21:23:40.841886+00	f
168	b0a3899d-dd50-487c-b759-826132a5af7d	fanduel	13	2.5	2025-09-28 01:11:59.815+00	t
170	63be1bd1-8401-4d9c-850a-3c48a0aa2542	fanduel	26	8	2025-09-28 01:12:00.789+00	t
171	34aa22d9-a08f-4527-9c82-f7bb72317a90	fanduel	16	3	2025-09-28 01:12:01.317+00	t
270	03dd600b-e67e-4366-aa83-4f8064d5e637	fanduel	4	7.5	2025-10-21 11:51:11.961906+00	t
271	a0bc9b29-3caf-4f8c-b95e-0bfea2440159	fanduel	7	6.5	2025-10-21 11:51:12.065586+00	t
272	c4d0ce83-8c64-4335-a1c6-dbaef3dc437d	fanduel	22	7	2025-10-21 11:51:12.181952+00	t
277	4a4eae9c-49f2-499d-98d0-74ed05ec8de5	fanduel	14	14.5	2025-10-21 11:51:12.692465+00	t
273	54bbb810-a9f6-429d-8566-74105f370675	fanduel	28	1.5	2025-10-21 11:51:12.283581+00	f
275	d40a4cd2-199d-4eb4-8f53-56280a7c2cea	fanduel	30	5.5	2025-10-21 11:51:12.495443+00	f
276	76a24644-043c-480c-8da7-ca22493a0a1e	fanduel	10	3	2025-10-21 11:51:12.59432+00	f
267	25dd832e-7722-464a-b421-822312d3c78f	fanduel	18	3	2025-10-21 11:51:11.584951+00	f
274	5671a21f-0b89-492d-853d-59ae0cb71a52	fanduel	26	7	2025-10-21 11:51:12.379284+00	f
278	92b36759-ce64-498d-ba8b-a7f12943e57c	fanduel	12	3.5	2025-10-21 11:51:12.791846+00	f
279	efaf70eb-ea6d-4e22-8266-344f60da958b	fanduel	16	10.5	2025-10-21 11:51:12.91072+00	f
283	25dd832e-7722-464a-b421-822312d3c78f	fanduel	18	3.5	2025-10-22 13:40:36.455362+00	f
287	25dd832e-7722-464a-b421-822312d3c78f	fanduel	18	3	2025-10-23 20:00:59.375964+00	t
269	acd96b50-45a0-4a07-a642-9b81bfc8d0c1	fanduel	3	6.5	2025-10-21 11:51:11.835638+00	f
268	046f08a3-ef04-4ded-8b18-b2515807cab2	fanduel	2	7.5	2025-10-21 11:51:11.722954+00	f
290	046f08a3-ef04-4ded-8b18-b2515807cab2	fanduel	2	7	2025-10-25 23:19:15.463417+00	t
293	76a24644-043c-480c-8da7-ca22493a0a1e	fanduel	10	19.5	2025-10-26 23:35:53.309504+00	t
285	92b36759-ce64-498d-ba8b-a7f12943e57c	fanduel	12	3	2025-10-22 13:40:37.681356+00	f
298	1a3df7be-f3f0-47b3-a753-354988a838ed	fanduel	6	2.5	2025-10-28 12:30:58.205007+00	t
300	ec97ca0a-b28f-47fc-ad2e-3ce8360cc08e	fanduel	11	8.5	2025-10-28 12:30:58.475096+00	t
306	67db401c-4a5d-49ad-83b6-a80fbd9e9061	fanduel	16	1.5	2025-10-28 12:30:59.242699+00	t
302	95b479b5-7350-46eb-8d94-6b207de641c3	fanduel	18	10.5	2025-10-28 12:30:58.724274+00	f
311	7892dd22-384d-420b-8ac9-b38f80357891	fanduel	12	13.5	2025-10-30 20:02:11.394137+00	t
308	e488eb19-d62f-430e-9d7a-4e676413412e	fanduel	9	3	2025-10-28 12:30:59.523407+00	f
296	aec4a3ad-d44d-41e6-9406-ed365058f749	fanduel	22	5.5	2025-10-28 12:30:57.970236+00	f
315	aec4a3ad-d44d-41e6-9406-ed365058f749	fanduel	22	4.5	2025-11-01 11:51:21.726419+00	t
304	9bd25183-b8a2-4e89-a87a-7cbe662d3f98	fanduel	15	3	2025-10-28 12:30:58.962214+00	f
313	e488eb19-d62f-430e-9d7a-4e676413412e	fanduel	9	2.5	2025-10-30 20:02:12.644537+00	f
318	85783c17-265e-45dc-8071-cefa65a6a341	fanduel	14	3.5	2025-11-02 01:02:08.843877+00	t
323	4efa1b98-b52f-4eda-a313-d3260e091fae	fanduel	4	9.5	2025-11-04 10:49:49.355485+00	t
321	d064ce63-ab19-4c93-a5ce-2edbf9fc77f7	fanduel	14	5.5	2025-11-04 10:49:49.151915+00	f
336	8697092d-e82a-45e2-b869-fd31ece83fe2	fanduel	10	8.5	2025-11-06 11:25:41.769493+00	t
325	4ea577b3-c84b-4f40-acb5-e02431fe5b41	fanduel	6	3.5	2025-11-04 10:49:49.564972+00	f
331	a46ddd80-9686-4da2-868e-09f4b91eb3d9	fanduel	19	3.5	2025-11-04 10:49:50.18477+00	f
327	d40c4e28-2593-4343-8a62-7ef114e0eecf	fanduel	13	1.5	2025-11-04 10:49:49.784507+00	f
333	e38cc65d-0609-4b3a-a380-637396570080	fanduel	12	2.5	2025-11-04 10:49:50.748972+00	f
329	50e71e9f-3dd0-40fc-91e5-9b3ba56ecee6	fanduel	29	6.5	2025-11-04 10:49:49.983379+00	f
338	a46ddd80-9686-4da2-868e-09f4b91eb3d9	fanduel	19	4.5	2025-11-06 11:25:43.161429+00	f
343	50e71e9f-3dd0-40fc-91e5-9b3ba56ecee6	fanduel	29	7	2025-11-09 13:02:45.426711+00	f
346	a46ddd80-9686-4da2-868e-09f4b91eb3d9	fanduel	19	9.5	2025-11-09 21:35:38.552286+00	t
340	13f2fd71-3d1c-42e5-9f5c-99bb8f212547	fanduel	18	2.5	2025-11-06 22:48:57.669114+00	f
349	5dae185c-5c31-487f-a883-6381c6e0a1c8	fanduel	22	11.5	2025-11-11 11:26:24.100278+00	f
356	f49a3914-1a2b-4bbd-bd90-58f3d43f2ca1	fanduel	13	7.5	2025-11-11 11:26:24.82587+00	f
357	95407649-75c0-440d-8115-1a5442582203	fanduel	18	2.5	2025-11-11 11:26:24.921026+00	f
360	f58f0065-696f-4d1a-9e79-ee46d002c79a	fanduel	3	8.5	2025-11-11 11:26:25.206236+00	f
369	f58f0065-696f-4d1a-9e79-ee46d002c79a	fanduel	3	7.5	2025-11-13 01:18:33.007785+00	t
353	acabce6e-fe7c-425b-9253-b814cd6566b4	fanduel	21	3	2025-11-11 11:26:24.5292+00	f
352	3c5359bd-125e-4aec-ad9d-a5c4b0d3e30c	fanduel	4	5.5	2025-11-11 11:26:24.434732+00	f
373	3c5359bd-125e-4aec-ad9d-a5c4b0d3e30c	fanduel	4	8.5	2025-11-16 21:01:15.635882+00	t
367	95407649-75c0-440d-8115-1a5442582203	fanduel	18	3	2025-11-13 01:18:32.054545+00	f
361	c95835d4-c6eb-495c-9a7b-8549c0bb86e4	fanduel	16	3.5	2025-11-11 11:26:25.293802+00	f
377	c95835d4-c6eb-495c-9a7b-8549c0bb86e4	fanduel	16	4.5	2025-11-16 21:01:16.552869+00	t
378	6f0ab50a-2db9-4735-b55e-04baec9fc2d3	fanduel	4	5.5	2025-11-18 23:37:55.834771+00	t
386	bc2dbf36-4786-48e6-9721-e16c5c2eb3e2	fanduel	15	2.5	2025-11-18 23:37:57.07366+00	t
381	d2bdacae-dd5f-4dd4-8535-a65ff9e42774	fanduel	22	7.5	2025-11-18 23:37:56.312732+00	f
394	d2bdacae-dd5f-4dd4-8535-a65ff9e42774	fanduel	22	7.5	2025-11-23 00:09:08.011919+00	t
382	45cc932e-b1d3-4204-aa65-372f0e48111a	fanduel	11	10.5	2025-11-18 23:37:56.465315+00	f
385	6d12b6ae-fe56-49e5-80d2-4b51d40770ae	fanduel	29	13.5	2025-11-18 23:37:56.925614+00	f
389	31e33109-b008-489b-a37a-e13202ed0927	fanduel	26	3.5	2025-11-18 23:37:57.491614+00	f
390	ecacbc7b-cc64-4ed6-8ab6-10c433fb3ce9	fanduel	19	6.5	2025-11-18 23:37:57.638911+00	f
399	7bdfc892-5cad-43d2-b235-02afede1ecbd	fanduel	28	7.5	2025-11-23 11:39:46.483124+00	t
402	c4d15223-1220-412c-a372-c5d0b415fee2	fanduel	3	7	2025-11-25 12:50:39.637015+00	t
417	b556dadc-16a2-4062-9e07-c4801a270aea	fanduel	16	3.5	2025-11-27 00:58:34.480023+00	t
414	2ee03b3d-e61b-4633-b5ed-f234f3c51cd6	fanduel	10	6.5	2025-11-25 12:50:41.249719+00	f
426	e2e4275d-7bcf-4d9e-b8cc-b35a5703de8c	fanduel	4	3	2025-11-28 23:52:31.294239+00	t
423	18174242-6c62-47ff-967f-d60afcc3b0ae	fanduel	14	3.5	2025-11-28 12:48:42.93268+00	f
431	3bf722b0-695a-428a-a9fc-f77cd0901e52	fanduel	15	5.5	2025-11-30 13:07:40.628352+00	t
420	2ee03b3d-e61b-4633-b5ed-f234f3c51cd6	fanduel	10	5.5	2025-11-27 00:58:35.750358+00	f
406	47f0286f-2598-4319-911a-3592d0ca6f07	fanduel	19	10.5	2025-11-25 12:50:40.184717+00	f
434	b57ee556-4263-43bf-924d-b59dbfa152f3	fanduel	30	4.5	2025-11-30 17:32:02.276933+00	t
169	105ee53e-1599-447f-8df2-04a8f0e03d2e	fanduel	18	3	2025-09-28 01:12:00.271+00	t
172	d6ea14f2-b5c2-4ba7-b9cf-37a49c400434	fanduel	7	5.5	2025-09-28 01:12:01.754+00	t
173	d5e23358-9bcf-4a36-bd67-60364e49567a	fanduel	22	2.5	2025-09-28 01:12:02.255+00	t
174	3436f7cb-d383-468b-b676-6e76b51d01c4	fanduel	15	3.5	2025-09-28 01:12:02.804+00	t
175	f04d3d1d-2117-4f57-a099-0172487c75a8	fanduel	30	1.5	2025-09-28 01:12:03.309+00	t
176	36496369-7298-4ef1-a622-6ef72558e109	fanduel	14	1.5	2025-09-28 01:12:03.827+00	t
177	e30cf41d-c05f-48b8-bd5b-674138779e39	fanduel	32	6.5	2025-09-28 01:12:04.396+00	t
178	718b520f-2d47-4a41-b108-d0ac9faa34aa	fanduel	27	2.5	2025-09-28 01:12:04.946+00	t
179	35fae26e-9b57-4a1a-b750-2ee208cf10ce	fanduel	1	6.5	2025-09-28 01:12:05.488+00	t
180	ec0ec9d8-cc67-421e-803b-590bc9113f08	fanduel	28	1.5	2025-09-28 01:12:06.007+00	t
181	3afdd6f6-f374-4f39-8c50-84dfebe25813	fanduel	12	2.5	2025-09-28 01:12:06.506+00	t
182	97f057d9-d748-49ae-aa3a-837b3c5297ca	fanduel	10	8.5	2025-09-28 01:12:07.092+00	t
46	103aa0f9-e2fb-40e9-b656-520220ddab95	fanduel	13	3	2025-09-05 00:19:42.698+00	f
183	103aa0f9-e2fb-40e9-b656-520220ddab95	fanduel	19	3	2025-09-28 01:12:07.607+00	t
184	cddd40f9-a5e9-432d-8bfb-719361eab23b	fanduel	3	1.5	2025-09-28 01:12:08.194+00	t
185	b6e60bfc-587b-4409-b2e6-7dd034f8cbc1	fanduel	21	1.5	2025-09-28 01:12:08.771+00	t
186	bc9e35d8-20fa-44b4-be20-81e6c19c72e1	fanduel	4	14.5	2025-09-28 04:28:49.23535+00	t
188	fe4ccad3-2b0e-46f8-b2eb-c197e204cd5c	fanduel	21	3.5	2025-09-30 22:38:24.217126+00	t
189	b78e5b52-7747-43a0-9bd4-020c7223b8e3	fanduel	13	1.5	2025-09-30 22:38:24.31541+00	t
190	6a64a55f-f8da-41e8-a1ce-50a485f53127	fanduel	20	1.5	2025-09-30 22:38:24.41311+00	t
192	380e817d-fcde-418f-9eb1-a97bb993e03e	fanduel	26	4.5	2025-09-30 22:38:24.587745+00	t
194	0b349bf3-4672-4285-9a9a-8330f11f8c22	fanduel	23	1.5	2025-09-30 22:38:24.774497+00	t
195	58b00d24-143e-48a2-a202-07a1b3975fc3	fanduel	1	8.5	2025-09-30 22:38:24.871274+00	t
197	2669b044-2985-4243-a9ab-9b725dccee62	fanduel	11	10.5	2025-09-30 22:38:25.067772+00	t
187	6d3724f1-646a-4345-9f21-6f0b4932664c	fanduel	19	5.5	2025-09-30 22:38:24.113588+00	f
201	6d3724f1-646a-4345-9f21-6f0b4932664c	fanduel	19	7	2025-10-01 14:05:44.002464+00	f
202	6d3724f1-646a-4345-9f21-6f0b4932664c	fanduel	19	8.5	2025-10-02 21:38:09.411529+00	t
191	86f55afb-4e15-4949-a2bc-ff38a995263f	fanduel	9	2.5	2025-09-30 22:38:24.500298+00	f
203	86f55afb-4e15-4949-a2bc-ff38a995263f	fanduel	9	1.5	2025-10-05 01:36:00.8868+00	t
193	ebba52ce-db32-4ea8-909d-eaf8c90105be	fanduel	14	6.5	2025-09-30 22:38:24.678954+00	f
204	ebba52ce-db32-4ea8-909d-eaf8c90105be	fanduel	14	7	2025-10-05 01:36:01.097234+00	t
196	bde2234a-6b87-4b5e-85dd-37c092bc3047	fanduel	29	3	2025-09-30 22:38:24.977897+00	f
205	bde2234a-6b87-4b5e-85dd-37c092bc3047	fanduel	29	3.5	2025-10-05 01:36:01.332966+00	t
198	c9bc16f7-9a25-429d-98f3-5c7a3ebc8414	fanduel	18	2.5	2025-09-30 22:38:25.156415+00	f
206	c9bc16f7-9a25-429d-98f3-5c7a3ebc8414	fanduel	32	16.5	2025-10-05 23:24:02.887019+00	t
199	8d1ac3c2-a669-4274-9d81-20e1f51b9bae	fanduel	4	8.5	2025-09-30 22:38:25.233409+00	f
207	8d1ac3c2-a669-4274-9d81-20e1f51b9bae	fanduel	4	7.5	2025-10-05 23:24:03.026897+00	t
200	d2ac537e-3d10-4662-b6f5-836d8255ffab	fanduel	16	3	2025-09-30 22:38:25.34009+00	f
208	d2ac537e-3d10-4662-b6f5-836d8255ffab	fanduel	16	3.5	2025-10-05 23:24:03.136605+00	f
209	d2ac537e-3d10-4662-b6f5-836d8255ffab	fanduel	16	4.5	2025-10-07 00:20:20.659752+00	t
210	9f96ae20-7274-4d44-8194-71356e732dca	fanduel	26	7.5	2025-10-07 00:20:20.799578+00	t
211	b30ae39f-ba57-4fc8-a725-8923136dca9c	fanduel	10	7	2025-10-07 00:20:20.899927+00	t
215	89626ca3-e73a-4c09-b1e3-76715d62524f	fanduel	27	5.5	2025-10-07 00:20:21.34728+00	t
219	85594600-e73f-49ee-a6bd-d52165c66b91	fanduel	22	3.5	2025-10-07 00:20:21.816524+00	t
220	e5b67945-f649-42a4-a3e8-2b8f21b8a88f	fanduel	12	14.5	2025-10-07 00:20:21.917178+00	t
216	9c472cce-9d22-412c-aa47-a9a40c7bbc23	fanduel	29	1.5	2025-10-07 00:20:21.479987+00	f
223	cab2be71-af69-4508-ac1d-06399b390190	fanduel	4	4.5	2025-10-07 00:20:22.258392+00	f
222	4c912b18-1027-4560-9cb6-3b20c73ac4d1	fanduel	16	1.5	2025-10-07 00:20:22.13549+00	f
227	4c912b18-1027-4560-9cb6-3b20c73ac4d1	fanduel	16	2.5	2025-10-08 12:23:32.346148+00	t
226	cab2be71-af69-4508-ac1d-06399b390190	fanduel	4	3.5	2025-10-07 12:08:58.824704+00	f
214	2165e08b-e5aa-4f76-adf9-ab393a4baa89	fanduel	9	3.5	2025-10-07 00:20:21.245591+00	f
229	2165e08b-e5aa-4f76-adf9-ab393a4baa89	fanduel	9	3	2025-10-08 18:16:10.015026+00	t
218	1c857c6e-f8b9-433f-949d-1d26a99838c9	fanduel	17	5.5	2025-10-07 00:20:21.702621+00	f
230	1c857c6e-f8b9-433f-949d-1d26a99838c9	fanduel	17	4.5	2025-10-08 22:21:12.40632+00	t
212	6cce17a8-edfb-4c7f-b706-3ae198691439	fanduel	14	6.5	2025-10-07 00:20:21.000144+00	f
225	9c472cce-9d22-412c-aa47-a9a40c7bbc23	fanduel	15	1.5	2025-10-07 12:08:57.949013+00	f
232	9c472cce-9d22-412c-aa47-a9a40c7bbc23	fanduel	29	1.5	2025-10-11 12:44:38.444596+00	t
213	7cb87419-fddd-4928-a943-391bd5227e2e	fanduel	19	7.5	2025-10-07 00:20:21.128935+00	f
233	7cb87419-fddd-4928-a943-391bd5227e2e	fanduel	19	7	2025-10-11 12:44:38.721777+00	t
221	6e5d4e91-b8ad-41df-9950-6d5fe79173b6	fanduel	30	3	2025-10-07 00:20:22.01622+00	f
234	6e5d4e91-b8ad-41df-9950-6d5fe79173b6	fanduel	30	3.5	2025-10-11 12:44:39.292589+00	t
231	6cce17a8-edfb-4c7f-b706-3ae198691439	fanduel	14	7	2025-10-10 17:16:22.57331+00	f
235	6cce17a8-edfb-4c7f-b706-3ae198691439	fanduel	14	9.5	2025-10-12 12:11:57.480906+00	t
217	b670f639-9ca2-4bc3-b9c5-d7f37ddc49c0	fanduel	18	4.5	2025-10-07 00:20:21.582666+00	f
236	b670f639-9ca2-4bc3-b9c5-d7f37ddc49c0	fanduel	18	3.5	2025-10-12 12:11:57.815007+00	t
228	cab2be71-af69-4508-ac1d-06399b390190	fanduel	4	4.5	2025-10-08 12:23:32.503246+00	f
237	cab2be71-af69-4508-ac1d-06399b390190	fanduel	4	3.5	2025-10-12 23:43:14.367282+00	t
224	06cc8eea-773e-43ae-b42f-4b8d732163f2	fanduel	32	4.5	2025-10-07 00:20:22.379445+00	f
238	06cc8eea-773e-43ae-b42f-4b8d732163f2	fanduel	32	5.5	2025-10-12 23:43:14.535968+00	t
239	b31c97c4-c4f1-4e44-8152-1e84c0d4b5d9	fanduel	27	5.5	2025-10-14 16:34:39.308097+00	t
245	d6041bda-3122-4abd-98cd-440d718d5848	fanduel	26	2.5	2025-10-14 16:34:40.323547+00	t
252	a2115ef5-9262-4cb0-872f-8d9c26fad40d	fanduel	11	5.5	2025-10-14 16:34:41.388108+00	t
241	b779443d-d9af-49d2-8259-6d8ed08ca2cb	fanduel	6	5.5	2025-10-14 16:34:39.618214+00	f
254	b779443d-d9af-49d2-8259-6d8ed08ca2cb	fanduel	6	4.5	2025-10-16 23:21:11.620955+00	t
243	9ff54761-9d51-46d8-82c3-ecfde5287333	fanduel	8	3	2025-10-14 16:34:40.003239+00	f
255	9ff54761-9d51-46d8-82c3-ecfde5287333	fanduel	8	2.5	2025-10-16 23:21:11.804185+00	t
251	e5bd2954-cf2a-4f63-9fa2-50576c33b631	fanduel	28	2.5	2025-10-14 16:34:41.24153+00	f
244	ce91cd15-e3fa-4dfe-8f38-52188d702923	fanduel	16	11.5	2025-10-14 16:34:40.205392+00	f
257	ce91cd15-e3fa-4dfe-8f38-52188d702923	fanduel	16	12.5	2025-10-19 00:16:09.765144+00	t
246	a3b2b894-f152-49e4-9a39-2accf094cd2c	fanduel	22	7	2025-10-14 16:34:40.49416+00	f
258	a3b2b894-f152-49e4-9a39-2accf094cd2c	fanduel	22	6.5	2025-10-19 00:16:09.976544+00	t
250	f47d6300-b4dd-4d9a-ab0b-e9196b98207d	fanduel	12	6.5	2025-10-14 16:34:41.102609+00	f
259	f47d6300-b4dd-4d9a-ab0b-e9196b98207d	fanduel	12	7	2025-10-19 00:16:10.21563+00	t
249	8a1a95b1-e629-4e81-bbce-bcdea7b945bb	fanduel	32	1.5	2025-10-14 16:34:40.962411+00	f
260	8a1a95b1-e629-4e81-bbce-bcdea7b945bb	fanduel	9	1.5	2025-10-19 00:16:10.323039+00	t
253	be4e70f7-a563-4858-971f-7007001a227c	fanduel	29	3.5	2025-10-14 16:34:41.53249+00	f
261	be4e70f7-a563-4858-971f-7007001a227c	fanduel	29	3	2025-10-19 00:16:10.560514+00	t
240	a10d2e03-a21f-4d06-8752-a46f00fe648b	fanduel	19	3	2025-10-14 16:34:39.469458+00	f
262	a10d2e03-a21f-4d06-8752-a46f00fe648b	fanduel	19	17.5	2025-10-19 15:18:17.561144+00	t
242	d021ef41-a018-46b2-a041-0e0ce8d684b8	fanduel	5	1.5	2025-10-14 16:34:39.812301+00	f
263	d021ef41-a018-46b2-a041-0e0ce8d684b8	fanduel	25	1.5	2025-10-19 15:18:17.689117+00	t
247	5f1076db-c38a-4250-8f63-b901fcd83cce	fanduel	10	7	2025-10-14 16:34:40.648175+00	f
248	b5de4725-8056-4e20-8a2e-712260bf3e53	fanduel	18	1.5	2025-10-14 16:34:40.801485+00	f
256	e5bd2954-cf2a-4f63-9fa2-50576c33b631	fanduel	28	1.5	2025-10-16 23:21:12.53268+00	f
264	5f1076db-c38a-4250-8f63-b901fcd83cce	fanduel	10	8.5	2025-10-19 15:18:18.258481+00	t
284	5671a21f-0b89-492d-853d-59ae0cb71a52	fanduel	26	7.5	2025-10-22 13:40:37.249383+00	t
288	acd96b50-45a0-4a07-a642-9b81bfc8d0c1	fanduel	3	7	2025-10-24 19:14:21.609967+00	f
291	acd96b50-45a0-4a07-a642-9b81bfc8d0c1	fanduel	3	1.5	2025-10-25 23:19:15.597801+00	t
281	d40a4cd2-199d-4eb4-8f53-56280a7c2cea	fanduel	30	4.5	2025-10-21 21:06:20.042228+00	f
294	92b36759-ce64-498d-ba8b-a7f12943e57c	fanduel	12	2.5	2025-10-26 23:35:53.422834+00	t
309	95b479b5-7350-46eb-8d94-6b207de641c3	fanduel	18	9.5	2025-10-29 12:45:49.670901+00	t
312	d1c9abe6-1923-41d8-b06b-cae30c9bd58f	fanduel	29	3	2025-10-30 20:02:12.524617+00	t
316	9bd25183-b8a2-4e89-a87a-7cbe662d3f98	fanduel	15	2.5	2025-11-01 11:51:22.469187+00	t
319	e488eb19-d62f-430e-9d7a-4e676413412e	fanduel	9	3	2025-11-02 01:02:09.376406+00	t
334	d064ce63-ab19-4c93-a5ce-2edbf9fc77f7	fanduel	14	6.5	2025-11-04 23:36:27.252092+00	t
337	4ea577b3-c84b-4f40-acb5-e02431fe5b41	fanduel	6	4.5	2025-11-06 11:25:42.200865+00	t
344	a46ddd80-9686-4da2-868e-09f4b91eb3d9	fanduel	19	5.5	2025-11-09 13:02:45.625128+00	f
341	cbc66c57-d654-486c-ae72-4ef57f0a3fe7	fanduel	11	7.5	2025-11-08 20:16:46.128052+00	f
347	cbc66c57-d654-486c-ae72-4ef57f0a3fe7	fanduel	11	12.5	2025-11-09 21:35:38.727586+00	t
350	41c027c6-fa5c-4a26-a7b6-3207cce3ebe6	fanduel	20	2.5	2025-11-11 11:26:24.223825+00	t
364	5dae185c-5c31-487f-a883-6381c6e0a1c8	fanduel	22	12.5	2025-11-13 01:18:31.115918+00	t
368	358d48e8-bed8-4dc9-a3a2-a45116df0833	fanduel	19	3	2025-11-13 01:18:32.87246+00	t
362	af39c4f7-7bbc-445f-9596-0ee71f84d732	fanduel	26	1.5	2025-11-11 11:26:25.383534+00	f
370	af39c4f7-7bbc-445f-9596-0ee71f84d732	fanduel	26	2.5	2025-11-13 01:18:33.232904+00	t
371	acabce6e-fe7c-425b-9253-b814cd6566b4	fanduel	21	2.5	2025-11-14 00:50:49.085302+00	t
366	f49a3914-1a2b-4bbd-bd90-58f3d43f2ca1	fanduel	13	6.5	2025-11-13 01:18:31.931173+00	f
354	2ce2ef92-1078-461b-abda-6d1911a0a056	fanduel	27	5.5	2025-11-11 11:26:24.650768+00	f
374	2ce2ef92-1078-461b-abda-6d1911a0a056	fanduel	27	14.5	2025-11-16 21:01:15.814384+00	t
358	01ced56f-5413-4445-b791-af1bc821d0cc	fanduel	28	3	2025-11-11 11:26:25.018919+00	f
376	01ced56f-5413-4445-b791-af1bc821d0cc	fanduel	28	3.5	2025-11-16 21:01:16.284227+00	t
379	79b2ed90-8c59-4bc9-92f0-2489d70c2da7	fanduel	3	13.5	2025-11-18 23:37:56.019155+00	t
383	e266dc82-da06-45ad-b515-1658832012d5	fanduel	12	6.5	2025-11-18 23:37:56.593655+00	t
387	431b3ac4-42da-42a1-9a49-3b791f370ab2	fanduel	17	3.5	2025-11-18 23:37:57.223194+00	t
392	d2bdacae-dd5f-4dd4-8535-a65ff9e42774	fanduel	22	6.5	2025-11-20 15:19:06.398087+00	f
395	45cc932e-b1d3-4204-aa65-372f0e48111a	fanduel	11	12.5	2025-11-23 00:09:08.123534+00	t
397	31e33109-b008-489b-a37a-e13202ed0927	fanduel	26	3	2025-11-23 00:09:08.710708+00	t
391	7bdfc892-5cad-43d2-b235-02afede1ecbd	fanduel	28	7	2025-11-18 23:37:57.789527+00	f
403	cc3cd25a-c004-40fa-a591-d8bbbb2ea929	fanduel	26	7	2025-11-25 12:50:39.781503+00	t
415	bd93f9ba-f462-4a2b-9d3c-8e7795cda802	fanduel	22	7.5	2025-11-25 12:50:41.383187+00	t
407	8680b02f-3c5c-405a-8de9-37384b0667d4	fanduel	28	6.5	2025-11-25 12:50:40.352483+00	f
404	b57ee556-4263-43bf-924d-b59dbfa152f3	fanduel	30	3	2025-11-25 12:50:39.928352+00	f
411	bf3f67e5-389a-4bd0-a40e-36cd2780ea22	fanduel	29	10.5	2025-11-25 12:50:40.88045+00	f
400	5cf03998-5733-4976-bd8d-f70cd50718fb	fanduel	11	2.5	2025-11-25 12:50:39.335598+00	f
421	5cf03998-5733-4976-bd8d-f70cd50718fb	fanduel	11	3	2025-11-27 15:00:00.505665+00	t
408	18174242-6c62-47ff-967f-d60afcc3b0ae	fanduel	14	4.5	2025-11-25 12:50:40.490154+00	f
418	b57ee556-4263-43bf-924d-b59dbfa152f3	fanduel	30	2.5	2025-11-27 00:58:34.721689+00	f
412	e2e4275d-7bcf-4d9e-b8cc-b35a5703de8c	fanduel	4	3.5	2025-11-25 12:50:41.004944+00	f
424	b57ee556-4263-43bf-924d-b59dbfa152f3	fanduel	30	4.5	2025-11-28 23:52:30.489701+00	f
429	8680b02f-3c5c-405a-8de9-37384b0667d4	fanduel	28	5.5	2025-11-30 13:07:40.414813+00	t
427	b57ee556-4263-43bf-924d-b59dbfa152f3	fanduel	30	3.5	2025-11-30 13:07:40.064892+00	f
432	2ee03b3d-e61b-4633-b5ed-f234f3c51cd6	fanduel	10	6.5	2025-11-30 13:07:41.006221+00	f
265	b5de4725-8056-4e20-8a2e-712260bf3e53	fanduel	18	2.5	2025-10-19 15:18:18.399556+00	t
266	e5bd2954-cf2a-4f63-9fa2-50576c33b631	fanduel	2	1.5	2025-10-19 15:18:18.675111+00	t
286	efaf70eb-ea6d-4e22-8266-344f60da958b	fanduel	16	11.5	2025-10-23 13:09:19.421087+00	t
280	54bbb810-a9f6-429d-8566-74105f370675	fanduel	13	1.5	2025-10-21 21:06:19.829488+00	f
289	54bbb810-a9f6-429d-8566-74105f370675	fanduel	13	2.5	2025-10-24 19:14:22.042448+00	t
292	d40a4cd2-199d-4eb4-8f53-56280a7c2cea	fanduel	30	3.5	2025-10-25 23:19:16.079046+00	t
282	76a24644-043c-480c-8da7-ca22493a0a1e	fanduel	10	3.5	2025-10-21 21:06:20.157133+00	f
299	112270ae-a6ed-426b-adac-56a0afff3476	fanduel	13	1.5	2025-10-28 12:30:58.334623+00	t
303	f3676ad2-38c0-4af9-b8ae-f57be8657020	fanduel	28	2.5	2025-10-28 12:30:58.847119+00	t
305	e2a776f8-11a6-4a08-9c21-ee1a62e72176	fanduel	19	13.5	2025-10-28 12:30:59.119616+00	f
310	e2a776f8-11a6-4a08-9c21-ee1a62e72176	fanduel	19	14.5	2025-10-29 12:45:49.95593+00	t
297	7892dd22-384d-420b-8ac9-b38f80357891	fanduel	12	12.5	2025-10-28 12:30:58.081253+00	f
307	d1c9abe6-1923-41d8-b06b-cae30c9bd58f	fanduel	29	3.5	2025-10-28 12:30:59.398399+00	f
295	f17681b2-38c7-4e9c-828b-72a18f4d0197	fanduel	3	7.5	2025-10-28 12:30:57.833545+00	f
314	f17681b2-38c7-4e9c-828b-72a18f4d0197	fanduel	3	9.5	2025-10-31 01:29:52.279914+00	t
301	85783c17-265e-45dc-8071-cefa65a6a341	fanduel	14	3	2025-10-28 12:30:58.602518+00	f
317	e488eb19-d62f-430e-9d7a-4e676413412e	fanduel	9	3.5	2025-11-01 11:51:22.817031+00	f
322	c326aa68-4af8-4b34-bf37-d8dbd1752bdc	fanduel	3	4.5	2025-11-04 10:49:49.256292+00	t
324	ba2b69b7-f9ba-467e-99da-26b8de97ade4	fanduel	5	5.5	2025-11-04 10:49:49.454707+00	t
328	b134cf70-c00d-45e0-95e1-8b400db16f9d	fanduel	30	2.5	2025-11-04 10:49:49.884566+00	t
326	73898b0c-165c-4160-8e2f-04fc60d929db	fanduel	25	1.5	2025-11-04 10:49:49.685456+00	f
335	73898b0c-165c-4160-8e2f-04fc60d929db	fanduel	8	2.5	2025-11-04 23:36:27.682492+00	t
320	8697092d-e82a-45e2-b869-fd31ece83fe2	fanduel	10	9.5	2025-11-04 10:49:49.00382+00	f
339	d40c4e28-2593-4343-8a62-7ef114e0eecf	fanduel	15	1.5	2025-11-06 22:48:57.180363+00	t
332	13f2fd71-3d1c-42e5-9f5c-99bb8f212547	fanduel	18	3	2025-11-04 10:49:50.284323+00	f
330	cbc66c57-d654-486c-ae72-4ef57f0a3fe7	fanduel	11	8.5	2025-11-04 10:49:50.085638+00	f
342	e38cc65d-0609-4b3a-a380-637396570080	fanduel	12	1.5	2025-11-08 20:16:46.460044+00	t
345	50e71e9f-3dd0-40fc-91e5-9b3ba56ecee6	fanduel	29	20.5	2025-11-09 21:35:38.409999+00	t
348	13f2fd71-3d1c-42e5-9f5c-99bb8f212547	fanduel	18	3	2025-11-09 21:35:38.854388+00	t
351	4a71fd05-215f-4ff9-a9a5-3ca7f0bb5938	fanduel	2	3.5	2025-11-11 11:26:24.335017+00	t
363	7c66af18-7fe5-403b-8a74-fc66d3e13e5f	fanduel	9	3.5	2025-11-11 11:26:25.481358+00	t
355	3cc444f7-1d14-4ca8-8871-dbfb2b3607b0	fanduel	12	7.5	2025-11-11 11:26:24.743388+00	f
365	3cc444f7-1d14-4ca8-8871-dbfb2b3607b0	fanduel	12	7	2025-11-13 01:18:31.791522+00	t
359	358d48e8-bed8-4dc9-a3a2-a45116df0833	fanduel	19	2.5	2025-11-11 11:26:25.113442+00	f
372	f49a3914-1a2b-4bbd-bd90-58f3d43f2ca1	fanduel	13	5.5	2025-11-14 00:50:49.433785+00	t
375	95407649-75c0-440d-8115-1a5442582203	fanduel	15	29.5	2025-11-16 21:01:15.972252+00	t
380	e4f9bc56-5420-4c15-8992-4feb8126e69a	fanduel	6	2.5	2025-11-18 23:37:56.15818+00	t
384	1a9a4ec2-e36e-445c-a230-904155133ad1	fanduel	16	3.5	2025-11-18 23:37:56.751142+00	t
388	834c89e5-0e51-4aca-9d66-d414bafa77e1	fanduel	23	1.5	2025-11-18 23:37:57.349397+00	t
393	d2bdacae-dd5f-4dd4-8535-a65ff9e42774	fanduel	22	5.5	2025-11-21 11:41:18.389479+00	f
396	6d12b6ae-fe56-49e5-80d2-4b51d40770ae	fanduel	29	12.5	2025-11-23 00:09:08.414933+00	t
398	ecacbc7b-cc64-4ed6-8ab6-10c433fb3ce9	fanduel	19	7	2025-11-23 00:09:08.810735+00	t
410	5d229b96-7da4-4fcb-a0d5-0bdcae77558e	fanduel	20	5.5	2025-11-25 12:50:40.764481+00	t
413	3d891558-07e3-4160-b83c-5b4a7d5f63df	fanduel	18	9.5	2025-11-25 12:50:41.135587+00	t
401	b556dadc-16a2-4062-9e07-c4801a270aea	fanduel	16	3	2025-11-25 12:50:39.497744+00	f
419	bf3f67e5-389a-4bd0-a40e-36cd2780ea22	fanduel	29	11.5	2025-11-27 00:58:35.447014+00	t
416	8680b02f-3c5c-405a-8de9-37384b0667d4	fanduel	28	5.5	2025-11-26 01:01:40.833916+00	f
422	8680b02f-3c5c-405a-8de9-37384b0667d4	fanduel	28	5	2025-11-27 15:00:01.391519+00	f
405	bb418583-3bf5-46ba-beb3-f4257a017cb7	fanduel	2	2.5	2025-11-25 12:50:40.054125+00	f
428	bb418583-3bf5-46ba-beb3-f4257a017cb7	fanduel	2	3	2025-11-30 13:07:40.199169+00	t
425	8680b02f-3c5c-405a-8de9-37384b0667d4	fanduel	28	4.5	2025-11-28 23:52:30.772181+00	f
430	18174242-6c62-47ff-967f-d60afcc3b0ae	fanduel	14	3	2025-11-30 13:07:40.520954+00	t
409	3bf722b0-695a-428a-a9fc-f77cd0901e52	fanduel	15	6.5	2025-11-25 12:50:40.650314+00	f
433	47f0286f-2598-4319-911a-3592d0ca6f07	fanduel	19	9.5	2025-11-30 17:32:01.748499+00	t
435	2ee03b3d-e61b-4633-b5ed-f234f3c51cd6	fanduel	10	5.5	2025-11-30 17:32:02.673097+00	t
438	fc8b6b92-e30a-4eeb-9530-04be061b5b49	fanduel	4	1.5	2025-12-13 06:28:09.524924+00	t
439	9425fac9-f534-4e02-b3d3-e3425b63c37e	fanduel	6	7.5	2025-12-13 06:28:09.728712+00	t
440	b4b93246-ac64-441d-8183-daca2214f1ec	fanduel	15	13.5	2025-12-13 06:28:09.836782+00	t
441	47b92751-161b-4dd5-93e0-2d60f012c09d	fanduel	16	5.5	2025-12-13 06:28:09.924821+00	t
442	b8833a95-dd4f-4e97-8c5d-1d79a6cc696b	fanduel	26	11.5	2025-12-13 06:28:10.020332+00	t
443	e13d70a2-d74f-47a0-8f68-cd165fc26500	fanduel	24	2.5	2025-12-13 06:28:10.107745+00	t
444	b4e62942-84c5-4c25-a189-b2b586fdd4b0	fanduel	5	2.5	2025-12-13 06:28:10.194468+00	t
446	97bb60db-40e1-4c11-bc42-3fc35ee8515f	fanduel	19	5.5	2025-12-13 06:28:10.463627+00	t
447	576a386b-69db-4c2a-bf7b-dc083b926ee4	fanduel	29	13.5	2025-12-13 06:28:10.560708+00	t
448	69737801-2958-40a5-9829-30b076fea2b5	fanduel	28	12.5	2025-12-13 06:28:10.636257+00	t
450	2ed27ee2-f524-4af9-ae41-62ac2b4a6555	fanduel	27	3	2025-12-13 06:28:10.7935+00	t
436	867e50da-8f73-4b9b-a725-c4dac87acf9e	fanduel	13	9.5	2025-12-13 06:28:09.273034+00	f
451	867e50da-8f73-4b9b-a725-c4dac87acf9e	fanduel	13	10.5	2025-12-14 14:36:42.786221+00	t
437	89456c0a-e395-4cdf-812d-219181f2eb9c	fanduel	3	2.5	2025-12-13 06:28:09.389254+00	f
452	89456c0a-e395-4cdf-812d-219181f2eb9c	fanduel	3	3	2025-12-14 14:36:42.976365+00	t
445	98d4c4a3-df38-4df5-8b79-4af1bec8f32e	fanduel	12	2.5	2025-12-13 06:28:10.324477+00	f
453	98d4c4a3-df38-4df5-8b79-4af1bec8f32e	fanduel	12	1.5	2025-12-14 14:36:43.685274+00	t
449	78636bdf-153e-476d-a4b9-4e0ac3f8d56b	fanduel	9	6.5	2025-12-13 06:28:10.719495+00	f
454	78636bdf-153e-476d-a4b9-4e0ac3f8d56b	fanduel	9	5.5	2025-12-14 14:36:43.986231+00	t
\.
COPY public.games (id, week_id, external_game_id, commence_time, home_team_id, away_team_id, status, final_scores) FROM stdin;
13a5b004-d94d-4fef-9586-6a0af5dfedec	9	4dd631102a977fd398f7ea594ed208f2	2025-09-28 13:31:00+00	27	21	scheduled	{"away": "21", "home": "24"}
8417d24a-a09d-4f23-ab21-40f016ed3bd3	9	bcb1f89cf378a586097c50585e53acce	2025-09-28 17:00:00+00	11	8	scheduled	{"away": "10", "home": "34"}
d5e23358-9bcf-4a36-bd67-60364e49567a	10	0b2455795dfcd692dd607503e4f20d04	2025-09-07 17:00:00+00	22	17	final	{"away": 20, "home": 13}
3436f7cb-d383-468b-b676-6e76b51d01c4	10	394256a6c3d0f5ecd1208fffaae6a72f	2025-09-07 17:00:00+00	15	5	final	{"away": 10, "home": 26}
103aa0f9-e2fb-40e9-b656-520220ddab95	10	dc0e3db61983a138098f28226788d2d3	2025-09-07 20:25:00+00	19	13	final	{"away": 9, "home": 14}
35fae26e-9b57-4a1a-b750-2ee208cf10ce	10	557d13ef8f4c1d21044f3a478cda6d0b	2025-09-07 17:00:00+00	23	1	final	{"away": 20, "home": 13}
ec0ec9d8-cc67-421e-803b-590bc9113f08	10	9f1ad249959aacae89e5e74e43429a4a	2025-09-07 20:05:00+00	29	28	final	{"away": 17, "home": 13}
3afdd6f6-f374-4f39-8c50-84dfebe25813	10	8e0e2d9237098222f9ca7554b11b12bb	2025-09-07 20:25:00+00	12	11	final	{"away": 13, "home": 27}
97f057d9-d748-49ae-aa3a-837b3c5297ca	10	68397f3aa9eb847a421a49f990a11928	2025-09-07 20:05:00+00	10	31	final	{"away": 12, "home": 20}
cddd40f9-a5e9-432d-8bfb-719361eab23b	10	dee0a41ed5e8201a96d457899adbe918	2025-09-08 00:20:00+00	4	3	final	{"away": 40, "home": 41}
b6e60bfc-587b-4409-b2e6-7dd034f8cbc1	10	c6d7807cee33d5e81c671527b9c8b3f1	2025-09-09 00:15:00+00	6	21	final	{"away": 27, "home": 24}
242131ad-16bf-4fd6-8e5e-65b6d2e79cf1	9	4a08b89f07a4a395620f6df5c1d239f4	2025-09-26 00:16:00+00	1	29	final	{"away": "23", "home": "20"}
105ee53e-1599-447f-8df2-04a8f0e03d2e	17	bebae12f59f19bd877df7ac3cab05263	2025-09-16 02:00:00+00	17	18	final	{"away": 20, "home": 9}
63be1bd1-8401-4d9c-850a-3c48a0aa2542	10	f1bc532dff946d15cb85654b5c4b246e	2025-09-05 00:22:00+00	26	9	final	{"away": 20, "home": 24}
b3236d16-a2ac-49f8-97f9-347a9d64c8d1	4	ee840f13db8bd150fcdd8f6670fa7041	2025-09-22 00:21:00+00	24	16	final	{"away": 22, "home": 9}
b92f4877-3642-4dad-8a58-cbbc33acaa27	4	02522f48a7b7e7524881c1b1638cd94d	2025-09-21 17:00:00+00	30	25	final	{"away": 27, "home": 29}
a6646dac-f8d6-473f-96fc-0e711dd92011	4	6e67ddae4bb01d1c2d3f461ee62d2666	2025-09-23 00:15:00+00	3	11	final	{"away": 38, "home": 30}
2954f2b9-b9ae-4d88-8c86-1be1a49f6f8a	4	581955d1b79fe87a3a61a4885cd7ea67	2025-09-21 17:00:00+00	8	12	final	{"away": 10, "home": 13}
fdd4448f-e730-4933-89a9-f4d40456b4d7	17	7e2ad5ef04493526707e0868f7b70c47	2025-09-14 20:05:00+00	1	5	final	{"away": 22, "home": 27}
67abe3aa-726e-41ef-baeb-b1d0bbd94e2f	4	c4c42918a645b1a4773f47d7eaa5cfcf	2025-09-21 17:00:00+00	22	27	final	{"away": 21, "home": 14}
0ba7b515-e8f9-4a04-8790-990094e4c9cf	4	0ee3f5a0078c21cfdffd1b97002e7da5	2025-09-21 20:05:00+00	18	10	final	{"away": 20, "home": 23}
dc820270-eba7-46bf-b0ea-a266032ff812	4	311c411c2d53e36a902763dc7a2ef678	2025-09-21 20:05:00+00	29	23	final	{"away": 13, "home": 44}
1211281f-ad14-48b6-86e4-a4eb98d667d0	4	4c4ae4a2d54fc3f71c450187e9391ddc	2025-09-21 17:01:00+00	26	19	final	{"away": 26, "home": 33}
080e3432-5c2c-4228-8de9-48845f5b826d	4	bb506016737825f4d0b1f9862f95c246	2025-09-21 17:01:00+00	31	14	final	{"away": 41, "home": 20}
0318ac4a-51fa-4197-9a58-d5a066c5c7cd	4	eefb7f130c8fc2c129e296fe5c6ba3e3	2025-09-21 17:00:00+00	21	7	final	{"away": 10, "home": 48}
509947e1-c9f4-4dea-869e-18f0ae6560b4	4	20b50dac292089c063b21e1410f172ef	2025-09-21 20:26:00+00	28	1	final	{"away": 15, "home": 16}
6e913449-02a1-41ef-9139-55aab1625913	4	97de7672b61dbddbce982711c121e76d	2025-09-21 17:00:00+00	15	13	final	{"away": 10, "home": 17}
7e68fe65-8ae9-4e71-ac41-ae6b9a3a7d62	17	0c6e5d9821ce0d3e82f3e792879776a6	2025-09-12 00:16:00+00	12	32	final	{"away": 18, "home": 27}
336dd0e8-7642-45af-a8a6-493dae1bedbc	17	553edb8bf2452482b37dde58e832a6fb	2025-09-14 17:01:00+00	3	8	final	{"away": 17, "home": 41}
bc9e35d8-20fa-44b4-be20-81e6c19c72e1	9	d16a43752aaac66e9ff8768d8590b662	2025-09-28 17:01:00+00	4	23	scheduled	{"away": "19", "home": "31"}
250c968a-cb9d-4060-a785-2dfbce12c181	4	aca5234c57e31b1931e51d2d0d6046f5	2025-09-19 00:15:00+00	4	20	scheduled	{"away": "21", "home": "31"}
49926afd-6329-4124-9846-7a044272ac54	17	0e6f68b30237afc04d1517a193213a65	2025-09-14 17:01:00+00	31	19	final	{"away": 33, "home": 19}
5334cd67-c846-4303-b979-4636a885b1b6	17	1ee9ea2c8256bc6be5dd92e60f6c17de	2025-09-14 17:00:00+00	11	6	final	{"away": 21, "home": 52}
fa733f3c-4b1a-442c-a331-8d2651040165	17	cd0fd9335b5182d3bfed35ab8d5ab6fb	2025-09-14 17:01:00+00	25	4	final	{"away": 30, "home": 10}
3c511a07-f80a-4dc2-bc49-40a3fbe5ddb3	17	05a5b084f4e19535b2d3f91ef5c00169	2025-09-14 17:00:00+00	9	24	final	{"away": 37, "home": 40}
3ec70270-c7f5-42b0-9220-34405add51e7	17	866d7405986fb4d14897cdb6c0aa5926	2025-09-14 17:01:00+00	23	28	final	{"away": 26, "home": 21}
a9ade8e0-8fb2-4c2b-917b-7191424388e7	17	575c1b169aab675ec72372ccb0f4c55f	2025-09-14 17:00:00+00	20	22	final	{"away": 33, "home": 24}
2c53b774-736f-410c-b671-9ec4f1493fbd	17	ec75e45d75691f810f347e0c5ff25d6e	2025-09-14 17:00:00+00	7	15	final	{"away": 27, "home": 31}
01b3a495-1daf-4b24-99e2-a903e786b1be	17	82f9fd7001598d5cf9c1bdd57c66cae4	2025-09-14 17:01:00+00	27	29	final	{"away": 31, "home": 17}
3cd1d025-e2d8-463e-80ef-6385fc746582	17	e217b38ef8bc6e98d3512cb42b90782e	2025-09-14 20:06:00+00	14	10	final	{"away": 28, "home": 29}
b42650fe-fa28-4feb-98d6-622cffa6eb2e	17	bbec8d71145954cff67915c9b006bb6e	2025-09-14 20:25:00+00	16	26	final	{"away": 20, "home": 17}
abd39ca3-bedd-4a14-942c-1871e3e9a85b	17	37d09ce5d357536d0e58dd4ba0ab4106	2025-09-15 00:20:00+00	21	2	final	{"away": 22, "home": 6}
b0a3899d-dd50-487c-b759-826132a5af7d	17	7d9a04f411031528d9c1d2df7b9a0453	2025-09-15 23:01:00+00	13	30	final	{"away": 20, "home": 19}
34aa22d9-a08f-4527-9c82-f7bb72317a90	10	9535d3e3ee9d9fc83ea2b500ad0b587c	2025-09-06 00:00:00+00	18	16	final	{"away": 21, "home": 27}
d6ea14f2-b5c2-4ba7-b9cf-37a49c400434	10	e2d3b0596efcebc1c19dab92009f5e26	2025-09-07 17:00:00+00	8	7	final	{"away": 17, "home": 16}
f04d3d1d-2117-4f57-a099-0172487c75a8	10	1e09eb3fe1385796c1a32000de48ac64	2025-09-07 17:00:00+00	2	30	final	{"away": 23, "home": 20}
36496369-7298-4ef1-a622-6ef72558e109	10	b02a72c768a6c6dee87aa74f78e84176	2025-09-07 17:00:00+00	14	20	final	{"away": 8, "home": 33}
e30cf41d-c05f-48b8-bd5b-674138779e39	10	4cce00ca468c67eca17a9a061f778fb2	2025-09-07 17:00:00+00	32	24	final	{"away": 6, "home": 21}
718b520f-2d47-4a41-b108-d0ac9faa34aa	10	5ed483bb614b18955f8b43f177746371	2025-09-07 17:00:00+00	25	27	final	{"away": 34, "home": 32}
f27eeec6-0e15-4c22-81c6-5c4b143adfe8	4	03a5eed2c8ef5d1c8a48866ea4b0d63a	2025-09-21 17:00:00+00	32	17	final	{"away": 24, "home": 41}
7d2cd926-d87c-49a2-ac4a-75992298fb33	9	d90e0de2d5fa2d57e8812f31775ad0ba	2025-09-28 20:06:00+00	19	14	scheduled	{"away": "20", "home": "27"}
a72be0b6-d553-4389-aee5-8c2fd70c58cc	9	051233db287b02fd3e7574955879ece2	2025-09-28 20:25:00+00	16	3	scheduled	{"away": "20", "home": "37"}
49a0b7ea-6fc3-45d1-848a-6b0e079f13a2	9	d921b1e86b0a30ad91000ffc360d302d	2025-09-28 17:00:00+00	24	18	scheduled	{"away": "18", "home": "21"}
b0f2ec20-f691-43a1-a91b-549cdde8abd4	9	f8fe40924827231233dc10f6999d8ff7	2025-09-28 17:01:00+00	22	5	scheduled	{"away": "13", "home": "42"}
d1c9abe6-1923-41d8-b06b-cae30c9bd58f	6	c2fd8a23091a954fb21ff6d3537db826	2025-11-03 01:20:00+00	32	29	scheduled	{"away": "38", "home": "14"}
10340ef1-48a2-48c8-a50a-bb3d0eaa35fe	9	8dcb2a6bf542ccb7e6bc58f83c8fc2ac	2025-09-30 00:16:00+00	10	7	scheduled	{"away": "3", "home": "28"}
a3b2b894-f152-49e4-9a39-2accf094cd2c	7	f7fa9341eeffb08f7e6e769398cd32e2	2025-10-19 17:00:00+00	31	22	scheduled	{"away": "31", "home": "13"}
b5de4725-8056-4e20-8a2e-712260bf3e53	7	a0ad5501e9d1d2ee9f61d9f293374f17	2025-10-19 20:05:00+00	18	14	scheduled	{"away": "38", "home": "24"}
f47d6300-b4dd-4d9a-ab0b-e9196b98207d	7	1036171316ac51350b388c99e000cfc1	2025-10-19 20:25:00+00	1	12	scheduled	{"away": "27", "home": "23"}
b30ae39f-ba57-4fc8-a725-8923136dca9c	2	e34812ee7fbf13bd75e4298bccfbdd10	2025-10-12 13:30:00+00	25	10	scheduled	{"away": "13", "home": "11"}
85594600-e73f-49ee-a6bd-d52165c66b91	2	f2c642e1f95555424b9a9a4f03733b42	2025-10-12 17:00:00+00	23	22	scheduled	{"away": "25", "home": "19"}
7cb87419-fddd-4928-a943-391bd5227e2e	2	b235bc78609644cb28492cc1d6ad69fd	2025-10-12 17:01:00+00	3	19	scheduled	{"away": "17", "home": "3"}
89626ca3-e73a-4c09-b1e3-76715d62524f	2	a11bbccb332241029ebaeb519b93b776	2025-10-12 17:01:00+00	27	8	scheduled	{"away": "9", "home": "23"}
b670f639-9ca2-4bc3-b9c5-d7f37ddc49c0	2	a7211a87bbd5fb2ee473eb9c93ee2e68	2025-10-12 17:01:00+00	20	18	scheduled	{"away": "29", "home": "27"}
6e5d4e91-b8ad-41df-9950-6d5fe79173b6	2	9e705d669039f2ca8364f408b7792a8a	2025-10-12 20:26:00+00	30	28	scheduled	{"away": "19", "home": "30"}
cab2be71-af69-4508-ac1d-06399b390190	2	33e0adf378d2856ffe5f8452e7d5512d	2025-10-13 23:15:00+00	2	4	scheduled	{"away": "14", "home": "24"}
a10d2e03-a21f-4d06-8752-a46f00fe648b	7	79de65f1b97c9145ebdcb019eb486500	2025-10-19 13:32:42+00	15	19	scheduled	{"away": "35", "home": "7"}
d021ef41-a018-46b2-a041-0e0ce8d684b8	7	ba4e8bfa1f4eeaa74c7b09f409361c0d	2025-10-19 17:00:00+00	25	5	scheduled	{"away": "13", "home": "6"}
ce91cd15-e3fa-4dfe-8f38-52188d702923	7	3127c0dd6ed51a44354af51791bc3e5a	2025-10-19 17:00:00+00	16	17	scheduled	{"away": "0", "home": "31"}
91376266-40b6-4e41-aca0-0736c40c57f2	9	de432abcc3bd8d42a582ae9f71388dcd	2025-09-29 00:21:00+00	9	12	scheduled	{"away": "40", "home": "40"}
c9bc16f7-9a25-429d-98f3-5c7a3ebc8414	21	79c4e9f40e2647dc2a7b377cf61c48cd	2025-10-05 20:26:00+00	18	32	scheduled	{"away": "27", "home": "10"}
380e817d-fcde-418f-9eb1-a97bb993e03e	21	bc4f9a719baf61261befad75f4bdb539	2025-10-05 17:01:00+00	26	10	scheduled	{"away": "21", "home": "17"}
bde2234a-6b87-4b5e-85dd-37c092bc3047	21	6f5a22a3ca33478094cef1e9212ba0fc	2025-10-05 20:06:00+00	29	30	scheduled	{"away": "38", "home": "35"}
fe4ccad3-2b0e-46f8-b2eb-c197e204cd5c	21	6e206c7bc9379b07d27298a393305384	2025-10-05 13:31:00+00	8	21	scheduled	{"away": "21", "home": "17"}
6a64a55f-f8da-41e8-a1ce-50a485f53127	21	ff8222149317a63ffe50fcda777d14c0	2025-10-05 17:01:00+00	5	20	scheduled	{"away": "24", "home": "27"}
0b349bf3-4672-4285-9a9a-8330f11f8c22	21	1fe136913ef0e77717c0f0668163637f	2025-10-05 17:01:00+00	23	24	scheduled	{"away": "14", "home": "26"}
6d3724f1-646a-4345-9f21-6f0b4932664c	21	c4b72eabb3d557e73022ec730d8e3944	2025-10-03 00:16:00+00	19	28	scheduled	{"away": "26", "home": "23"}
a2115ef5-9262-4cb0-872f-8d9c26fad40d	7	b808059d3ccc754ace4a3d23b58e47e8	2025-10-20 23:00:00+00	11	30	scheduled	{"away": "9", "home": "24"}
d2ac537e-3d10-4662-b6f5-836d8255ffab	21	1910db6879dddf37e4f86f0bcf1c9547	2025-10-07 00:16:00+00	15	16	scheduled	{"away": "28", "home": "31"}
112270ae-a6ed-426b-adac-56a0afff3476	6	72e2ce6652bbb3901f60b38bec05bf5f	2025-11-02 18:00:00+00	13	10	scheduled	{"away": "18", "home": "15"}
85783c17-265e-45dc-8071-cefa65a6a341	6	2340a6e0794d5688996dcf8aaf634742	2025-11-02 18:00:00+00	27	14	scheduled	{"away": "20", "home": "27"}
9f96ae20-7274-4d44-8194-71356e732dca	2	e10fe83ee6178a598e7fa84ea0913366	2025-10-10 00:15:00+00	24	26	scheduled	{"away": "17", "home": "34"}
e488eb19-d62f-430e-9d7a-4e676413412e	6	f3dfb574e0a542375a480534525ee6cf	2025-11-04 01:15:00+00	9	1	scheduled	{"away": "27", "home": "17"}
73898b0c-165c-4160-8e2f-04fc60d929db	16	844b89333f293f055f8e0c147fb9fec5	2025-11-09 18:00:00+00	25	8	scheduled	{"away": "20", "home": "27"}
7892dd22-384d-420b-8ac9-b38f80357891	6	6031b513e188fc19a2311499566c9258	2025-11-02 18:00:00+00	12	5	scheduled	{"away": "16", "home": "13"}
f49a3914-1a2b-4bbd-bd90-58f3d43f2ca1	11	fd2f29289d6437a7c07d4780c5f04936	2025-11-16 18:00:00+00	31	13	scheduled	{"away": "16", "home": "13"}
c326aa68-4af8-4b34-bf37-d8dbd1752bdc	16	9900b89c4776c5b47dd26ca4c755edf9	2025-11-09 18:00:00+00	21	3	scheduled	{"away": "27", "home": "19"}
f3676ad2-38c0-4af9-b8ae-f57be8657020	6	a788e7cebff4b5fe10034710090e4529	2025-11-02 18:00:00+00	24	28	scheduled	{"away": "34", "home": "24"}
e2a776f8-11a6-4a08-9c21-ee1a62e72176	6	b08df670a95f1809707b335dc75081c6	2025-11-02 21:05:00+00	19	23	scheduled	{"away": "10", "home": "34"}
d064ce63-ab19-4c93-a5ce-2edbf9fc77f7	16	42473c1ddf8f424069ff3f264dd8dca4	2025-11-09 14:30:00+00	14	2	scheduled	{"away": "25", "home": "31"}
f17681b2-38c7-4e9c-828b-72a18f4d0197	6	677dbbb6ad96fc5f5b36bb20b43139dd	2025-10-31 00:16:07+00	20	3	scheduled	{"away": "28", "home": "6"}
a46ddd80-9686-4da2-868e-09f4b91eb3d9	16	2710103fe4fb0170ae03b4e34bde8132	2025-11-09 21:25:29+00	28	19	scheduled	{"away": "42", "home": "26"}
b134cf70-c00d-45e0-95e1-8b400db16f9d	16	39e7c1f6e36d5bc4d2613ebf7bb83c10	2025-11-09 18:00:00+00	30	22	scheduled	{"away": "28", "home": "23"}
8697092d-e82a-45e2-b869-fd31ece83fe2	16	13bdffda97e8fb13179fe3f2f69d66f8	2025-11-07 01:15:00+00	10	17	scheduled	{"away": "7", "home": "10"}
cbc66c57-d654-486c-ae72-4ef57f0a3fe7	16	93365f943b3aa23705bc9e1c7b47d7f8	2025-11-09 21:26:15+00	32	11	scheduled	{"away": "44", "home": "22"}
13f2fd71-3d1c-42e5-9f5c-99bb8f212547	16	349d53a4f89591312ea528e81b786474	2025-11-10 01:20:00+00	18	27	scheduled	{"away": "10", "home": "25"}
ba2b69b7-f9ba-467e-99da-26b8de97ade4	16	21f47a328fb2ab65c01360a7a2bd9571	2025-11-09 18:00:00+00	5	23	scheduled	{"away": "17", "home": "7"}
4a71fd05-215f-4ff9-a9a5-3ca7f0bb5938	11	0ae85bbc3711ad0cb94475a40e2364f0	2025-11-16 18:00:00+00	2	5	scheduled	{"away": "30", "home": "27"}
95407649-75c0-440d-8115-1a5442582203	11	591fd7cff37201a14cbdfbd457592445	2025-11-16 18:02:48+00	15	18	scheduled	{"away": "6", "home": "35"}
3c5359bd-125e-4aec-ad9d-a5c4b0d3e30c	11	96377d2fb55e3cef733cecccdecaed5f	2025-11-16 18:02:33+00	4	30	scheduled	{"away": "32", "home": "44"}
3cc444f7-1d14-4ca8-8871-dbfb2b3607b0	11	5c06e82838fcfade9adf1e89b8bd3081	2025-11-16 18:00:00+00	24	12	scheduled	{"away": "27", "home": "20"}
5dae185c-5c31-487f-a883-6381c6e0a1c8	11	32ec2bd4ac9e4c40f9f5cbed7e67f837	2025-11-14 01:15:00+00	22	25	scheduled	{"away": "14", "home": "27"}
d26f58ed-1e7b-4e7f-9045-36b6a4072128	9	09f55b4a19a83eb951a9400a11123477	2025-09-28 20:06:00+00	28	15	scheduled	{"away": "26", "home": "21"}
8c1fa576-2d49-4e8a-962d-259057938461	9	af6fbb0a2e996613bc393115276c60e2	2025-09-28 20:26:00+00	17	6	scheduled	{"away": "25", "home": "24"}
2b45efe0-31db-4e09-868e-5ab5549e0b0a	9	b7934d72587b62de0f563ac9acbaa770	2025-09-28 17:01:00+00	2	32	scheduled	{"away": "27", "home": "34"}
ca15c000-5210-4eb0-9793-bda649720d4d	9	85c9b76cd6bd575b611cb4e8feb7a0b0	2025-09-28 17:01:00+00	13	31	scheduled	{"away": "0", "home": "26"}
9b3c55d8-73f8-4a27-9f17-9d1d9fbd9350	9	894976986c24d52cf1d45f0e6bb0e90c	2025-09-28 17:01:00+00	30	26	scheduled	{"away": "31", "home": "25"}
0efcb2cd-b1dd-46bd-bc97-4b1af61b2154	9	bc76fb8d846588ed46297aaab4e83de9	2025-09-29 23:16:00+00	20	25	scheduled	{"away": "21", "home": "27"}
5635fb7e-2185-479c-90b1-b46de7a4f4b3	4	5737e4dbf6879c5061bb23033a4d8a55	2025-09-21 17:00:00+00	5	2	final	{"away": 0, "home": 30}
31e6b9ac-abc1-402e-bed5-2961e9bc8a02	4	186868cc79ce1f5d22075b67ebbc7b64	2025-09-21 20:25:00+00	6	9	final	{"away": 14, "home": 31}
06cc8eea-773e-43ae-b42f-4b8d732163f2	2	38366aa83a3eb6cef71a1134c4fceb2c	2025-10-14 00:16:00+00	32	6	scheduled	{"away": "25", "home": "24"}
8a1a95b1-e629-4e81-bbce-bcdea7b945bb	7	ff0c1ce30d562926ce40fc9bbaa2b7b1	2025-10-19 20:25:00+00	9	32	scheduled	{"away": "22", "home": "44"}
b779443d-d9af-49d2-8259-6d8ed08ca2cb	7	8f06a4b503cc7309cb0df4a8b67f9930	2025-10-19 17:00:00+00	6	23	scheduled	{"away": "14", "home": "26"}
9ff54761-9d51-46d8-82c3-ecfde5287333	7	f0336c9a3749716250afba387d157377	2025-10-19 17:00:00+00	8	20	scheduled	{"away": "6", "home": "31"}
54bbb810-a9f6-429d-8566-74105f370675	3	abc4104a9ac597ce37d703613256fd6c	2025-10-26 17:00:00+00	13	28	scheduled	{"away": "15", "home": "26"}
5671a21f-0b89-492d-853d-59ae0cb71a52	3	a8ebe01e05675c109b53a97f653f8653	2025-10-26 17:00:00+00	26	24	scheduled	{"away": "20", "home": "38"}
76a24644-043c-480c-8da7-ca22493a0a1e	3	40c2ebd9ddd5ce8ff5b1ada730bb1785	2025-10-26 20:25:25+00	10	9	scheduled	{"away": "24", "home": "44"}
92b36759-ce64-498d-ba8b-a7f12943e57c	3	fb900eef07307ebf5c1930341ecd852a	2025-10-27 00:20:00+00	27	12	scheduled	{"away": "35", "home": "25"}
046f08a3-ef04-4ded-8b18-b2515807cab2	3	ac02b1b59aa0623845378a02bc530c68	2025-10-26 17:00:00+00	2	20	scheduled	{"away": "34", "home": "10"}
d6041bda-3122-4abd-98cd-440d718d5848	7	6a8d2daf7f75100d02656bc0217737e8	2025-10-19 17:00:00+00	21	26	scheduled	{"away": "28", "home": "22"}
e5bd2954-cf2a-4f63-9fa2-50576c33b631	7	7b2ded52498efcf97a08ef10ee99b0f3	2025-10-20 00:20:00+00	28	2	scheduled	{"away": "10", "home": "20"}
acd96b50-45a0-4a07-a642-9b81bfc8d0c1	3	a061e80d1f50eab193b34d19f8e59f62	2025-10-26 17:00:00+00	3	6	scheduled	{"away": "16", "home": "30"}
8d1ac3c2-a669-4274-9d81-20e1f51b9bae	21	ba826e757d625a676452b8d3d6971bb0	2025-10-06 00:21:00+00	4	22	scheduled	{"away": "23", "home": "20"}
2669b044-2985-4243-a9ab-9b725dccee62	21	e9de9c4390a28a90f437760050b23531	2025-10-05 20:26:00+00	7	11	scheduled	{"away": "37", "home": "24"}
58b00d24-143e-48a2-a202-07a1b3975fc3	21	8fa3fd86eaa7b432469d43b84904e1dc	2025-10-05 20:06:00+00	1	31	scheduled	{"away": "22", "home": "21"}
b78e5b52-7747-43a0-9bd4-020c7223b8e3	21	6eb8eeff6a052455649ddd2a50e0a188	2025-10-05 17:01:00+00	3	13	scheduled	{"away": "44", "home": "10"}
b31c97c4-c4f1-4e44-8152-1e84c0d4b5d9	7	6076f9eab496770efc0ab7095b27c122	2025-10-17 00:15:00+00	7	27	scheduled	{"away": "31", "home": "33"}
86f55afb-4e15-4949-a2bc-ff38a995263f	21	df7e32f3c6cfaaa66de560906faabe32	2025-10-05 17:01:00+00	25	9	scheduled	{"away": "37", "home": "22"}
ebba52ce-db32-4ea8-909d-eaf8c90105be	21	1e3d3526039030b96471845ade5992cf	2025-10-05 17:01:00+00	14	17	scheduled	{"away": "6", "home": "40"}
4c912b18-1027-4560-9cb6-3b20c73ac4d1	2	82e432d5d8bc0b5a6cbe0c324de90de3	2025-10-13 00:20:00+00	16	11	scheduled	{"away": "17", "home": "30"}
1c857c6e-f8b9-433f-949d-1d26a99838c9	2	4963bff460a5f26cab46a8e5ea6db148	2025-10-12 20:06:00+00	17	31	scheduled	{"away": "10", "home": "20"}
e5b67945-f649-42a4-a3e8-2b8f21b8a88f	2	0c85b0939650e29689bb2651b33522eb	2025-10-12 20:26:00+00	12	7	scheduled	{"away": "18", "home": "27"}
9c472cce-9d22-412c-aa47-a9a40c7bbc23	2	e5dd1fed586cfc0ec2d7c06f2a02c37a	2025-10-12 17:00:00+00	15	29	scheduled	{"away": "20", "home": "12"}
6cce17a8-edfb-4c7f-b706-3ae198691439	2	dfa87b0532de1389297103c2e3195347	2025-10-12 17:01:00+00	14	1	scheduled	{"away": "27", "home": "31"}
2165e08b-e5aa-4f76-adf9-ab393a4baa89	2	dd3a14fa1529e79bd338a7bfd71d5b3a	2025-10-12 17:01:00+00	5	9	scheduled	{"away": "27", "home": "30"}
5f1076db-c38a-4250-8f63-b901fcd83cce	7	3be866344dfa050e602a6e69170b3cbe	2025-10-19 20:05:00+00	10	24	scheduled	{"away": "32", "home": "33"}
be4e70f7-a563-4858-971f-7007001a227c	7	7ca953ab786f70b22cabbe4946d330fa	2025-10-21 02:00:00+00	29	13	scheduled	{"away": "19", "home": "27"}
25dd832e-7722-464a-b421-822312d3c78f	3	6439b16f4a038f1c351dc3f1aef27471	2025-10-24 00:15:00+00	18	21	scheduled	{"away": "10", "home": "37"}
d40a4cd2-199d-4eb4-8f53-56280a7c2cea	3	a8dd9bb0681692540d067bd0e9e66989	2025-10-26 20:05:00+00	23	30	scheduled	{"away": "23", "home": "3"}
4a4eae9c-49f2-499d-98d0-74ed05ec8de5	3	88187a33b007c088d75c6cd14c83086c	2025-10-26 20:25:00+00	14	31	scheduled	{"away": "14", "home": "38"}
03dd600b-e67e-4366-aa83-4f8064d5e637	3	53d4369464c66630f03a5d128cd39b08	2025-10-26 17:00:00+00	5	4	scheduled	{"away": "40", "home": "9"}
a0bc9b29-3caf-4f8c-b95e-0bfea2440159	3	9c1f73e48ca9750f6e7d5d64874057c2	2025-10-26 17:00:00+00	7	25	scheduled	{"away": "39", "home": "38"}
c4d0ce83-8c64-4335-a1c6-dbaef3dc437d	3	3536a3e857050d2dd6e2019ceb668f67	2025-10-26 17:00:00+00	22	8	scheduled	{"away": "13", "home": "32"}
efaf70eb-ea6d-4e22-8266-344f60da958b	3	7e3361e84d5223a8d210a887b249f247	2025-10-28 00:15:00+00	16	32	scheduled	{"away": "7", "home": "28"}
1a3df7be-f3f0-47b3-a753-354988a838ed	6	016f76d8237e8d4eb62b9c2ef68381bb	2025-11-02 18:00:00+00	7	6	scheduled	{"away": "47", "home": "42"}
ec97ca0a-b28f-47fc-ad2e-3ce8360cc08e	6	cf95657d78ab3e515203df1d19c3b0c2	2025-11-02 18:00:00+00	11	21	scheduled	{"away": "27", "home": "24"}
aec4a3ad-d44d-41e6-9406-ed365058f749	6	6dd3b8a705ed0db85d59fa19b9062cc8	2025-11-02 18:00:00+00	22	2	scheduled	{"away": "23", "home": "24"}
67db401c-4a5d-49ad-83b6-a80fbd9e9061	6	61531628516decd1ee8116da5f6f9056	2025-11-02 21:25:00+00	4	16	scheduled	{"away": "21", "home": "28"}
9bd25183-b8a2-4e89-a87a-7cbe662d3f98	6	d0bf341e7959d69b55f1a8ff09065234	2025-11-02 21:05:00+00	17	15	scheduled	{"away": "30", "home": "29"}
95b479b5-7350-46eb-8d94-6b207de641c3	6	b60025aea576e2e89ef7bc7303f847ec	2025-11-02 18:00:00+00	31	18	scheduled	{"away": "27", "home": "20"}
50e71e9f-3dd0-40fc-91e5-9b3ba56ecee6	16	740b843794cc89176c4ffe38b66d30d9	2025-11-09 21:06:09+00	29	1	scheduled	{"away": "22", "home": "44"}
4ea577b3-c84b-4f40-acb5-e02431fe5b41	16	3b1a97366685a96e6e1940ae56cc4d31	2025-11-09 18:00:00+00	6	24	scheduled	{"away": "20", "home": "24"}
d40c4e28-2593-4343-8a62-7ef114e0eecf	16	9dbf94f23521c7cae7fd89b2d33fc3bd	2025-11-09 18:00:00+00	13	15	scheduled	{"away": "29", "home": "36"}
4efa1b98-b52f-4eda-a313-d3260e091fae	16	3c10bc18680995136017c3bfd3152334	2025-11-09 18:00:00+00	20	4	scheduled	{"away": "13", "home": "30"}
01ced56f-5413-4445-b791-af1bc821d0cc	11	91630b9c62640117918fa30d2a62d2db	2025-11-16 21:08:00+00	1	28	scheduled	{"away": "41", "home": "22"}
af39c4f7-7bbc-445f-9596-0ee71f84d732	11	6d209e0e637f3b116ec958e0634f2a02	2025-11-17 01:20:00+00	26	11	scheduled	{"away": "9", "home": "16"}
7c66af18-7fe5-403b-8a74-fc66d3e13e5f	11	80d04ba917883a6438580ebae9fb0f22	2025-11-18 01:15:00+00	17	9	scheduled	{"away": "33", "home": "16"}
358d48e8-bed8-4dc9-a3a2-a45116df0833	11	e926e654cedeb65fcfcc389a5158ef4e	2025-11-16 21:05:00+00	19	29	scheduled	{"away": "19", "home": "21"}
f58f0065-696f-4d1a-9e79-ee46d002c79a	11	cc60225b5a907bd9ba7c27c23131fc5c	2025-11-16 21:25:00+00	8	3	scheduled	{"away": "23", "home": "16"}
e38cc65d-0609-4b3a-a380-637396570080	16	438868ff90501a1fe9a0fbecbee9dc12	2025-11-11 01:15:00+00	12	26	scheduled	{"away": "10", "home": "7"}
c95835d4-c6eb-495c-9a7b-8549c0bb86e4	11	96ce7785b0980b03282c7e10d4c58d4a	2025-11-16 21:25:00+00	10	16	scheduled	{"away": "19", "home": "22"}
acabce6e-fe7c-425b-9253-b814cd6566b4	11	229a5e9ce60dcb344a8cc3c97121154e	2025-11-16 18:00:00+00	21	6	scheduled	{"away": "19", "home": "17"}
41c027c6-fa5c-4a26-a7b6-3207cce3ebe6	11	265f0188945bb81ec64751571eb724cb	2025-11-16 14:30:00+00	20	32	scheduled	{"away": "13", "home": "16"}
2ce2ef92-1078-461b-abda-6d1911a0a056	11	7147476b5d96c0ee874b838de3910ee3	2025-11-16 18:02:45+00	27	7	scheduled	{"away": "12", "home": "34"}
2ee03b3d-e61b-4633-b5ed-f234f3c51cd6	20	9c040de8f1dfc3ddee20e0d65c9402de	2025-12-01 01:20:00+00	32	10	scheduled	{"away": "27", "home": "26"}
c4d15223-1220-412c-a372-c5d0b415fee2	20	883a79a306b312fad75ebf04b441b4da	2025-11-28 01:20:00+00	3	7	scheduled	{"away": "32", "home": "14"}
79b2ed90-8c59-4bc9-92f0-2489d70c2da7	15	7159d60c7a31c7d593167637723d7663	2025-11-23 18:00:00+00	3	25	scheduled	{"away": "10", "home": "23"}
e4f9bc56-5420-4c15-8992-4feb8126e69a	15	c8913b70b63ae247f23a4e1dec08c668	2025-11-23 18:00:00+00	6	27	scheduled	{"away": "28", "home": "31"}
d2bdacae-dd5f-4dd4-8535-a65ff9e42774	15	1a8f3d70399a5cad83c95196795ed77b	2025-11-23 18:00:00+00	7	22	scheduled	{"away": "26", "home": "20"}
45cc932e-b1d3-4204-aa65-372f0e48111a	15	535bbe97d4e56494b039ade88459c338	2025-11-23 18:00:00+00	11	24	scheduled	{"away": "27", "home": "34"}
e266dc82-da06-45ad-b515-1658832012d5	15	91019a528f43cd28965fdc68a3f3ef85	2025-11-23 18:00:00+00	12	21	scheduled	{"away": "6", "home": "23"}
1a9a4ec2-e36e-445c-a230-904155133ad1	15	8b39d8dc550ced94f9faa91878ebf6b6	2025-11-23 18:00:00+00	16	14	scheduled	{"away": "20", "home": "23"}
6d12b6ae-fe56-49e5-80d2-4b51d40770ae	15	0ff4e68cf39cc57ca7cf1276e4a44d2f	2025-11-23 18:00:00+00	31	29	scheduled	{"away": "30", "home": "24"}
b57ee556-4263-43bf-924d-b59dbfa152f3	20	c0d324e29ce58b36bdc77564f7aae56f	2025-11-30 18:03:00+00	30	1	scheduled	{"away": "17", "home": "20"}
bb418583-3bf5-46ba-beb3-f4257a017cb7	20	9da608f5bdae527b280abd61e47a110b	2025-11-30 18:00:00+00	25	2	scheduled	{"away": "24", "home": "27"}
47f0286f-2598-4319-911a-3592d0ca6f07	20	67e51d17848485bed8737bd7043a275a	2025-11-30 18:00:00+00	5	19	scheduled	{"away": "28", "home": "31"}
8680b02f-3c5c-405a-8de9-37384b0667d4	20	36fcf5ca155a5dcd2f7a87fd2a985b02	2025-11-30 18:00:00+00	8	28	scheduled	{"away": "26", "home": "8"}
18174242-6c62-47ff-967f-d60afcc3b0ae	20	fa46c661007f5f0cbbf6abf939ac9d51	2025-11-30 18:00:00+00	14	13	scheduled	{"away": "20", "home": "16"}
bc2dbf36-4786-48e6-9721-e16c5c2eb3e2	15	e32e0030899c06fdf2c74745ca27d85a	2025-11-23 21:05:00+00	1	15	scheduled	{"away": "27", "home": "24"}
6f0ab50a-2db9-4735-b55e-04baec9fc2d3	15	cd2e0964817c30ad3f5144ea49b55f2b	2025-11-21 01:15:00+00	13	4	scheduled	{"away": "19", "home": "23"}
431b3ac4-42da-42a1-9a49-3b791f370ab2	15	27f50ddbc4c3fbad10398c5187a28dc7	2025-11-23 21:05:00+00	17	8	scheduled	{"away": "24", "home": "10"}
ecacbc7b-cc64-4ed6-8ab6-10c433fb3ce9	15	9e7119f5a24471c39145663b84f100b2	2025-11-24 01:20:00+00	19	30	scheduled	{"away": "7", "home": "34"}
7bdfc892-5cad-43d2-b235-02afede1ecbd	15	90391be251d876bb41d36978a43c7ac2	2025-11-25 01:15:00+00	28	5	scheduled	{"away": "9", "home": "20"}
834c89e5-0e51-4aca-9d66-d414bafa77e1	15	8c2d6a56aa63f42227f18a18fc3d2146	2025-11-23 21:25:00+00	23	2	scheduled	{"away": "24", "home": "10"}
31e33109-b008-489b-a37a-e13202ed0927	15	4553ba763cb3cfcfc33fd62672a2057f	2025-11-23 21:25:00+00	9	26	scheduled	{"away": "21", "home": "24"}
bd93f9ba-f462-4a2b-9d3c-8e7795cda802	20	3e65786eddd4c7aee9e7f2504f6fdedc	2025-12-02 01:15:00+00	22	24	scheduled	\N
3bf722b0-695a-428a-a9fc-f77cd0901e52	20	61e1e459b2ddafd43e8808d4f40c01d9	2025-11-30 18:00:00+00	31	15	scheduled	{"away": "25", "home": "3"}
b556dadc-16a2-4062-9e07-c4801a270aea	20	de53b8a594fe830c5fd56484705cd756	2025-11-27 21:30:00+00	9	16	scheduled	{"away": "28", "home": "31"}
5d229b96-7da4-4fcb-a0d5-0bdcae77558e	20	e3c9bfba57bbe784481d881ea3b4519d	2025-11-30 18:00:00+00	20	23	scheduled	{"away": "17", "home": "21"}
5cf03998-5733-4976-bd8d-f70cd50718fb	20	fe2eb07797580740af78037ab498198e	2025-11-27 18:00:00+00	11	12	scheduled	{"away": "31", "home": "24"}
cc3cd25a-c004-40fa-a591-d8bbbb2ea929	20	52f539d9d080618aa8830a0b03846a80	2025-11-28 20:00:00+00	26	6	scheduled	{"away": "24", "home": "15"}
bf3f67e5-389a-4bd0-a40e-36cd2780ea22	20	6f956074c4df48e7b07a3286a6c6ed2a	2025-11-30 21:05:00+00	29	21	scheduled	{"away": "0", "home": "26"}
e2e4275d-7bcf-4d9e-b8cc-b35a5703de8c	20	365a766a3862bc47a5455dc3b097421e	2025-11-30 21:25:00+00	27	4	scheduled	{"away": "26", "home": "7"}
3d891558-07e3-4160-b83c-5b4a7d5f63df	20	76ac5a8d2c8679ae6ea8861114791bd8	2025-11-30 21:25:00+00	18	17	scheduled	{"away": "14", "home": "31"}
867e50da-8f73-4b9b-a725-c4dac87acf9e	18	a360e4c43576d22057ff90d818928066	2025-12-14 18:00:00+00	13	1	scheduled	\N
89456c0a-e395-4cdf-812d-219181f2eb9c	18	1aa1fb046f11dadb32dad77d5baf552e	2025-12-14 18:00:00+00	7	3	scheduled	\N
fc8b6b92-e30a-4eeb-9530-04be061b5b49	18	c127c7a2426ec655e18ca9c394068f6c	2025-12-14 18:00:00+00	22	4	scheduled	\N
9425fac9-f534-4e02-b3d3-e3425b63c37e	18	8261541e6b9b32537bd0821ef2c0a05d	2025-12-14 18:00:00+00	6	8	scheduled	\N
b4b93246-ac64-441d-8183-daca2214f1ec	18	0f0601c020a478f5d9f81f06a141c2c8	2025-12-14 18:00:00+00	15	25	scheduled	\N
47b92751-161b-4dd5-93e0-2d60f012c09d	18	cd5151f8a1e7fcba4901929e77b94acd	2025-12-14 18:00:00+00	16	18	scheduled	\N
b8833a95-dd4f-4e97-8c5d-1d79a6cc696b	18	813dab51d999b87c7968ac4890965f73	2025-12-14 18:00:00+00	26	17	scheduled	\N
e13d70a2-d74f-47a0-8f68-cd165fc26500	18	3aba4bb1fe41ecd45f934116fcc90c3f	2025-12-14 18:00:00+00	24	32	scheduled	\N
b4e62942-84c5-4c25-a189-b2b586fdd4b0	18	f3fd2782d4d03bd12a177fbbad17005b	2025-12-14 21:25:00+00	23	5	scheduled	\N
98d4c4a3-df38-4df5-8b79-4af1bec8f32e	18	2ec8a387d0c337aeffac3f956c292e87	2025-12-14 21:25:00+00	10	12	scheduled	\N
97bb60db-40e1-4c11-bc42-3fc35ee8515f	18	bd299b70476643cff05f2be58e12301a	2025-12-14 21:25:00+00	19	11	scheduled	\N
576a386b-69db-4c2a-bf7b-dc083b926ee4	18	f7343baf47dcf23e672799d00788173d	2025-12-14 21:25:00+00	29	14	scheduled	\N
69737801-2958-40a5-9829-30b076fea2b5	18	7ba03312d1012d9872de9999e496558f	2025-12-14 21:25:00+00	28	31	scheduled	\N
78636bdf-153e-476d-a4b9-4e0ac3f8d56b	18	3c74ebd1d005a7346c182daf6f7279dd	2025-12-15 01:20:00+00	9	21	scheduled	\N
2ed27ee2-f524-4af9-ae41-62ac2b4a6555	18	ba5d065a7e9ea9afe54642036f2ec83a	2025-12-16 01:15:00+00	27	20	scheduled	\N
\.
COPY public.pick_settlement (user_id, game_id, pick_id, points_delta, outcome, graded_at) FROM stdin;
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	dc820270-eba7-46bf-b0ea-a266032ff812	2a16b613-4173-4063-931b-858a884cf69a	1	win	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	0318ac4a-51fa-4197-9a58-d5a066c5c7cd	08de88e7-75c8-43dd-8cb7-4107b6c8f6a1	3	win	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	509947e1-c9f4-4dea-869e-18f0ae6560b4	162cc64f-0e0b-4f38-9a2d-a624ee6d11c2	3	win	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	a6646dac-f8d6-473f-96fc-0e711dd92011	8790c2ad-db15-4580-a146-d6c1496bf3e6	3	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	a6646dac-f8d6-473f-96fc-0e711dd92011	aabbe292-b1b3-44e0-bccc-839100593016	-3	loss	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	242131ad-16bf-4fd6-8e5e-65b6d2e79cf1	4b501f55-94e6-4c5e-956a-514ab0bffcd7	3	win	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	242131ad-16bf-4fd6-8e5e-65b6d2e79cf1	b69fab7c-c675-49b3-8226-bc9fed0464f3	3	win	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	7e68fe65-8ae9-4e71-ac41-ae6b9a3a7d62	8ee0618b-8cc4-47bc-bfbb-e0f8f027fd19	-3	loss	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	13a5b004-d94d-4fef-9586-6a0af5dfedec	5a87f3f9-7864-4c71-9638-1912fa969229	3	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	8417d24a-a09d-4f23-ab21-40f016ed3bd3	aa9cc460-6def-49d1-b0e2-38e061beb7fb	3	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	9b3c55d8-73f8-4a27-9f17-9d1d9fbd9350	80ca4b83-bf77-4137-b78c-37f351b87585	-5	loss	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	7d2cd926-d87c-49a2-ac4a-75992298fb33	b8cc1852-f97b-44ad-a6fe-1afd54696915	-1	loss	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	f49a3914-1a2b-4bbd-bd90-58f3d43f2ca1	9ac5ebf4-300a-4dc7-a42f-ee56eebb71c2	-5	loss	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	95407649-75c0-440d-8115-1a5442582203	52e621bf-99f1-46d9-b01b-2d163e58d10d	-5	loss	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	2ce2ef92-1078-461b-abda-6d1911a0a056	222d7c5e-9859-4fe4-81db-c475379a67ea	-3	loss	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	acabce6e-fe7c-425b-9253-b814cd6566b4	d2cac6ef-2f8a-466f-87de-b267e28f3e0d	3	win	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	4a71fd05-215f-4ff9-a9a5-3ca7f0bb5938	1910d12f-f7b3-4fb5-b0bf-63dd9cf8efed	3	win	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	3cc444f7-1d14-4ca8-8871-dbfb2b3607b0	7d57c7e9-2902-4386-b894-981e44945098	0	push	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	3c5359bd-125e-4aec-ad9d-a5c4b0d3e30c	d977d002-9f02-485e-9899-a2ecfbaed5a2	-3	loss	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	01ced56f-5413-4445-b791-af1bc821d0cc	48f38de7-1bb6-4df7-bd68-ec9e34547ba1	3	win	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	358d48e8-bed8-4dc9-a3a2-a45116df0833	e4254f90-2245-4fe2-8d5d-a8d6d0b3589a	-3	loss	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	f58f0065-696f-4d1a-9e79-ee46d002c79a	01726dd5-4c0c-4351-88aa-20d8b6dba013	-10	loss	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	c95835d4-c6eb-495c-9a7b-8549c0bb86e4	90ed739d-6d1d-48b2-95b9-0c39f87b61d5	-3	loss	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	af39c4f7-7bbc-445f-9596-0ee71f84d732	449ee392-c831-463d-8d8f-2df6c6f86206	-3	loss	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	7c66af18-7fe5-403b-8a74-fc66d3e13e5f	53550f45-b364-407b-a669-ed09e6ee97c5	1	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	41c027c6-fa5c-4a26-a7b6-3207cce3ebe6	59cb3ac3-5790-4449-b58f-9df333bf1a40	5	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	f49a3914-1a2b-4bbd-bd90-58f3d43f2ca1	26ee881a-5e53-4664-b063-17142b705b06	-3	loss	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	95407649-75c0-440d-8115-1a5442582203	5889baa5-72d0-4f16-a713-48df7a5a2e6b	1	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	c4d15223-1220-412c-a372-c5d0b415fee2	502c0e30-2e8c-4782-98d7-ffba6f0305d1	1	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	5cf03998-5733-4976-bd8d-f70cd50718fb	d94a1beb-6227-4b8c-9a67-5767f0b11725	3	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	b556dadc-16a2-4062-9e07-c4801a270aea	7384d179-ae79-4feb-8667-4b090f0b6ba9	-3	loss	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	5cf03998-5733-4976-bd8d-f70cd50718fb	1af8962c-0958-494f-9e22-ac47b8455053	-3	loss	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	b556dadc-16a2-4062-9e07-c4801a270aea	d55c42ca-0e3c-40c5-8d7b-90c6f66f7349	5	win	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	c4d15223-1220-412c-a372-c5d0b415fee2	6356de01-b776-4d82-b7a1-6a1f8a8aae6d	3	win	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	b30ae39f-ba57-4fc8-a725-8923136dca9c	\N	-1	missed	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	a9ade8e0-8fb2-4c2b-917b-7191424388e7	661b7740-aede-49ce-be59-566033988500	-3	loss	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	a72be0b6-d553-4389-aee5-8c2fd70c58cc	d8cc2c9b-76bf-4526-abab-0e96f4cbdcfc	-5	loss	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	a72be0b6-d553-4389-aee5-8c2fd70c58cc	a03f1cc6-b8f4-429e-92da-9c40a9207157	3	win	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	a72be0b6-d553-4389-aee5-8c2fd70c58cc	26901614-0608-4750-9afe-15358223e45d	1	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	3436f7cb-d383-468b-b676-6e76b51d01c4	cd860079-e8e1-4fb7-a531-8955be373128	-3	loss	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	3436f7cb-d383-468b-b676-6e76b51d01c4	9584afa7-89dd-47e0-a284-eb44cfb238d1	1	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	3436f7cb-d383-468b-b676-6e76b51d01c4	4089845a-1819-44ab-a8d1-6833ee5bdde9	3	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	f04d3d1d-2117-4f57-a099-0172487c75a8	067fefa2-aa28-4152-a690-95e3579244a9	-1	loss	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	f04d3d1d-2117-4f57-a099-0172487c75a8	52c1b335-6e51-4a9b-b3e1-13e3f9ddabe3	-3	loss	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	f04d3d1d-2117-4f57-a099-0172487c75a8	e18175c5-56ce-4648-87fd-759ebd4a9455	3	win	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	f04d3d1d-2117-4f57-a099-0172487c75a8	472777d7-5de5-40e0-8942-bc4ecee23c09	3	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	36496369-7298-4ef1-a622-6ef72558e109	2b0b06e3-331c-459e-938e-7eacc3d7ae78	-1	loss	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	36496369-7298-4ef1-a622-6ef72558e109	dcc72f9e-8a67-4f1d-910f-50068c249df8	-3	loss	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	242131ad-16bf-4fd6-8e5e-65b6d2e79cf1	7ede862f-c048-4203-9b21-798fc969a179	-3	loss	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	7e68fe65-8ae9-4e71-ac41-ae6b9a3a7d62	6b0f8c2c-a3e7-4764-9195-2da025a3312d	-3	loss	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	36496369-7298-4ef1-a622-6ef72558e109	e55913b6-e3af-40d6-8002-bb36f185e8f4	3	win	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	a0bc9b29-3caf-4f8c-b95e-0bfea2440159	56afd574-bf30-4389-9e41-4582b97e7561	-3	loss	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	c4d0ce83-8c64-4335-a1c6-dbaef3dc437d	63de56a0-11b4-47e9-ac98-9f3f5efd0c01	1	win	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	03dd600b-e67e-4366-aa83-4f8064d5e637	8dbaf6a1-8cf1-43c5-bca3-e1b0e09d5903	3	win	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	046f08a3-ef04-4ded-8b18-b2515807cab2	4c1c0fa1-963d-41c1-b7fb-38657b76995f	-5	loss	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	5671a21f-0b89-492d-853d-59ae0cb71a52	0d06361f-fa4d-4d0e-86c7-f0a9bf464086	-1	loss	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	acd96b50-45a0-4a07-a642-9b81bfc8d0c1	65143582-73d0-4c90-be85-c640fefcc425	-3	loss	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	2ce2ef92-1078-461b-abda-6d1911a0a056	333fbb47-c1b4-41ad-b2e5-ea0b93bb775f	3	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	acabce6e-fe7c-425b-9253-b814cd6566b4	cf1f1bb1-9650-4884-bf8c-8712dee5660f	-3	loss	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	4a71fd05-215f-4ff9-a9a5-3ca7f0bb5938	8986ddf9-3322-4c39-bf3a-09817e8b7789	1	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	3cc444f7-1d14-4ca8-8871-dbfb2b3607b0	e5ad535e-de2f-4949-9542-2aa2ea14c4a1	0	push	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	3c5359bd-125e-4aec-ad9d-a5c4b0d3e30c	8be9b718-8c86-43a7-988a-f61f1e3dc862	-3	loss	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	01ced56f-5413-4445-b791-af1bc821d0cc	f4bb7866-7927-4225-b526-d9f3a72fe7af	3	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	358d48e8-bed8-4dc9-a3a2-a45116df0833	b8fc9a99-1ade-4539-9386-222c6d54acf7	1	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	f58f0065-696f-4d1a-9e79-ee46d002c79a	d93b883a-ba66-4e77-82ad-ba5bc0252f4c	-3	loss	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	c95835d4-c6eb-495c-9a7b-8549c0bb86e4	40adcb62-565a-4b23-adf3-302abc247ccc	3	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	af39c4f7-7bbc-445f-9596-0ee71f84d732	0b93bbfb-b002-47ab-a504-4031e814f496	-5	loss	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	7c66af18-7fe5-403b-8a74-fc66d3e13e5f	5201acf2-5950-41d7-8672-7c7e138e7221	3	win	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	41c027c6-fa5c-4a26-a7b6-3207cce3ebe6	b1003183-9c57-42c5-8983-5c2cb8b8245f	-1	loss	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	41c027c6-fa5c-4a26-a7b6-3207cce3ebe6	e3b77625-c5cc-48db-98fb-7f2547a2dfbe	-1	loss	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	49a0b7ea-6fc3-45d1-848a-6b0e079f13a2	56a026b0-7d11-4cfd-9ca9-f99278cd50ad	1	win	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	8417d24a-a09d-4f23-ab21-40f016ed3bd3	ec54540a-219e-4986-83ed-8c83e10093d4	3	win	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	5635fb7e-2185-479c-90b1-b46de7a4f4b3	2842afa6-1867-4c62-a1ae-785f1c73c304	-3	loss	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	0318ac4a-51fa-4197-9a58-d5a066c5c7cd	73d8d0b8-39f2-47b5-bd97-9edbf93b98a3	-5	loss	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	6e913449-02a1-41ef-9139-55aab1625913	33888905-35c2-4b44-a57e-1d4c6ddf418b	3	win	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	b92f4877-3642-4dad-8a58-cbbc33acaa27	2d20a952-7750-4dba-9505-56e2b682d1ca	-5	loss	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	dc820270-eba7-46bf-b0ea-a266032ff812	5272aadd-e380-47bd-b412-674e07216ee3	-3	loss	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	509947e1-c9f4-4dea-869e-18f0ae6560b4	a5bab6ab-5ea8-4493-a0af-ea688ddb3fc8	3	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	509947e1-c9f4-4dea-869e-18f0ae6560b4	61662299-de8d-466d-826f-765c15c8a30f	-1	loss	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	5635fb7e-2185-479c-90b1-b46de7a4f4b3	580f289b-c09c-4977-ae31-92f192fc7382	-3	loss	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	f27eeec6-0e15-4c22-81c6-5c4b143adfe8	5f1177b4-c221-4fc3-bdb1-f6a00e93e5e1	5	win	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	6e913449-02a1-41ef-9139-55aab1625913	1bfbf103-88bb-42f3-ba44-8a0fbba2db98	-3	loss	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	b92f4877-3642-4dad-8a58-cbbc33acaa27	c4616373-7145-4ba4-822d-514c66d2a2c0	-3	loss	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	1211281f-ad14-48b6-86e4-a4eb98d667d0	6e317b3d-864d-4103-9820-11fd2782e6bb	-3	loss	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	31e6b9ac-abc1-402e-bed5-2961e9bc8a02	ed0b92aa-5364-4346-abbb-285e5f17c8b0	3	win	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	b92f4877-3642-4dad-8a58-cbbc33acaa27	8ab200bc-2e9e-4812-a16c-7d8219f44bb4	1	win	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	3ec70270-c7f5-42b0-9220-34405add51e7	e80f337b-b86a-4a22-a862-011330247a5e	-1	loss	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	a9ade8e0-8fb2-4c2b-917b-7191424388e7	aa7e4f65-3b54-4246-9575-c8053b54e8bf	3	win	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	a9ade8e0-8fb2-4c2b-917b-7191424388e7	f42b3e8c-4621-46d5-a438-7acaaa0f8cbb	3	win	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	a9ade8e0-8fb2-4c2b-917b-7191424388e7	35e03366-388f-4d0a-9a7e-479131b07432	3	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	2c53b774-736f-410c-b671-9ec4f1493fbd	8e357af2-c7ef-432c-a078-c31cdeb1c878	1	win	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	2c53b774-736f-410c-b671-9ec4f1493fbd	6df2f915-085f-4998-9200-8c2b8c8e188b	3	win	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	2c53b774-736f-410c-b671-9ec4f1493fbd	18810d72-75a6-4bf8-85b8-bfa6b3f733bb	-3	loss	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	2c53b774-736f-410c-b671-9ec4f1493fbd	3b3feba4-23b5-4380-8fa6-8b756d929adc	3	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	01b3a495-1daf-4b24-99e2-a903e786b1be	9121db51-f9d9-45c0-a9b8-311497904340	-3	loss	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	01b3a495-1daf-4b24-99e2-a903e786b1be	89061fc7-e8ff-437d-9de0-df27f5c5ab22	-3	loss	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	01b3a495-1daf-4b24-99e2-a903e786b1be	32d553b4-334e-47f1-96bf-09feb6bfee82	-1	loss	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	01b3a495-1daf-4b24-99e2-a903e786b1be	7f3e97a5-cfc3-41a7-9390-101dea66ab70	-1	loss	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	3cd1d025-e2d8-463e-80ef-6385fc746582	fdc878c7-52b5-44b9-a147-1e1ea2a49e08	-3	loss	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	3cd1d025-e2d8-463e-80ef-6385fc746582	ef5291c5-29b4-43dd-9be3-6892887b2a3a	-3	loss	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	3cd1d025-e2d8-463e-80ef-6385fc746582	80b50169-2cd8-42bc-a3fb-980536fa4005	-5	loss	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	3cd1d025-e2d8-463e-80ef-6385fc746582	f54933f7-c56e-4aeb-93f1-1f2b3e54899b	-5	loss	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	2ce2ef92-1078-461b-abda-6d1911a0a056	49d5c310-8e4b-477c-baa3-7ebe319634b0	-1	loss	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	acabce6e-fe7c-425b-9253-b814cd6566b4	f6904e24-f96d-4d71-ab93-57cad95700ef	-3	loss	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	4a71fd05-215f-4ff9-a9a5-3ca7f0bb5938	01d46c87-a070-437f-b504-98b91acf4f58	3	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	3cc444f7-1d14-4ca8-8871-dbfb2b3607b0	25d031d5-4f35-4d23-b104-1c3fa020a2f1	0	push	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	3c5359bd-125e-4aec-ad9d-a5c4b0d3e30c	8de7ec53-2e64-46ae-ac50-1c38598cd555	-1	loss	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	01ced56f-5413-4445-b791-af1bc821d0cc	6de40207-956b-4ccc-939d-554caa44796b	1	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	f58f0065-696f-4d1a-9e79-ee46d002c79a	10f6e77e-a321-48b6-a4e6-699c015820ac	1	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	358d48e8-bed8-4dc9-a3a2-a45116df0833	7e493a96-7b02-43f9-aa8a-dae54786c2d9	3	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	c95835d4-c6eb-495c-9a7b-8549c0bb86e4	ce743392-4c84-4420-ba46-4af16f306ede	-5	loss	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	7c66af18-7fe5-403b-8a74-fc66d3e13e5f	5d7fdeba-1ad9-4b72-be3e-e5da98c6b5a2	-1	loss	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	af39c4f7-7bbc-445f-9596-0ee71f84d732	85f0aaa5-ea27-4385-8180-89e3c9216c11	3	win	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	e4f9bc56-5420-4c15-8992-4feb8126e69a	0707c0e9-0325-416d-bc8f-986c4cc7e237	-1	loss	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	1a9a4ec2-e36e-445c-a230-904155133ad1	db4f83a8-b042-4c55-b758-435d5d287a17	1	win	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	31e6b9ac-abc1-402e-bed5-2961e9bc8a02	b37a333e-0bb5-4537-a628-d382cdf037ab	3	win	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	a6646dac-f8d6-473f-96fc-0e711dd92011	fd8e2615-c176-4582-a6b3-f1047b61f600	1	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	31e6b9ac-abc1-402e-bed5-2961e9bc8a02	0da9b3ad-2783-47c3-9b10-ebd3c9d3b312	-3	loss	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	242131ad-16bf-4fd6-8e5e-65b6d2e79cf1	7f4767fd-8be2-41b5-8f3f-504e8d3bd2fc	3	win	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	7e68fe65-8ae9-4e71-ac41-ae6b9a3a7d62	b3cc948f-9b38-4cac-a9e3-d75ccb479a07	-3	loss	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	336dd0e8-7642-45af-a8a6-493dae1bedbc	1aa1513d-ee94-4d8f-9239-977d5276cc1d	-3	loss	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	b0a3899d-dd50-487c-b759-826132a5af7d	547e39f3-d57e-49b0-8745-89e581a5f04b	5	win	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	b0a3899d-dd50-487c-b759-826132a5af7d	55666f50-914c-448f-9fab-b81b1812b3a9	3	win	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	36496369-7298-4ef1-a622-6ef72558e109	cb74f1c3-3725-4e1c-9f95-abaac191c3c4	3	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	13a5b004-d94d-4fef-9586-6a0af5dfedec	ee9eb97d-0c55-4fea-a6fc-2daa416be7c1	3	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	bc9e35d8-20fa-44b4-be20-81e6c19c72e1	a3a63fcb-0cbd-4dc5-beb4-f1574b31a433	-1	loss	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	ca15c000-5210-4eb0-9793-bda649720d4d	12a61f9e-0955-484b-b52b-1ffaea3d0599	-5	loss	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	10340ef1-48a2-48c8-a50a-bb3d0eaa35fe	643aade0-9f12-4625-9872-76b0da58ea31	1	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	8417d24a-a09d-4f23-ab21-40f016ed3bd3	c078b5bf-c0d5-473d-83c3-565148d37ce7	-1	loss	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	ca15c000-5210-4eb0-9793-bda649720d4d	633308ac-99ba-4732-849a-c3a953ee254f	-1	loss	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	8417d24a-a09d-4f23-ab21-40f016ed3bd3	40755be6-aad3-4c37-964e-c4ad480d3ee0	1	win	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	ca15c000-5210-4eb0-9793-bda649720d4d	45c97254-210c-467e-a939-83bfcf2a5148	1	win	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	2b45efe0-31db-4e09-868e-5ab5549e0b0a	7c900c89-c6c8-42f2-bd50-676ca03874ff	-3	loss	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	0efcb2cd-b1dd-46bd-bc97-4b1af61b2154	93d4e783-3003-40d0-8871-2a266fe175de	3	win	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	2b45efe0-31db-4e09-868e-5ab5549e0b0a	f21693f6-ca37-4542-82e1-e65886138af2	-5	loss	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	fdd4448f-e730-4933-89a9-f4d40456b4d7	1a04a19c-9181-44f4-9ae9-7cdc277d5d95	-1	loss	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	fdd4448f-e730-4933-89a9-f4d40456b4d7	cab3acf8-e4d7-4f70-8aee-18d3f0ab057e	-5	loss	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	fdd4448f-e730-4933-89a9-f4d40456b4d7	66986b9f-8293-42cf-8e06-a4f15e79550e	1	win	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	fdd4448f-e730-4933-89a9-f4d40456b4d7	b54b9760-8543-44a0-9ab0-62d982c7c74b	1	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	b42650fe-fa28-4feb-98d6-622cffa6eb2e	a3cd9621-132c-443e-a364-88ead447fe1e	1	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	2ee03b3d-e61b-4633-b5ed-f234f3c51cd6	79038b10-2d3f-42ab-afc4-2a5c1a550de6	-3	loss	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	5cf03998-5733-4976-bd8d-f70cd50718fb	ca7d5447-e66c-4124-9328-853b2efc94eb	-1	loss	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	b556dadc-16a2-4062-9e07-c4801a270aea	bc84de4e-e2bd-4a5d-8b9b-5ec62505cb61	-1	loss	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	c4d15223-1220-412c-a372-c5d0b415fee2	e0f47d00-edcd-45c0-b9c0-e63ea52d8937	1	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	5cf03998-5733-4976-bd8d-f70cd50718fb	623a14e0-0346-4e1d-97e6-3b921e4edf74	-3	loss	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	b556dadc-16a2-4062-9e07-c4801a270aea	b39f3bf7-48e2-4a8b-9b95-02bec90b33a8	3	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	c4d15223-1220-412c-a372-c5d0b415fee2	4f33681d-7c72-4318-a18d-cced91e332ac	-3	loss	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	5cf03998-5733-4976-bd8d-f70cd50718fb	0288bdf8-347d-4a8e-9fb9-dbd42b6ee2ae	-5	loss	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	5d229b96-7da4-4fcb-a0d5-0bdcae77558e	\N	-1	missed	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	5cf03998-5733-4976-bd8d-f70cd50718fb	\N	-1	missed	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	cc3cd25a-c004-40fa-a591-d8bbbb2ea929	\N	-1	missed	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	e2e4275d-7bcf-4d9e-b8cc-b35a5703de8c	\N	-1	missed	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	3d891558-07e3-4160-b83c-5b4a7d5f63df	\N	-1	missed	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	ca15c000-5210-4eb0-9793-bda649720d4d	6ee0752b-7d16-40f4-a12c-5a3791e62b4a	-5	loss	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	8417d24a-a09d-4f23-ab21-40f016ed3bd3	aff99dc6-ea1e-4a92-a210-5d9352bde1de	-3	loss	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	0efcb2cd-b1dd-46bd-bc97-4b1af61b2154	c672eaa8-7ea8-49ab-93c9-c48ce5866838	-1	loss	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	d26f58ed-1e7b-4e7f-9045-36b6a4072128	8a345519-1395-44da-9d8b-84e7ec6ccc68	1	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	250c968a-cb9d-4060-a785-2dfbce12c181	831b3420-e314-4c77-aee6-40daab8e6567	-3	loss	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	9b3c55d8-73f8-4a27-9f17-9d1d9fbd9350	7e314ad3-aa9a-4b37-a982-f1b4b5b1ecec	-1	loss	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	2b45efe0-31db-4e09-868e-5ab5549e0b0a	45da191e-e6cc-4220-8721-b879d5e1ac39	-3	loss	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	a72be0b6-d553-4389-aee5-8c2fd70c58cc	51812c44-45d2-4a4f-85a5-24b41de750a9	-5	loss	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	d26f58ed-1e7b-4e7f-9045-36b6a4072128	9fa21466-f14f-48b0-9cdf-63aff6033283	-5	loss	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	a72be0b6-d553-4389-aee5-8c2fd70c58cc	697a3326-110b-482d-a328-d9d470d23a37	-3	loss	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	91376266-40b6-4e41-aca0-0736c40c57f2	4dfc2f7b-69fc-462b-a376-e1b29cfe6f57	3	win	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	0efcb2cd-b1dd-46bd-bc97-4b1af61b2154	eb3924b7-90e6-49f8-9bda-6e8b0e03bbd1	-1	loss	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	8c1fa576-2d49-4e8a-962d-259057938461	04afee6f-c49e-43a8-92b7-217c6a90ae44	5	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	2b45efe0-31db-4e09-868e-5ab5549e0b0a	b6c45821-5614-4cfc-8089-f30f8a77ced1	-5	loss	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	b0f2ec20-f691-43a1-a91b-549cdde8abd4	d09b4062-869f-4abe-bb14-222b64302d1e	1	win	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	bc9e35d8-20fa-44b4-be20-81e6c19c72e1	11e8df81-5dbd-4398-ae96-930fa0f070f0	-1	loss	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	b556dadc-16a2-4062-9e07-c4801a270aea	bd4f410d-b24a-48ac-9734-3f21bfb5b26e	3	win	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	c4d15223-1220-412c-a372-c5d0b415fee2	c0e0e607-8082-467e-aad1-e2cb3a84a358	-1	loss	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	18174242-6c62-47ff-967f-d60afcc3b0ae	e3b70265-aa52-4da3-ae53-25fdb02e74c1	-1	loss	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	47f0286f-2598-4319-911a-3592d0ca6f07	4b4565d0-de4f-4742-ba95-575e6945de70	3	win	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	3bf722b0-695a-428a-a9fc-f77cd0901e52	84ecc3e9-68a4-41f2-8f84-3cf29c233f61	3	win	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	b57ee556-4263-43bf-924d-b59dbfa152f3	1a6167c5-5751-4b06-bef2-6d903de6b652	-3	loss	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	8680b02f-3c5c-405a-8de9-37384b0667d4	3e7a3938-2c40-46ea-8636-a469746f046e	-1	loss	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	5d229b96-7da4-4fcb-a0d5-0bdcae77558e	d4fbb051-1c25-4286-b9da-8ced594c16a6	3	win	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	bb418583-3bf5-46ba-beb3-f4257a017cb7	e804583c-df5c-4615-8edf-5a74f8232ae0	-3	loss	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	bf3f67e5-389a-4bd0-a40e-36cd2780ea22	55d42c43-4efb-43e9-bccb-bf41ecbaf805	1	win	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	1211281f-ad14-48b6-86e4-a4eb98d667d0	a167f431-ca20-4d74-a004-16c78957c86f	-5	loss	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	a6646dac-f8d6-473f-96fc-0e711dd92011	eba99a9e-36dd-4e24-a681-783d4d81b9e4	5	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	a6646dac-f8d6-473f-96fc-0e711dd92011	9c1447ee-f61f-4841-99b6-d189b7644cdd	1	win	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	10340ef1-48a2-48c8-a50a-bb3d0eaa35fe	4b7d77b0-59a9-4dd9-80c1-34c1db454c48	-1	loss	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	6d3724f1-646a-4345-9f21-6f0b4932664c	a46e7703-50ab-456d-9594-f997a6165b8f	-1	loss	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	fe4ccad3-2b0e-46f8-b2eb-c197e204cd5c	f79383b9-9b66-45ed-bf4a-85ad716b8aee	-1	loss	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	86f55afb-4e15-4949-a2bc-ff38a995263f	58f7830e-6721-42c5-96a2-8f8ba13f237d	3	win	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	0b349bf3-4672-4285-9a9a-8330f11f8c22	6dda985d-259e-4ab9-8552-e111a34a6114	-5	loss	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	bde2234a-6b87-4b5e-85dd-37c092bc3047	359e5138-422e-49ff-b16b-2bca4b6650a5	5	win	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	2669b044-2985-4243-a9ab-9b725dccee62	6b6533dd-4a82-401f-baee-cfa118d1382d	5	win	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	8d1ac3c2-a669-4274-9d81-20e1f51b9bae	eeccb00e-ce8a-4548-9431-584a92461faa	-3	loss	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	34aa22d9-a08f-4527-9c82-f7bb72317a90	60d20f5e-dd05-4201-8b30-5752247720f9	-1	loss	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	f27eeec6-0e15-4c22-81c6-5c4b143adfe8	2f78d3f2-c8a6-4f65-9049-c5d2e383fbff	5	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	3ec70270-c7f5-42b0-9220-34405add51e7	6a70523a-aaf5-4817-aa8e-4c4ef6ec1197	-1	loss	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	3c511a07-f80a-4dc2-bc49-40a3fbe5ddb3	1873ae4b-07ee-442d-b47a-dd416bb857be	3	win	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	336dd0e8-7642-45af-a8a6-493dae1bedbc	fc00420e-5d62-4612-bd05-0a2a4309d738	-3	loss	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	3ec70270-c7f5-42b0-9220-34405add51e7	5a0e540c-7d65-4db0-8bc7-529befcb2c7e	-3	loss	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	2c53b774-736f-410c-b671-9ec4f1493fbd	04c218b7-abd6-4aea-9a1a-fbad6a9537ac	-3	loss	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	5334cd67-c846-4303-b979-4636a885b1b6	69d56277-cd20-4ef9-aeb3-274ebe698087	3	win	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	a9ade8e0-8fb2-4c2b-917b-7191424388e7	60ad939a-2ad6-40fb-96f2-00c2a1f91668	-1	loss	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	fa733f3c-4b1a-442c-a331-8d2651040165	57fc77cb-15eb-41cf-b010-290a40f432b2	-3	loss	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	67abe3aa-726e-41ef-baeb-b1d0bbd94e2f	4fb951b7-5cc1-4b70-8bf2-a1fbfae4d1cb	3	win	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	080e3432-5c2c-4228-8de9-48845f5b826d	bf9950d6-ba9e-4212-8beb-6aaddfad094d	3	win	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	0ba7b515-e8f9-4a04-8790-990094e4c9cf	d3c21858-098c-4bc8-8415-50cd44d0adb7	0	push	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	31e6b9ac-abc1-402e-bed5-2961e9bc8a02	640219fb-7530-4018-8b4d-5135fa1420f0	-5	loss	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	b3236d16-a2ac-49f8-97f9-347a9d64c8d1	be4343b1-cc1c-4dbe-9fda-cb1c2b9eee49	-1	loss	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	5635fb7e-2185-479c-90b1-b46de7a4f4b3	20664859-89d2-4ebf-af2b-d29a34162b4b	3	win	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	0318ac4a-51fa-4197-9a58-d5a066c5c7cd	ccf1b5db-e2f1-4f18-afed-2d7fbce7c044	3	win	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	67abe3aa-726e-41ef-baeb-b1d0bbd94e2f	cc898777-1d62-42be-b092-d4b8627c92bd	-3	loss	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	080e3432-5c2c-4228-8de9-48845f5b826d	b405de1c-b980-43c5-aa59-1952cc5c729f	-3	loss	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	0ba7b515-e8f9-4a04-8790-990094e4c9cf	68e65c43-55e9-4bb0-86ed-6d04dbbc845b	0	push	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	dc820270-eba7-46bf-b0ea-a266032ff812	96d67b65-2212-4dff-8bca-7d5a6ffa8d3a	-3	loss	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	509947e1-c9f4-4dea-869e-18f0ae6560b4	de03f07c-3f06-48a8-abee-7fd8e8cca4d1	5	win	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	b3236d16-a2ac-49f8-97f9-347a9d64c8d1	b8d17748-2b87-4c9b-b3d4-b7a3effbc04d	-5	loss	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	6e913449-02a1-41ef-9139-55aab1625913	de0faff2-057d-4782-b639-627ecc403709	-1	loss	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	67abe3aa-726e-41ef-baeb-b1d0bbd94e2f	0d014c92-a342-44fb-955d-8d9c3a7c878f	-1	loss	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	080e3432-5c2c-4228-8de9-48845f5b826d	b9c2027f-4535-4aad-b50a-afca36d63df6	-1	loss	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	0ba7b515-e8f9-4a04-8790-990094e4c9cf	bde61916-3dfe-4197-8ee0-e811f04e0735	0	push	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	509947e1-c9f4-4dea-869e-18f0ae6560b4	6bc1073e-746c-4068-a906-c03c8cf9ff5e	-3	loss	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	5635fb7e-2185-479c-90b1-b46de7a4f4b3	5bdc0b7f-12e2-48fb-8454-6c937e4c8085	1	win	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	6e913449-02a1-41ef-9139-55aab1625913	109b4589-6d9b-43bd-a196-749e4595eb11	3	win	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	b92f4877-3642-4dad-8a58-cbbc33acaa27	881f11e1-220e-4b66-9349-ac55e02b83e5	-3	loss	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	1211281f-ad14-48b6-86e4-a4eb98d667d0	e2acbe40-4c0a-4263-9208-f447ca4572b6	-3	loss	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	7d2cd926-d87c-49a2-ac4a-75992298fb33	230db018-2d72-4de9-9127-5c39930212e3	3	win	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	8c1fa576-2d49-4e8a-962d-259057938461	ffbe13f5-5f1d-42db-8df5-568df4ef01d0	3	win	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	b0f2ec20-f691-43a1-a91b-549cdde8abd4	0ebe0503-f980-4644-9f8d-63df92e4678d	-3	loss	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	49a0b7ea-6fc3-45d1-848a-6b0e079f13a2	5104530e-e7c7-4887-9fae-82b8e695b85b	-3	loss	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	8c1fa576-2d49-4e8a-962d-259057938461	cdf828bd-7395-4dda-8fc0-fe2c7c50e6a0	-1	loss	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	10340ef1-48a2-48c8-a50a-bb3d0eaa35fe	958da5b5-647c-4bc9-b8d5-0a99ef50e81d	-5	loss	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	8c1fa576-2d49-4e8a-962d-259057938461	d0fed4d0-8fc0-445b-a9d4-e393360fdb5f	-1	loss	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	b0f2ec20-f691-43a1-a91b-549cdde8abd4	fd2cdc8d-e3c3-4726-93ab-9f1ced69a003	-1	loss	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	ca15c000-5210-4eb0-9793-bda649720d4d	7ca52994-dad7-433e-8ddf-8ba3aa9373d0	-3	loss	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	7d2cd926-d87c-49a2-ac4a-75992298fb33	8bd77f4e-d580-4364-8280-42b8afd11ea6	5	win	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	8c1fa576-2d49-4e8a-962d-259057938461	d9e1c959-6c90-4c8a-acd0-891bdcb1a23e	1	win	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	6d3724f1-646a-4345-9f21-6f0b4932664c	eeced433-4d83-47f3-8a6c-ebb76b97ffec	1	win	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	6d3724f1-646a-4345-9f21-6f0b4932664c	63774d26-e7b0-4c71-b150-628771971f09	-5	loss	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	6a64a55f-f8da-41e8-a1ce-50a485f53127	4c122b5d-58ac-4950-a6ae-f8c1fabe12bf	5	win	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	ebba52ce-db32-4ea8-909d-eaf8c90105be	ced2f8cf-f150-47db-a4d1-9c6460c0c2dd	3	win	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	b78e5b52-7747-43a0-9bd4-020c7223b8e3	ee8c9ed7-b616-48f6-a031-b3629857d020	-5	loss	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	58b00d24-143e-48a2-a202-07a1b3975fc3	1e0e5ab6-dd2b-4390-beb1-2512912d70a5	1	win	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	c9bc16f7-9a25-429d-98f3-5c7a3ebc8414	652810f6-869a-4a52-a1f4-1d99f36334ac	-5	loss	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	d2ac537e-3d10-4662-b6f5-836d8255ffab	156dacbd-679e-47f4-884e-5a394a5bb8b2	3	win	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	fe4ccad3-2b0e-46f8-b2eb-c197e204cd5c	9da90617-e655-4702-85e1-aaa22866cc6b	1	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	fe4ccad3-2b0e-46f8-b2eb-c197e204cd5c	0852face-10b6-4b2f-9cb4-9588c5625ae4	1	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	f27eeec6-0e15-4c22-81c6-5c4b143adfe8	f3e20be8-13e1-4c4f-b023-b74d25df2985	3	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	2954f2b9-b9ae-4d88-8c86-1be1a49f6f8a	c97b5abc-b240-4647-8a0a-6669debf0a20	-3	loss	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	67abe3aa-726e-41ef-baeb-b1d0bbd94e2f	ae01da17-a2c8-4b70-8a88-ce8d763b40d5	3	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	080e3432-5c2c-4228-8de9-48845f5b826d	8f15e81c-b7bb-42b4-a14b-2b8bf99927ff	3	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	0ba7b515-e8f9-4a04-8790-990094e4c9cf	ad79a75a-7561-485e-b4da-e46f023486cd	0	push	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	b3236d16-a2ac-49f8-97f9-347a9d64c8d1	77aceca1-a79f-48ae-a65a-620e25291432	3	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	5635fb7e-2185-479c-90b1-b46de7a4f4b3	5a3831fb-cc71-4332-8a0b-b253fe9ec056	-3	loss	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	5635fb7e-2185-479c-90b1-b46de7a4f4b3	d7dfffb3-a6ab-4457-8d44-6a9aacb28660	-5	loss	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	0318ac4a-51fa-4197-9a58-d5a066c5c7cd	de4aebfb-29bb-4c4d-84c3-f5d4f3a868a1	-1	loss	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	6e913449-02a1-41ef-9139-55aab1625913	9ad38a18-4ef7-41b7-a561-edac86eb2709	1	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	b92f4877-3642-4dad-8a58-cbbc33acaa27	970460c5-2d62-4e9e-a24c-3d3f8f878418	1	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	1211281f-ad14-48b6-86e4-a4eb98d667d0	ee3ccee8-8e6d-43c8-ab8c-d66f89820a32	3	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	dc820270-eba7-46bf-b0ea-a266032ff812	34c9e698-d388-430c-bc2b-26e7f3d2d707	-5	loss	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	b0a3899d-dd50-487c-b759-826132a5af7d	ab9fa15c-3bb7-42a1-96ec-25168554ab72	-1	loss	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	105ee53e-1599-447f-8df2-04a8f0e03d2e	bf99edfb-c614-49b8-8a85-3c8bf1d17cb8	3	win	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	105ee53e-1599-447f-8df2-04a8f0e03d2e	551c0aa7-a738-43d2-baf9-b7e46190ee42	10	win	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	105ee53e-1599-447f-8df2-04a8f0e03d2e	92a35638-0750-4bd5-a4db-eb55fe9295b5	-3	loss	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	105ee53e-1599-447f-8df2-04a8f0e03d2e	c88c90bc-04b5-48c3-9f08-c63586149be4	5	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	63be1bd1-8401-4d9c-850a-3c48a0aa2542	82d5ac6b-8dfb-4a10-b984-f61f1ea52d2d	-3	loss	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	63be1bd1-8401-4d9c-850a-3c48a0aa2542	04736120-c6bc-4a00-a5e7-47a5e3c51466	-1	loss	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	63be1bd1-8401-4d9c-850a-3c48a0aa2542	c49fd9f8-8e15-46a9-876e-bb5173d88503	-3	loss	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	63be1bd1-8401-4d9c-850a-3c48a0aa2542	50c41ab1-e800-4058-9caf-ba07f5654c15	-1	loss	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	34aa22d9-a08f-4527-9c82-f7bb72317a90	2e34c30b-f43e-40de-a31c-632014aab331	-1	loss	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	34aa22d9-a08f-4527-9c82-f7bb72317a90	febdebbc-0f54-4db8-9a71-59b7748f61cf	-1	loss	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	34aa22d9-a08f-4527-9c82-f7bb72317a90	f8b8f33a-f9c2-403d-a51f-eb2f57e38e12	3	win	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	34aa22d9-a08f-4527-9c82-f7bb72317a90	7007e8cc-1839-404e-8e6b-b4e871da3f87	-3	loss	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	d6ea14f2-b5c2-4ba7-b9cf-37a49c400434	5c503377-cabc-4f0c-a302-52526aa7e035	-3	loss	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	d6ea14f2-b5c2-4ba7-b9cf-37a49c400434	3713b5f6-e6cf-4909-888d-d23cdc9d92d3	1	win	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	d6ea14f2-b5c2-4ba7-b9cf-37a49c400434	6007d87b-7a83-4ae1-9c29-dad7574d8c83	1	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	d5e23358-9bcf-4a36-bd67-60364e49567a	de1d44f9-9696-4c50-a1ec-cc44e3965abc	-1	loss	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	d5e23358-9bcf-4a36-bd67-60364e49567a	8a6a9324-f9c9-49d9-8e44-6cc7af2e5131	3	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	d5e23358-9bcf-4a36-bd67-60364e49567a	e5f43835-08f3-4e6c-8c1a-75b964d5aba9	-3	loss	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	d5e23358-9bcf-4a36-bd67-60364e49567a	8f0007d9-c4c3-454c-ac3d-0101bc8ebcb8	-1	loss	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	36496369-7298-4ef1-a622-6ef72558e109	8f2e0a16-50cc-4120-960e-30abce0cad6d	1	win	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	e30cf41d-c05f-48b8-bd5b-674138779e39	98502f63-f1a2-4c3c-8d32-ef7f1bcf3b33	3	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	e30cf41d-c05f-48b8-bd5b-674138779e39	d6510a63-3ecd-416d-8992-b9f103c4165b	3	win	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	e30cf41d-c05f-48b8-bd5b-674138779e39	3ecccf3a-4fc6-4524-8463-8fc45ac63dd3	-1	loss	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	718b520f-2d47-4a41-b108-d0ac9faa34aa	c474d6be-e980-4ce3-afb9-d3b4ecbad72d	-1	loss	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	718b520f-2d47-4a41-b108-d0ac9faa34aa	4e08b8de-b84a-4c12-83ce-1e374c4e8200	-1	loss	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	718b520f-2d47-4a41-b108-d0ac9faa34aa	4e8340dc-6bb5-40a9-be35-4cfbdd928b62	-3	loss	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	35fae26e-9b57-4a1a-b750-2ee208cf10ce	aba6fe64-bc10-47af-b910-3803b18f8907	3	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	35fae26e-9b57-4a1a-b750-2ee208cf10ce	80cb5d8e-9da9-46d2-acfa-681ac19e5633	-1	loss	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	35fae26e-9b57-4a1a-b750-2ee208cf10ce	3aec86ee-8f66-4815-b803-c0d64e36b74a	1	win	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	ec0ec9d8-cc67-421e-803b-590bc9113f08	8492a5fb-e9b7-476d-9296-030084eafa79	3	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	ec0ec9d8-cc67-421e-803b-590bc9113f08	94be3df8-4479-484e-8497-c4aaf6e8c0a6	3	win	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	ec0ec9d8-cc67-421e-803b-590bc9113f08	57b8b755-e277-4a86-9c33-3a45aac61bed	-1	loss	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	3afdd6f6-f374-4f39-8c50-84dfebe25813	5f2637b2-b9b8-4954-b115-ae4d8d60f5f4	-1	loss	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	3afdd6f6-f374-4f39-8c50-84dfebe25813	7625ca2a-6a61-40a1-ac74-a2201004d7bd	3	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	3afdd6f6-f374-4f39-8c50-84dfebe25813	511f28f3-5b42-4561-aaea-20310252b315	-5	loss	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	3afdd6f6-f374-4f39-8c50-84dfebe25813	5096baf5-4651-47e9-a436-ef3cfb695571	3	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	97f057d9-d748-49ae-aa3a-837b3c5297ca	21362822-59e4-4773-832c-7026d37ae2b3	-3	loss	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	97f057d9-d748-49ae-aa3a-837b3c5297ca	39d49d3f-8702-4e6c-94a9-908f49dbc874	-3	loss	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	97f057d9-d748-49ae-aa3a-837b3c5297ca	505a71c2-7632-4342-ab3a-21ffaaa30506	3	win	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	7e68fe65-8ae9-4e71-ac41-ae6b9a3a7d62	16ed07ae-b510-44d4-9c78-2a814508cacf	3	win	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	7e68fe65-8ae9-4e71-ac41-ae6b9a3a7d62	61337ae5-a193-486f-addf-3eb7b1dc436d	-3	loss	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	336dd0e8-7642-45af-a8a6-493dae1bedbc	a910e0bc-85fc-4e4a-b300-37e2d6e9ba3a	-3	loss	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	336dd0e8-7642-45af-a8a6-493dae1bedbc	fbfb8821-82ec-4a93-8073-6f10b61ad6df	-3	loss	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	336dd0e8-7642-45af-a8a6-493dae1bedbc	eb17360a-475c-4a80-b660-3b69d3a3d84f	-3	loss	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	336dd0e8-7642-45af-a8a6-493dae1bedbc	0131d4a3-55d4-4ade-becb-85c22513bb8d	-1	loss	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	49926afd-6329-4124-9846-7a044272ac54	632956b2-2ee9-4a92-bd0f-dbe7c3939341	5	win	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	49926afd-6329-4124-9846-7a044272ac54	83a695f4-aa52-415f-a2ba-c3c43473dc10	-3	loss	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	49926afd-6329-4124-9846-7a044272ac54	d2b2e3bc-2a18-46c6-bc57-d39d7b56c11d	3	win	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	49926afd-6329-4124-9846-7a044272ac54	7bac3160-d334-4cdd-ac4f-574c8a948483	3	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	5334cd67-c846-4303-b979-4636a885b1b6	e39deb29-e9ff-40a9-b190-6b1167480ad1	1	win	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	5334cd67-c846-4303-b979-4636a885b1b6	983a2aac-1f3c-439f-bc49-16bef23dffdf	1	win	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	5334cd67-c846-4303-b979-4636a885b1b6	1b796b41-aa43-4507-aae6-2ba57ffac42b	-3	loss	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	5334cd67-c846-4303-b979-4636a885b1b6	470a7a25-3142-4231-a504-fe0f2b525c26	5	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	fa733f3c-4b1a-442c-a331-8d2651040165	7794db56-a138-4b81-8e6a-311eee9c9b74	-1	loss	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	fa733f3c-4b1a-442c-a331-8d2651040165	513b01ce-1d14-4857-ba78-9b9f9459784a	1	win	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	fa733f3c-4b1a-442c-a331-8d2651040165	779a2cda-31ca-4132-8cb0-82e2616a8636	-1	loss	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	fa733f3c-4b1a-442c-a331-8d2651040165	f4f2b3c6-f8d3-456f-a61e-7957a0a3ce3c	1	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	3c511a07-f80a-4dc2-bc49-40a3fbe5ddb3	682afdcd-4016-4d77-ba1c-3c1924d23336	-5	loss	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	3c511a07-f80a-4dc2-bc49-40a3fbe5ddb3	97792588-1aa8-4e6a-9a9f-ffb8c78aa8c7	1	win	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	3c511a07-f80a-4dc2-bc49-40a3fbe5ddb3	70f9b9b1-cffa-4c6a-ac8c-0a2911f753ed	-5	loss	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	3c511a07-f80a-4dc2-bc49-40a3fbe5ddb3	6d9e9a64-4058-46f7-9e72-121c33764d9a	-3	loss	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	3ec70270-c7f5-42b0-9220-34405add51e7	f09ae650-48b0-48b9-9cd1-570b7b6e823d	3	win	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	3ec70270-c7f5-42b0-9220-34405add51e7	b99b9335-cb81-43a9-91ec-fd7849f4f84f	3	win	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	3ec70270-c7f5-42b0-9220-34405add51e7	be671e68-efac-4af9-bc2d-82ab835fd6dc	-1	loss	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	b42650fe-fa28-4feb-98d6-622cffa6eb2e	75457a91-875f-430a-80b5-ee8f59f27a53	5	win	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	b42650fe-fa28-4feb-98d6-622cffa6eb2e	d0bf1c23-9261-434e-b9fa-0fa1367c1317	3	win	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	b42650fe-fa28-4feb-98d6-622cffa6eb2e	9ecb4ca1-08b2-4062-813f-e3b0fe7a1a99	3	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	abd39ca3-bedd-4a14-942c-1871e3e9a85b	cbef93b3-684d-4db5-830a-a6e7b635f3fa	1	win	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	abd39ca3-bedd-4a14-942c-1871e3e9a85b	0ee0f02d-2c3a-4dea-8f3d-7eac3a052886	3	win	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	abd39ca3-bedd-4a14-942c-1871e3e9a85b	678e8d8a-d8fd-4e96-8d77-fc7bbe7d7ade	5	win	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	abd39ca3-bedd-4a14-942c-1871e3e9a85b	92624d76-6257-47fe-ae4b-017441e3e417	-1	loss	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	b0a3899d-dd50-487c-b759-826132a5af7d	40af44ac-f686-46a2-b5b6-b909059465f8	3	win	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	97f057d9-d748-49ae-aa3a-837b3c5297ca	4b6a12dd-e750-4e50-a512-d35232af8a92	-1	loss	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	103aa0f9-e2fb-40e9-b656-520220ddab95	8c9ae839-4329-4cef-908d-629e2a2b7633	3	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	103aa0f9-e2fb-40e9-b656-520220ddab95	3b02494a-31d4-48c9-ba80-ae621ccf2826	1	win	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	bf3f67e5-389a-4bd0-a40e-36cd2780ea22	\N	-1	missed	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	34aa22d9-a08f-4527-9c82-f7bb72317a90	6e471c1d-5cba-45cb-a93b-1cc9993abcc2	1	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	d6ea14f2-b5c2-4ba7-b9cf-37a49c400434	10191521-ea93-4d3d-8220-483fbb66b29a	1	win	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	d6ea14f2-b5c2-4ba7-b9cf-37a49c400434	0260610b-46ea-4ea0-8d9a-864427f99a9b	-5	loss	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	d6ea14f2-b5c2-4ba7-b9cf-37a49c400434	a2d251ad-b949-4a62-95dc-db117928fd0b	3	win	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	d5e23358-9bcf-4a36-bd67-60364e49567a	b6c67b80-4704-4847-9279-364fa561a697	-3	loss	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	d5e23358-9bcf-4a36-bd67-60364e49567a	52e72dac-2118-45be-9933-4c2c210a0a6e	-3	loss	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	3436f7cb-d383-468b-b676-6e76b51d01c4	1c914656-ee66-4ef1-be94-110092759e05	3	win	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	3436f7cb-d383-468b-b676-6e76b51d01c4	74bb4fad-2677-476c-8932-0649e16fcf2e	-3	loss	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	f04d3d1d-2117-4f57-a099-0172487c75a8	c6ae09e0-31fe-4950-8421-f008a75d93b5	-3	loss	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	f04d3d1d-2117-4f57-a099-0172487c75a8	626a2e0f-2a78-4eee-9ead-954e7372595b	5	win	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	36496369-7298-4ef1-a622-6ef72558e109	0170048e-1d2c-4ab5-aaac-5f24aa6a4def	-3	loss	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	e30cf41d-c05f-48b8-bd5b-674138779e39	6f7694ee-cf1d-42be-8e5c-f6515ebfabf6	-1	loss	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	e30cf41d-c05f-48b8-bd5b-674138779e39	645551ab-f5dc-4d97-b925-c7a9d21b684d	-10	loss	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	e30cf41d-c05f-48b8-bd5b-674138779e39	b82e95f2-d87d-433a-b613-409726376876	-1	loss	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	718b520f-2d47-4a41-b108-d0ac9faa34aa	3139ec38-8380-4356-924e-13743c42e48a	-1	loss	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	718b520f-2d47-4a41-b108-d0ac9faa34aa	fb625825-ad90-4752-b45a-4527f3d8b820	1	win	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	718b520f-2d47-4a41-b108-d0ac9faa34aa	bea920de-11e6-4e7d-912c-d819c8b38360	-1	loss	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	35fae26e-9b57-4a1a-b750-2ee208cf10ce	e3861996-64d7-4e95-8042-406962ad678f	-1	loss	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	35fae26e-9b57-4a1a-b750-2ee208cf10ce	2732dd3b-b993-4ffb-aa9a-fd97c3fdbe96	-1	loss	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	35fae26e-9b57-4a1a-b750-2ee208cf10ce	fa3df1c5-e24f-4f1e-bd9c-87e10d66c2c7	3	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	ec0ec9d8-cc67-421e-803b-590bc9113f08	58594ea2-6cd7-4517-8932-add786f1d508	1	win	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	ec0ec9d8-cc67-421e-803b-590bc9113f08	cd381c83-a335-4b26-8d09-b8cf3824f71d	5	win	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	ec0ec9d8-cc67-421e-803b-590bc9113f08	a6d7f14e-fbc7-495c-a5fa-e7ef892a00bf	3	win	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	3afdd6f6-f374-4f39-8c50-84dfebe25813	96920b02-c12c-40b3-94cb-28c02f3e03c9	-5	loss	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	3afdd6f6-f374-4f39-8c50-84dfebe25813	c0f1b49a-60e3-4059-bfbf-b07983b207ef	-3	loss	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	97f057d9-d748-49ae-aa3a-837b3c5297ca	1738ad25-ba91-4ee1-a993-97e50cf328dd	-3	loss	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	97f057d9-d748-49ae-aa3a-837b3c5297ca	86e43a8d-1913-4d5e-b07e-3a0c7c7c6253	-10	loss	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	103aa0f9-e2fb-40e9-b656-520220ddab95	d928caa4-68c0-4e2b-84de-58e2fb73633b	1	win	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	103aa0f9-e2fb-40e9-b656-520220ddab95	ccfb5bd4-8676-4b8d-9aa1-77708829798d	3	win	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	cddd40f9-a5e9-432d-8bfb-719361eab23b	6b98e7d6-6b8f-421e-bf6c-0cd4960f83ca	5	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	cddd40f9-a5e9-432d-8bfb-719361eab23b	fabf89e6-e7a3-441e-9f5b-9cb5428385a0	3	win	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	cddd40f9-a5e9-432d-8bfb-719361eab23b	41fd9928-a61b-450b-bac8-2269456b8e30	3	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	b6e60bfc-587b-4409-b2e6-7dd034f8cbc1	90936848-0554-4ff4-b38a-91140033e31a	-3	loss	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	b6e60bfc-587b-4409-b2e6-7dd034f8cbc1	9d841127-6c15-47eb-8eaa-2f5b9676bbcb	-3	loss	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	250c968a-cb9d-4060-a785-2dfbce12c181	3efdbafd-4d74-4261-9c72-e312227db40b	1	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	250c968a-cb9d-4060-a785-2dfbce12c181	a358fc57-9a15-45d1-9a21-6f6396b67464	-3	loss	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	250c968a-cb9d-4060-a785-2dfbce12c181	a1a2ef46-c5c9-416e-b849-8943ee264ae8	-1	loss	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	250c968a-cb9d-4060-a785-2dfbce12c181	b5a38f7f-228c-46d5-8de4-b6c8a81edb38	3	win	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	250c968a-cb9d-4060-a785-2dfbce12c181	6580265c-4248-4f75-845f-99a6b6a48e1b	-10	loss	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	0318ac4a-51fa-4197-9a58-d5a066c5c7cd	3f075333-4c0b-43e5-b547-9ce38f264199	1	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	6e913449-02a1-41ef-9139-55aab1625913	8f9844b0-0714-44f7-9bd3-4d550c990d5d	-1	loss	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	b92f4877-3642-4dad-8a58-cbbc33acaa27	94fd00ed-150e-450b-988a-e6dc2afb98f2	-3	loss	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	1211281f-ad14-48b6-86e4-a4eb98d667d0	9ebb43ac-606b-4cc5-97eb-7e52c8d4bca4	-3	loss	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	dc820270-eba7-46bf-b0ea-a266032ff812	87b5e1c4-3241-4303-abd3-56efdb267ab8	1	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	509947e1-c9f4-4dea-869e-18f0ae6560b4	f566a1ba-72a7-49fe-86e0-cbcda089b640	1	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	f27eeec6-0e15-4c22-81c6-5c4b143adfe8	508989e0-3e81-485f-b689-090aa107cfbe	5	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	2954f2b9-b9ae-4d88-8c86-1be1a49f6f8a	e7f7e347-3008-4f6d-89fa-f760eb402f62	-3	loss	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	67abe3aa-726e-41ef-baeb-b1d0bbd94e2f	07f2acc7-91e9-4df0-9d2c-667730cc8dd0	3	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	080e3432-5c2c-4228-8de9-48845f5b826d	44988fcf-b68b-47c6-a2a9-5d98f629b42b	-5	loss	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	0ba7b515-e8f9-4a04-8790-990094e4c9cf	b9d0451e-cb5e-4e04-84b7-6bd46c519b06	0	push	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	31e6b9ac-abc1-402e-bed5-2961e9bc8a02	db12f5c7-042c-4637-ae73-8522a5d3f58d	3	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	b3236d16-a2ac-49f8-97f9-347a9d64c8d1	dc091ddd-bc2a-4180-8784-463f10b4fe61	1	win	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	f27eeec6-0e15-4c22-81c6-5c4b143adfe8	283b3e3c-0ccf-4029-9e3a-e57b20f7bdb8	3	win	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	2954f2b9-b9ae-4d88-8c86-1be1a49f6f8a	45aaa0ee-354f-44ee-9d92-9690f3b75ae4	-5	loss	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	0318ac4a-51fa-4197-9a58-d5a066c5c7cd	906124fc-5172-4c4d-8cda-a733892791ae	3	win	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	2954f2b9-b9ae-4d88-8c86-1be1a49f6f8a	bd86916a-acf1-409d-a2d1-a901623ee84e	-3	loss	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	a6646dac-f8d6-473f-96fc-0e711dd92011	5bfb839f-dd48-4c15-8913-3fe4255c93c3	-5	loss	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	1211281f-ad14-48b6-86e4-a4eb98d667d0	794785c5-1127-49b5-8bbb-9e309329ea58	3	win	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	dc820270-eba7-46bf-b0ea-a266032ff812	d654a61c-6cd2-4e42-89f8-1059b04853fc	3	win	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	b3236d16-a2ac-49f8-97f9-347a9d64c8d1	e867a18f-e066-46f8-b76d-65a92b5eeaff	3	win	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	f27eeec6-0e15-4c22-81c6-5c4b143adfe8	0fb0b77e-b27d-4430-a261-d763e2f5c33b	3	win	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	2954f2b9-b9ae-4d88-8c86-1be1a49f6f8a	f1e2746d-f0b4-43f2-9524-e2afb77a4bea	-3	loss	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	67abe3aa-726e-41ef-baeb-b1d0bbd94e2f	f3e25cfe-65cb-4123-8e5f-25a30e3c1bd3	3	win	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	080e3432-5c2c-4228-8de9-48845f5b826d	1942d97e-de1c-41cf-8cea-b775563b8a4d	3	win	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	0ba7b515-e8f9-4a04-8790-990094e4c9cf	53716138-b126-4e75-9162-d157d3c9c4b3	0	push	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	31e6b9ac-abc1-402e-bed5-2961e9bc8a02	3b71bc22-d3e8-4317-ba59-6f32600b0776	3	win	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	b3236d16-a2ac-49f8-97f9-347a9d64c8d1	6bb064e4-b418-4c40-8e5c-200e1a090ffc	1	win	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	242131ad-16bf-4fd6-8e5e-65b6d2e79cf1	b8b1b4b0-4e00-4307-bed6-71f8c2f63ea7	-3	loss	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	242131ad-16bf-4fd6-8e5e-65b6d2e79cf1	ca9d55a7-03c3-4a4c-a595-0ee2884406e0	5	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	7e68fe65-8ae9-4e71-ac41-ae6b9a3a7d62	32786933-6fbf-4a96-b427-b4b75e6e4ab5	-3	loss	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	3436f7cb-d383-468b-b676-6e76b51d01c4	67742302-7745-4412-aa6b-2c02dd5d9673	3	win	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	103aa0f9-e2fb-40e9-b656-520220ddab95	d1e7fd58-81dc-4a10-b3ad-a5605efb3f43	-1	loss	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	b6e60bfc-587b-4409-b2e6-7dd034f8cbc1	1361f23f-0405-4858-9beb-639f73e4b442	-1	loss	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	b6e60bfc-587b-4409-b2e6-7dd034f8cbc1	5dd45144-3402-4480-928f-6b4da6285b7c	3	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	49a0b7ea-6fc3-45d1-848a-6b0e079f13a2	2808df73-a2f0-4c51-9681-0012f886d446	3	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	b0f2ec20-f691-43a1-a91b-549cdde8abd4	5bc1051d-e117-4651-b501-fb43b3e34230	-1	loss	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	2b45efe0-31db-4e09-868e-5ab5549e0b0a	479a6fdc-f010-4ee8-b38e-89531a51421d	-10	loss	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	d26f58ed-1e7b-4e7f-9045-36b6a4072128	01d2c158-e940-4c8c-9dc8-0e53da015c98	3	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	91376266-40b6-4e41-aca0-0736c40c57f2	64beedfd-52b5-445d-9aad-5b89718bb799	-3	loss	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	0efcb2cd-b1dd-46bd-bc97-4b1af61b2154	238023fa-d121-4b5c-8ece-842ab103a968	-3	loss	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	bc9e35d8-20fa-44b4-be20-81e6c19c72e1	a5263e40-bcd6-469c-89a1-70d270ef9fe8	-3	loss	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	9b3c55d8-73f8-4a27-9f17-9d1d9fbd9350	3c84fa63-a5c9-43a5-bcab-e1a667e09be8	5	win	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	49a0b7ea-6fc3-45d1-848a-6b0e079f13a2	80e20853-f9cc-485e-8b8a-9e44e4540265	-3	loss	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	b0f2ec20-f691-43a1-a91b-549cdde8abd4	6abb3352-255c-4b1b-b10d-73b613a0dc4a	1	win	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	9b3c55d8-73f8-4a27-9f17-9d1d9fbd9350	e328982a-da79-4ab8-96d1-9e46f7c28a0b	-3	loss	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	d26f58ed-1e7b-4e7f-9045-36b6a4072128	0b0b8cf9-c4dd-4264-a342-ece6a797bb83	3	win	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	91376266-40b6-4e41-aca0-0736c40c57f2	71441b94-4a06-4858-b400-e90be267151c	3	win	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	10340ef1-48a2-48c8-a50a-bb3d0eaa35fe	776c2ab5-0884-48a0-8258-6a10e7b8a5e5	3	win	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	7d2cd926-d87c-49a2-ac4a-75992298fb33	663a9bb2-4f02-45e0-9acc-e7334d87d629	1	win	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	9b3c55d8-73f8-4a27-9f17-9d1d9fbd9350	b231579b-a70c-419f-9e9c-97a6ca6f1574	-3	loss	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	bc9e35d8-20fa-44b4-be20-81e6c19c72e1	b402b8bc-5939-40b4-9175-ae3273b1e1e9	-5	loss	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	d26f58ed-1e7b-4e7f-9045-36b6a4072128	8e77e82c-b1af-4a58-a0d2-1d0d3328ccee	3	win	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	91376266-40b6-4e41-aca0-0736c40c57f2	0b8618be-e8c4-49b8-aec3-a5f4f7ea0161	-5	loss	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	7d2cd926-d87c-49a2-ac4a-75992298fb33	d63f3564-9d29-424f-b2b2-f204da1c6a1c	3	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	91376266-40b6-4e41-aca0-0736c40c57f2	f6790552-1357-42e9-8715-e6aeaffc454d	-5	loss	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	0efcb2cd-b1dd-46bd-bc97-4b1af61b2154	df0b7670-46aa-4208-8b14-0c45a36b32ca	1	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	10340ef1-48a2-48c8-a50a-bb3d0eaa35fe	a150a76b-4c5f-4684-9c9e-d7935868095f	-1	loss	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	49a0b7ea-6fc3-45d1-848a-6b0e079f13a2	0f232fe6-e9e8-4af9-a643-91d2a5b23177	-3	loss	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	bc9e35d8-20fa-44b4-be20-81e6c19c72e1	af8343df-6ffb-488d-a4c7-6286b5db756b	1	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	380e817d-fcde-418f-9eb1-a97bb993e03e	e0f85100-b72b-4e9f-81ef-75024c473d00	5	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	b78e5b52-7747-43a0-9bd4-020c7223b8e3	1a11ba7c-ea5f-415f-af16-147e6f4f6be6	-3	loss	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	86f55afb-4e15-4949-a2bc-ff38a995263f	6c8f5124-a622-4c01-8f74-c09dc47dc2de	-1	loss	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	bde2234a-6b87-4b5e-85dd-37c092bc3047	5e7ff270-881e-4482-8c4d-912c7847bbc0	1	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	0b349bf3-4672-4285-9a9a-8330f11f8c22	43246543-0fda-495f-b1a8-f0983140f221	-3	loss	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	6a64a55f-f8da-41e8-a1ce-50a485f53127	fcce5ea9-8f94-459f-9a95-8b3f8c4668b6	-1	loss	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	58b00d24-143e-48a2-a202-07a1b3975fc3	ff06e270-0138-43e8-815f-3bc08e53c9e6	1	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	c9bc16f7-9a25-429d-98f3-5c7a3ebc8414	d3c1678a-a1a9-413d-a27a-da1dbbd5b603	3	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	2669b044-2985-4243-a9ab-9b725dccee62	c478c25c-fcfb-4309-a0b6-2f86585a216a	10	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	8d1ac3c2-a669-4274-9d81-20e1f51b9bae	9254a60c-f7c8-45c2-9a14-dec2a746eed2	1	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	d2ac537e-3d10-4662-b6f5-836d8255ffab	d7d93682-5bdc-4f4c-b01a-126c021b2188	-1	loss	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	380e817d-fcde-418f-9eb1-a97bb993e03e	af9e46fb-137c-4fe6-9429-f2838a34dacf	3	win	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	fe4ccad3-2b0e-46f8-b2eb-c197e204cd5c	2329dcd2-86dd-4d78-9a5f-a5f36fedbc8c	3	win	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	380e817d-fcde-418f-9eb1-a97bb993e03e	f3d88af0-e63e-4812-af3a-eb8a78fcae3f	-3	loss	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	0b349bf3-4672-4285-9a9a-8330f11f8c22	7e10b070-cd8e-4c71-9c4d-ba1174242b06	-1	loss	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	b78e5b52-7747-43a0-9bd4-020c7223b8e3	4f8dea50-f901-41f3-9f9c-4e9eba18d5b9	-3	loss	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	86f55afb-4e15-4949-a2bc-ff38a995263f	3c01eb70-e75b-4718-be9e-5daade2e9167	3	win	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	ebba52ce-db32-4ea8-909d-eaf8c90105be	335f7579-7de0-40b9-a53b-65daaf1e1721	1	win	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	6a64a55f-f8da-41e8-a1ce-50a485f53127	b21553c8-c845-4593-a012-6d836f97b899	1	win	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	bde2234a-6b87-4b5e-85dd-37c092bc3047	aee32e4d-b545-4fc1-9bca-cd66974da79f	3	win	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	58b00d24-143e-48a2-a202-07a1b3975fc3	e118a215-da2e-4ebd-ad34-1265cab82cc7	3	win	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	c9bc16f7-9a25-429d-98f3-5c7a3ebc8414	4116041d-33c0-4dd2-b168-9261d4dc424b	-3	loss	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	2669b044-2985-4243-a9ab-9b725dccee62	d8a8e4f0-37d6-4ca3-8c22-f931499be6f9	3	win	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	8d1ac3c2-a669-4274-9d81-20e1f51b9bae	116a9af9-956c-48e8-9aaa-a8a4120f7609	3	win	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	d2ac537e-3d10-4662-b6f5-836d8255ffab	d321fcc5-cfa8-4953-8207-599d8df3452a	-5	loss	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	ebba52ce-db32-4ea8-909d-eaf8c90105be	5c8537ef-ddde-4cdf-9cb2-9a4708a4d878	3	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	380e817d-fcde-418f-9eb1-a97bb993e03e	6c1b6a75-acde-495b-9bdf-cc479c27c684	1	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	0b349bf3-4672-4285-9a9a-8330f11f8c22	bd2542f6-3f2d-47ea-8406-df6dc65bf364	-5	loss	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	b78e5b52-7747-43a0-9bd4-020c7223b8e3	146a076c-ca6d-48b6-9c6e-4f531add83f3	-1	loss	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	86f55afb-4e15-4949-a2bc-ff38a995263f	c7598513-f7e6-403d-a2c2-70d5525d12f5	1	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	ebba52ce-db32-4ea8-909d-eaf8c90105be	eaab490e-7434-44de-adf1-12260b6b367b	3	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	6a64a55f-f8da-41e8-a1ce-50a485f53127	16530374-393e-46fa-9156-4fba7d3224bc	-3	loss	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	bde2234a-6b87-4b5e-85dd-37c092bc3047	935d2d82-0a1d-4b4a-9a13-7b2d0622a202	3	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	58b00d24-143e-48a2-a202-07a1b3975fc3	4230a819-424d-453c-86a2-52769e55296e	3	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	c9bc16f7-9a25-429d-98f3-5c7a3ebc8414	19cec44e-6522-465b-a866-3448fc7243e6	5	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	2669b044-2985-4243-a9ab-9b725dccee62	e6f5af34-b0e0-4152-a61a-0651fdc77198	5	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	8d1ac3c2-a669-4274-9d81-20e1f51b9bae	e6a5583b-0436-43f1-9349-9be39004964a	5	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	d2ac537e-3d10-4662-b6f5-836d8255ffab	a41d5174-76ba-48e5-b6a0-984f0cbdd33e	3	win	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	380e817d-fcde-418f-9eb1-a97bb993e03e	76926571-1261-4c24-8d6b-49de2c514bf5	3	win	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	0b349bf3-4672-4285-9a9a-8330f11f8c22	0569c874-b687-41b3-a9a9-90c7a8f33f57	3	win	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	86f55afb-4e15-4949-a2bc-ff38a995263f	1885521d-818e-4db5-aa93-7d6d6c1ae88c	-3	loss	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	ebba52ce-db32-4ea8-909d-eaf8c90105be	cfd8371d-76b4-4f3f-8786-e500a201edf7	3	win	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	6a64a55f-f8da-41e8-a1ce-50a485f53127	47b0987e-a4dd-4cdb-86ea-af589fd63432	-5	loss	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	bde2234a-6b87-4b5e-85dd-37c092bc3047	d2920b6c-0177-4eb0-86b5-c8516e5cd6d4	-3	loss	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	58b00d24-143e-48a2-a202-07a1b3975fc3	055bdf8c-b9ec-4779-a04e-a947578eb938	3	win	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	c9bc16f7-9a25-429d-98f3-5c7a3ebc8414	a9fed85f-8091-4b9c-a4b5-ffc1a76fa418	3	win	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	2669b044-2985-4243-a9ab-9b725dccee62	ae1578f7-db93-4e05-a7bf-6de3aba4eb10	3	win	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	8d1ac3c2-a669-4274-9d81-20e1f51b9bae	d6decd4b-923b-4262-b818-c4c077010ed8	1	win	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	d2ac537e-3d10-4662-b6f5-836d8255ffab	a592166a-4cb3-4b64-8484-8ace3a193f9b	-5	loss	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	8d1ac3c2-a669-4274-9d81-20e1f51b9bae	96ec87c7-2add-480b-b706-421fee765db3	1	win	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	d2ac537e-3d10-4662-b6f5-836d8255ffab	387a37a8-4fe7-453b-a8b7-01c280aaafe4	1	win	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	9f96ae20-7274-4d44-8194-71356e732dca	1e84127f-416a-4557-99e4-0171a8f86cd5	1	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	9f96ae20-7274-4d44-8194-71356e732dca	ae12ac5d-8cd1-4177-b32b-8658483a3b63	-3	loss	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	9f96ae20-7274-4d44-8194-71356e732dca	b2640b2d-23c4-4ca7-8b97-82eb30ae05cc	-1	loss	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	9f96ae20-7274-4d44-8194-71356e732dca	6fb5619b-dde6-4d03-bb09-299fbfcd2b63	-5	loss	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	9f96ae20-7274-4d44-8194-71356e732dca	5865aebf-9876-4ebb-8a64-b32330f79804	3	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	b30ae39f-ba57-4fc8-a725-8923136dca9c	7776135e-cead-4947-a2e6-d1b9773e01c6	-3	loss	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	b30ae39f-ba57-4fc8-a725-8923136dca9c	7653db35-5ed0-4319-9db9-18d4347235c3	1	win	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	b30ae39f-ba57-4fc8-a725-8923136dca9c	e12453c0-d503-46db-ab0d-9d4d271985e1	1	win	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	85594600-e73f-49ee-a6bd-d52165c66b91	55f3def7-f743-4920-84ca-e74675327605	-5	loss	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	9c472cce-9d22-412c-aa47-a9a40c7bbc23	8ad0118c-9594-45de-bf0f-3c841e1b063a	3	win	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	2165e08b-e5aa-4f76-adf9-ab393a4baa89	fbd6526a-03ca-4ca1-82b6-23ac7d7c13fd	-5	loss	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	6cce17a8-edfb-4c7f-b706-3ae198691439	f201ba11-68cb-4f34-ae46-4793fe5b9dd4	3	win	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	89626ca3-e73a-4c09-b1e3-76715d62524f	6b284f51-e803-41bb-86e6-f09d66682eb0	-10	loss	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	b670f639-9ca2-4bc3-b9c5-d7f37ddc49c0	506ced46-525e-42c3-ac68-cc37f17df7dd	3	win	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	7cb87419-fddd-4928-a943-391bd5227e2e	9ff8acb4-3a4d-40a3-bf66-aa16898f7632	3	win	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	1c857c6e-f8b9-433f-949d-1d26a99838c9	d23abcfb-9863-4bfe-a4a0-ada187834521	-3	loss	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	6e5d4e91-b8ad-41df-9950-6d5fe79173b6	1ba1da55-e748-446c-b9d2-d1aaac6a3e8e	-3	loss	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	e5b67945-f649-42a4-a3e8-2b8f21b8a88f	6bdb62e6-3873-444f-ad2d-739f938a1a7f	3	win	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	4c912b18-1027-4560-9cb6-3b20c73ac4d1	aa49ca75-6908-48ac-8ba7-57c995f37522	-5	loss	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	cab2be71-af69-4508-ac1d-06399b390190	4e072639-f65d-4b91-8ddb-9c2f45fec122	-3	loss	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	06cc8eea-773e-43ae-b42f-4b8d732163f2	69f1874d-4675-40b9-9367-cf3424c17173	-3	loss	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	9c472cce-9d22-412c-aa47-a9a40c7bbc23	66cf6e8a-ed75-477b-a459-0acbdb14d578	-1	loss	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	85594600-e73f-49ee-a6bd-d52165c66b91	ee72ba4d-0c77-4090-8193-51af9faa107a	-3	loss	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	b670f639-9ca2-4bc3-b9c5-d7f37ddc49c0	80c56310-5b98-406a-8faf-046dc1a9e7af	-5	loss	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	89626ca3-e73a-4c09-b1e3-76715d62524f	d62283d1-a35d-4e59-ae96-5bd7651060d5	5	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	2165e08b-e5aa-4f76-adf9-ab393a4baa89	5e2aed32-7145-4b6d-99c9-dcd3529ff1c8	-5	loss	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	7cb87419-fddd-4928-a943-391bd5227e2e	534f267c-99c7-4ddd-9390-b18c300c7e5c	-1	loss	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	1c857c6e-f8b9-433f-949d-1d26a99838c9	4d9bfd8f-82aa-4e91-9cc8-8061e35c301c	-1	loss	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	e5b67945-f649-42a4-a3e8-2b8f21b8a88f	4434e48e-90d1-4aa6-a3ea-35fe9f793e99	-3	loss	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	6e5d4e91-b8ad-41df-9950-6d5fe79173b6	6e58ccd0-704b-4358-bd22-2c4c5b1185bd	3	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	cab2be71-af69-4508-ac1d-06399b390190	3dd5ccfb-09b3-4fe8-98a3-5ca44ac7c36d	-1	loss	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	b30ae39f-ba57-4fc8-a725-8923136dca9c	dad032f8-9428-46b6-8bc4-84e71d6e8c24	5	win	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	9c472cce-9d22-412c-aa47-a9a40c7bbc23	8ad83cd0-5b03-4788-9737-025dee54e5d8	-5	loss	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	85594600-e73f-49ee-a6bd-d52165c66b91	ed9cee07-3872-4acc-ae52-1112429d3d07	3	win	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	b670f639-9ca2-4bc3-b9c5-d7f37ddc49c0	207da4ec-0e84-4fb1-8f3a-8f9625488243	-5	loss	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	89626ca3-e73a-4c09-b1e3-76715d62524f	f1593c78-2922-43b9-a265-0fdf9bd5bddb	-3	loss	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	2165e08b-e5aa-4f76-adf9-ab393a4baa89	51be6a7e-7de4-492e-8c4e-79f72856d5e9	-3	loss	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	7cb87419-fddd-4928-a943-391bd5227e2e	516f5e37-cbae-48ec-9c55-5e146b5c2bd5	-5	loss	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	6cce17a8-edfb-4c7f-b706-3ae198691439	029668b7-bf1e-4a5a-b18e-083aa17baece	3	win	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	1c857c6e-f8b9-433f-949d-1d26a99838c9	8ae8d556-131b-46c5-9db6-8f5e64d4b32b	-3	loss	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	e5b67945-f649-42a4-a3e8-2b8f21b8a88f	cf4a6987-f588-44f7-b617-9b4ae58c2b57	3	win	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	6e5d4e91-b8ad-41df-9950-6d5fe79173b6	82a1ba15-6b23-48ac-9122-d47acca74009	3	win	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	4c912b18-1027-4560-9cb6-3b20c73ac4d1	dcb6a17b-da0c-454d-80f7-49467d31576f	-5	loss	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	cab2be71-af69-4508-ac1d-06399b390190	3972612a-7c34-458e-812a-b9359650d8d6	-5	loss	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	06cc8eea-773e-43ae-b42f-4b8d732163f2	11c61489-c5a1-4678-9f4b-ffffcad2eceb	-3	loss	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	9c472cce-9d22-412c-aa47-a9a40c7bbc23	d6cd7633-dc53-45b3-90c7-30c60cb79689	-3	loss	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	85594600-e73f-49ee-a6bd-d52165c66b91	4e32135f-8aa7-4798-beb7-b2de23d78818	3	win	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	b670f639-9ca2-4bc3-b9c5-d7f37ddc49c0	d343b456-94b2-4dbd-a390-2b4e7a9c00a8	1	win	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	89626ca3-e73a-4c09-b1e3-76715d62524f	b11e0f49-dfbb-4c7a-b3c4-f842c98c0561	-1	loss	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	2165e08b-e5aa-4f76-adf9-ab393a4baa89	22c8c427-aaa5-4a1b-8205-522597594f96	-3	loss	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	6cce17a8-edfb-4c7f-b706-3ae198691439	69aae4c9-fefc-4447-8d61-dd67234579a0	1	win	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	1c857c6e-f8b9-433f-949d-1d26a99838c9	cd1d2f61-cd6a-4c84-90c6-1f383d3323b0	-1	loss	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	e5b67945-f649-42a4-a3e8-2b8f21b8a88f	4d7a5fd5-9b41-48d8-8114-41b836aa3e7b	3	win	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	6e5d4e91-b8ad-41df-9950-6d5fe79173b6	7f93acc2-661b-4d44-bcff-6e3117bd222b	3	win	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	4c912b18-1027-4560-9cb6-3b20c73ac4d1	7156e2b9-8cae-47ba-9359-d4e1cd3cd955	-5	loss	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	cab2be71-af69-4508-ac1d-06399b390190	4cbe28d7-4f56-4d7f-a6fb-49b247322f02	-3	loss	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	06cc8eea-773e-43ae-b42f-4b8d732163f2	8353a0b1-c455-4715-ad18-13cec60e516b	-3	loss	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	6cce17a8-edfb-4c7f-b706-3ae198691439	107ebfd4-dedd-45c0-a1cc-054803dafa43	-5	loss	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	7cb87419-fddd-4928-a943-391bd5227e2e	31f3478e-a2e7-4cdd-850f-d1a38427150f	3	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	9c472cce-9d22-412c-aa47-a9a40c7bbc23	c954564d-546e-49a7-b4c6-835d416f4e4d	3	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	85594600-e73f-49ee-a6bd-d52165c66b91	ed042b67-3b2b-4ac4-a66e-dba30ea6f360	3	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	b670f639-9ca2-4bc3-b9c5-d7f37ddc49c0	13c193df-efe9-4ceb-8b01-fed758f0d0f5	-3	loss	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	89626ca3-e73a-4c09-b1e3-76715d62524f	5df7becc-59cf-4cda-9e7f-d87e1d8141bd	5	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	2165e08b-e5aa-4f76-adf9-ab393a4baa89	e2f4bfc7-c488-4a8b-8f86-4cc761521ec2	5	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	7cb87419-fddd-4928-a943-391bd5227e2e	2749647c-ed6d-49db-a63e-2f14230db363	3	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	6cce17a8-edfb-4c7f-b706-3ae198691439	6886c135-cae1-4d19-9877-6e74c26508e2	3	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	1c857c6e-f8b9-433f-949d-1d26a99838c9	19925d82-3954-4588-8f5d-31d8acdee2cb	-3	loss	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	e5b67945-f649-42a4-a3e8-2b8f21b8a88f	ad108ecf-bc35-4c2e-8244-b3995df67392	3	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	6e5d4e91-b8ad-41df-9950-6d5fe79173b6	14df8a83-ccbf-4059-8727-7df742ed3695	1	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	4c912b18-1027-4560-9cb6-3b20c73ac4d1	9e111c48-4eb4-409f-a144-6d8593fb0e6d	-10	loss	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	cab2be71-af69-4508-ac1d-06399b390190	319b7a0f-bc67-499b-8a65-32f8f960e517	-1	loss	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	06cc8eea-773e-43ae-b42f-4b8d732163f2	d1a51a4b-ac59-4ee7-9b22-117838d0aff8	-5	loss	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	9c472cce-9d22-412c-aa47-a9a40c7bbc23	48ebe02d-a6f1-4590-93c1-42df9b6ae311	1	win	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	85594600-e73f-49ee-a6bd-d52165c66b91	60cb9352-6e15-41d1-a829-40977134e616	3	win	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	b670f639-9ca2-4bc3-b9c5-d7f37ddc49c0	e34cef0b-56ab-4f96-9091-b23bd94be502	-1	loss	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	89626ca3-e73a-4c09-b1e3-76715d62524f	6ca151d1-0feb-4c6e-ae80-8c2292e57d66	1	win	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	2165e08b-e5aa-4f76-adf9-ab393a4baa89	b790d365-7ed4-49ca-aaaa-f37fb9b8cdcf	1	win	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	7cb87419-fddd-4928-a943-391bd5227e2e	61817bef-640a-4a02-aa5e-ed8a9cd9d8b7	-1	loss	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	6cce17a8-edfb-4c7f-b706-3ae198691439	e411917a-dc91-46db-8ce2-c450034a3a37	-1	loss	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	1c857c6e-f8b9-433f-949d-1d26a99838c9	173e53e3-c663-4b99-ad6c-93eae4e04c7e	1	win	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	e5b67945-f649-42a4-a3e8-2b8f21b8a88f	d4ec81ac-c8c7-43f4-9adb-d366293c7d38	1	win	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	6e5d4e91-b8ad-41df-9950-6d5fe79173b6	d805a4e7-c0b1-4e51-9bea-0062fb911642	-1	loss	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	4c912b18-1027-4560-9cb6-3b20c73ac4d1	0a06205f-bd19-436f-92a1-d0b804387844	-3	loss	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	cab2be71-af69-4508-ac1d-06399b390190	a9d80eb1-2f44-47cb-8661-43496a8da05d	-1	loss	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	06cc8eea-773e-43ae-b42f-4b8d732163f2	c71155e1-5522-4451-b488-46b77e59d116	-1	loss	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	4c912b18-1027-4560-9cb6-3b20c73ac4d1	93f6a05d-a325-4a61-858f-441955ba065f	-5	loss	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	06cc8eea-773e-43ae-b42f-4b8d732163f2	d82ca08a-9e9a-49f3-85c0-e6da72dd4d98	-3	loss	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	b31c97c4-c4f1-4e44-8152-1e84c0d4b5d9	8614012a-5445-4f59-a1fd-031e43157aac	3	win	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	b31c97c4-c4f1-4e44-8152-1e84c0d4b5d9	b1d0a548-6b67-42d3-a308-2b77997efde1	3	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	b31c97c4-c4f1-4e44-8152-1e84c0d4b5d9	545adb13-c060-444d-9570-dcfbdf21e412	1	win	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	b31c97c4-c4f1-4e44-8152-1e84c0d4b5d9	513f0350-261e-4e64-b743-00381432f9a1	1	win	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	b31c97c4-c4f1-4e44-8152-1e84c0d4b5d9	8875b5db-ba53-4a20-aa5d-b9d8315265fe	1	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	d6041bda-3122-4abd-98cd-440d718d5848	a3fc1f28-42c2-478e-94b1-47549120e861	-3	loss	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	9ff54761-9d51-46d8-82c3-ecfde5287333	6564d5dc-56b7-4ed1-b162-72a179320a1c	1	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	ce91cd15-e3fa-4dfe-8f38-52188d702923	c3f58e77-172d-4c5b-a70e-f6e2718de818	1	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	f47d6300-b4dd-4d9a-ab0b-e9196b98207d	22d65ca4-9ee6-427b-8e3b-1ef7d44510ca	1	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	e5bd2954-cf2a-4f63-9fa2-50576c33b631	4fda0d78-8a86-4ac1-8b1e-ad0fc13c36dd	1	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	a2115ef5-9262-4cb0-872f-8d9c26fad40d	a47090cf-7713-4754-9f7d-5b9bdc36cfaa	-1	loss	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	a10d2e03-a21f-4d06-8752-a46f00fe648b	22a0c914-8a7c-45eb-b0ba-abeaa0da4426	3	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	d021ef41-a018-46b2-a041-0e0ce8d684b8	6ad24730-654c-4ca9-9bce-388de9e7d15e	5	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	be4e70f7-a563-4858-971f-7007001a227c	199fd4b6-d118-4c27-ae5c-7f6df7c28571	1	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	5f1076db-c38a-4250-8f63-b901fcd83cce	6085ad29-bc61-464a-90a1-a281d08c6daa	-3	loss	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	a10d2e03-a21f-4d06-8752-a46f00fe648b	9102045e-9851-4172-b0c5-8fdb4ca5c6e6	1	win	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	d6041bda-3122-4abd-98cd-440d718d5848	b771d85a-0b95-4942-8a0f-f61cc679ba19	-1	loss	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	b779443d-d9af-49d2-8259-6d8ed08ca2cb	0c0f3ac0-ff06-4953-90cd-0373bfacd5ca	-1	loss	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	d021ef41-a018-46b2-a041-0e0ce8d684b8	951c502f-e4c5-4005-b562-e903ffe60645	-1	loss	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	9ff54761-9d51-46d8-82c3-ecfde5287333	7fc3ef14-b7a2-4b07-8436-1a147157b5e9	-1	loss	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	ce91cd15-e3fa-4dfe-8f38-52188d702923	f2ce672f-9d9e-4f0c-9d95-f155809acc26	1	win	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	a3b2b894-f152-49e4-9a39-2accf094cd2c	0b0297a4-3bb8-4ae6-8d26-57a9a0bc9c34	1	win	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	5f1076db-c38a-4250-8f63-b901fcd83cce	86ef18be-bd26-43c2-9e9d-cd83d54853a6	1	win	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	b5de4725-8056-4e20-8a2e-712260bf3e53	7f3944e3-9bb6-45b3-b264-5d0075c206c6	1	win	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	8a1a95b1-e629-4e81-bbce-bcdea7b945bb	bdbb5673-ba6a-4dc4-980a-82caf87f3968	1	win	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	f47d6300-b4dd-4d9a-ab0b-e9196b98207d	3e7a1d09-1b09-423b-9dd8-7f3ce39e99b6	1	win	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	e5bd2954-cf2a-4f63-9fa2-50576c33b631	9db13192-b4e9-4d75-957b-f9d10035a698	1	win	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	a2115ef5-9262-4cb0-872f-8d9c26fad40d	e583cc9c-ea7c-479e-a2d2-c36e1a94721d	1	win	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	be4e70f7-a563-4858-971f-7007001a227c	075dcfe1-02e8-4f70-8e5e-062b42a3bbc9	-1	loss	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	a10d2e03-a21f-4d06-8752-a46f00fe648b	1776f335-f681-482a-ba1f-e1f390594883	-3	loss	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	d6041bda-3122-4abd-98cd-440d718d5848	785d7382-a766-4de5-af1c-63a8c703dfe3	-3	loss	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	b779443d-d9af-49d2-8259-6d8ed08ca2cb	2dbe9df1-ff70-4740-8985-3e2b15de6757	3	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	d021ef41-a018-46b2-a041-0e0ce8d684b8	b5ba72e5-d45a-454a-93cb-28677321fa59	3	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	9ff54761-9d51-46d8-82c3-ecfde5287333	b0716bd1-6e29-409c-b5cd-47649ab4e89f	3	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	ce91cd15-e3fa-4dfe-8f38-52188d702923	e38141a6-c95f-436a-8568-b3aa645e074b	3	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	a3b2b894-f152-49e4-9a39-2accf094cd2c	787b5f5b-9ebe-4166-9fa7-20e8125a3635	3	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	5f1076db-c38a-4250-8f63-b901fcd83cce	7b1b725b-98d3-476f-af36-23e46bc4458b	3	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	b5de4725-8056-4e20-8a2e-712260bf3e53	8ca5c774-11ad-4dfc-8d31-8d1738132bd9	3	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	8a1a95b1-e629-4e81-bbce-bcdea7b945bb	49f114bc-ae72-4282-9c57-e951f4e7a4b4	-5	loss	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	f47d6300-b4dd-4d9a-ab0b-e9196b98207d	f25a76dd-2e64-47e5-ab97-22ea337cc2eb	-3	loss	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	e5bd2954-cf2a-4f63-9fa2-50576c33b631	53dd9d4d-6fd9-41fc-bec0-abfa9d86aa98	3	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	a2115ef5-9262-4cb0-872f-8d9c26fad40d	4d65a33a-bfd4-40a2-b16c-95bd4cf8a48f	3	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	be4e70f7-a563-4858-971f-7007001a227c	330c54fb-2e1f-4651-88f6-5dbe3a543032	3	win	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	d6041bda-3122-4abd-98cd-440d718d5848	de591b00-c74d-4d59-92f9-6c4b47a619f9	-5	loss	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	b779443d-d9af-49d2-8259-6d8ed08ca2cb	73a900ed-a3fe-47f2-b2a7-6ddaa2ededcc	-5	loss	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	d021ef41-a018-46b2-a041-0e0ce8d684b8	3200b226-fc54-4af0-a103-266cb8d2cc10	3	win	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	ce91cd15-e3fa-4dfe-8f38-52188d702923	dde4f1a8-a193-43a3-98f0-b15635c2f458	-10	loss	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	9ff54761-9d51-46d8-82c3-ecfde5287333	37e4bcea-41ea-463c-9ec2-4b7a5057b2c2	3	win	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	a3b2b894-f152-49e4-9a39-2accf094cd2c	b36c8902-446e-4d61-813d-c3d6babeae38	1	win	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	5f1076db-c38a-4250-8f63-b901fcd83cce	74f03ff7-bb5f-4e42-9f1f-2e7ef206d3c3	3	win	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	b5de4725-8056-4e20-8a2e-712260bf3e53	5eb1c972-1aec-466f-866c-b0c08d7626e7	3	win	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	8a1a95b1-e629-4e81-bbce-bcdea7b945bb	a2913305-ffb6-4a9e-81ca-1bb669cd468f	-5	loss	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	f47d6300-b4dd-4d9a-ab0b-e9196b98207d	686bde3a-51ad-4ed9-8622-44bae98b230a	-3	loss	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	e5bd2954-cf2a-4f63-9fa2-50576c33b631	67dbc7a3-43f9-4291-87f5-688c724b71a1	-3	loss	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	a2115ef5-9262-4cb0-872f-8d9c26fad40d	7cbf685c-2c51-430b-bd97-29a7a518a78d	-3	loss	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	be4e70f7-a563-4858-971f-7007001a227c	d4de86c9-76b0-4701-ab4e-077fa21d9e43	-5	loss	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	b779443d-d9af-49d2-8259-6d8ed08ca2cb	c29a1b58-9b7a-4b55-bd12-526c434b11bb	-1	loss	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	b779443d-d9af-49d2-8259-6d8ed08ca2cb	a4662c75-beb2-4ccc-a9ec-3dd0859f1c68	3	win	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	9ff54761-9d51-46d8-82c3-ecfde5287333	642a6fc6-de30-458d-babe-cf6902dcce76	-3	loss	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	ce91cd15-e3fa-4dfe-8f38-52188d702923	055f26cd-fa22-4641-ac06-8b7d72e69e4c	-3	loss	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	a3b2b894-f152-49e4-9a39-2accf094cd2c	65a998ae-c546-4990-82f8-143276bc672f	1	win	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	d021ef41-a018-46b2-a041-0e0ce8d684b8	8bd4d8f2-2b5a-4968-9fa7-6a3e6e2bd8c5	3	win	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	d6041bda-3122-4abd-98cd-440d718d5848	05814a6e-5e01-45ec-a30a-3329a355fcf7	5	win	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	5f1076db-c38a-4250-8f63-b901fcd83cce	4083473e-6b70-46b2-a931-f1a2d96b0340	-1	loss	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	b5de4725-8056-4e20-8a2e-712260bf3e53	c970fe2d-cbbd-44eb-abb6-18ea86623be0	1	win	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	f47d6300-b4dd-4d9a-ab0b-e9196b98207d	d9e3317f-b60b-4e9b-b149-0c2ea03f9fe1	-3	loss	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	8a1a95b1-e629-4e81-bbce-bcdea7b945bb	ab725ec8-daf4-484e-b1bc-95fd1a27a05c	3	win	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	a2115ef5-9262-4cb0-872f-8d9c26fad40d	398ad52f-9199-4cde-a90b-9e3d7993b051	3	win	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	e5bd2954-cf2a-4f63-9fa2-50576c33b631	52bcdb72-896a-4db0-8575-765c2f948dbc	3	win	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	be4e70f7-a563-4858-971f-7007001a227c	5032596e-14e3-4d85-a355-3f1f74ac6342	5	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	a3b2b894-f152-49e4-9a39-2accf094cd2c	d177e26e-d6bb-4cc9-9664-83f2919acc1e	-1	loss	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	b779443d-d9af-49d2-8259-6d8ed08ca2cb	1d5fd9dd-4c12-4fbd-8eb3-5a799ccf56c5	3	win	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	9ff54761-9d51-46d8-82c3-ecfde5287333	3f02aa04-f377-4d45-a025-c84cf094b33a	3	win	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	a3b2b894-f152-49e4-9a39-2accf094cd2c	0074d516-cf15-4775-8a20-c87c8cd6b156	5	win	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	ce91cd15-e3fa-4dfe-8f38-52188d702923	3f2b702c-5803-425b-a94a-c305bf2a7658	3	win	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	d021ef41-a018-46b2-a041-0e0ce8d684b8	27a0b9b6-1c2b-4fbb-bfe2-d26d49bd16da	-3	loss	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	d6041bda-3122-4abd-98cd-440d718d5848	56235264-6fd8-40a7-ab7f-ca8a84f9a207	1	win	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	5f1076db-c38a-4250-8f63-b901fcd83cce	dac30573-b04f-4add-ae28-dd011f80327e	3	win	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	b5de4725-8056-4e20-8a2e-712260bf3e53	49cc46c8-23f1-4a37-b840-412e7e98145e	-5	loss	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	f47d6300-b4dd-4d9a-ab0b-e9196b98207d	87e141dd-aabc-41aa-afb0-cccef244b53b	-5	loss	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	8a1a95b1-e629-4e81-bbce-bcdea7b945bb	020da9a4-0a20-4231-9def-ee213e3a5a63	-3	loss	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	e5bd2954-cf2a-4f63-9fa2-50576c33b631	bfe918f8-fac7-4514-8c76-c084990a4893	-5	loss	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	a2115ef5-9262-4cb0-872f-8d9c26fad40d	23634c58-1a5a-43ca-bec2-87c15d22e358	-3	loss	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	be4e70f7-a563-4858-971f-7007001a227c	8b4c1015-a3e8-47ed-ab28-690babd6d893	3	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	b5de4725-8056-4e20-8a2e-712260bf3e53	e45e35e7-1e21-4d3d-a4e5-f80753cb3f31	-1	loss	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	8a1a95b1-e629-4e81-bbce-bcdea7b945bb	5fb529d2-3077-4630-be49-b4a93df12f69	-1	loss	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	25dd832e-7722-464a-b421-822312d3c78f	3c4cd083-dfd8-4657-b19a-6ee4b4bd53df	1	win	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	25dd832e-7722-464a-b421-822312d3c78f	55329999-87ce-4370-9eed-24cb5e47a21c	1	win	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	4a4eae9c-49f2-499d-98d0-74ed05ec8de5	255e478a-cef2-4aa4-88d9-9e134c084982	3	win	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	76a24644-043c-480c-8da7-ca22493a0a1e	78dec6f0-5b84-47e2-9a62-76c93613879e	-3	loss	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	92b36759-ce64-498d-ba8b-a7f12943e57c	91514398-d6b5-468a-979f-a66aa11a761c	1	win	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	efaf70eb-ea6d-4e22-8266-344f60da958b	d1db23ae-a211-486b-8db2-fc9892df33bd	3	win	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	54bbb810-a9f6-429d-8566-74105f370675	68b25163-7c59-4200-9259-c60576b99277	-3	loss	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	d40a4cd2-199d-4eb4-8f53-56280a7c2cea	f6944559-f19a-43bc-bc9a-df1ec47907e0	10	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	a0bc9b29-3caf-4f8c-b95e-0bfea2440159	a065bc32-5efe-4715-a5af-cf88b9fa77c3	1	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	c4d0ce83-8c64-4335-a1c6-dbaef3dc437d	752c1162-f6b1-41be-a6ee-b30539ab6baa	1	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	03dd600b-e67e-4366-aa83-4f8064d5e637	f80a8c71-2988-43f7-a45b-62951054fc02	1	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	046f08a3-ef04-4ded-8b18-b2515807cab2	20c48664-f609-4d28-bf68-ae2fa696e65b	-1	loss	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	5671a21f-0b89-492d-853d-59ae0cb71a52	b334e0e6-5a6c-4dc7-85ba-a5a6e10cafad	1	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	acd96b50-45a0-4a07-a642-9b81bfc8d0c1	effb4eef-4c29-4f0b-b9b4-fa7e51c4c29c	1	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	54bbb810-a9f6-429d-8566-74105f370675	fa54fcf5-c1ae-4b4a-83f8-45953bb43562	-1	loss	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	d40a4cd2-199d-4eb4-8f53-56280a7c2cea	b1c17b1d-a713-44e4-87fb-85f93e34ffba	1	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	4a4eae9c-49f2-499d-98d0-74ed05ec8de5	8c1c97d5-9d65-4480-9c15-5ec9d8345538	3	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	76a24644-043c-480c-8da7-ca22493a0a1e	09c6a46e-b9b3-42cd-88a3-c08a6b567827	-1	loss	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	efaf70eb-ea6d-4e22-8266-344f60da958b	94cc3278-e6a7-40a4-9bc3-77509dc8bf45	-1	loss	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	c4d0ce83-8c64-4335-a1c6-dbaef3dc437d	74fb72ce-03ed-49cd-9e25-a21d3ff236cf	1	win	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	03dd600b-e67e-4366-aa83-4f8064d5e637	abfeb2b9-084b-4a0e-ad4d-b4d02dbefc68	1	win	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	046f08a3-ef04-4ded-8b18-b2515807cab2	8b26cbca-70c3-4222-a126-f4d535879ac5	-3	loss	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	5671a21f-0b89-492d-853d-59ae0cb71a52	8b55f2e2-bdb4-48b1-81a3-2989ffdf0906	-3	loss	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	acd96b50-45a0-4a07-a642-9b81bfc8d0c1	58100891-3f2e-4aff-8361-6f75001553a5	-3	loss	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	d40a4cd2-199d-4eb4-8f53-56280a7c2cea	56466eb3-825d-43e1-a35f-85e44311aefe	3	win	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	54bbb810-a9f6-429d-8566-74105f370675	75bdea1b-45d3-45e4-8a9e-ffaee6c03d8c	-3	loss	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	4a4eae9c-49f2-499d-98d0-74ed05ec8de5	e599c093-af49-44cc-aadb-a84bf9a61c33	-1	loss	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	76a24644-043c-480c-8da7-ca22493a0a1e	f7e8752a-0c8a-403e-856b-9d12705468c6	5	win	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	92b36759-ce64-498d-ba8b-a7f12943e57c	561134cf-a140-4c6c-a646-50a40643c897	-3	loss	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	efaf70eb-ea6d-4e22-8266-344f60da958b	59f6fc68-cc5b-4d4a-b973-cde6a063903e	3	win	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	a0bc9b29-3caf-4f8c-b95e-0bfea2440159	4e08a25f-1236-4ca0-96a7-d1ac2f36519b	3	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	a0bc9b29-3caf-4f8c-b95e-0bfea2440159	51f4aa3c-d7b4-466f-9171-91c857718579	-3	loss	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	c4d0ce83-8c64-4335-a1c6-dbaef3dc437d	ae5c2526-6669-4250-844c-c9f4b05dae37	-3	loss	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	03dd600b-e67e-4366-aa83-4f8064d5e637	41571e1d-ca22-488b-ba6b-324a56cef646	-1	loss	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	046f08a3-ef04-4ded-8b18-b2515807cab2	c747d592-ad8b-48f7-9062-d8182b0d2589	-3	loss	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	5671a21f-0b89-492d-853d-59ae0cb71a52	44d54cd6-819e-4fc6-9c84-b65b0674efde	-1	loss	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	acd96b50-45a0-4a07-a642-9b81bfc8d0c1	2f088996-e57d-48a9-a581-6b37486d1b4f	-3	loss	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	d40a4cd2-199d-4eb4-8f53-56280a7c2cea	4a869257-ed4f-4bc2-aeb4-753ae547d509	3	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	4a4eae9c-49f2-499d-98d0-74ed05ec8de5	89599703-e851-42f9-9589-aa631a656918	3	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	76a24644-043c-480c-8da7-ca22493a0a1e	5cfa7088-984e-488a-8174-1fc79dedbf57	3	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	92b36759-ce64-498d-ba8b-a7f12943e57c	4d382b15-6c32-4200-811b-829ee4f44dbb	-3	loss	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	efaf70eb-ea6d-4e22-8266-344f60da958b	39d09081-8881-4365-8d57-b9b3e6eb6d7b	-3	loss	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	a0bc9b29-3caf-4f8c-b95e-0bfea2440159	6342475d-da6c-4bc9-b9bc-5becef771866	-1	loss	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	c4d0ce83-8c64-4335-a1c6-dbaef3dc437d	cbe89db9-6964-4912-892b-f258488311d6	-1	loss	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	03dd600b-e67e-4366-aa83-4f8064d5e637	68d5c451-08cb-4240-9718-bc6d6876dba5	-1	loss	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	046f08a3-ef04-4ded-8b18-b2515807cab2	871fa24d-428b-4f58-bd31-62f04bbb6dbd	-1	loss	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	5671a21f-0b89-492d-853d-59ae0cb71a52	1e02710b-d3f0-410e-af7f-c9e735e4c3f0	-1	loss	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	acd96b50-45a0-4a07-a642-9b81bfc8d0c1	4bc3b3fa-1b4f-4141-878f-c66c256043f3	-1	loss	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	54bbb810-a9f6-429d-8566-74105f370675	b2be3bec-c464-4a02-9bb2-9cbeaffb3524	-1	loss	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	d40a4cd2-199d-4eb4-8f53-56280a7c2cea	01306f1c-f243-4b7b-b338-9678432df08e	1	win	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	4a4eae9c-49f2-499d-98d0-74ed05ec8de5	c6b4b373-e443-4e16-8cd7-6a72d806339e	1	win	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	76a24644-043c-480c-8da7-ca22493a0a1e	26e25658-2859-4331-bd30-cb9511317fdc	-1	loss	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	92b36759-ce64-498d-ba8b-a7f12943e57c	25109c8e-7811-4dc1-a253-ce2de9825b03	-1	loss	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	efaf70eb-ea6d-4e22-8266-344f60da958b	7fd609c9-f056-4b1f-8618-11323f289158	-1	loss	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	a0bc9b29-3caf-4f8c-b95e-0bfea2440159	cedbd18b-0b16-439e-8755-f016a6ba3c80	3	win	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	c4d0ce83-8c64-4335-a1c6-dbaef3dc437d	32debbb1-2eb8-42e5-9a13-4cfe3c771148	-5	loss	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	03dd600b-e67e-4366-aa83-4f8064d5e637	26da3183-75e7-4875-800f-869657784c6b	-3	loss	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	046f08a3-ef04-4ded-8b18-b2515807cab2	43e50017-2334-4fd3-918d-b85f2b1ac98b	-5	loss	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	5671a21f-0b89-492d-853d-59ae0cb71a52	c42099a2-c47e-448e-a20e-399ed30e3a0a	-3	loss	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	acd96b50-45a0-4a07-a642-9b81bfc8d0c1	060c6b65-75af-4746-aa08-308d4df285d5	-5	loss	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	54bbb810-a9f6-429d-8566-74105f370675	0ed1e97c-e01a-48db-b103-2f9837fa5848	-5	loss	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	d40a4cd2-199d-4eb4-8f53-56280a7c2cea	964454ca-5781-449f-9263-f4cffa30b480	3	win	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	4a4eae9c-49f2-499d-98d0-74ed05ec8de5	0be30f53-ce99-4023-a316-29c20c045b3e	-3	loss	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	76a24644-043c-480c-8da7-ca22493a0a1e	1aa74417-5023-43ca-a6f8-834dbefeb2bd	-5	loss	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	92b36759-ce64-498d-ba8b-a7f12943e57c	ae9b8a8a-a084-4a6e-b4f2-2fb39a986bc3	3	win	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	efaf70eb-ea6d-4e22-8266-344f60da958b	570542e5-5c4c-4c76-b325-517bec51dc46	-3	loss	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	92b36759-ce64-498d-ba8b-a7f12943e57c	0e2e0839-dfd2-4a84-921f-292064efed9c	-1	loss	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	f17681b2-38c7-4e9c-828b-72a18f4d0197	7f9ba32f-a839-4e43-bf4f-c7103e491b6e	-1	loss	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	f17681b2-38c7-4e9c-828b-72a18f4d0197	8420923a-733e-4d1c-a5d9-7035f6b44063	10	win	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	ec97ca0a-b28f-47fc-ad2e-3ce8360cc08e	da73ea82-04e2-4f2a-a512-445b6b979edd	-3	loss	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	7892dd22-384d-420b-8ac9-b38f80357891	f42243bc-2c6f-4838-903f-7518ada781fe	1	win	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	aec4a3ad-d44d-41e6-9406-ed365058f749	9a861672-0232-445e-9f80-db2846e4c195	-3	loss	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	85783c17-265e-45dc-8071-cefa65a6a341	8607dbcb-f0a1-42f0-9f7c-826e83848051	1	win	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	95b479b5-7350-46eb-8d94-6b207de641c3	f4fd363b-0e81-4910-ae0e-b5717e398ae7	-3	loss	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	1a3df7be-f3f0-47b3-a753-354988a838ed	ce4f2b00-d3cb-4c87-bd0f-2335c2456f23	3	win	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	112270ae-a6ed-426b-adac-56a0afff3476	79024a83-d955-4cf0-834f-61fcbe766d99	-3	loss	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	f3676ad2-38c0-4af9-b8ae-f57be8657020	157685b9-2e81-4192-b298-bc2a5bdd3799	-3	loss	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	7892dd22-384d-420b-8ac9-b38f80357891	0b510aeb-e7bc-40f9-97e2-8e949d9c83dc	5	win	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	aec4a3ad-d44d-41e6-9406-ed365058f749	a1c470a4-7437-4971-911f-9fcbb41e7278	3	win	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	e2a776f8-11a6-4a08-9c21-ee1a62e72176	059101d5-38ea-444d-9d42-ab9a913c95af	-1	loss	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	85783c17-265e-45dc-8071-cefa65a6a341	b33e2dd1-78f6-4c10-8245-b8050eb33c47	-5	loss	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	95b479b5-7350-46eb-8d94-6b207de641c3	b33d65e1-aa82-4a1e-b432-072692b264ca	3	win	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	1a3df7be-f3f0-47b3-a753-354988a838ed	1236eea3-68bf-437b-9a34-b23b07c2e7ec	-5	loss	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	9bd25183-b8a2-4e89-a87a-7cbe662d3f98	4c9b7c42-892d-4a5b-90e6-888ad9b3a26d	-5	loss	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	67db401c-4a5d-49ad-83b6-a80fbd9e9061	1a9d880a-03c9-403f-b4f5-6884bed3cfde	5	win	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	112270ae-a6ed-426b-adac-56a0afff3476	0db7676f-6c91-406e-b278-fccd899688f1	-5	loss	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	f3676ad2-38c0-4af9-b8ae-f57be8657020	584c45ce-901e-4426-8d86-583ff694cb2d	3	win	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	e2a776f8-11a6-4a08-9c21-ee1a62e72176	0f505675-9102-4c47-938b-f5370b936e57	-3	loss	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	d1c9abe6-1923-41d8-b06b-cae30c9bd58f	f1ab4113-2ce5-4e06-858f-b64c7922e609	-3	loss	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	9bd25183-b8a2-4e89-a87a-7cbe662d3f98	401734ec-72bd-4c75-a13c-9aa894d852ea	-3	loss	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	67db401c-4a5d-49ad-83b6-a80fbd9e9061	3c1d7018-1234-4b10-9eb8-f622f5c8cb53	3	win	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	e488eb19-d62f-430e-9d7a-4e676413412e	79a5c348-69f9-4a2d-bf26-2d75cfcd4f75	-5	loss	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	d1c9abe6-1923-41d8-b06b-cae30c9bd58f	1d77a3c3-dc81-4548-a980-00f56f7978bc	3	win	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	e488eb19-d62f-430e-9d7a-4e676413412e	c7ca0935-de99-4c66-9822-4a5960cc7877	-5	loss	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	ec97ca0a-b28f-47fc-ad2e-3ce8360cc08e	862e239b-f68f-4e4e-8556-2eddc66f359c	-5	loss	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	ec97ca0a-b28f-47fc-ad2e-3ce8360cc08e	751297cb-c0f8-4cf0-8c75-2530c8ef0b87	1	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	7892dd22-384d-420b-8ac9-b38f80357891	af86ed9f-9e0e-4c6d-a041-45f7113af0ab	-3	loss	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	aec4a3ad-d44d-41e6-9406-ed365058f749	177aef12-add7-4346-a100-2cc426d830b5	1	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	85783c17-265e-45dc-8071-cefa65a6a341	a7f805bb-1d37-43d8-89a6-5b86fe24e5e3	-5	loss	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	ec97ca0a-b28f-47fc-ad2e-3ce8360cc08e	009ba32e-4ec4-4824-a4b0-2d6b6cd4674a	-3	loss	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	7892dd22-384d-420b-8ac9-b38f80357891	d1a2748a-fdd5-488b-9009-e3689c2b6a6b	1	win	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	aec4a3ad-d44d-41e6-9406-ed365058f749	5c391fce-c53f-4dff-aa85-05081e382a99	-5	loss	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	85783c17-265e-45dc-8071-cefa65a6a341	bd2a6d63-acca-49af-91d7-3bb31bb4ff05	-1	loss	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	95b479b5-7350-46eb-8d94-6b207de641c3	952eb15d-d3ee-4a9f-9300-9688d9f65dea	1	win	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	1a3df7be-f3f0-47b3-a753-354988a838ed	cdfbb98f-f2ca-4c49-8d55-3074535fd9fe	-1	loss	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	112270ae-a6ed-426b-adac-56a0afff3476	720e33e7-69e8-4870-9889-e004a24f6300	3	win	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	f3676ad2-38c0-4af9-b8ae-f57be8657020	6099b56c-ba0d-4647-8501-cafe26c690d5	-1	loss	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	e2a776f8-11a6-4a08-9c21-ee1a62e72176	9ecd9be1-b686-4f2e-888f-269b7e5281c0	-1	loss	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	9bd25183-b8a2-4e89-a87a-7cbe662d3f98	09c81d8d-702a-46bf-be6b-3c7397d7cddc	-3	loss	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	67db401c-4a5d-49ad-83b6-a80fbd9e9061	915aedf0-4cc7-404d-8bf9-a25533f93993	3	win	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	d1c9abe6-1923-41d8-b06b-cae30c9bd58f	d309c32e-4620-490a-a619-d683f3219bea	3	win	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	e488eb19-d62f-430e-9d7a-4e676413412e	072d739c-529b-4e42-a341-5d2fcf7b4edc	-5	loss	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	ec97ca0a-b28f-47fc-ad2e-3ce8360cc08e	7cc70eeb-d819-4290-a444-0a4fc7e4cb7e	-3	loss	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	7892dd22-384d-420b-8ac9-b38f80357891	183db228-a320-4103-8b9c-7e8f59db0052	-1	loss	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	aec4a3ad-d44d-41e6-9406-ed365058f749	a57453ac-d2a4-48ac-a36e-e296f4f10c8c	-1	loss	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	85783c17-265e-45dc-8071-cefa65a6a341	c15f69dc-8fd2-4da5-99b4-2b641f979909	-3	loss	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	95b479b5-7350-46eb-8d94-6b207de641c3	30f6bcea-31ad-489d-96c8-c6234439323c	-1	loss	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	1a3df7be-f3f0-47b3-a753-354988a838ed	70adeea4-c908-4707-81e0-64b78cc3eb60	1	win	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	112270ae-a6ed-426b-adac-56a0afff3476	a50e2845-7cfe-48c8-8122-7cad7b9eeb6c	-3	loss	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	f3676ad2-38c0-4af9-b8ae-f57be8657020	bf509aa0-caac-4ee2-87c8-94b72c486529	3	win	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	e2a776f8-11a6-4a08-9c21-ee1a62e72176	04df57a1-2184-4802-827c-5e2a1b5e4ca5	1	win	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	9bd25183-b8a2-4e89-a87a-7cbe662d3f98	0c530e68-8855-46d1-8b4b-f83e1b9836b0	1	win	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	67db401c-4a5d-49ad-83b6-a80fbd9e9061	0c0f2347-4107-4f95-bcf7-a20e4839c739	3	win	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	d1c9abe6-1923-41d8-b06b-cae30c9bd58f	3e02a1ce-3e8e-4347-9aca-10af51fbcf96	-3	loss	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	e488eb19-d62f-430e-9d7a-4e676413412e	bc258491-805e-4539-9820-dc828b2ecc0d	1	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	95b479b5-7350-46eb-8d94-6b207de641c3	bffd5365-d623-4d2d-ab2a-4272df94917a	1	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	1a3df7be-f3f0-47b3-a753-354988a838ed	920564ac-532b-45f8-8916-3d1283045c20	1	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	112270ae-a6ed-426b-adac-56a0afff3476	2e8828d2-3125-431d-a214-dbaf8437bcb6	3	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	f3676ad2-38c0-4af9-b8ae-f57be8657020	628e88d6-d8d6-48c4-944e-8eced5a74eb0	1	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	e2a776f8-11a6-4a08-9c21-ee1a62e72176	8f542b9a-362b-472e-96c7-e4e5d4d7deeb	-1	loss	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	9bd25183-b8a2-4e89-a87a-7cbe662d3f98	6add0bbb-d1f5-4834-8fde-f336fdfabb36	-3	loss	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	67db401c-4a5d-49ad-83b6-a80fbd9e9061	c8ed94fd-6816-4e3d-bd52-7b8ccacfd799	-3	loss	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	d1c9abe6-1923-41d8-b06b-cae30c9bd58f	4310a49e-4efa-4e7c-a50f-308fa05fa382	1	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	e488eb19-d62f-430e-9d7a-4e676413412e	4c0cde15-2c47-483b-968f-4a17a7c50748	1	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	ec97ca0a-b28f-47fc-ad2e-3ce8360cc08e	1f895681-b928-4f4a-87e5-d1ec831f6a27	-3	loss	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	7892dd22-384d-420b-8ac9-b38f80357891	6e45cbab-8505-4b91-9faa-e90e327f2ba0	1	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	aec4a3ad-d44d-41e6-9406-ed365058f749	5eeb935c-9539-4c84-80dd-10bf1c817ea8	-1	loss	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	85783c17-265e-45dc-8071-cefa65a6a341	dea2fe64-1e45-4a7a-aa2a-35ed6c5e07b2	-3	loss	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	95b479b5-7350-46eb-8d94-6b207de641c3	880345af-02d1-4ed9-987b-4b0465bb4fb3	-1	loss	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	1a3df7be-f3f0-47b3-a753-354988a838ed	27e162cb-756f-408f-b787-fc1f2b45226c	-1	loss	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	112270ae-a6ed-426b-adac-56a0afff3476	c3179af3-a1c7-43b8-9c79-a3ae7fe64c5e	3	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	f3676ad2-38c0-4af9-b8ae-f57be8657020	613f3d67-8c36-4f63-a9ec-830524a8b32d	3	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	e2a776f8-11a6-4a08-9c21-ee1a62e72176	d7bab2f3-d034-4aae-a98d-9f87b3e9d766	1	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	9bd25183-b8a2-4e89-a87a-7cbe662d3f98	7e585aee-577a-4e40-b12c-c795161ca9f7	-5	loss	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	67db401c-4a5d-49ad-83b6-a80fbd9e9061	0bec661c-04d3-4cc3-b02a-9b58b7f92576	3	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	d1c9abe6-1923-41d8-b06b-cae30c9bd58f	c102200f-5402-4985-863d-e1f65317c749	-1	loss	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	e488eb19-d62f-430e-9d7a-4e676413412e	9c2a1c69-ded3-43b9-add4-e72a4cd08054	-3	loss	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	8697092d-e82a-45e2-b869-fd31ece83fe2	c12c8808-cb95-474c-b73b-b74e1ef13dad	1	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	d064ce63-ab19-4c93-a5ce-2edbf9fc77f7	f289bbcc-f58f-4a52-88bb-2a80567feeb5	-1	loss	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	8697092d-e82a-45e2-b869-fd31ece83fe2	38601edd-be60-4651-9774-79199cac3fd7	1	win	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	8697092d-e82a-45e2-b869-fd31ece83fe2	2f861289-2602-4383-a5f5-ab1d752c9d2d	1	win	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	d064ce63-ab19-4c93-a5ce-2edbf9fc77f7	9b100a54-3897-4e93-bf0a-247d14530678	3	win	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	d40c4e28-2593-4343-8a62-7ef114e0eecf	acd4936b-7b70-4fbc-ba43-10c0af7f3ee5	1	win	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	4ea577b3-c84b-4f40-acb5-e02431fe5b41	2c4f3b48-8c43-4676-a453-2de561e7bf4f	1	win	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	ba2b69b7-f9ba-467e-99da-26b8de97ade4	60039b47-ec79-4a00-aa52-4a412c8ac76e	-5	loss	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	73898b0c-165c-4160-8e2f-04fc60d929db	ca6cfdd5-feab-4529-97e5-f6bb0ef34baf	-3	loss	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	b134cf70-c00d-45e0-95e1-8b400db16f9d	8b7a3b94-f9c5-4282-ae9f-426413b63b5b	-3	loss	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	c326aa68-4af8-4b34-bf37-d8dbd1752bdc	d0a73a8c-98ac-46d2-a047-958ba7b35021	10	win	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	4efa1b98-b52f-4eda-a313-d3260e091fae	8fa0472c-5fc9-4c94-b982-c8b252f0e1a2	-5	loss	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	d064ce63-ab19-4c93-a5ce-2edbf9fc77f7	75868542-6a05-494e-a387-27133395f6bb	-1	loss	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	d40c4e28-2593-4343-8a62-7ef114e0eecf	b592a5e0-7bb3-49f5-80a1-b25e3191af1a	-1	loss	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	4ea577b3-c84b-4f40-acb5-e02431fe5b41	fde1721c-3c52-44b3-b7c2-f46970d34163	-1	loss	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	ba2b69b7-f9ba-467e-99da-26b8de97ade4	d92fb6f3-debc-4fc8-8586-adb77b565cda	-1	loss	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	73898b0c-165c-4160-8e2f-04fc60d929db	eb68c1f6-6143-46a0-ba4e-40711598eaef	-3	loss	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	b134cf70-c00d-45e0-95e1-8b400db16f9d	1134e595-4969-46c4-a2c8-0b58a785a469	-1	loss	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	4efa1b98-b52f-4eda-a313-d3260e091fae	b3b22450-dbcc-474b-b9b8-5100bdb664b1	1	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	c326aa68-4af8-4b34-bf37-d8dbd1752bdc	33b1531b-4b2b-475c-91e6-c4855ae956e9	1	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	50e71e9f-3dd0-40fc-91e5-9b3ba56ecee6	08ff239e-33b9-4a69-b2a5-943cca80b258	-1	loss	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	a46ddd80-9686-4da2-868e-09f4b91eb3d9	bba96147-687a-4e25-8fbc-b94897ca0205	-1	loss	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	13f2fd71-3d1c-42e5-9f5c-99bb8f212547	dcd9699d-8fdf-436f-bed4-54af148c2429	-1	loss	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	e38cc65d-0609-4b3a-a380-637396570080	d61b2f38-eba7-406c-b6a7-e9dc68f29c4a	3	win	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	d40c4e28-2593-4343-8a62-7ef114e0eecf	d7566a7d-49a9-4c43-8f2f-ff443c6edff6	3	win	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	49926afd-6329-4124-9846-7a044272ac54	f80074f2-0ea7-429e-93ab-9f8163ead795	3	win	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	01b3a495-1daf-4b24-99e2-a903e786b1be	e2be1a2c-edbd-4c74-b908-c3d35e212cbb	-3	loss	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	fdd4448f-e730-4933-89a9-f4d40456b4d7	c04a210d-913b-4e97-9c0f-387b63dee8f0	-1	loss	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	49926afd-6329-4124-9846-7a044272ac54	e97b3743-2a46-4364-b8c8-2eb28ff2f446	1	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	5334cd67-c846-4303-b979-4636a885b1b6	f39bee62-88fb-4c8a-b5e3-3064ff13c9fd	-5	loss	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	fa733f3c-4b1a-442c-a331-8d2651040165	402e9399-eacb-44df-ae70-4992c00dbc87	-3	loss	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	3c511a07-f80a-4dc2-bc49-40a3fbe5ddb3	1fadf5a4-4f5c-4f3a-ace9-1030e546a773	-3	loss	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	a9ade8e0-8fb2-4c2b-917b-7191424388e7	b78f40ae-ba83-4cbc-b555-8bc39db94e17	3	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	2c53b774-736f-410c-b671-9ec4f1493fbd	39733976-1fa4-439e-87cb-2e2b2b37c01e	-1	loss	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	01b3a495-1daf-4b24-99e2-a903e786b1be	9c72cb22-8e35-4885-bbf1-7c6b7e91f2e3	1	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	3cd1d025-e2d8-463e-80ef-6385fc746582	313f08c6-ee26-4d83-9b2e-7e2802fa004f	3	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	fdd4448f-e730-4933-89a9-f4d40456b4d7	51bd3d25-1955-44a3-9b31-d855a3ba0f5c	-1	loss	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	b42650fe-fa28-4feb-98d6-622cffa6eb2e	df9514f2-7ce9-4044-9f1b-c66446fe23c2	3	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	abd39ca3-bedd-4a14-942c-1871e3e9a85b	07f6401b-ab36-47d2-91b2-5bf04aba7cc0	1	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	b0a3899d-dd50-487c-b759-826132a5af7d	0265bbf6-b7fd-4c95-8b13-9059b2c8b8e5	5	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	105ee53e-1599-447f-8df2-04a8f0e03d2e	945bff13-b2c4-4aaa-977a-5533dba5c9eb	3	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	63be1bd1-8401-4d9c-850a-3c48a0aa2542	3ce3beb6-c7ff-4448-8d6e-fac116e83927	-5	loss	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	63be1bd1-8401-4d9c-850a-3c48a0aa2542	c9a07ba2-b588-43e3-9f9c-1498b9e8fe5e	-3	loss	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	103aa0f9-e2fb-40e9-b656-520220ddab95	2966313e-148f-4da5-9975-72fe533d3283	1	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	cddd40f9-a5e9-432d-8bfb-719361eab23b	9623aaef-82c8-46c1-a287-74108dac448c	1	win	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	cddd40f9-a5e9-432d-8bfb-719361eab23b	7d4ac4b7-d041-4571-8915-2229ec3f85e6	-3	loss	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	cddd40f9-a5e9-432d-8bfb-719361eab23b	661eb3b1-9aff-4f15-806a-0851d8e83440	-1	loss	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	b6e60bfc-587b-4409-b2e6-7dd034f8cbc1	e56d6b31-4703-413b-9d09-9e14bb62e12a	1	win	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	b6e60bfc-587b-4409-b2e6-7dd034f8cbc1	0136a31e-056b-4b0b-858d-bfb2ebfabf8a	-3	loss	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	3cd1d025-e2d8-463e-80ef-6385fc746582	71accfc5-2932-4166-b1e6-bc3be9bb6a1e	3	win	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	b42650fe-fa28-4feb-98d6-622cffa6eb2e	b81c8004-0175-4637-9c89-189eea15913b	-3	loss	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	abd39ca3-bedd-4a14-942c-1871e3e9a85b	3bc51ccb-a746-4364-97bc-cb51e0cbe300	1	win	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	b0a3899d-dd50-487c-b759-826132a5af7d	2d3850c9-bfb9-401c-8306-7911cd8d3722	-1	loss	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	105ee53e-1599-447f-8df2-04a8f0e03d2e	a9adde81-6286-4916-9ac7-72214b4fc4cd	-3	loss	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	2954f2b9-b9ae-4d88-8c86-1be1a49f6f8a	0d9acd12-b31c-4100-8c99-e0957dbae8bc	-3	loss	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	4ea577b3-c84b-4f40-acb5-e02431fe5b41	dcd2e09d-7830-4a58-93d0-ca4f356fe6e8	1	win	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	ba2b69b7-f9ba-467e-99da-26b8de97ade4	1bce7233-5df6-400f-b851-29fa8247d57c	-3	loss	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	73898b0c-165c-4160-8e2f-04fc60d929db	e5895534-6ea8-4ccc-b8a5-eed05cab6a04	-3	loss	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	4efa1b98-b52f-4eda-a313-d3260e091fae	5ef53423-6fb7-46b1-a6f3-285a00e9e4a6	-1	loss	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	c326aa68-4af8-4b34-bf37-d8dbd1752bdc	360bb1e0-95e0-4155-a512-3822de3ca84e	-3	loss	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	50e71e9f-3dd0-40fc-91e5-9b3ba56ecee6	fa3a6aca-93a8-456a-a659-7ac95b0152dd	3	win	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	a46ddd80-9686-4da2-868e-09f4b91eb3d9	e2bbd3d0-34bd-46fa-9bd0-0cdb72f48f0a	-1	loss	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	cbc66c57-d654-486c-ae72-4ef57f0a3fe7	bb26008e-d04a-4b0a-86b5-0bbcab9f6146	3	win	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	13f2fd71-3d1c-42e5-9f5c-99bb8f212547	f060637b-cfc7-4c13-a256-58e2f2f00f4a	5	win	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	e38cc65d-0609-4b3a-a380-637396570080	5c0a2728-847a-4cd3-8672-ef3da48944f7	1	win	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	d40c4e28-2593-4343-8a62-7ef114e0eecf	50dc2877-a82e-4560-90d1-7773f3564e91	5	win	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	4ea577b3-c84b-4f40-acb5-e02431fe5b41	22850b00-ea83-4eac-9d67-c896220b14f2	-3	loss	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	ba2b69b7-f9ba-467e-99da-26b8de97ade4	5e83b3d6-abd3-4f27-b4c1-d2aab272d6d0	-5	loss	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	73898b0c-165c-4160-8e2f-04fc60d929db	a3740ee4-7444-46cc-9abe-6867de76f72b	-10	loss	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	b134cf70-c00d-45e0-95e1-8b400db16f9d	6be30d08-9b15-4d92-a6ef-4377a82b24c3	-3	loss	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	4efa1b98-b52f-4eda-a313-d3260e091fae	df00becc-5ecd-4fcd-b892-77143efff36b	-5	loss	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	c326aa68-4af8-4b34-bf37-d8dbd1752bdc	1161ba43-1c2b-47d5-b184-a4eea6c04414	-3	loss	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	50e71e9f-3dd0-40fc-91e5-9b3ba56ecee6	c70b40c9-20b1-4930-86e3-6b6d08b266e3	5	win	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	a46ddd80-9686-4da2-868e-09f4b91eb3d9	6a291e80-767b-4929-9288-52f5390bf702	-5	loss	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	cbc66c57-d654-486c-ae72-4ef57f0a3fe7	81cb19c8-fa6b-4ab1-9224-5d37dc7495d0	3	win	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	13f2fd71-3d1c-42e5-9f5c-99bb8f212547	3503ab60-f1a6-4e4f-913e-f66b648468d6	3	win	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	e38cc65d-0609-4b3a-a380-637396570080	2f4d0513-b253-4a01-a809-8bf44086e231	5	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	d40c4e28-2593-4343-8a62-7ef114e0eecf	b6d53cfe-883e-4307-995b-6fd6de5b52c8	-3	loss	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	4ea577b3-c84b-4f40-acb5-e02431fe5b41	4d6c21c7-db5a-4e1b-b80b-b2d2030d23af	3	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	ba2b69b7-f9ba-467e-99da-26b8de97ade4	909b9e7f-f9a7-410f-9fa9-49da9a3dd939	-3	loss	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	73898b0c-165c-4160-8e2f-04fc60d929db	a06c63c1-ab5c-4bd7-af39-2b11c42c2d05	-1	loss	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	b134cf70-c00d-45e0-95e1-8b400db16f9d	e9f25077-29ce-44a4-af61-5e018cf43ec8	3	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	4efa1b98-b52f-4eda-a313-d3260e091fae	c5c3a53c-77d5-446b-85be-8d233e2e8411	-5	loss	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	c326aa68-4af8-4b34-bf37-d8dbd1752bdc	5e5d99b0-c30a-4bea-8942-af714e844877	-3	loss	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	50e71e9f-3dd0-40fc-91e5-9b3ba56ecee6	c65de972-4ae0-47ee-9789-9a44c8873e84	3	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	a46ddd80-9686-4da2-868e-09f4b91eb3d9	26367792-505a-4f95-9898-3f4e0167d219	3	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	cbc66c57-d654-486c-ae72-4ef57f0a3fe7	aacc1f97-2bb0-4563-8650-f2dcb7b6a49c	5	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	13f2fd71-3d1c-42e5-9f5c-99bb8f212547	9bdc113b-3d0c-4220-8e49-17daff3198d9	3	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	e38cc65d-0609-4b3a-a380-637396570080	4656e80c-e196-40b7-afe3-969d50d9246a	5	win	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	d40c4e28-2593-4343-8a62-7ef114e0eecf	29afe631-8e75-4a5f-8338-134a3b37d2eb	-1	loss	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	4ea577b3-c84b-4f40-acb5-e02431fe5b41	912d295a-f7bb-4f5c-857f-1faed6a2341e	-1	loss	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	ba2b69b7-f9ba-467e-99da-26b8de97ade4	04742026-581d-4f11-849d-9b49390b3379	-1	loss	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	73898b0c-165c-4160-8e2f-04fc60d929db	03e648d0-fb52-4702-a48b-fbcbea53c0b0	1	win	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	b134cf70-c00d-45e0-95e1-8b400db16f9d	4e316698-9091-4e63-926c-43b28a3a618e	-1	loss	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	4efa1b98-b52f-4eda-a313-d3260e091fae	3d84058b-394c-4f5c-9e5c-5d2f0d33dd32	-1	loss	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	c326aa68-4af8-4b34-bf37-d8dbd1752bdc	e34484a2-f512-471c-936e-44b00a347c82	1	win	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	50e71e9f-3dd0-40fc-91e5-9b3ba56ecee6	8ea54e6b-c0d5-48fb-a489-e7391e76a716	-1	loss	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	a46ddd80-9686-4da2-868e-09f4b91eb3d9	d67ec608-0709-431d-9414-94a9c8bf1d01	1	win	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	cbc66c57-d654-486c-ae72-4ef57f0a3fe7	5cdd9df2-a19c-4e5b-81d1-f4214baed98f	1	win	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	95407649-75c0-440d-8115-1a5442582203	11e941b3-59f9-481d-a922-ca00d8a0c40f	-1	loss	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	2ce2ef92-1078-461b-abda-6d1911a0a056	4bcd0389-105a-461a-a430-5d7076b07687	3	win	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	acabce6e-fe7c-425b-9253-b814cd6566b4	ab9bb983-4037-46fa-be0f-476e6d164c6b	-3	loss	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	4a71fd05-215f-4ff9-a9a5-3ca7f0bb5938	2cde8e77-69e0-4602-93b3-ed8e02b54ecf	-3	loss	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	3cc444f7-1d14-4ca8-8871-dbfb2b3607b0	4e600a71-a5ec-4bfc-aca5-73d6d8346aa9	0	push	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	3c5359bd-125e-4aec-ad9d-a5c4b0d3e30c	20cf21a1-6fae-4fb7-8af4-1428256610c1	-3	loss	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	01ced56f-5413-4445-b791-af1bc821d0cc	90bed927-05ea-488e-b731-58b140f51b01	1	win	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	358d48e8-bed8-4dc9-a3a2-a45116df0833	f2d35db0-3d12-4ca9-b092-017298727b3a	-3	loss	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	f58f0065-696f-4d1a-9e79-ee46d002c79a	d765ca73-4369-4010-b668-0b85eeadd30e	-3	loss	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	c95835d4-c6eb-495c-9a7b-8549c0bb86e4	c97d726f-45ad-4de8-bd72-6149852652af	1	win	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	af39c4f7-7bbc-445f-9596-0ee71f84d732	0e3df0f2-efdd-4290-aacd-1222714eb36d	-3	loss	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	7c66af18-7fe5-403b-8a74-fc66d3e13e5f	77b3ae68-6409-46fc-9438-d277c4addfcb	1	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	f49a3914-1a2b-4bbd-bd90-58f3d43f2ca1	8e80ca19-e102-4b9e-8898-57ef777d8b9d	-1	loss	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	95407649-75c0-440d-8115-1a5442582203	73255d16-f26b-4103-af79-bafadc120de7	-1	loss	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	7bdfc892-5cad-43d2-b235-02afede1ecbd	8d9cf54f-ce35-4175-8c8b-6812b7295543	-5	loss	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	d2bdacae-dd5f-4dd4-8535-a65ff9e42774	31f19545-3676-4d1a-8882-7812a9dccd65	-3	loss	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	79b2ed90-8c59-4bc9-92f0-2489d70c2da7	050e63ce-1649-4016-a642-aa747dafa861	1	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	e266dc82-da06-45ad-b515-1658832012d5	268fa995-90f9-4bfc-bafc-4cd6e39aca51	-1	loss	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	45cc932e-b1d3-4204-aa65-372f0e48111a	0383a38a-7a24-4e05-a054-eccb725fd66d	1	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	1a9a4ec2-e36e-445c-a230-904155133ad1	50f95bf4-8a5d-4850-a039-bf32903d39e5	1	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	6d12b6ae-fe56-49e5-80d2-4b51d40770ae	c44e1894-d8de-4334-90ea-74a0e70557e2	-3	loss	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	431b3ac4-42da-42a1-9a49-3b791f370ab2	3638eace-b266-4179-9659-d55d22106576	1	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	bc2dbf36-4786-48e6-9721-e16c5c2eb3e2	9586fd2c-d73c-4f36-b6c9-3059f21bcb06	1	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	31e33109-b008-489b-a37a-e13202ed0927	594dedb9-617e-40c9-8375-e4ec632f87a2	10	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	834c89e5-0e51-4aca-9d66-d414bafa77e1	35a21135-69e5-4940-9112-e68dbf0bd9d6	1	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	ecacbc7b-cc64-4ed6-8ab6-10c433fb3ce9	993d3319-2808-4f15-af93-a4f4b8d24e79	1	win	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	d2bdacae-dd5f-4dd4-8535-a65ff9e42774	4b3ef7dc-5dbb-45d5-9c0c-687c4ad4a99f	1	win	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	45cc932e-b1d3-4204-aa65-372f0e48111a	cf1848e0-9f4c-4120-a81a-037c587a6636	-1	loss	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	79b2ed90-8c59-4bc9-92f0-2489d70c2da7	27d88ddf-52d6-4d52-bb54-fbcdf23bc952	3	win	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	e266dc82-da06-45ad-b515-1658832012d5	2ca89f81-aca0-44b8-8395-75e0d7ba89f5	-1	loss	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	e4f9bc56-5420-4c15-8992-4feb8126e69a	58fff39c-bcfa-4af8-9c81-6eb9c9423dc0	-3	loss	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	1a9a4ec2-e36e-445c-a230-904155133ad1	640a6a15-a713-4b99-aa37-881fa2ed3546	-3	loss	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	6d12b6ae-fe56-49e5-80d2-4b51d40770ae	c4c98870-58db-4e4a-b57a-225cf9ce2476	3	win	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	431b3ac4-42da-42a1-9a49-3b791f370ab2	8aeeeaed-799b-42c8-8a46-a3110dce13db	3	win	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	bc2dbf36-4786-48e6-9721-e16c5c2eb3e2	27a351f4-d20a-4437-9711-d054a7787ca6	3	win	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	31e33109-b008-489b-a37a-e13202ed0927	ea97f128-36c7-42a8-aadc-b52495aa2557	-5	loss	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	834c89e5-0e51-4aca-9d66-d414bafa77e1	2bf0e474-03f1-4358-9caf-50f51a07d26f	5	win	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	ecacbc7b-cc64-4ed6-8ab6-10c433fb3ce9	c5c2ac6b-58de-45fa-b0c3-49739fd28a5c	-3	loss	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	7bdfc892-5cad-43d2-b235-02afede1ecbd	18c7b574-e1f3-4dea-b3ef-1d510c01f55d	3	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	45cc932e-b1d3-4204-aa65-372f0e48111a	266a4d1c-c621-4f18-ae04-bd3e033a0bc5	-3	loss	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	d2bdacae-dd5f-4dd4-8535-a65ff9e42774	00f5d533-3071-48ce-ab96-fc300dcd6f73	1	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	79b2ed90-8c59-4bc9-92f0-2489d70c2da7	21ae284d-7d15-469e-ac30-0af0ce937889	-3	loss	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	e266dc82-da06-45ad-b515-1658832012d5	74101b86-d8ca-47d6-99e3-e894d5b734e5	-1	loss	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	e4f9bc56-5420-4c15-8992-4feb8126e69a	59a8716d-55e9-46f4-ae2e-089f43da8939	-3	loss	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	1a9a4ec2-e36e-445c-a230-904155133ad1	e441b982-c57e-45df-aafd-7684113ad44b	3	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	6d12b6ae-fe56-49e5-80d2-4b51d40770ae	f9bfc018-442f-4397-8dbc-1fdb01ef97bf	-1	loss	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	431b3ac4-42da-42a1-9a49-3b791f370ab2	343a2064-ca39-4be5-8b10-2691514cd7fc	1	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	bc2dbf36-4786-48e6-9721-e16c5c2eb3e2	c659da4e-ffdf-4571-a713-01c3dba6178e	5	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	7bdfc892-5cad-43d2-b235-02afede1ecbd	91e24ef6-ff7b-4e99-8af0-9b0f5ea78743	-1	loss	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	31e33109-b008-489b-a37a-e13202ed0927	0962c6f1-e0cb-4244-8028-5f68e2526c34	1	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	834c89e5-0e51-4aca-9d66-d414bafa77e1	2e5edff9-0283-48a9-95db-467dbe62403e	1	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	ecacbc7b-cc64-4ed6-8ab6-10c433fb3ce9	3588c736-b985-4c88-bb3f-b0b0decf16ab	-3	loss	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	45cc932e-b1d3-4204-aa65-372f0e48111a	6480f8ce-06e0-4b9d-bd27-944509c88d94	1	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	e4f9bc56-5420-4c15-8992-4feb8126e69a	10796c99-9d95-4e8b-9efc-ac84b036a57b	1	win	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	d2bdacae-dd5f-4dd4-8535-a65ff9e42774	f3952fd8-f86e-48be-954a-b80dfff01721	1	win	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	45cc932e-b1d3-4204-aa65-372f0e48111a	91e64a21-dbec-46c6-a788-9e1b59e3e0cb	1	win	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	79b2ed90-8c59-4bc9-92f0-2489d70c2da7	f7f6bc2b-7067-466c-bb80-760156108577	1	win	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	e266dc82-da06-45ad-b515-1658832012d5	7135fd2c-a6fb-406c-addb-fff7d76b01ab	-1	loss	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	6d12b6ae-fe56-49e5-80d2-4b51d40770ae	fcb76812-1267-4805-9ff7-189fb864b588	-1	loss	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	431b3ac4-42da-42a1-9a49-3b791f370ab2	b952b0af-d569-4ed0-80d8-63d88294d0f2	-1	loss	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	13f2fd71-3d1c-42e5-9f5c-99bb8f212547	dd90a429-0d18-4571-946c-045140e8e58b	1	win	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	e38cc65d-0609-4b3a-a380-637396570080	d06a4d65-15a2-4297-9ac5-233820b3c37d	1	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	cbc66c57-d654-486c-ae72-4ef57f0a3fe7	7ae73b64-9ccc-42fb-8f20-68ee1b83802a	3	win	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	a46ddd80-9686-4da2-868e-09f4b91eb3d9	0ab139a2-12a5-4c4d-b17b-6e608347325d	-5	loss	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	cbc66c57-d654-486c-ae72-4ef57f0a3fe7	32e096a9-752c-4b55-bb82-22919109f5bd	5	win	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	13f2fd71-3d1c-42e5-9f5c-99bb8f212547	57693f87-26f5-497f-b7dd-c2a4a6f075a5	-3	loss	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	e38cc65d-0609-4b3a-a380-637396570080	419b5980-d9c5-484e-a739-b6530741bdb8	5	win	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	5dae185c-5c31-487f-a883-6381c6e0a1c8	cce00746-1647-42ba-b423-5ca69164fe9c	3	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	5dae185c-5c31-487f-a883-6381c6e0a1c8	7ee5f0be-a48e-4b27-b513-d556caa889d7	1	win	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	5dae185c-5c31-487f-a883-6381c6e0a1c8	14938621-4c08-4368-b6b2-5c2ac8256c5e	-1	loss	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	5dae185c-5c31-487f-a883-6381c6e0a1c8	9c935011-2598-4a60-90fb-2951694324ed	1	win	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	41c027c6-fa5c-4a26-a7b6-3207cce3ebe6	3e85ea39-7caa-452c-b3c7-94b9ee911e9e	-3	loss	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	bc2dbf36-4786-48e6-9721-e16c5c2eb3e2	5f896ef2-db1a-492d-990e-9e8dfff81cd7	1	win	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	31e33109-b008-489b-a37a-e13202ed0927	2d164cb5-facd-4de7-82ea-fa1a0e992f03	-1	loss	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	834c89e5-0e51-4aca-9d66-d414bafa77e1	791868e8-eea4-4e55-957e-d1deb16e5ddf	-1	loss	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	ecacbc7b-cc64-4ed6-8ab6-10c433fb3ce9	8e83b918-b351-4f3e-a7d1-38d04890b0fe	-1	loss	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	7bdfc892-5cad-43d2-b235-02afede1ecbd	fca49706-0308-463d-9119-5f9052ded256	-1	loss	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	7bdfc892-5cad-43d2-b235-02afede1ecbd	e56db1e0-d6d6-4f7e-9c0b-06b9d0b4769d	-3	loss	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	cc3cd25a-c004-40fa-a591-d8bbbb2ea929	abe58279-14fa-460a-a65c-9d69de8aee47	3	win	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	cc3cd25a-c004-40fa-a591-d8bbbb2ea929	60350293-9c78-45a6-a729-90a300631b15	-1	loss	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	cc3cd25a-c004-40fa-a591-d8bbbb2ea929	df4e689e-e5f7-4e2c-b87b-e95c58df604a	-3	loss	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	cc3cd25a-c004-40fa-a591-d8bbbb2ea929	2fe8b154-386c-419b-865b-818bfa7f517a	-1	loss	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	cc3cd25a-c004-40fa-a591-d8bbbb2ea929	657dd7f2-4a7c-477b-a033-7cd6655431fa	3	win	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	e2e4275d-7bcf-4d9e-b8cc-b35a5703de8c	aec76838-7d00-4eed-9dc1-46c1b3560a79	5	win	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	3d891558-07e3-4160-b83c-5b4a7d5f63df	692e140e-d0d9-4da3-9626-ed58a4fa24b6	5	win	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	18174242-6c62-47ff-967f-d60afcc3b0ae	ebec99a6-f7dc-475a-8f8f-3fccde55311a	-3	loss	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	47f0286f-2598-4319-911a-3592d0ca6f07	fde5a297-3b53-49a9-91a3-6e7744d11937	1	win	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	3bf722b0-695a-428a-a9fc-f77cd0901e52	bfc98aba-f416-4728-b607-4b443edb71e7	3	win	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	b57ee556-4263-43bf-924d-b59dbfa152f3	1498add2-7d09-49ed-a600-0d10bd26fd50	-3	loss	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	8680b02f-3c5c-405a-8de9-37384b0667d4	34f3fef8-4000-4fcc-82be-f7fc32c2cb38	-1	loss	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	5d229b96-7da4-4fcb-a0d5-0bdcae77558e	66f40ab2-1c3e-4ff1-b987-569287822583	1	win	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	bb418583-3bf5-46ba-beb3-f4257a017cb7	b8111793-57b6-4a99-a817-c599fad4e0d8	-1	loss	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	bf3f67e5-389a-4bd0-a40e-36cd2780ea22	9028320e-956f-4eda-8fb9-c3d359c28861	1	win	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	e2e4275d-7bcf-4d9e-b8cc-b35a5703de8c	a1ecc05e-f268-4a3e-bb38-a56ae0af7ed6	3	win	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	3d891558-07e3-4160-b83c-5b4a7d5f63df	2054d254-1897-4274-bfe3-799f580e7057	3	win	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	2ee03b3d-e61b-4633-b5ed-f234f3c51cd6	49d365d1-b8b1-452a-822e-9ce590f5c5fd	-5	loss	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	18174242-6c62-47ff-967f-d60afcc3b0ae	0ad0fed8-8f4a-48e3-84b2-fb74eced6cb8	-3	loss	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	47f0286f-2598-4319-911a-3592d0ca6f07	edcc7397-9a8e-4fbf-9565-5788015509be	1	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	3bf722b0-695a-428a-a9fc-f77cd0901e52	61145420-3330-435a-8606-3c86a379933d	3	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	b57ee556-4263-43bf-924d-b59dbfa152f3	30a7c44d-bdad-4384-8e93-bceb136945a1	-1	loss	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	5d229b96-7da4-4fcb-a0d5-0bdcae77558e	4c131719-bbee-4121-a291-0b0fa72b6544	-3	loss	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	bb418583-3bf5-46ba-beb3-f4257a017cb7	c8689b5a-b4c6-49c0-b964-ffe507e02f4a	-3	loss	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	bf3f67e5-389a-4bd0-a40e-36cd2780ea22	e4f03a08-9939-4079-a203-f8ceda376027	-3	loss	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	3d891558-07e3-4160-b83c-5b4a7d5f63df	897ec650-9fee-40be-b82d-b8770b5723de	5	win	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	2ee03b3d-e61b-4633-b5ed-f234f3c51cd6	5e028ff4-2902-40e5-acfc-d5ec47cc65b2	-5	loss	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	8680b02f-3c5c-405a-8de9-37384b0667d4	05224add-8469-4e0e-9356-c4447ea41163	-1	loss	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	e2e4275d-7bcf-4d9e-b8cc-b35a5703de8c	e62aecb9-202c-4370-b585-171501c782c8	3	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	8680b02f-3c5c-405a-8de9-37384b0667d4	5a4a62f6-0f24-44ff-b568-0757f7dffdf1	5	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	5d229b96-7da4-4fcb-a0d5-0bdcae77558e	711c3983-41b1-4bd4-afd2-de97fb23cdb7	-1	loss	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	18174242-6c62-47ff-967f-d60afcc3b0ae	dd711d6e-ebcc-46de-9bf4-283d482b9ab9	3	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	47f0286f-2598-4319-911a-3592d0ca6f07	21cc4956-5a3b-4d1e-b7a9-64b3f81d9833	-5	loss	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	b57ee556-4263-43bf-924d-b59dbfa152f3	9918f793-1158-4521-b8d0-7efd0f49907e	3	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	bf3f67e5-389a-4bd0-a40e-36cd2780ea22	59ca6829-5243-4677-89fe-3308ee418cd0	5	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	e2e4275d-7bcf-4d9e-b8cc-b35a5703de8c	346a517e-a168-4a6d-9ae0-7e536442a163	5	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	3d891558-07e3-4160-b83c-5b4a7d5f63df	0f8d4533-4b8a-45b1-b35d-ec0080910cba	3	win	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	bb418583-3bf5-46ba-beb3-f4257a017cb7	e34125dd-3291-477e-b3d4-870bf3fa454d	-1	loss	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	3bf722b0-695a-428a-a9fc-f77cd0901e52	ae5f64be-4cb0-4418-9c58-3c3f00c4bbb6	-1	loss	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	8680b02f-3c5c-405a-8de9-37384b0667d4	d2e4ad3d-40b0-4895-91d3-150bd9982ade	1	win	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	3bf722b0-695a-428a-a9fc-f77cd0901e52	dd559a75-415c-427b-a6a5-71512b04b95b	1	win	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	5d229b96-7da4-4fcb-a0d5-0bdcae77558e	c343da3b-66d7-4dcf-ac49-2da3bdccaa04	-3	loss	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	bb418583-3bf5-46ba-beb3-f4257a017cb7	4175acd1-0a97-470f-a769-669346defb7a	1	win	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	18174242-6c62-47ff-967f-d60afcc3b0ae	93303afd-cefd-4aff-9111-a9befda9a4a3	-3	loss	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	47f0286f-2598-4319-911a-3592d0ca6f07	14f14641-28be-494d-9b6e-b4d6000522d1	-3	loss	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	b57ee556-4263-43bf-924d-b59dbfa152f3	40afa85f-77b8-47c9-8e8f-3ef36d943b65	-1	loss	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	bf3f67e5-389a-4bd0-a40e-36cd2780ea22	c3f2670f-8ea0-4701-bd76-6da06e2a7884	-1	loss	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	3d891558-07e3-4160-b83c-5b4a7d5f63df	dec74a15-236a-43ce-ba60-ac8c416dcc7b	1	win	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	e2e4275d-7bcf-4d9e-b8cc-b35a5703de8c	71c48d23-35a7-42b8-acb4-ebb6d645e414	1	win	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	2ee03b3d-e61b-4633-b5ed-f234f3c51cd6	9732ac1d-9fe9-4f25-8ebd-da5f8f280448	-1	loss	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	2ee03b3d-e61b-4633-b5ed-f234f3c51cd6	bf32abd8-eacc-47df-9197-2f518fb2f63e	-10	loss	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	2ee03b3d-e61b-4633-b5ed-f234f3c51cd6	\N	-1	missed	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	431b3ac4-42da-42a1-9a49-3b791f370ab2	\N	-1	missed	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	ecacbc7b-cc64-4ed6-8ab6-10c433fb3ce9	\N	-1	missed	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	7bdfc892-5cad-43d2-b235-02afede1ecbd	\N	-1	missed	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	834c89e5-0e51-4aca-9d66-d414bafa77e1	\N	-1	missed	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	31e33109-b008-489b-a37a-e13202ed0927	\N	-1	missed	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	3bf722b0-695a-428a-a9fc-f77cd0901e52	\N	-1	missed	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	b556dadc-16a2-4062-9e07-c4801a270aea	\N	-1	missed	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	01ced56f-5413-4445-b791-af1bc821d0cc	b04acd7f-9a33-4165-8b72-a3e84a110999	1	win	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	358d48e8-bed8-4dc9-a3a2-a45116df0833	4ada72cd-a784-470a-8c00-777cad99a694	1	win	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	f58f0065-696f-4d1a-9e79-ee46d002c79a	ff6af580-c277-4f2b-81d1-a0cf014eaf66	-1	loss	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	c95835d4-c6eb-495c-9a7b-8549c0bb86e4	d578e6ea-9a84-467a-9845-ed5bba9332a6	1	win	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	af39c4f7-7bbc-445f-9596-0ee71f84d732	25bf0af9-de19-4068-94de-39008ec31117	1	win	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	7c66af18-7fe5-403b-8a74-fc66d3e13e5f	d82178da-4ce3-4601-91d9-0fef09fc2c69	-1	loss	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	6f0ab50a-2db9-4735-b55e-04baec9fc2d3	d9eb0fe2-cff9-4999-b043-2f586ca61555	-10	loss	2025-12-01 18:43:40.662483+00
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	6f0ab50a-2db9-4735-b55e-04baec9fc2d3	dff48f74-1c42-446c-bc04-1d22f72e707a	-1	loss	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	6f0ab50a-2db9-4735-b55e-04baec9fc2d3	4a33917a-8f3e-4b1a-9bba-a880541b23ef	-1	loss	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	6d12b6ae-fe56-49e5-80d2-4b51d40770ae	f1d76a04-9014-4c9e-a6f5-5967e4fdabc9	-3	loss	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	d2bdacae-dd5f-4dd4-8535-a65ff9e42774	10f38cc7-f8a5-41ba-a812-9ab081c53bfb	3	win	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	e266dc82-da06-45ad-b515-1658832012d5	0d4239f4-360c-4bf7-a573-ca9768cf6909	3	win	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	e4f9bc56-5420-4c15-8992-4feb8126e69a	3cb410c9-b13c-41a5-b872-0b70ccc756da	5	win	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	79b2ed90-8c59-4bc9-92f0-2489d70c2da7	78a95636-0cca-417b-a661-cf3ed66cfbc8	-5	loss	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	1a9a4ec2-e36e-445c-a230-904155133ad1	3e720d61-301d-41c4-8dbc-cf534413540e	3	win	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	431b3ac4-42da-42a1-9a49-3b791f370ab2	4b55b5a4-ee75-4a09-a418-f4ff12aa7fdf	3	win	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	bc2dbf36-4786-48e6-9721-e16c5c2eb3e2	1b703864-7541-4994-9f85-5f6e1cd78b2c	5	win	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	31e33109-b008-489b-a37a-e13202ed0927	60447ece-4fa3-44e1-93f7-3e3a493eef33	3	win	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	834c89e5-0e51-4aca-9d66-d414bafa77e1	96c04a05-48ca-4279-948c-cebfddc7a631	1	win	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	ecacbc7b-cc64-4ed6-8ab6-10c433fb3ce9	479eac31-2f69-48c7-8aca-3adc57ed27d7	3	win	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	13a5b004-d94d-4fef-9586-6a0af5dfedec	\N	-1	missed	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	13a5b004-d94d-4fef-9586-6a0af5dfedec	\N	-1	missed	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	13a5b004-d94d-4fef-9586-6a0af5dfedec	\N	-1	missed	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	13a5b004-d94d-4fef-9586-6a0af5dfedec	\N	-1	missed	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	8417d24a-a09d-4f23-ab21-40f016ed3bd3	\N	-1	missed	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	bc9e35d8-20fa-44b4-be20-81e6c19c72e1	\N	-1	missed	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	7d2cd926-d87c-49a2-ac4a-75992298fb33	\N	-1	missed	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	a72be0b6-d553-4389-aee5-8c2fd70c58cc	\N	-1	missed	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	49a0b7ea-6fc3-45d1-848a-6b0e079f13a2	\N	-1	missed	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	b0f2ec20-f691-43a1-a91b-549cdde8abd4	\N	-1	missed	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	10340ef1-48a2-48c8-a50a-bb3d0eaa35fe	\N	-1	missed	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	b30ae39f-ba57-4fc8-a725-8923136dca9c	\N	-1	missed	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	a10d2e03-a21f-4d06-8752-a46f00fe648b	\N	-1	missed	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	a10d2e03-a21f-4d06-8752-a46f00fe648b	\N	-1	missed	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	a10d2e03-a21f-4d06-8752-a46f00fe648b	\N	-1	missed	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	91376266-40b6-4e41-aca0-0736c40c57f2	\N	-1	missed	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	c9bc16f7-9a25-429d-98f3-5c7a3ebc8414	\N	-1	missed	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	380e817d-fcde-418f-9eb1-a97bb993e03e	\N	-1	missed	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	bde2234a-6b87-4b5e-85dd-37c092bc3047	\N	-1	missed	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	fe4ccad3-2b0e-46f8-b2eb-c197e204cd5c	\N	-1	missed	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	fe4ccad3-2b0e-46f8-b2eb-c197e204cd5c	\N	-1	missed	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	6a64a55f-f8da-41e8-a1ce-50a485f53127	\N	-1	missed	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	0b349bf3-4672-4285-9a9a-8330f11f8c22	\N	-1	missed	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	6d3724f1-646a-4345-9f21-6f0b4932664c	\N	-1	missed	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	6d3724f1-646a-4345-9f21-6f0b4932664c	\N	-1	missed	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	6d3724f1-646a-4345-9f21-6f0b4932664c	\N	-1	missed	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	9f96ae20-7274-4d44-8194-71356e732dca	\N	-1	missed	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	f49a3914-1a2b-4bbd-bd90-58f3d43f2ca1	\N	-1	missed	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	f49a3914-1a2b-4bbd-bd90-58f3d43f2ca1	\N	-1	missed	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	f49a3914-1a2b-4bbd-bd90-58f3d43f2ca1	\N	-1	missed	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	d064ce63-ab19-4c93-a5ce-2edbf9fc77f7	\N	-1	missed	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	d064ce63-ab19-4c93-a5ce-2edbf9fc77f7	\N	-1	missed	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	d064ce63-ab19-4c93-a5ce-2edbf9fc77f7	\N	-1	missed	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	f17681b2-38c7-4e9c-828b-72a18f4d0197	\N	-1	missed	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	f17681b2-38c7-4e9c-828b-72a18f4d0197	\N	-1	missed	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	f17681b2-38c7-4e9c-828b-72a18f4d0197	\N	-1	missed	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	f17681b2-38c7-4e9c-828b-72a18f4d0197	\N	-1	missed	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	b134cf70-c00d-45e0-95e1-8b400db16f9d	\N	-1	missed	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	8697092d-e82a-45e2-b869-fd31ece83fe2	\N	-1	missed	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	8697092d-e82a-45e2-b869-fd31ece83fe2	\N	-1	missed	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	8697092d-e82a-45e2-b869-fd31ece83fe2	\N	-1	missed	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	4a71fd05-215f-4ff9-a9a5-3ca7f0bb5938	\N	-1	missed	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	4a71fd05-215f-4ff9-a9a5-3ca7f0bb5938	\N	-1	missed	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	95407649-75c0-440d-8115-1a5442582203	\N	-1	missed	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	95407649-75c0-440d-8115-1a5442582203	\N	-1	missed	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	3c5359bd-125e-4aec-ad9d-a5c4b0d3e30c	\N	-1	missed	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	3c5359bd-125e-4aec-ad9d-a5c4b0d3e30c	\N	-1	missed	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	3cc444f7-1d14-4ca8-8871-dbfb2b3607b0	\N	-1	missed	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	3cc444f7-1d14-4ca8-8871-dbfb2b3607b0	\N	-1	missed	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	5dae185c-5c31-487f-a883-6381c6e0a1c8	\N	-1	missed	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	5dae185c-5c31-487f-a883-6381c6e0a1c8	\N	-1	missed	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	d26f58ed-1e7b-4e7f-9045-36b6a4072128	\N	-1	missed	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	8c1fa576-2d49-4e8a-962d-259057938461	\N	-1	missed	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	2b45efe0-31db-4e09-868e-5ab5549e0b0a	\N	-1	missed	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	ca15c000-5210-4eb0-9793-bda649720d4d	\N	-1	missed	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	9b3c55d8-73f8-4a27-9f17-9d1d9fbd9350	\N	-1	missed	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	0efcb2cd-b1dd-46bd-bc97-4b1af61b2154	\N	-1	missed	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	c4d15223-1220-412c-a372-c5d0b415fee2	\N	-1	missed	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	79b2ed90-8c59-4bc9-92f0-2489d70c2da7	\N	-1	missed	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	e4f9bc56-5420-4c15-8992-4feb8126e69a	\N	-1	missed	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	d2bdacae-dd5f-4dd4-8535-a65ff9e42774	\N	-1	missed	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	45cc932e-b1d3-4204-aa65-372f0e48111a	\N	-1	missed	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	e266dc82-da06-45ad-b515-1658832012d5	\N	-1	missed	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	1a9a4ec2-e36e-445c-a230-904155133ad1	\N	-1	missed	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	6d12b6ae-fe56-49e5-80d2-4b51d40770ae	\N	-1	missed	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	b57ee556-4263-43bf-924d-b59dbfa152f3	\N	-1	missed	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	bb418583-3bf5-46ba-beb3-f4257a017cb7	\N	-1	missed	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	47f0286f-2598-4319-911a-3592d0ca6f07	\N	-1	missed	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	54bbb810-a9f6-429d-8566-74105f370675	\N	-1	missed	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	2669b044-2985-4243-a9ab-9b725dccee62	\N	-1	missed	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	58b00d24-143e-48a2-a202-07a1b3975fc3	\N	-1	missed	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	b78e5b52-7747-43a0-9bd4-020c7223b8e3	\N	-1	missed	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	b78e5b52-7747-43a0-9bd4-020c7223b8e3	\N	-1	missed	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	b31c97c4-c4f1-4e44-8152-1e84c0d4b5d9	\N	-1	missed	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	86f55afb-4e15-4949-a2bc-ff38a995263f	\N	-1	missed	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	ebba52ce-db32-4ea8-909d-eaf8c90105be	\N	-1	missed	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	25dd832e-7722-464a-b421-822312d3c78f	\N	-1	missed	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	25dd832e-7722-464a-b421-822312d3c78f	\N	-1	missed	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	25dd832e-7722-464a-b421-822312d3c78f	\N	-1	missed	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	25dd832e-7722-464a-b421-822312d3c78f	\N	-1	missed	2025-12-01 18:43:40.662483+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	50e71e9f-3dd0-40fc-91e5-9b3ba56ecee6	\N	-1	missed	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	01ced56f-5413-4445-b791-af1bc821d0cc	\N	-1	missed	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	af39c4f7-7bbc-445f-9596-0ee71f84d732	\N	-1	missed	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	7c66af18-7fe5-403b-8a74-fc66d3e13e5f	\N	-1	missed	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	358d48e8-bed8-4dc9-a3a2-a45116df0833	\N	-1	missed	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	f58f0065-696f-4d1a-9e79-ee46d002c79a	\N	-1	missed	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	c95835d4-c6eb-495c-9a7b-8549c0bb86e4	\N	-1	missed	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	acabce6e-fe7c-425b-9253-b814cd6566b4	\N	-1	missed	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	acabce6e-fe7c-425b-9253-b814cd6566b4	\N	-1	missed	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	41c027c6-fa5c-4a26-a7b6-3207cce3ebe6	\N	-1	missed	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	41c027c6-fa5c-4a26-a7b6-3207cce3ebe6	\N	-1	missed	2025-12-01 18:43:40.662483+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	2ce2ef92-1078-461b-abda-6d1911a0a056	\N	-1	missed	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	2ce2ef92-1078-461b-abda-6d1911a0a056	\N	-1	missed	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	8680b02f-3c5c-405a-8de9-37384b0667d4	\N	-1	missed	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	18174242-6c62-47ff-967f-d60afcc3b0ae	\N	-1	missed	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	bc2dbf36-4786-48e6-9721-e16c5c2eb3e2	\N	-1	missed	2025-12-01 18:43:40.662483+00
b75858d9-3f6f-46b7-be49-6884b28493f6	6f0ab50a-2db9-4735-b55e-04baec9fc2d3	\N	-1	missed	2025-12-01 18:43:40.662483+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	6f0ab50a-2db9-4735-b55e-04baec9fc2d3	\N	-1	missed	2025-12-01 18:43:40.662483+00
93abda42-cf85-4c5f-bd90-81210369b2dc	6f0ab50a-2db9-4735-b55e-04baec9fc2d3	\N	-1	missed	2025-12-01 18:43:40.662483+00
\.
COPY public.picks (user_id, game_id, picked_team_id, weight, locked_at, locked_line_id, locked_spread_team_id, locked_spread_value, locked_by, id, _normalized_spread_at) FROM stdin;
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	49a0b7ea-6fc3-45d1-848a-6b0e079f13a2	24	L	2025-09-28 15:13:24.199599+00	124	18	6.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	56a026b0-7d11-4cfd-9ca9-f99278cd50ad	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	8417d24a-a09d-4f23-ab21-40f016ed3bd3	11	M	2025-09-28 15:27:19.788344+00	119	11	9.5	b75858d9-3f6f-46b7-be49-6884b28493f6	ec54540a-219e-4986-83ed-8c83e10093d4	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	5635fb7e-2185-479c-90b1-b46de7a4f4b3	2	M	2025-09-21 14:13:13.407137+00	66	2	4.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	2842afa6-1867-4c62-a1ae-785f1c73c304	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	0318ac4a-51fa-4197-9a58-d5a066c5c7cd	7	H	2025-09-21 14:13:17.346332+00	67	21	3	d8db1ea2-76a7-4cb1-8025-167bef10c724	73d8d0b8-39f2-47b5-bd97-9edbf93b98a3	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	6e913449-02a1-41ef-9139-55aab1625913	15	M	2025-09-21 14:13:20.484289+00	69	15	1.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	33888905-35c2-4b44-a57e-1d4c6ddf418b	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	b92f4877-3642-4dad-8a58-cbbc33acaa27	30	H	2025-09-21 14:13:23.955396+00	72	30	6.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	2d20a952-7750-4dba-9505-56e2b682d1ca	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	1211281f-ad14-48b6-86e4-a4eb98d667d0	19	H	2025-09-21 14:13:33.11113+00	74	26	3.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	a167f431-ca20-4d74-a004-16c78957c86f	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	dc820270-eba7-46bf-b0ea-a266032ff812	23	M	2025-09-21 14:13:48.34654+00	76	29	7.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	5272aadd-e380-47bd-b412-674e07216ee3	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	509947e1-c9f4-4dea-869e-18f0ae6560b4	1	M	2025-09-21 14:13:56.220644+00	78	28	2.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	a5bab6ab-5ea8-4493-a0af-ea688ddb3fc8	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	a6646dac-f8d6-473f-96fc-0e711dd92011	11	H	2025-09-21 14:14:07.961809+00	80	3	5.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	eba99a9e-36dd-4e24-a681-783d4d81b9e4	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	509947e1-c9f4-4dea-869e-18f0ae6560b4	28	L	2025-09-21 14:18:32.98609+00	78	28	2.5	93abda42-cf85-4c5f-bd90-81210369b2dc	61662299-de8d-466d-826f-765c15c8a30f	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	a6646dac-f8d6-473f-96fc-0e711dd92011	11	L	2025-09-21 14:18:48.75707+00	80	3	5.5	93abda42-cf85-4c5f-bd90-81210369b2dc	9c1447ee-f61f-4841-99b6-d189b7644cdd	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	5635fb7e-2185-479c-90b1-b46de7a4f4b3	2	M	2025-09-21 14:25:38.20552+00	66	2	4.5	b75858d9-3f6f-46b7-be49-6884b28493f6	580f289b-c09c-4977-ae31-92f192fc7382	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	f27eeec6-0e15-4c22-81c6-5c4b143adfe8	32	H	2025-09-21 14:25:48.823071+00	70	32	3	b75858d9-3f6f-46b7-be49-6884b28493f6	5f1177b4-c221-4fc3-bdb1-f6a00e93e5e1	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	6e913449-02a1-41ef-9139-55aab1625913	13	M	2025-09-21 14:25:52.873668+00	69	15	1.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	1bfbf103-88bb-42f3-ba44-8a0fbba2db98	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	b92f4877-3642-4dad-8a58-cbbc33acaa27	30	M	2025-09-21 14:26:05.686038+00	72	30	6.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	c4616373-7145-4ba4-822d-514c66d2a2c0	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	1211281f-ad14-48b6-86e4-a4eb98d667d0	19	M	2025-09-21 14:26:18.639748+00	74	26	3.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	6e317b3d-864d-4103-9820-11fd2782e6bb	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	31e6b9ac-abc1-402e-bed5-2961e9bc8a02	6	M	2025-09-21 14:26:40.303274+00	77	9	1.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	ed0b92aa-5364-4346-abbb-285e5f17c8b0	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	b92f4877-3642-4dad-8a58-cbbc33acaa27	25	L	2025-09-21 14:28:04.779114+00	72	30	6.5	b75858d9-3f6f-46b7-be49-6884b28493f6	8ab200bc-2e9e-4812-a16c-7d8219f44bb4	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	31e6b9ac-abc1-402e-bed5-2961e9bc8a02	6	M	2025-09-21 14:29:47.143154+00	77	9	1.5	b75858d9-3f6f-46b7-be49-6884b28493f6	b37a333e-0bb5-4537-a628-d382cdf037ab	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	a6646dac-f8d6-473f-96fc-0e711dd92011	11	L	2025-09-21 14:30:39.983078+00	80	3	5.5	b75858d9-3f6f-46b7-be49-6884b28493f6	fd8e2615-c176-4582-a6b3-f1047b61f600	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	31e6b9ac-abc1-402e-bed5-2961e9bc8a02	9	M	2025-09-21 20:22:36.5864+00	77	9	1.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	0da9b3ad-2783-47c3-9b10-ebd3c9d3b312	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	242131ad-16bf-4fd6-8e5e-65b6d2e79cf1	29	M	2025-09-25 13:04:38.527446+00	117	29	1.5	93abda42-cf85-4c5f-bd90-81210369b2dc	7f4767fd-8be2-41b5-8f3f-504e8d3bd2fc	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	242131ad-16bf-4fd6-8e5e-65b6d2e79cf1	1	M	2025-09-25 22:21:47.572602+00	117	29	1.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	7ede862f-c048-4203-9b21-798fc969a179	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	7e68fe65-8ae9-4e71-ac41-ae6b9a3a7d62	32	M	2025-09-12 00:16:00+00	154	12	3.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	6b0f8c2c-a3e7-4764-9195-2da025a3312d	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	7e68fe65-8ae9-4e71-ac41-ae6b9a3a7d62	32	M	2025-09-12 00:16:00+00	154	12	3.5	b75858d9-3f6f-46b7-be49-6884b28493f6	b3cc948f-9b38-4cac-a9e3-d75ccb479a07	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	336dd0e8-7642-45af-a8a6-493dae1bedbc	8	M	2025-09-14 17:01:00+00	155	3	11.5	93abda42-cf85-4c5f-bd90-81210369b2dc	1aa1513d-ee94-4d8f-9239-977d5276cc1d	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	a9ade8e0-8fb2-4c2b-917b-7191424388e7	20	M	2025-09-14 17:00:00+00	161	20	2.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	661b7740-aede-49ce-be59-566033988500	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	b0a3899d-dd50-487c-b759-826132a5af7d	30	H	2025-09-15 23:01:00+00	168	13	2.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	547e39f3-d57e-49b0-8745-89e581a5f04b	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	b0a3899d-dd50-487c-b759-826132a5af7d	30	M	2025-09-15 23:01:00+00	168	13	2.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	55666f50-914c-448f-9fab-b81b1812b3a9	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	36496369-7298-4ef1-a622-6ef72558e109	14	M	2025-09-07 17:00:00+00	176	14	1.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	cb74f1c3-3725-4e1c-9f95-abaac191c3c4	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	13a5b004-d94d-4fef-9586-6a0af5dfedec	27	M	2025-09-28 04:29:52.321762+00	118	21	2.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	ee9eb97d-0c55-4fea-a6fc-2daa416be7c1	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	bc9e35d8-20fa-44b4-be20-81e6c19c72e1	4	L	2025-09-28 12:13:23.960561+00	186	4	14.5	93abda42-cf85-4c5f-bd90-81210369b2dc	a3a63fcb-0cbd-4dc5-beb4-f1574b31a433	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	ca15c000-5210-4eb0-9793-bda649720d4d	31	H	2025-09-28 12:13:58.794664+00	123	13	7.5	93abda42-cf85-4c5f-bd90-81210369b2dc	12a61f9e-0955-484b-b52b-1ffaea3d0599	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	a72be0b6-d553-4389-aee5-8c2fd70c58cc	3	H	2025-09-28 12:14:29.865573+00	128	3	2.5	93abda42-cf85-4c5f-bd90-81210369b2dc	d8cc2c9b-76bf-4526-abab-0e96f4cbdcfc	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	10340ef1-48a2-48c8-a50a-bb3d0eaa35fe	10	L	2025-09-28 12:14:55.186929+00	132	10	7.5	93abda42-cf85-4c5f-bd90-81210369b2dc	643aade0-9f12-4625-9872-76b0da58ea31	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	8417d24a-a09d-4f23-ab21-40f016ed3bd3	8	L	2025-09-28 14:28:16.676341+00	119	11	9.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	c078b5bf-c0d5-473d-83c3-565148d37ce7	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	ca15c000-5210-4eb0-9793-bda649720d4d	31	L	2025-09-28 14:28:31.399408+00	123	13	7.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	633308ac-99ba-4732-849a-c3a953ee254f	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	8417d24a-a09d-4f23-ab21-40f016ed3bd3	11	L	2025-09-28 14:39:58.210725+00	119	11	9.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	40755be6-aad3-4c37-964e-c4ad480d3ee0	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	ca15c000-5210-4eb0-9793-bda649720d4d	13	L	2025-09-28 14:40:14.815422+00	123	13	7.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	45c97254-210c-467e-a939-83bfcf2a5148	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	2b45efe0-31db-4e09-868e-5ab5549e0b0a	32	M	2025-09-28 14:40:32.673228+00	120	2	2.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	7c900c89-c6c8-42f2-bd50-676ca03874ff	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	a72be0b6-d553-4389-aee5-8c2fd70c58cc	16	M	2025-09-28 14:40:51.938278+00	128	3	2.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	a03f1cc6-b8f4-429e-92da-9c40a9207157	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	0efcb2cd-b1dd-46bd-bc97-4b1af61b2154	20	M	2025-09-28 14:41:11.903927+00	131	20	2.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	93d4e783-3003-40d0-8871-2a266fe175de	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	2b45efe0-31db-4e09-868e-5ab5549e0b0a	32	H	2025-09-28 14:53:15.843147+00	120	2	2.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	f21693f6-ca37-4542-82e1-e65886138af2	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	ca15c000-5210-4eb0-9793-bda649720d4d	31	H	2025-09-28 14:53:18.460855+00	123	13	7.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	6ee0752b-7d16-40f4-a12c-5a3791e62b4a	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	8417d24a-a09d-4f23-ab21-40f016ed3bd3	8	M	2025-09-28 14:53:22.717441+00	119	11	9.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	aff99dc6-ea1e-4a92-a210-5d9352bde1de	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	a72be0b6-d553-4389-aee5-8c2fd70c58cc	16	L	2025-09-28 14:53:37.481659+00	128	3	2.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	26901614-0608-4750-9afe-15358223e45d	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	0efcb2cd-b1dd-46bd-bc97-4b1af61b2154	25	L	2025-09-28 14:53:50.308347+00	131	20	2.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	c672eaa8-7ea8-49ab-93c9-c48ce5866838	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	d26f58ed-1e7b-4e7f-9045-36b6a4072128	15	L	2025-09-28 15:11:23.514492+00	127	28	3.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	8a345519-1395-44da-9d8b-84e7ec6ccc68	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	250c968a-cb9d-4060-a785-2dfbce12c181	4	M	2025-09-19 00:15:00+00	65	4	11.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	831b3420-e314-4c77-aee6-40daab8e6567	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	9b3c55d8-73f8-4a27-9f17-9d1d9fbd9350	30	L	2025-09-28 15:28:37.012138+00	125	26	3.5	b75858d9-3f6f-46b7-be49-6884b28493f6	7e314ad3-aa9a-4b37-a982-f1b4b5b1ecec	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	2b45efe0-31db-4e09-868e-5ab5549e0b0a	32	M	2025-09-28 15:29:03.103504+00	120	2	2.5	b75858d9-3f6f-46b7-be49-6884b28493f6	45da191e-e6cc-4220-8721-b879d5e1ac39	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	a72be0b6-d553-4389-aee5-8c2fd70c58cc	3	H	2025-09-28 15:11:30.835085+00	128	3	2.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	51812c44-45d2-4a4f-85a5-24b41de750a9	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	d26f58ed-1e7b-4e7f-9045-36b6a4072128	28	H	2025-09-28 15:29:30.560513+00	127	28	3.5	b75858d9-3f6f-46b7-be49-6884b28493f6	9fa21466-f14f-48b0-9cdf-63aff6033283	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	a72be0b6-d553-4389-aee5-8c2fd70c58cc	3	M	2025-09-28 15:29:37.927816+00	128	3	2.5	b75858d9-3f6f-46b7-be49-6884b28493f6	697a3326-110b-482d-a328-d9d470d23a37	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	91376266-40b6-4e41-aca0-0736c40c57f2	9	M	2025-09-28 15:29:51.804785+00	130	12	6.5	b75858d9-3f6f-46b7-be49-6884b28493f6	4dfc2f7b-69fc-462b-a376-e1b29cfe6f57	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	0efcb2cd-b1dd-46bd-bc97-4b1af61b2154	25	L	2025-09-28 15:30:00.987845+00	131	20	2.5	b75858d9-3f6f-46b7-be49-6884b28493f6	eb3924b7-90e6-49f8-9bda-6e8b0e03bbd1	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	10340ef1-48a2-48c8-a50a-bb3d0eaa35fe	7	L	2025-09-28 15:30:17.00683+00	132	10	7.5	b75858d9-3f6f-46b7-be49-6884b28493f6	4b7d77b0-59a9-4dd9-80c1-34c1db454c48	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	6d3724f1-646a-4345-9f21-6f0b4932664c	19	L	2025-10-02 21:38:31.84364+00	202	19	8.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	a46e7703-50ab-456d-9594-f997a6165b8f	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	fe4ccad3-2b0e-46f8-b2eb-c197e204cd5c	8	L	2025-10-03 00:11:18.871298+00	188	21	3.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	f79383b9-9b66-45ed-bf4a-85ad716b8aee	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	86f55afb-4e15-4949-a2bc-ff38a995263f	9	M	2025-10-03 00:11:35.236194+00	191	9	2.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	58f7830e-6721-42c5-96a2-8f8ba13f237d	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	0b349bf3-4672-4285-9a9a-8330f11f8c22	24	H	2025-10-03 00:11:54.472855+00	194	23	1.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	6dda985d-259e-4ab9-8552-e111a34a6114	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	bde2234a-6b87-4b5e-85dd-37c092bc3047	30	H	2025-10-03 00:12:07.611349+00	196	29	3	61183ed6-88ce-418b-8bdf-f16c57a350f7	359e5138-422e-49ff-b16b-2bca4b6650a5	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	2669b044-2985-4243-a9ab-9b725dccee62	11	H	2025-10-03 00:12:24.823427+00	197	11	10.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	6b6533dd-4a82-401f-baee-cfa118d1382d	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	8d1ac3c2-a669-4274-9d81-20e1f51b9bae	4	M	2025-10-03 00:12:35.93355+00	199	4	8.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	eeccb00e-ce8a-4548-9431-584a92461faa	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	34aa22d9-a08f-4527-9c82-f7bb72317a90	16	L	2025-09-05 00:16:16.799119+00	18	16	3	d8db1ea2-76a7-4cb1-8025-167bef10c724	60d20f5e-dd05-4201-8b30-5752247720f9	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	f27eeec6-0e15-4c22-81c6-5c4b143adfe8	32	H	2025-09-21 14:13:15.500351+00	70	32	3	d8db1ea2-76a7-4cb1-8025-167bef10c724	2f78d3f2-c8a6-4f65-9049-c5d2e383fbff	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	3ec70270-c7f5-42b0-9220-34405add51e7	23	L	2025-09-14 11:32:48.978011+00	57	28	3	93abda42-cf85-4c5f-bd90-81210369b2dc	6a70523a-aaf5-4817-aa8e-4c4ef6ec1197	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	3c511a07-f80a-4dc2-bc49-40a3fbe5ddb3	24	M	2025-09-14 12:40:32.827017+00	52	9	4.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	1873ae4b-07ee-442d-b47a-dd416bb857be	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	336dd0e8-7642-45af-a8a6-493dae1bedbc	8	M	2025-09-14 12:41:06.645702+00	54	3	11.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	fc00420e-5d62-4612-bd05-0a2a4309d738	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	3ec70270-c7f5-42b0-9220-34405add51e7	23	M	2025-09-14 12:41:22.661744+00	57	28	3	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	5a0e540c-7d65-4db0-8bc7-529befcb2c7e	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	2c53b774-736f-410c-b671-9ec4f1493fbd	15	M	2025-09-14 12:41:47.272109+00	51	7	3.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	04c218b7-abd6-4aea-9a1a-fbad6a9537ac	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	5334cd67-c846-4303-b979-4636a885b1b6	11	M	2025-09-14 12:41:58.540803+00	50	11	6.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	69d56277-cd20-4ef9-aeb3-274ebe698087	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	a9ade8e0-8fb2-4c2b-917b-7191424388e7	20	L	2025-09-14 12:42:06.348589+00	53	20	1.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	60ad939a-2ad6-40fb-96f2-00c2a1f91668	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	fa733f3c-4b1a-442c-a331-8d2651040165	25	M	2025-09-14 12:42:18.533444+00	55	4	6.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	57fc77cb-15eb-41cf-b010-290a40f432b2	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	49926afd-6329-4124-9846-7a044272ac54	19	M	2025-09-14 12:42:27.450428+00	56	19	5.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	f80074f2-0ea7-429e-93ab-9f8163ead795	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	01b3a495-1daf-4b24-99e2-a903e786b1be	27	M	2025-09-14 12:42:41.430888+00	58	27	3	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	e2be1a2c-edbd-4c74-b908-c3d35e212cbb	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	fdd4448f-e730-4933-89a9-f4d40456b4d7	1	L	2025-09-14 12:42:55.649496+00	59	1	6.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	c04a210d-913b-4e97-9c0f-387b63dee8f0	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	49926afd-6329-4124-9846-7a044272ac54	19	L	2025-09-14 17:01:00+00	156	19	5.5	93abda42-cf85-4c5f-bd90-81210369b2dc	e97b3743-2a46-4364-b8c8-2eb28ff2f446	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	5334cd67-c846-4303-b979-4636a885b1b6	6	H	2025-09-14 17:00:00+00	157	11	6.5	93abda42-cf85-4c5f-bd90-81210369b2dc	f39bee62-88fb-4c8a-b5e3-3064ff13c9fd	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	fa733f3c-4b1a-442c-a331-8d2651040165	25	M	2025-09-14 17:01:00+00	158	4	6.5	93abda42-cf85-4c5f-bd90-81210369b2dc	402e9399-eacb-44df-ae70-4992c00dbc87	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	3c511a07-f80a-4dc2-bc49-40a3fbe5ddb3	9	M	2025-09-14 17:00:00+00	159	9	4.5	93abda42-cf85-4c5f-bd90-81210369b2dc	1fadf5a4-4f5c-4f3a-ace9-1030e546a773	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	a9ade8e0-8fb2-4c2b-917b-7191424388e7	22	M	2025-09-14 17:00:00+00	161	20	2.5	93abda42-cf85-4c5f-bd90-81210369b2dc	b78f40ae-ba83-4cbc-b555-8bc39db94e17	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	2c53b774-736f-410c-b671-9ec4f1493fbd	15	L	2025-09-14 17:00:00+00	162	7	3.5	93abda42-cf85-4c5f-bd90-81210369b2dc	39733976-1fa4-439e-87cb-2e2b2b37c01e	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	01b3a495-1daf-4b24-99e2-a903e786b1be	29	L	2025-09-14 17:01:00+00	163	27	3	93abda42-cf85-4c5f-bd90-81210369b2dc	9c72cb22-8e35-4885-bbf1-7c6b7e91f2e3	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	3cd1d025-e2d8-463e-80ef-6385fc746582	14	M	2025-09-14 20:06:00+00	164	10	2.5	93abda42-cf85-4c5f-bd90-81210369b2dc	313f08c6-ee26-4d83-9b2e-7e2802fa004f	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	fdd4448f-e730-4933-89a9-f4d40456b4d7	1	L	2025-09-14 20:05:00+00	165	1	6.5	93abda42-cf85-4c5f-bd90-81210369b2dc	51bd3d25-1955-44a3-9b31-d855a3ba0f5c	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	b42650fe-fa28-4feb-98d6-622cffa6eb2e	26	M	2025-09-14 20:25:00+00	166	26	1.5	93abda42-cf85-4c5f-bd90-81210369b2dc	df9514f2-7ce9-4044-9f1b-c66446fe23c2	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	abd39ca3-bedd-4a14-942c-1871e3e9a85b	2	L	2025-09-15 00:20:00+00	167	21	3.5	93abda42-cf85-4c5f-bd90-81210369b2dc	07f6401b-ab36-47d2-91b2-5bf04aba7cc0	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	b0a3899d-dd50-487c-b759-826132a5af7d	30	H	2025-09-15 23:01:00+00	168	13	2.5	93abda42-cf85-4c5f-bd90-81210369b2dc	0265bbf6-b7fd-4c95-8b13-9059b2c8b8e5	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	105ee53e-1599-447f-8df2-04a8f0e03d2e	18	M	2025-09-16 02:00:00+00	169	18	3	93abda42-cf85-4c5f-bd90-81210369b2dc	945bff13-b2c4-4aaa-977a-5533dba5c9eb	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	63be1bd1-8401-4d9c-850a-3c48a0aa2542	26	H	2025-09-05 00:22:00+00	170	26	8	93abda42-cf85-4c5f-bd90-81210369b2dc	3ce3beb6-c7ff-4448-8d6e-fac116e83927	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	63be1bd1-8401-4d9c-850a-3c48a0aa2542	26	M	2025-09-05 00:22:00+00	170	26	8	d8db1ea2-76a7-4cb1-8025-167bef10c724	c9a07ba2-b588-43e3-9f9c-1498b9e8fe5e	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	34aa22d9-a08f-4527-9c82-f7bb72317a90	18	L	2025-09-06 00:00:00+00	171	16	3	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	6e471c1d-5cba-45cb-a93b-1cc9993abcc2	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	d6ea14f2-b5c2-4ba7-b9cf-37a49c400434	8	L	2025-09-07 17:00:00+00	172	7	5.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	10191521-ea93-4d3d-8220-483fbb66b29a	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	d6ea14f2-b5c2-4ba7-b9cf-37a49c400434	7	H	2025-09-07 17:00:00+00	172	7	5.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	0260610b-46ea-4ea0-8d9a-864427f99a9b	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	d6ea14f2-b5c2-4ba7-b9cf-37a49c400434	8	M	2025-09-07 17:00:00+00	172	7	5.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	a2d251ad-b949-4a62-95dc-db117928fd0b	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	d5e23358-9bcf-4a36-bd67-60364e49567a	22	M	2025-09-07 17:00:00+00	173	22	2.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	b6c67b80-4704-4847-9279-364fa561a697	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	d5e23358-9bcf-4a36-bd67-60364e49567a	22	M	2025-09-07 17:00:00+00	173	22	2.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	52e72dac-2118-45be-9933-4c2c210a0a6e	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	3436f7cb-d383-468b-b676-6e76b51d01c4	15	M	2025-09-07 17:00:00+00	174	15	3.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	1c914656-ee66-4ef1-be94-110092759e05	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	3436f7cb-d383-468b-b676-6e76b51d01c4	5	M	2025-09-07 17:00:00+00	174	15	3.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	74bb4fad-2677-476c-8932-0649e16fcf2e	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	f04d3d1d-2117-4f57-a099-0172487c75a8	2	M	2025-09-07 17:00:00+00	175	30	1.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	c6ae09e0-31fe-4950-8421-f008a75d93b5	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	f04d3d1d-2117-4f57-a099-0172487c75a8	30	H	2025-09-07 17:00:00+00	175	30	1.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	626a2e0f-2a78-4eee-9ead-954e7372595b	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	36496369-7298-4ef1-a622-6ef72558e109	20	M	2025-09-07 17:00:00+00	176	14	1.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	0170048e-1d2c-4ab5-aaac-5f24aa6a4def	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	e30cf41d-c05f-48b8-bd5b-674138779e39	24	L	2025-09-07 17:00:00+00	177	32	6.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	6f7694ee-cf1d-42be-8e5c-f6515ebfabf6	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	e30cf41d-c05f-48b8-bd5b-674138779e39	24	A	2025-09-07 17:00:00+00	177	32	6.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	645551ab-f5dc-4d97-b925-c7a9d21b684d	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	e30cf41d-c05f-48b8-bd5b-674138779e39	24	L	2025-09-07 17:00:00+00	177	32	6.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	b82e95f2-d87d-433a-b613-409726376876	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	718b520f-2d47-4a41-b108-d0ac9faa34aa	27	L	2025-09-07 17:00:00+00	178	27	2.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	3139ec38-8380-4356-924e-13743c42e48a	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	718b520f-2d47-4a41-b108-d0ac9faa34aa	25	L	2025-09-07 17:00:00+00	178	27	2.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	fb625825-ad90-4752-b45a-4527f3d8b820	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	718b520f-2d47-4a41-b108-d0ac9faa34aa	27	L	2025-09-07 17:00:00+00	178	27	2.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	bea920de-11e6-4e7d-912c-d819c8b38360	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	35fae26e-9b57-4a1a-b750-2ee208cf10ce	23	L	2025-09-07 17:00:00+00	179	1	6.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	e3861996-64d7-4e95-8042-406962ad678f	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	35fae26e-9b57-4a1a-b750-2ee208cf10ce	23	L	2025-09-07 17:00:00+00	179	1	6.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	2732dd3b-b993-4ffb-aa9a-fd97c3fdbe96	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	35fae26e-9b57-4a1a-b750-2ee208cf10ce	1	M	2025-09-07 17:00:00+00	179	1	6.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	fa3df1c5-e24f-4f1e-bd9c-87e10d66c2c7	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	ec0ec9d8-cc67-421e-803b-590bc9113f08	28	L	2025-09-07 20:05:00+00	180	28	1.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	58594ea2-6cd7-4517-8932-add786f1d508	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	ec0ec9d8-cc67-421e-803b-590bc9113f08	28	H	2025-09-07 20:05:00+00	180	28	1.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	cd381c83-a335-4b26-8d09-b8cf3824f71d	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	ec0ec9d8-cc67-421e-803b-590bc9113f08	28	M	2025-09-07 20:05:00+00	180	28	1.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	a6d7f14e-fbc7-495c-a5fa-e7ef892a00bf	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	3afdd6f6-f374-4f39-8c50-84dfebe25813	11	H	2025-09-07 20:25:00+00	181	12	2.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	96920b02-c12c-40b3-94cb-28c02f3e03c9	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	3afdd6f6-f374-4f39-8c50-84dfebe25813	11	M	2025-09-07 20:25:00+00	181	12	2.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	c0f1b49a-60e3-4059-bfbf-b07983b207ef	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	97f057d9-d748-49ae-aa3a-837b3c5297ca	10	M	2025-09-07 20:05:00+00	182	10	8.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	1738ad25-ba91-4ee1-a993-97e50cf328dd	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	97f057d9-d748-49ae-aa3a-837b3c5297ca	10	A	2025-09-07 20:05:00+00	182	10	8.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	86e43a8d-1913-4d5e-b07e-3a0c7c7c6253	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	103aa0f9-e2fb-40e9-b656-520220ddab95	19	L	2025-09-07 20:25:00+00	183	19	3	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	d928caa4-68c0-4e2b-84de-58e2fb73633b	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	103aa0f9-e2fb-40e9-b656-520220ddab95	19	M	2025-09-07 20:25:00+00	183	19	3	61183ed6-88ce-418b-8bdf-f16c57a350f7	ccfb5bd4-8676-4b8d-9aa1-77708829798d	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	103aa0f9-e2fb-40e9-b656-520220ddab95	19	L	2025-09-07 20:25:00+00	183	19	3	d8db1ea2-76a7-4cb1-8025-167bef10c724	2966313e-148f-4da5-9975-72fe533d3283	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	cddd40f9-a5e9-432d-8bfb-719361eab23b	4	L	2025-09-08 00:20:00+00	184	3	1.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	9623aaef-82c8-46c1-a287-74108dac448c	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	cddd40f9-a5e9-432d-8bfb-719361eab23b	3	M	2025-09-08 00:20:00+00	184	3	1.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	7d4ac4b7-d041-4571-8915-2229ec3f85e6	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	cddd40f9-a5e9-432d-8bfb-719361eab23b	3	L	2025-09-08 00:20:00+00	184	3	1.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	661eb3b1-9aff-4f15-806a-0851d8e83440	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	b6e60bfc-587b-4409-b2e6-7dd034f8cbc1	21	L	2025-09-09 00:15:00+00	185	21	1.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	e56d6b31-4703-413b-9d09-9e14bb62e12a	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	b6e60bfc-587b-4409-b2e6-7dd034f8cbc1	6	M	2025-09-09 00:15:00+00	185	21	1.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	0136a31e-056b-4b0b-858d-bfb2ebfabf8a	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	3cd1d025-e2d8-463e-80ef-6385fc746582	14	M	2025-09-14 12:43:07.167995+00	60	10	2.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	71accfc5-2932-4166-b1e6-bc3be9bb6a1e	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	b42650fe-fa28-4feb-98d6-622cffa6eb2e	16	M	2025-09-14 12:43:18.291378+00	61	26	1.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	b81c8004-0175-4637-9c89-189eea15913b	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	abd39ca3-bedd-4a14-942c-1871e3e9a85b	2	L	2025-09-14 12:43:35.136281+00	62	21	3.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	3bc51ccb-a746-4364-97bc-cb51e0cbe300	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	b0a3899d-dd50-487c-b759-826132a5af7d	13	L	2025-09-14 12:43:48.610901+00	63	13	2.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	2d3850c9-bfb9-401c-8306-7911cd8d3722	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	105ee53e-1599-447f-8df2-04a8f0e03d2e	17	M	2025-09-14 12:43:55.294612+00	64	18	3	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	a9adde81-6286-4916-9ac7-72214b4fc4cd	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	2954f2b9-b9ae-4d88-8c86-1be1a49f6f8a	12	M	2025-09-21 14:13:18.937088+00	68	12	7.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	0d9acd12-b31c-4100-8c99-e0957dbae8bc	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	67abe3aa-726e-41ef-baeb-b1d0bbd94e2f	27	M	2025-09-21 14:13:22.169027+00	71	27	1.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	4fb951b7-5cc1-4b70-8bf2-a1fbfae4d1cb	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	080e3432-5c2c-4228-8de9-48845f5b826d	14	M	2025-09-21 14:13:25.951631+00	73	14	4.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	bf9950d6-ba9e-4212-8beb-6aaddfad094d	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	0ba7b515-e8f9-4a04-8790-990094e4c9cf	18	M	2025-09-21 14:13:44.546192+00	75	18	3	d8db1ea2-76a7-4cb1-8025-167bef10c724	d3c21858-098c-4bc8-8415-50cd44d0adb7	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	31e6b9ac-abc1-402e-bed5-2961e9bc8a02	9	H	2025-09-21 14:13:52.315003+00	77	9	1.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	640219fb-7530-4018-8b4d-5135fa1420f0	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	b3236d16-a2ac-49f8-97f9-347a9d64c8d1	24	L	2025-09-21 14:14:03.238873+00	79	16	5.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	be4343b1-cc1c-4dbe-9fda-cb1c2b9eee49	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	5635fb7e-2185-479c-90b1-b46de7a4f4b3	5	M	2025-09-21 14:22:46.769802+00	66	2	4.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	20664859-89d2-4ebf-af2b-d29a34162b4b	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	0318ac4a-51fa-4197-9a58-d5a066c5c7cd	21	M	2025-09-21 14:25:40.74369+00	67	21	3	61183ed6-88ce-418b-8bdf-f16c57a350f7	ccf1b5db-e2f1-4f18-afed-2d7fbce7c044	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	67abe3aa-726e-41ef-baeb-b1d0bbd94e2f	22	M	2025-09-21 14:25:59.84045+00	71	27	1.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	cc898777-1d62-42be-b092-d4b8627c92bd	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	080e3432-5c2c-4228-8de9-48845f5b826d	31	M	2025-09-21 14:26:12.802075+00	73	14	4.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	b405de1c-b980-43c5-aa59-1952cc5c729f	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	0ba7b515-e8f9-4a04-8790-990094e4c9cf	18	H	2025-09-21 14:26:23.473279+00	75	18	3	61183ed6-88ce-418b-8bdf-f16c57a350f7	68e65c43-55e9-4bb0-86ed-6d04dbbc845b	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	dc820270-eba7-46bf-b0ea-a266032ff812	23	M	2025-09-21 14:26:31.232315+00	76	29	7.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	96d67b65-2212-4dff-8bca-7d5a6ffa8d3a	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	509947e1-c9f4-4dea-869e-18f0ae6560b4	1	H	2025-09-21 14:26:45.264761+00	78	28	2.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	de03f07c-3f06-48a8-abee-7fd8e8cca4d1	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	b3236d16-a2ac-49f8-97f9-347a9d64c8d1	24	H	2025-09-21 14:26:48.271489+00	79	16	5.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	b8d17748-2b87-4c9b-b3d4-b7a3effbc04d	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	6e913449-02a1-41ef-9139-55aab1625913	13	L	2025-09-21 14:27:02.402635+00	69	15	1.5	b75858d9-3f6f-46b7-be49-6884b28493f6	de0faff2-057d-4782-b639-627ecc403709	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	67abe3aa-726e-41ef-baeb-b1d0bbd94e2f	22	L	2025-09-21 14:27:20.391879+00	71	27	1.5	b75858d9-3f6f-46b7-be49-6884b28493f6	0d014c92-a342-44fb-955d-8d9c3a7c878f	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	080e3432-5c2c-4228-8de9-48845f5b826d	31	L	2025-09-21 14:28:29.255718+00	73	14	4.5	b75858d9-3f6f-46b7-be49-6884b28493f6	b9c2027f-4535-4aad-b50a-afca36d63df6	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	0ba7b515-e8f9-4a04-8790-990094e4c9cf	10	L	2025-09-21 14:29:11.750434+00	75	18	3	b75858d9-3f6f-46b7-be49-6884b28493f6	bde61916-3dfe-4197-8ee0-e811f04e0735	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	509947e1-c9f4-4dea-869e-18f0ae6560b4	28	M	2025-09-21 14:30:06.296324+00	78	28	2.5	b75858d9-3f6f-46b7-be49-6884b28493f6	6bc1073e-746c-4068-a906-c03c8cf9ff5e	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	5635fb7e-2185-479c-90b1-b46de7a4f4b3	5	L	2025-09-21 16:37:48.157456+00	66	2	4.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	5bdc0b7f-12e2-48fb-8454-6c937e4c8085	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	6e913449-02a1-41ef-9139-55aab1625913	15	M	2025-09-21 16:38:14.367342+00	69	15	1.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	109b4589-6d9b-43bd-a196-749e4595eb11	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	b92f4877-3642-4dad-8a58-cbbc33acaa27	30	M	2025-09-21 16:38:21.283343+00	72	30	6.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	881f11e1-220e-4b66-9349-ac55e02b83e5	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	1211281f-ad14-48b6-86e4-a4eb98d667d0	19	M	2025-09-21 16:38:29.478984+00	74	26	3.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	e2acbe40-4c0a-4263-9208-f447ca4572b6	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	dc820270-eba7-46bf-b0ea-a266032ff812	29	L	2025-09-21 16:38:41.536664+00	76	29	7.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	2a16b613-4173-4063-931b-858a884cf69a	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	0318ac4a-51fa-4197-9a58-d5a066c5c7cd	21	M	2025-09-21 16:38:54.729291+00	67	21	3	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	08de88e7-75c8-43dd-8cb7-4107b6c8f6a1	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	509947e1-c9f4-4dea-869e-18f0ae6560b4	1	M	2025-09-21 16:39:06.488809+00	78	28	2.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	162cc64f-0e0b-4f38-9a2d-a624ee6d11c2	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	a6646dac-f8d6-473f-96fc-0e711dd92011	11	M	2025-09-21 16:39:17.314015+00	80	3	5.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	8790c2ad-db15-4580-a146-d6c1496bf3e6	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	a6646dac-f8d6-473f-96fc-0e711dd92011	3	M	2025-09-22 23:51:38.612142+00	80	3	4.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	aabbe292-b1b3-44e0-bccc-839100593016	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	242131ad-16bf-4fd6-8e5e-65b6d2e79cf1	29	M	2025-09-25 21:40:46.649594+00	117	29	1.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	4b501f55-94e6-4c5e-956a-514ab0bffcd7	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	242131ad-16bf-4fd6-8e5e-65b6d2e79cf1	29	M	2025-09-25 22:52:18.17347+00	117	29	1.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	b69fab7c-c675-49b3-8226-bc9fed0464f3	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	7e68fe65-8ae9-4e71-ac41-ae6b9a3a7d62	32	M	2025-09-12 00:16:00+00	154	12	3.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	8ee0618b-8cc4-47bc-bfbb-e0f8f027fd19	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	13a5b004-d94d-4fef-9586-6a0af5dfedec	27	M	2025-09-28 12:12:36.013422+00	118	21	2.5	93abda42-cf85-4c5f-bd90-81210369b2dc	5a87f3f9-7864-4c71-9638-1912fa969229	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	8417d24a-a09d-4f23-ab21-40f016ed3bd3	11	M	2025-09-28 12:13:40.529489+00	119	11	9.5	93abda42-cf85-4c5f-bd90-81210369b2dc	aa9cc460-6def-49d1-b0e2-38e061beb7fb	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	9b3c55d8-73f8-4a27-9f17-9d1d9fbd9350	30	H	2025-09-28 12:14:05.938439+00	125	26	3.5	93abda42-cf85-4c5f-bd90-81210369b2dc	80ca4b83-bf77-4137-b78c-37f351b87585	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	7d2cd926-d87c-49a2-ac4a-75992298fb33	14	L	2025-09-28 12:14:20.353177+00	126	19	3.5	93abda42-cf85-4c5f-bd90-81210369b2dc	b8cc1852-f97b-44ad-a6fe-1afd54696915	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	8c1fa576-2d49-4e8a-962d-259057938461	6	H	2025-09-28 12:14:36.903646+00	129	17	1.5	93abda42-cf85-4c5f-bd90-81210369b2dc	04afee6f-c49e-43a8-92b7-217c6a90ae44	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	2b45efe0-31db-4e09-868e-5ab5549e0b0a	32	H	2025-09-28 14:09:05.296901+00	120	2	2.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	b6c45821-5614-4cfc-8089-f30f8a77ced1	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	b0f2ec20-f691-43a1-a91b-549cdde8abd4	22	L	2025-09-28 14:28:27.99947+00	122	22	5.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	d09b4062-869f-4abe-bb14-222b64302d1e	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	bc9e35d8-20fa-44b4-be20-81e6c19c72e1	4	L	2025-09-28 14:40:02.123682+00	186	4	14.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	11e8df81-5dbd-4398-ae96-930fa0f070f0	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	7d2cd926-d87c-49a2-ac4a-75992298fb33	19	M	2025-09-28 14:40:38.768513+00	126	19	3.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	230db018-2d72-4de9-9127-5c39930212e3	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	8c1fa576-2d49-4e8a-962d-259057938461	6	M	2025-09-28 14:40:59.162698+00	129	17	1.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	ffbe13f5-5f1d-42db-8df5-568df4ef01d0	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	b0f2ec20-f691-43a1-a91b-549cdde8abd4	5	M	2025-09-28 14:53:19.909124+00	122	22	5.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	0ebe0503-f980-4644-9f8d-63df92e4678d	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	49a0b7ea-6fc3-45d1-848a-6b0e079f13a2	18	M	2025-09-28 14:53:24.007878+00	124	18	6.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	5104530e-e7c7-4887-9fae-82b8e695b85b	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	8c1fa576-2d49-4e8a-962d-259057938461	17	L	2025-09-28 14:53:41.595549+00	129	17	1.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	cdf828bd-7395-4dda-8fc0-fe2c7c50e6a0	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	10340ef1-48a2-48c8-a50a-bb3d0eaa35fe	7	H	2025-09-28 14:53:54.797539+00	132	10	7.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	958da5b5-647c-4bc9-b8d5-0a99ef50e81d	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	8c1fa576-2d49-4e8a-962d-259057938461	17	L	2025-09-28 15:11:40.978693+00	129	17	1.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	d0fed4d0-8fc0-445b-a9d4-e393360fdb5f	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	b0f2ec20-f691-43a1-a91b-549cdde8abd4	5	L	2025-09-28 15:27:44.148494+00	122	22	5.5	b75858d9-3f6f-46b7-be49-6884b28493f6	fd2cdc8d-e3c3-4726-93ab-9f1ced69a003	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	ca15c000-5210-4eb0-9793-bda649720d4d	31	M	2025-09-28 15:28:05.297646+00	123	13	7.5	b75858d9-3f6f-46b7-be49-6884b28493f6	7ca52994-dad7-433e-8ddf-8ba3aa9373d0	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	7d2cd926-d87c-49a2-ac4a-75992298fb33	19	H	2025-09-28 15:29:23.015496+00	126	19	3.5	b75858d9-3f6f-46b7-be49-6884b28493f6	8bd77f4e-d580-4364-8280-42b8afd11ea6	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	8c1fa576-2d49-4e8a-962d-259057938461	6	L	2025-09-28 15:29:46.317346+00	129	17	1.5	b75858d9-3f6f-46b7-be49-6884b28493f6	d9e1c959-6c90-4c8a-acd0-891bdcb1a23e	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	6d3724f1-646a-4345-9f21-6f0b4932664c	28	L	2025-10-02 19:58:03.778164+00	201	19	7	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	eeced433-4d83-47f3-8a6c-ebb76b97ffec	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	6d3724f1-646a-4345-9f21-6f0b4932664c	19	H	2025-10-03 00:11:01.266422+00	202	19	8.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	63774d26-e7b0-4c71-b150-628771971f09	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	6a64a55f-f8da-41e8-a1ce-50a485f53127	5	H	2025-10-03 00:11:28.182537+00	190	20	1.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	4c122b5d-58ac-4950-a6ae-f8c1fabe12bf	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	ebba52ce-db32-4ea8-909d-eaf8c90105be	14	M	2025-10-03 00:11:49.732756+00	193	14	6.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	ced2f8cf-f150-47db-a4d1-9c6460c0c2dd	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	b78e5b52-7747-43a0-9bd4-020c7223b8e3	3	H	2025-10-03 00:11:59.61645+00	189	13	1.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	ee8c9ed7-b616-48f6-a031-b3629857d020	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	58b00d24-143e-48a2-a202-07a1b3975fc3	31	L	2025-10-03 00:12:16.877336+00	195	1	8.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	1e0e5ab6-dd2b-4390-beb1-2512912d70a5	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	c9bc16f7-9a25-429d-98f3-5c7a3ebc8414	18	H	2025-10-03 00:12:28.605705+00	198	18	2.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	652810f6-869a-4a52-a1f4-1d99f36334ac	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	d2ac537e-3d10-4662-b6f5-836d8255ffab	15	M	2025-10-03 00:12:40.087295+00	200	16	3	61183ed6-88ce-418b-8bdf-f16c57a350f7	156dacbd-679e-47f4-884e-5a394a5bb8b2	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	fe4ccad3-2b0e-46f8-b2eb-c197e204cd5c	21	L	2025-10-04 14:39:24.78959+00	188	21	3.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	9da90617-e655-4702-85e1-aaa22866cc6b	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	fe4ccad3-2b0e-46f8-b2eb-c197e204cd5c	21	L	2025-10-05 01:36:33.800604+00	188	21	3.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	0852face-10b6-4b2f-9cb4-9588c5625ae4	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	f27eeec6-0e15-4c22-81c6-5c4b143adfe8	32	M	2025-09-21 14:08:27.609537+00	70	32	3	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	f3e20be8-13e1-4c4f-b023-b74d25df2985	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	2954f2b9-b9ae-4d88-8c86-1be1a49f6f8a	12	M	2025-09-21 14:09:01.469429+00	68	12	7.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	c97b5abc-b240-4647-8a0a-6669debf0a20	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	67abe3aa-726e-41ef-baeb-b1d0bbd94e2f	27	M	2025-09-21 14:09:11.727833+00	71	27	1.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	ae01da17-a2c8-4b70-8a88-ce8d763b40d5	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	080e3432-5c2c-4228-8de9-48845f5b826d	14	M	2025-09-21 14:09:28.101766+00	73	14	4.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	8f15e81c-b7bb-42b4-a14b-2b8bf99927ff	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	0ba7b515-e8f9-4a04-8790-990094e4c9cf	18	M	2025-09-21 14:09:43.831931+00	75	18	3	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	ad79a75a-7561-485e-b4da-e46f023486cd	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	b3236d16-a2ac-49f8-97f9-347a9d64c8d1	16	M	2025-09-21 14:10:14.650792+00	79	16	5.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	77aceca1-a79f-48ae-a65a-620e25291432	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	5635fb7e-2185-479c-90b1-b46de7a4f4b3	2	M	2025-09-21 14:10:38.740003+00	66	2	4.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	5a3831fb-cc71-4332-8a0b-b253fe9ec056	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	5635fb7e-2185-479c-90b1-b46de7a4f4b3	2	H	2025-09-21 14:17:30.429061+00	66	2	4.5	93abda42-cf85-4c5f-bd90-81210369b2dc	d7dfffb3-a6ab-4457-8d44-6a9aacb28660	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	0318ac4a-51fa-4197-9a58-d5a066c5c7cd	7	L	2025-09-21 14:17:38.639688+00	67	21	3	93abda42-cf85-4c5f-bd90-81210369b2dc	de4aebfb-29bb-4c4d-84c3-f5d4f3a868a1	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	6e913449-02a1-41ef-9139-55aab1625913	15	L	2025-09-21 14:17:49.512871+00	69	15	1.5	93abda42-cf85-4c5f-bd90-81210369b2dc	9ad38a18-4ef7-41b7-a561-edac86eb2709	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	b92f4877-3642-4dad-8a58-cbbc33acaa27	25	L	2025-09-21 14:17:58.808987+00	72	30	6.5	93abda42-cf85-4c5f-bd90-81210369b2dc	970460c5-2d62-4e9e-a24c-3d3f8f878418	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	1211281f-ad14-48b6-86e4-a4eb98d667d0	26	M	2025-09-21 14:18:14.308269+00	74	26	3.5	93abda42-cf85-4c5f-bd90-81210369b2dc	ee3ccee8-8e6d-43c8-ab8c-d66f89820a32	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	dc820270-eba7-46bf-b0ea-a266032ff812	23	H	2025-09-21 14:18:25.086649+00	76	29	7.5	93abda42-cf85-4c5f-bd90-81210369b2dc	34c9e698-d388-430c-bc2b-26e7f3d2d707	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	b0a3899d-dd50-487c-b759-826132a5af7d	13	L	2025-09-15 23:01:00+00	168	13	2.5	b75858d9-3f6f-46b7-be49-6884b28493f6	ab9fa15c-3bb7-42a1-96ec-25168554ab72	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	105ee53e-1599-447f-8df2-04a8f0e03d2e	18	M	2025-09-16 02:00:00+00	169	18	3	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	bf99edfb-c614-49b8-8a85-3c8bf1d17cb8	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	105ee53e-1599-447f-8df2-04a8f0e03d2e	18	A	2025-09-16 02:00:00+00	169	18	3	61183ed6-88ce-418b-8bdf-f16c57a350f7	551c0aa7-a738-43d2-baf9-b7e46190ee42	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	105ee53e-1599-447f-8df2-04a8f0e03d2e	17	M	2025-09-16 02:00:00+00	169	18	3	d8db1ea2-76a7-4cb1-8025-167bef10c724	92a35638-0750-4bd5-a4db-eb55fe9295b5	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	105ee53e-1599-447f-8df2-04a8f0e03d2e	18	H	2025-09-16 02:00:00+00	169	18	3	b75858d9-3f6f-46b7-be49-6884b28493f6	c88c90bc-04b5-48c3-9f08-c63586149be4	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	63be1bd1-8401-4d9c-850a-3c48a0aa2542	26	M	2025-09-05 00:22:00+00	170	26	8	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	82d5ac6b-8dfb-4a10-b984-f61f1ea52d2d	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	63be1bd1-8401-4d9c-850a-3c48a0aa2542	26	L	2025-09-05 00:22:00+00	170	26	8	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	04736120-c6bc-4a00-a5e7-47a5e3c51466	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	63be1bd1-8401-4d9c-850a-3c48a0aa2542	26	M	2025-09-05 00:22:00+00	170	26	8	61183ed6-88ce-418b-8bdf-f16c57a350f7	c49fd9f8-8e15-46a9-876e-bb5173d88503	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	63be1bd1-8401-4d9c-850a-3c48a0aa2542	26	L	2025-09-05 00:22:00+00	170	26	8	b75858d9-3f6f-46b7-be49-6884b28493f6	50c41ab1-e800-4058-9caf-ba07f5654c15	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	34aa22d9-a08f-4527-9c82-f7bb72317a90	16	L	2025-09-06 00:00:00+00	171	16	3	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	2e34c30b-f43e-40de-a31c-632014aab331	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	34aa22d9-a08f-4527-9c82-f7bb72317a90	16	L	2025-09-06 00:00:00+00	171	16	3	93abda42-cf85-4c5f-bd90-81210369b2dc	febdebbc-0f54-4db8-9a71-59b7748f61cf	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	34aa22d9-a08f-4527-9c82-f7bb72317a90	18	M	2025-09-06 00:00:00+00	171	16	3	61183ed6-88ce-418b-8bdf-f16c57a350f7	f8b8f33a-f9c2-403d-a51f-eb2f57e38e12	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	34aa22d9-a08f-4527-9c82-f7bb72317a90	16	M	2025-09-06 00:00:00+00	171	16	3	b75858d9-3f6f-46b7-be49-6884b28493f6	7007e8cc-1839-404e-8e6b-b4e871da3f87	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	d6ea14f2-b5c2-4ba7-b9cf-37a49c400434	7	M	2025-09-07 17:00:00+00	172	7	5.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	5c503377-cabc-4f0c-a302-52526aa7e035	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	d6ea14f2-b5c2-4ba7-b9cf-37a49c400434	8	L	2025-09-07 17:00:00+00	172	7	5.5	93abda42-cf85-4c5f-bd90-81210369b2dc	3713b5f6-e6cf-4909-888d-d23cdc9d92d3	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	d6ea14f2-b5c2-4ba7-b9cf-37a49c400434	8	L	2025-09-07 17:00:00+00	172	7	5.5	b75858d9-3f6f-46b7-be49-6884b28493f6	6007d87b-7a83-4ae1-9c29-dad7574d8c83	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	d5e23358-9bcf-4a36-bd67-60364e49567a	22	L	2025-09-07 17:00:00+00	173	22	2.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	de1d44f9-9696-4c50-a1ec-cc44e3965abc	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	d5e23358-9bcf-4a36-bd67-60364e49567a	17	M	2025-09-07 17:00:00+00	173	22	2.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	8a6a9324-f9c9-49d9-8e44-6cc7af2e5131	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	d5e23358-9bcf-4a36-bd67-60364e49567a	22	M	2025-09-07 17:00:00+00	173	22	2.5	93abda42-cf85-4c5f-bd90-81210369b2dc	e5f43835-08f3-4e6c-8c1a-75b964d5aba9	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	d5e23358-9bcf-4a36-bd67-60364e49567a	22	L	2025-09-07 17:00:00+00	173	22	2.5	b75858d9-3f6f-46b7-be49-6884b28493f6	8f0007d9-c4c3-454c-ac3d-0101bc8ebcb8	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	3436f7cb-d383-468b-b676-6e76b51d01c4	5	M	2025-09-07 17:00:00+00	174	15	3.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	cd860079-e8e1-4fb7-a531-8955be373128	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	3436f7cb-d383-468b-b676-6e76b51d01c4	15	L	2025-09-07 17:00:00+00	174	15	3.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	9584afa7-89dd-47e0-a284-eb44cfb238d1	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	3436f7cb-d383-468b-b676-6e76b51d01c4	15	M	2025-09-07 17:00:00+00	174	15	3.5	93abda42-cf85-4c5f-bd90-81210369b2dc	4089845a-1819-44ab-a8d1-6833ee5bdde9	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	f04d3d1d-2117-4f57-a099-0172487c75a8	2	L	2025-09-07 17:00:00+00	175	30	1.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	067fefa2-aa28-4152-a690-95e3579244a9	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	f04d3d1d-2117-4f57-a099-0172487c75a8	2	M	2025-09-07 17:00:00+00	175	30	1.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	52c1b335-6e51-4a9b-b3e1-13e3f9ddabe3	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	f04d3d1d-2117-4f57-a099-0172487c75a8	30	M	2025-09-07 17:00:00+00	175	30	1.5	93abda42-cf85-4c5f-bd90-81210369b2dc	e18175c5-56ce-4648-87fd-759ebd4a9455	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	f04d3d1d-2117-4f57-a099-0172487c75a8	30	M	2025-09-07 17:00:00+00	175	30	1.5	b75858d9-3f6f-46b7-be49-6884b28493f6	472777d7-5de5-40e0-8942-bc4ecee23c09	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	36496369-7298-4ef1-a622-6ef72558e109	20	L	2025-09-07 17:00:00+00	176	14	1.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	2b0b06e3-331c-459e-938e-7eacc3d7ae78	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	36496369-7298-4ef1-a622-6ef72558e109	20	M	2025-09-07 17:00:00+00	176	14	1.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	dcc72f9e-8a67-4f1d-910f-50068c249df8	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	36496369-7298-4ef1-a622-6ef72558e109	14	M	2025-09-07 17:00:00+00	176	14	1.5	93abda42-cf85-4c5f-bd90-81210369b2dc	e55913b6-e3af-40d6-8002-bb36f185e8f4	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	36496369-7298-4ef1-a622-6ef72558e109	14	L	2025-09-07 17:00:00+00	176	14	1.5	b75858d9-3f6f-46b7-be49-6884b28493f6	8f2e0a16-50cc-4120-960e-30abce0cad6d	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	e30cf41d-c05f-48b8-bd5b-674138779e39	32	M	2025-09-07 17:00:00+00	177	32	6.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	98502f63-f1a2-4c3c-8d32-ef7f1bcf3b33	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	e30cf41d-c05f-48b8-bd5b-674138779e39	32	M	2025-09-07 17:00:00+00	177	32	6.5	93abda42-cf85-4c5f-bd90-81210369b2dc	d6510a63-3ecd-416d-8992-b9f103c4165b	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	e30cf41d-c05f-48b8-bd5b-674138779e39	24	L	2025-09-07 17:00:00+00	177	32	6.5	b75858d9-3f6f-46b7-be49-6884b28493f6	3ecccf3a-4fc6-4524-8463-8fc45ac63dd3	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	718b520f-2d47-4a41-b108-d0ac9faa34aa	27	L	2025-09-07 17:00:00+00	178	27	2.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	c474d6be-e980-4ce3-afb9-d3b4ecbad72d	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	718b520f-2d47-4a41-b108-d0ac9faa34aa	27	L	2025-09-07 17:00:00+00	178	27	2.5	93abda42-cf85-4c5f-bd90-81210369b2dc	4e08b8de-b84a-4c12-83ce-1e374c4e8200	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	718b520f-2d47-4a41-b108-d0ac9faa34aa	27	M	2025-09-07 17:00:00+00	178	27	2.5	b75858d9-3f6f-46b7-be49-6884b28493f6	4e8340dc-6bb5-40a9-be35-4cfbdd928b62	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	35fae26e-9b57-4a1a-b750-2ee208cf10ce	1	M	2025-09-07 17:00:00+00	179	1	6.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	aba6fe64-bc10-47af-b910-3803b18f8907	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	35fae26e-9b57-4a1a-b750-2ee208cf10ce	23	L	2025-09-07 17:00:00+00	179	1	6.5	93abda42-cf85-4c5f-bd90-81210369b2dc	80cb5d8e-9da9-46d2-acfa-681ac19e5633	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	35fae26e-9b57-4a1a-b750-2ee208cf10ce	1	L	2025-09-07 17:00:00+00	179	1	6.5	b75858d9-3f6f-46b7-be49-6884b28493f6	3aec86ee-8f66-4815-b803-c0d64e36b74a	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	ec0ec9d8-cc67-421e-803b-590bc9113f08	28	M	2025-09-07 20:05:00+00	180	28	1.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	8492a5fb-e9b7-476d-9296-030084eafa79	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	ec0ec9d8-cc67-421e-803b-590bc9113f08	28	M	2025-09-07 20:05:00+00	180	28	1.5	93abda42-cf85-4c5f-bd90-81210369b2dc	94be3df8-4479-484e-8497-c4aaf6e8c0a6	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	ec0ec9d8-cc67-421e-803b-590bc9113f08	29	L	2025-09-07 20:05:00+00	180	28	1.5	b75858d9-3f6f-46b7-be49-6884b28493f6	57b8b755-e277-4a86-9c33-3a45aac61bed	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	3afdd6f6-f374-4f39-8c50-84dfebe25813	11	L	2025-09-07 20:25:00+00	181	12	2.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	5f2637b2-b9b8-4954-b115-ae4d8d60f5f4	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	3afdd6f6-f374-4f39-8c50-84dfebe25813	12	M	2025-09-07 20:25:00+00	181	12	2.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	7625ca2a-6a61-40a1-ac74-a2201004d7bd	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	3afdd6f6-f374-4f39-8c50-84dfebe25813	11	H	2025-09-07 20:25:00+00	181	12	2.5	93abda42-cf85-4c5f-bd90-81210369b2dc	511f28f3-5b42-4561-aaea-20310252b315	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	3afdd6f6-f374-4f39-8c50-84dfebe25813	12	M	2025-09-07 20:25:00+00	181	12	2.5	b75858d9-3f6f-46b7-be49-6884b28493f6	5096baf5-4651-47e9-a436-ef3cfb695571	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	97f057d9-d748-49ae-aa3a-837b3c5297ca	10	M	2025-09-07 20:05:00+00	182	10	8.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	21362822-59e4-4773-832c-7026d37ae2b3	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	97f057d9-d748-49ae-aa3a-837b3c5297ca	10	M	2025-09-07 20:05:00+00	182	10	8.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	39d49d3f-8702-4e6c-94a9-908f49dbc874	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	97f057d9-d748-49ae-aa3a-837b3c5297ca	31	M	2025-09-07 20:05:00+00	182	10	8.5	93abda42-cf85-4c5f-bd90-81210369b2dc	505a71c2-7632-4342-ab3a-21ffaaa30506	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	7e68fe65-8ae9-4e71-ac41-ae6b9a3a7d62	12	M	2025-09-12 00:16:00+00	154	12	3.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	16ed07ae-b510-44d4-9c78-2a814508cacf	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	7e68fe65-8ae9-4e71-ac41-ae6b9a3a7d62	32	M	2025-09-12 00:16:00+00	154	12	3.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	61337ae5-a193-486f-addf-3eb7b1dc436d	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	336dd0e8-7642-45af-a8a6-493dae1bedbc	8	M	2025-09-14 17:01:00+00	155	3	11.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	a910e0bc-85fc-4e4a-b300-37e2d6e9ba3a	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	336dd0e8-7642-45af-a8a6-493dae1bedbc	8	M	2025-09-14 17:01:00+00	155	3	11.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	fbfb8821-82ec-4a93-8073-6f10b61ad6df	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	336dd0e8-7642-45af-a8a6-493dae1bedbc	8	M	2025-09-14 17:01:00+00	155	3	11.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	eb17360a-475c-4a80-b660-3b69d3a3d84f	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	336dd0e8-7642-45af-a8a6-493dae1bedbc	8	L	2025-09-14 17:01:00+00	155	3	11.5	b75858d9-3f6f-46b7-be49-6884b28493f6	0131d4a3-55d4-4ade-becb-85c22513bb8d	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	49926afd-6329-4124-9846-7a044272ac54	19	H	2025-09-14 17:01:00+00	156	19	5.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	632956b2-2ee9-4a92-bd0f-dbe7c3939341	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	49926afd-6329-4124-9846-7a044272ac54	31	M	2025-09-14 17:01:00+00	156	19	5.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	83a695f4-aa52-415f-a2ba-c3c43473dc10	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	49926afd-6329-4124-9846-7a044272ac54	19	M	2025-09-14 17:01:00+00	156	19	5.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	d2b2e3bc-2a18-46c6-bc57-d39d7b56c11d	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	49926afd-6329-4124-9846-7a044272ac54	19	M	2025-09-14 17:01:00+00	156	19	5.5	b75858d9-3f6f-46b7-be49-6884b28493f6	7bac3160-d334-4cdd-ac4f-574c8a948483	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	5334cd67-c846-4303-b979-4636a885b1b6	11	L	2025-09-14 17:00:00+00	157	11	6.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	e39deb29-e9ff-40a9-b190-6b1167480ad1	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	5334cd67-c846-4303-b979-4636a885b1b6	11	L	2025-09-14 17:00:00+00	157	11	6.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	983a2aac-1f3c-439f-bc49-16bef23dffdf	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	5334cd67-c846-4303-b979-4636a885b1b6	6	M	2025-09-14 17:00:00+00	157	11	6.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	1b796b41-aa43-4507-aae6-2ba57ffac42b	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	5334cd67-c846-4303-b979-4636a885b1b6	11	H	2025-09-14 17:00:00+00	157	11	6.5	b75858d9-3f6f-46b7-be49-6884b28493f6	470a7a25-3142-4231-a504-fe0f2b525c26	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	fa733f3c-4b1a-442c-a331-8d2651040165	25	L	2025-09-14 17:01:00+00	158	4	6.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	7794db56-a138-4b81-8e6a-311eee9c9b74	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	fa733f3c-4b1a-442c-a331-8d2651040165	4	L	2025-09-14 17:01:00+00	158	4	6.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	513b01ce-1d14-4857-ba78-9b9f9459784a	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	fa733f3c-4b1a-442c-a331-8d2651040165	25	L	2025-09-14 17:01:00+00	158	4	6.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	779a2cda-31ca-4132-8cb0-82e2616a8636	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	fa733f3c-4b1a-442c-a331-8d2651040165	4	L	2025-09-14 17:01:00+00	158	4	6.5	b75858d9-3f6f-46b7-be49-6884b28493f6	f4f2b3c6-f8d3-456f-a61e-7957a0a3ce3c	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	3c511a07-f80a-4dc2-bc49-40a3fbe5ddb3	9	H	2025-09-14 17:00:00+00	159	9	4.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	682afdcd-4016-4d77-ba1c-3c1924d23336	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	3c511a07-f80a-4dc2-bc49-40a3fbe5ddb3	24	L	2025-09-14 17:00:00+00	159	9	4.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	97792588-1aa8-4e6a-9a9f-ffb8c78aa8c7	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	3c511a07-f80a-4dc2-bc49-40a3fbe5ddb3	9	H	2025-09-14 17:00:00+00	159	9	4.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	70f9b9b1-cffa-4c6a-ac8c-0a2911f753ed	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	3c511a07-f80a-4dc2-bc49-40a3fbe5ddb3	9	M	2025-09-14 17:00:00+00	159	9	4.5	b75858d9-3f6f-46b7-be49-6884b28493f6	6d9e9a64-4058-46f7-9e72-121c33764d9a	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	3ec70270-c7f5-42b0-9220-34405add51e7	28	M	2025-09-14 17:01:00+00	160	28	3	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	f09ae650-48b0-48b9-9cd1-570b7b6e823d	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	3ec70270-c7f5-42b0-9220-34405add51e7	28	M	2025-09-14 17:01:00+00	160	28	3	61183ed6-88ce-418b-8bdf-f16c57a350f7	b99b9335-cb81-43a9-91ec-fd7849f4f84f	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	3ec70270-c7f5-42b0-9220-34405add51e7	23	L	2025-09-14 17:01:00+00	160	28	3	d8db1ea2-76a7-4cb1-8025-167bef10c724	be671e68-efac-4af9-bc2d-82ab835fd6dc	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	3ec70270-c7f5-42b0-9220-34405add51e7	23	L	2025-09-14 17:01:00+00	160	28	3	b75858d9-3f6f-46b7-be49-6884b28493f6	e80f337b-b86a-4a22-a862-011330247a5e	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	a9ade8e0-8fb2-4c2b-917b-7191424388e7	22	M	2025-09-14 17:00:00+00	161	20	2.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	aa7e4f65-3b54-4246-9575-c8053b54e8bf	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	a9ade8e0-8fb2-4c2b-917b-7191424388e7	22	M	2025-09-14 17:00:00+00	161	20	2.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	f42b3e8c-4621-46d5-a438-7acaaa0f8cbb	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	a9ade8e0-8fb2-4c2b-917b-7191424388e7	22	M	2025-09-14 17:00:00+00	161	20	2.5	b75858d9-3f6f-46b7-be49-6884b28493f6	35e03366-388f-4d0a-9a7e-479131b07432	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	2c53b774-736f-410c-b671-9ec4f1493fbd	7	L	2025-09-14 17:00:00+00	162	7	3.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	8e357af2-c7ef-432c-a078-c31cdeb1c878	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	2c53b774-736f-410c-b671-9ec4f1493fbd	7	M	2025-09-14 17:00:00+00	162	7	3.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	6df2f915-085f-4998-9200-8c2b8c8e188b	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	2c53b774-736f-410c-b671-9ec4f1493fbd	15	M	2025-09-14 17:00:00+00	162	7	3.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	18810d72-75a6-4bf8-85b8-bfa6b3f733bb	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	2c53b774-736f-410c-b671-9ec4f1493fbd	7	M	2025-09-14 17:00:00+00	162	7	3.5	b75858d9-3f6f-46b7-be49-6884b28493f6	3b3feba4-23b5-4380-8fa6-8b756d929adc	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	01b3a495-1daf-4b24-99e2-a903e786b1be	27	M	2025-09-14 17:01:00+00	163	27	3	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	9121db51-f9d9-45c0-a9b8-311497904340	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	01b3a495-1daf-4b24-99e2-a903e786b1be	27	M	2025-09-14 17:01:00+00	163	27	3	61183ed6-88ce-418b-8bdf-f16c57a350f7	89061fc7-e8ff-437d-9de0-df27f5c5ab22	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	01b3a495-1daf-4b24-99e2-a903e786b1be	27	L	2025-09-14 17:01:00+00	163	27	3	d8db1ea2-76a7-4cb1-8025-167bef10c724	32d553b4-334e-47f1-96bf-09feb6bfee82	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	01b3a495-1daf-4b24-99e2-a903e786b1be	27	L	2025-09-14 17:01:00+00	163	27	3	b75858d9-3f6f-46b7-be49-6884b28493f6	7f3e97a5-cfc3-41a7-9390-101dea66ab70	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	3cd1d025-e2d8-463e-80ef-6385fc746582	10	M	2025-09-14 20:06:00+00	164	10	2.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	fdc878c7-52b5-44b9-a147-1e1ea2a49e08	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	3cd1d025-e2d8-463e-80ef-6385fc746582	10	M	2025-09-14 20:06:00+00	164	10	2.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	ef5291c5-29b4-43dd-9be3-6892887b2a3a	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	3cd1d025-e2d8-463e-80ef-6385fc746582	10	H	2025-09-14 20:06:00+00	164	10	2.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	80b50169-2cd8-42bc-a3fb-980536fa4005	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	3cd1d025-e2d8-463e-80ef-6385fc746582	10	H	2025-09-14 20:06:00+00	164	10	2.5	b75858d9-3f6f-46b7-be49-6884b28493f6	f54933f7-c56e-4aeb-93f1-1f2b3e54899b	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	fdd4448f-e730-4933-89a9-f4d40456b4d7	1	L	2025-09-14 20:05:00+00	165	1	6.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	1a04a19c-9181-44f4-9ae9-7cdc277d5d95	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	fdd4448f-e730-4933-89a9-f4d40456b4d7	1	H	2025-09-14 20:05:00+00	165	1	6.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	cab3acf8-e4d7-4f70-8aee-18d3f0ab057e	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	fdd4448f-e730-4933-89a9-f4d40456b4d7	5	L	2025-09-14 20:05:00+00	165	1	6.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	66986b9f-8293-42cf-8e06-a4f15e79550e	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	fdd4448f-e730-4933-89a9-f4d40456b4d7	5	L	2025-09-14 20:05:00+00	165	1	6.5	b75858d9-3f6f-46b7-be49-6884b28493f6	b54b9760-8543-44a0-9ab0-62d982c7c74b	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	b42650fe-fa28-4feb-98d6-622cffa6eb2e	26	L	2025-09-14 20:25:00+00	166	26	1.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	a3cd9621-132c-443e-a364-88ead447fe1e	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	b42650fe-fa28-4feb-98d6-622cffa6eb2e	26	H	2025-09-14 20:25:00+00	166	26	1.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	75457a91-875f-430a-80b5-ee8f59f27a53	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	b42650fe-fa28-4feb-98d6-622cffa6eb2e	26	M	2025-09-14 20:25:00+00	166	26	1.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	d0bf1c23-9261-434e-b9fa-0fa1367c1317	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	b42650fe-fa28-4feb-98d6-622cffa6eb2e	26	M	2025-09-14 20:25:00+00	166	26	1.5	b75858d9-3f6f-46b7-be49-6884b28493f6	9ecb4ca1-08b2-4062-813f-e3b0fe7a1a99	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	abd39ca3-bedd-4a14-942c-1871e3e9a85b	2	L	2025-09-15 00:20:00+00	167	21	3.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	cbef93b3-684d-4db5-830a-a6e7b635f3fa	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	abd39ca3-bedd-4a14-942c-1871e3e9a85b	2	M	2025-09-15 00:20:00+00	167	21	3.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	0ee0f02d-2c3a-4dea-8f3d-7eac3a052886	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	abd39ca3-bedd-4a14-942c-1871e3e9a85b	2	H	2025-09-15 00:20:00+00	167	21	3.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	678e8d8a-d8fd-4e96-8d77-fc7bbe7d7ade	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	abd39ca3-bedd-4a14-942c-1871e3e9a85b	21	L	2025-09-15 00:20:00+00	167	21	3.5	b75858d9-3f6f-46b7-be49-6884b28493f6	92624d76-6257-47fe-ae4b-017441e3e417	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	b0a3899d-dd50-487c-b759-826132a5af7d	30	M	2025-09-15 23:01:00+00	168	13	2.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	40af44ac-f686-46a2-b5b6-b909059465f8	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	97f057d9-d748-49ae-aa3a-837b3c5297ca	10	L	2025-09-07 20:05:00+00	182	10	8.5	b75858d9-3f6f-46b7-be49-6884b28493f6	4b6a12dd-e750-4e50-a512-d35232af8a92	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	103aa0f9-e2fb-40e9-b656-520220ddab95	19	M	2025-09-07 20:25:00+00	183	19	3	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	8c9ae839-4329-4cef-908d-629e2a2b7633	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	103aa0f9-e2fb-40e9-b656-520220ddab95	19	L	2025-09-07 20:25:00+00	183	19	3	93abda42-cf85-4c5f-bd90-81210369b2dc	3b02494a-31d4-48c9-ba80-ae621ccf2826	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	cddd40f9-a5e9-432d-8bfb-719361eab23b	4	H	2025-09-08 00:20:00+00	184	3	1.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	6b98e7d6-6b8f-421e-bf6c-0cd4960f83ca	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	cddd40f9-a5e9-432d-8bfb-719361eab23b	4	M	2025-09-08 00:20:00+00	184	3	1.5	93abda42-cf85-4c5f-bd90-81210369b2dc	fabf89e6-e7a3-441e-9f5b-9cb5428385a0	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	cddd40f9-a5e9-432d-8bfb-719361eab23b	4	M	2025-09-08 00:20:00+00	184	3	1.5	b75858d9-3f6f-46b7-be49-6884b28493f6	41fd9928-a61b-450b-bac8-2269456b8e30	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	b6e60bfc-587b-4409-b2e6-7dd034f8cbc1	6	M	2025-09-09 00:15:00+00	185	21	1.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	90936848-0554-4ff4-b38a-91140033e31a	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	b6e60bfc-587b-4409-b2e6-7dd034f8cbc1	6	M	2025-09-09 00:15:00+00	185	21	1.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	9d841127-6c15-47eb-8eaa-2f5b9676bbcb	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	250c968a-cb9d-4060-a785-2dfbce12c181	20	L	2025-09-19 00:15:00+00	65	4	11.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	3efdbafd-4d74-4261-9c72-e312227db40b	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	250c968a-cb9d-4060-a785-2dfbce12c181	4	M	2025-09-19 00:15:00+00	65	4	11.5	93abda42-cf85-4c5f-bd90-81210369b2dc	a358fc57-9a15-45d1-9a21-6f6396b67464	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	250c968a-cb9d-4060-a785-2dfbce12c181	4	L	2025-09-19 00:15:00+00	65	4	11.5	b75858d9-3f6f-46b7-be49-6884b28493f6	a1a2ef46-c5c9-416e-b849-8943ee264ae8	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	250c968a-cb9d-4060-a785-2dfbce12c181	20	M	2025-09-19 00:15:00+00	65	4	11.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	b5a38f7f-228c-46d5-8de4-b6c8a81edb38	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	250c968a-cb9d-4060-a785-2dfbce12c181	4	A	2025-09-19 00:15:00+00	65	4	11.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	6580265c-4248-4f75-845f-99a6b6a48e1b	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	0318ac4a-51fa-4197-9a58-d5a066c5c7cd	21	L	2025-09-21 14:08:47.658698+00	67	21	3	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	3f075333-4c0b-43e5-b547-9ce38f264199	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	6e913449-02a1-41ef-9139-55aab1625913	13	L	2025-09-21 14:09:07.996137+00	69	15	1.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	8f9844b0-0714-44f7-9bd3-4d550c990d5d	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	b92f4877-3642-4dad-8a58-cbbc33acaa27	30	M	2025-09-21 14:09:17.950457+00	72	30	6.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	94fd00ed-150e-450b-988a-e6dc2afb98f2	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	1211281f-ad14-48b6-86e4-a4eb98d667d0	19	M	2025-09-21 14:09:36.82593+00	74	26	3.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	9ebb43ac-606b-4cc5-97eb-7e52c8d4bca4	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	dc820270-eba7-46bf-b0ea-a266032ff812	29	L	2025-09-21 14:09:50.091557+00	76	29	7.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	87b5e1c4-3241-4303-abd3-56efdb267ab8	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	509947e1-c9f4-4dea-869e-18f0ae6560b4	1	L	2025-09-21 14:10:10.382697+00	78	28	2.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	f566a1ba-72a7-49fe-86e0-cbcda089b640	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	f27eeec6-0e15-4c22-81c6-5c4b143adfe8	32	H	2025-09-21 14:17:33.526637+00	70	32	3	93abda42-cf85-4c5f-bd90-81210369b2dc	508989e0-3e81-485f-b689-090aa107cfbe	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	2954f2b9-b9ae-4d88-8c86-1be1a49f6f8a	12	M	2025-09-21 14:17:42.773031+00	68	12	7.5	93abda42-cf85-4c5f-bd90-81210369b2dc	e7f7e347-3008-4f6d-89fa-f760eb402f62	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	67abe3aa-726e-41ef-baeb-b1d0bbd94e2f	27	M	2025-09-21 14:17:54.90599+00	71	27	1.5	93abda42-cf85-4c5f-bd90-81210369b2dc	07f2acc7-91e9-4df0-9d2c-667730cc8dd0	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	080e3432-5c2c-4228-8de9-48845f5b826d	31	H	2025-09-21 14:18:06.106582+00	73	14	4.5	93abda42-cf85-4c5f-bd90-81210369b2dc	44988fcf-b68b-47c6-a2a9-5d98f629b42b	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	0ba7b515-e8f9-4a04-8790-990094e4c9cf	10	M	2025-09-21 14:18:17.383927+00	75	18	3	93abda42-cf85-4c5f-bd90-81210369b2dc	b9d0451e-cb5e-4e04-84b7-6bd46c519b06	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	31e6b9ac-abc1-402e-bed5-2961e9bc8a02	6	M	2025-09-21 14:18:27.847325+00	77	9	1.5	93abda42-cf85-4c5f-bd90-81210369b2dc	db12f5c7-042c-4637-ae73-8522a5d3f58d	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	b3236d16-a2ac-49f8-97f9-347a9d64c8d1	16	L	2025-09-21 14:18:42.015528+00	79	16	5.5	93abda42-cf85-4c5f-bd90-81210369b2dc	dc091ddd-bc2a-4180-8784-463f10b4fe61	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	f27eeec6-0e15-4c22-81c6-5c4b143adfe8	32	M	2025-09-21 14:23:03.597902+00	70	32	3	61183ed6-88ce-418b-8bdf-f16c57a350f7	283b3e3c-0ccf-4029-9e3a-e57b20f7bdb8	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	2954f2b9-b9ae-4d88-8c86-1be1a49f6f8a	12	H	2025-09-21 14:25:47.760856+00	68	12	7.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	45aaa0ee-354f-44ee-9d92-9690f3b75ae4	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	0318ac4a-51fa-4197-9a58-d5a066c5c7cd	21	M	2025-09-21 14:26:13.218051+00	67	21	3	b75858d9-3f6f-46b7-be49-6884b28493f6	906124fc-5172-4c4d-8cda-a733892791ae	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	2954f2b9-b9ae-4d88-8c86-1be1a49f6f8a	12	M	2025-09-21 14:26:32.770859+00	68	12	7.5	b75858d9-3f6f-46b7-be49-6884b28493f6	bd86916a-acf1-409d-a2d1-a901623ee84e	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	a6646dac-f8d6-473f-96fc-0e711dd92011	3	H	2025-09-21 14:26:51.181454+00	80	3	5.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	5bfb839f-dd48-4c15-8913-3fe4255c93c3	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	1211281f-ad14-48b6-86e4-a4eb98d667d0	26	M	2025-09-21 14:28:47.16079+00	74	26	3.5	b75858d9-3f6f-46b7-be49-6884b28493f6	794785c5-1127-49b5-8bbb-9e309329ea58	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	dc820270-eba7-46bf-b0ea-a266032ff812	29	M	2025-09-21 14:29:34.753445+00	76	29	7.5	b75858d9-3f6f-46b7-be49-6884b28493f6	d654a61c-6cd2-4e42-89f8-1059b04853fc	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	b3236d16-a2ac-49f8-97f9-347a9d64c8d1	16	M	2025-09-21 14:30:22.656179+00	79	16	5.5	b75858d9-3f6f-46b7-be49-6884b28493f6	e867a18f-e066-46f8-b76d-65a92b5eeaff	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	f27eeec6-0e15-4c22-81c6-5c4b143adfe8	32	M	2025-09-21 16:37:54.333448+00	70	32	3	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	0fb0b77e-b27d-4430-a261-d763e2f5c33b	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	2954f2b9-b9ae-4d88-8c86-1be1a49f6f8a	12	M	2025-09-21 16:38:10.153492+00	68	12	7.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	f1e2746d-f0b4-43f2-9524-e2afb77a4bea	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	67abe3aa-726e-41ef-baeb-b1d0bbd94e2f	27	M	2025-09-21 16:38:19.042159+00	71	27	1.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	f3e25cfe-65cb-4123-8e5f-25a30e3c1bd3	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	080e3432-5c2c-4228-8de9-48845f5b826d	14	M	2025-09-21 16:38:25.212331+00	73	14	4.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	1942d97e-de1c-41cf-8cea-b775563b8a4d	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	0ba7b515-e8f9-4a04-8790-990094e4c9cf	18	M	2025-09-21 16:38:35.803346+00	75	18	3	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	53716138-b126-4e75-9162-d157d3c9c4b3	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	31e6b9ac-abc1-402e-bed5-2961e9bc8a02	6	M	2025-09-21 16:39:00.428734+00	77	9	1.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	3b71bc22-d3e8-4317-ba59-6f32600b0776	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	b3236d16-a2ac-49f8-97f9-347a9d64c8d1	16	L	2025-09-21 16:39:13.413929+00	79	16	5.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	6bb064e4-b418-4c40-8e5c-200e1a090ffc	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	242131ad-16bf-4fd6-8e5e-65b6d2e79cf1	1	M	2025-09-25 22:16:34.952786+00	117	29	1.5	b75858d9-3f6f-46b7-be49-6884b28493f6	b8b1b4b0-4e00-4307-bed6-71f8c2f63ea7	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	242131ad-16bf-4fd6-8e5e-65b6d2e79cf1	29	H	2025-09-26 00:02:30.905575+00	117	29	1.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	ca9d55a7-03c3-4a4c-a595-0ee2884406e0	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	7e68fe65-8ae9-4e71-ac41-ae6b9a3a7d62	32	M	2025-09-12 00:16:00+00	154	12	3.5	93abda42-cf85-4c5f-bd90-81210369b2dc	32786933-6fbf-4a96-b427-b4b75e6e4ab5	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	3436f7cb-d383-468b-b676-6e76b51d01c4	15	M	2025-09-07 17:00:00+00	174	15	3.5	b75858d9-3f6f-46b7-be49-6884b28493f6	67742302-7745-4412-aa6b-2c02dd5d9673	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	103aa0f9-e2fb-40e9-b656-520220ddab95	13	L	2025-09-07 20:25:00+00	183	19	3	b75858d9-3f6f-46b7-be49-6884b28493f6	d1e7fd58-81dc-4a10-b3ad-a5605efb3f43	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	b6e60bfc-587b-4409-b2e6-7dd034f8cbc1	6	L	2025-09-09 00:15:00+00	185	21	1.5	93abda42-cf85-4c5f-bd90-81210369b2dc	1361f23f-0405-4858-9beb-639f73e4b442	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	b6e60bfc-587b-4409-b2e6-7dd034f8cbc1	21	M	2025-09-09 00:15:00+00	185	21	1.5	b75858d9-3f6f-46b7-be49-6884b28493f6	5dd45144-3402-4480-928f-6b4da6285b7c	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	49a0b7ea-6fc3-45d1-848a-6b0e079f13a2	24	M	2025-09-28 12:12:54.211233+00	124	18	6.5	93abda42-cf85-4c5f-bd90-81210369b2dc	2808df73-a2f0-4c51-9681-0012f886d446	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	b0f2ec20-f691-43a1-a91b-549cdde8abd4	5	L	2025-09-28 12:13:52.451724+00	122	22	5.5	93abda42-cf85-4c5f-bd90-81210369b2dc	5bc1051d-e117-4651-b501-fb43b3e34230	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	2b45efe0-31db-4e09-868e-5ab5549e0b0a	32	A	2025-09-28 12:14:10.862926+00	120	2	2.5	93abda42-cf85-4c5f-bd90-81210369b2dc	479a6fdc-f010-4ee8-b38e-89531a51421d	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	d26f58ed-1e7b-4e7f-9045-36b6a4072128	15	M	2025-09-28 12:14:24.879844+00	127	28	3.5	93abda42-cf85-4c5f-bd90-81210369b2dc	01d2c158-e940-4c8c-9dc8-0e53da015c98	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	91376266-40b6-4e41-aca0-0736c40c57f2	12	M	2025-09-28 12:14:42.245123+00	130	12	6.5	93abda42-cf85-4c5f-bd90-81210369b2dc	64beedfd-52b5-445d-9aad-5b89718bb799	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	0efcb2cd-b1dd-46bd-bc97-4b1af61b2154	25	M	2025-09-28 12:14:50.335579+00	131	20	2.5	93abda42-cf85-4c5f-bd90-81210369b2dc	238023fa-d121-4b5c-8ece-842ab103a968	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	bc9e35d8-20fa-44b4-be20-81e6c19c72e1	4	M	2025-09-28 14:28:24.080679+00	186	4	14.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	a5263e40-bcd6-469c-89a1-70d270ef9fe8	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	9b3c55d8-73f8-4a27-9f17-9d1d9fbd9350	26	H	2025-09-28 14:28:36.52952+00	125	26	3.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	3c84fa63-a5c9-43a5-bcab-e1a667e09be8	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	49a0b7ea-6fc3-45d1-848a-6b0e079f13a2	18	M	2025-09-28 14:39:46.570417+00	124	18	6.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	80e20853-f9cc-485e-8b8a-9e44e4540265	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	b0f2ec20-f691-43a1-a91b-549cdde8abd4	22	L	2025-09-28 14:40:10.071136+00	122	22	5.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	6abb3352-255c-4b1b-b10d-73b613a0dc4a	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	9b3c55d8-73f8-4a27-9f17-9d1d9fbd9350	30	M	2025-09-28 14:40:25.570048+00	125	26	3.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	e328982a-da79-4ab8-96d1-9e46f7c28a0b	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	d26f58ed-1e7b-4e7f-9045-36b6a4072128	15	M	2025-09-28 14:40:45.258144+00	127	28	3.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	0b0b8cf9-c4dd-4264-a342-ece6a797bb83	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	91376266-40b6-4e41-aca0-0736c40c57f2	9	M	2025-09-28 14:41:04.837542+00	130	12	6.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	71441b94-4a06-4858-b400-e90be267151c	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	10340ef1-48a2-48c8-a50a-bb3d0eaa35fe	10	M	2025-09-28 14:41:21.385419+00	132	10	7.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	776c2ab5-0884-48a0-8258-6a10e7b8a5e5	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	7d2cd926-d87c-49a2-ac4a-75992298fb33	19	L	2025-09-28 14:53:14.411325+00	126	19	3.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	663a9bb2-4f02-45e0-9acc-e7334d87d629	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	9b3c55d8-73f8-4a27-9f17-9d1d9fbd9350	30	M	2025-09-28 14:53:17.167477+00	125	26	3.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	b231579b-a70c-419f-9e9c-97a6ca6f1574	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	bc9e35d8-20fa-44b4-be20-81e6c19c72e1	4	H	2025-09-28 14:53:21.382835+00	186	4	14.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	b402b8bc-5939-40b4-9175-ae3273b1e1e9	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	d26f58ed-1e7b-4e7f-9045-36b6a4072128	15	M	2025-09-28 14:53:33.588637+00	127	28	3.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	8e77e82c-b1af-4a58-a0d2-1d0d3328ccee	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	91376266-40b6-4e41-aca0-0736c40c57f2	12	H	2025-09-28 14:53:45.925382+00	130	12	6.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	0b8618be-e8c4-49b8-aec3-a5f4f7ea0161	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	7d2cd926-d87c-49a2-ac4a-75992298fb33	19	M	2025-09-28 15:11:18.924268+00	126	19	3.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	d63f3564-9d29-424f-b2b2-f204da1c6a1c	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	91376266-40b6-4e41-aca0-0736c40c57f2	12	H	2025-09-28 15:11:52.985861+00	130	12	6.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	f6790552-1357-42e9-8715-e6aeaffc454d	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	0efcb2cd-b1dd-46bd-bc97-4b1af61b2154	20	L	2025-09-28 15:12:07.092453+00	131	20	2.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	df0b7670-46aa-4208-8b14-0c45a36b32ca	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	10340ef1-48a2-48c8-a50a-bb3d0eaa35fe	7	L	2025-09-28 15:12:17.698413+00	132	10	7.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	a150a76b-4c5f-4684-9c9e-d7935868095f	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	49a0b7ea-6fc3-45d1-848a-6b0e079f13a2	18	M	2025-09-28 15:27:14.361925+00	124	18	6.5	b75858d9-3f6f-46b7-be49-6884b28493f6	0f232fe6-e9e8-4af9-a643-91d2a5b23177	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	bc9e35d8-20fa-44b4-be20-81e6c19c72e1	23	L	2025-09-28 15:27:30.149137+00	186	4	14.5	b75858d9-3f6f-46b7-be49-6884b28493f6	af8343df-6ffb-488d-a4c7-6286b5db756b	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	380e817d-fcde-418f-9eb1-a97bb993e03e	10	H	2025-10-05 01:36:42.154428+00	192	26	4.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	e0f85100-b72b-4e9f-81ef-75024c473d00	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	b78e5b52-7747-43a0-9bd4-020c7223b8e3	3	M	2025-10-05 01:37:06.221663+00	189	13	1.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	1a11ba7c-ea5f-415f-af16-147e6f4f6be6	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	86f55afb-4e15-4949-a2bc-ff38a995263f	25	L	2025-10-05 01:37:13.447461+00	203	9	1.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	6c8f5124-a622-4c01-8f74-c09dc47dc2de	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	bde2234a-6b87-4b5e-85dd-37c092bc3047	30	L	2025-10-05 01:37:43.205478+00	205	29	3.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	5e7ff270-881e-4482-8c4d-912c7847bbc0	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	0b349bf3-4672-4285-9a9a-8330f11f8c22	24	M	2025-10-05 01:36:57.759971+00	194	23	1.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	43246543-0fda-495f-b1a8-f0983140f221	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	6a64a55f-f8da-41e8-a1ce-50a485f53127	20	L	2025-10-05 01:37:26.467203+00	190	20	1.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	fcce5ea9-8f94-459f-9a95-8b3f8c4668b6	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	58b00d24-143e-48a2-a202-07a1b3975fc3	31	L	2025-10-05 01:39:51.61819+00	195	1	8.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	ff06e270-0138-43e8-815f-3bc08e53c9e6	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	c9bc16f7-9a25-429d-98f3-5c7a3ebc8414	32	M	2025-10-05 01:39:57.521554+00	198	18	2.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	d3c1678a-a1a9-413d-a27a-da1dbbd5b603	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	2669b044-2985-4243-a9ab-9b725dccee62	11	A	2025-10-05 01:40:04.360698+00	197	11	10.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	c478c25c-fcfb-4309-a0b6-2f86585a216a	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	8d1ac3c2-a669-4274-9d81-20e1f51b9bae	22	L	2025-10-05 01:40:23.117039+00	199	4	8.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	9254a60c-f7c8-45c2-9a14-dec2a746eed2	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	d2ac537e-3d10-4662-b6f5-836d8255ffab	16	L	2025-10-05 01:40:31.721928+00	200	16	3	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	d7d93682-5bdc-4f4c-b01a-126c021b2188	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	380e817d-fcde-418f-9eb1-a97bb993e03e	10	M	2025-10-05 12:30:50.337404+00	192	26	4.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	af9e46fb-137c-4fe6-9429-f2838a34dacf	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	fe4ccad3-2b0e-46f8-b2eb-c197e204cd5c	21	M	2025-10-05 12:58:22.807492+00	188	21	3.5	b75858d9-3f6f-46b7-be49-6884b28493f6	2329dcd2-86dd-4d78-9a5f-a5f36fedbc8c	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	380e817d-fcde-418f-9eb1-a97bb993e03e	26	M	2025-10-05 12:59:06.07551+00	192	26	4.5	b75858d9-3f6f-46b7-be49-6884b28493f6	f3d88af0-e63e-4812-af3a-eb8a78fcae3f	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	0b349bf3-4672-4285-9a9a-8330f11f8c22	24	L	2025-10-05 12:59:32.39487+00	194	23	1.5	b75858d9-3f6f-46b7-be49-6884b28493f6	7e10b070-cd8e-4c71-9c4d-ba1174242b06	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	b78e5b52-7747-43a0-9bd4-020c7223b8e3	3	M	2025-10-05 12:59:43.224998+00	189	13	1.5	b75858d9-3f6f-46b7-be49-6884b28493f6	4f8dea50-f901-41f3-9f9c-4e9eba18d5b9	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	86f55afb-4e15-4949-a2bc-ff38a995263f	9	M	2025-10-05 12:59:55.62656+00	203	9	1.5	b75858d9-3f6f-46b7-be49-6884b28493f6	3c01eb70-e75b-4718-be9e-5daade2e9167	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	ebba52ce-db32-4ea8-909d-eaf8c90105be	14	L	2025-10-05 13:00:10.934567+00	204	14	7	b75858d9-3f6f-46b7-be49-6884b28493f6	335f7579-7de0-40b9-a53b-65daaf1e1721	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	6a64a55f-f8da-41e8-a1ce-50a485f53127	5	L	2025-10-05 13:00:24.801388+00	190	20	1.5	b75858d9-3f6f-46b7-be49-6884b28493f6	b21553c8-c845-4593-a012-6d836f97b899	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	bde2234a-6b87-4b5e-85dd-37c092bc3047	30	M	2025-10-05 13:00:46.434836+00	205	29	3.5	b75858d9-3f6f-46b7-be49-6884b28493f6	aee32e4d-b545-4fc1-9bca-cd66974da79f	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	58b00d24-143e-48a2-a202-07a1b3975fc3	31	M	2025-10-05 13:00:57.973586+00	195	1	8.5	b75858d9-3f6f-46b7-be49-6884b28493f6	e118a215-da2e-4ebd-ad34-1265cab82cc7	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	c9bc16f7-9a25-429d-98f3-5c7a3ebc8414	18	M	2025-10-05 13:01:21.276529+00	198	18	2.5	b75858d9-3f6f-46b7-be49-6884b28493f6	4116041d-33c0-4dd2-b168-9261d4dc424b	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	2669b044-2985-4243-a9ab-9b725dccee62	11	M	2025-10-05 13:01:36.859248+00	197	11	10.5	b75858d9-3f6f-46b7-be49-6884b28493f6	d8a8e4f0-37d6-4ca3-8c22-f931499be6f9	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	8d1ac3c2-a669-4274-9d81-20e1f51b9bae	22	M	2025-10-05 13:03:13.190105+00	199	4	8.5	b75858d9-3f6f-46b7-be49-6884b28493f6	116a9af9-956c-48e8-9aaa-a8a4120f7609	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	d2ac537e-3d10-4662-b6f5-836d8255ffab	16	H	2025-10-05 13:03:26.476083+00	200	16	3	b75858d9-3f6f-46b7-be49-6884b28493f6	d321fcc5-cfa8-4953-8207-599d8df3452a	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	ebba52ce-db32-4ea8-909d-eaf8c90105be	14	M	2025-10-05 13:44:10.554371+00	204	14	7	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	5c8537ef-ddde-4cdf-9cb2-9a4708a4d878	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	380e817d-fcde-418f-9eb1-a97bb993e03e	10	L	2025-10-05 13:46:07.695152+00	192	26	4.5	93abda42-cf85-4c5f-bd90-81210369b2dc	6c1b6a75-acde-495b-9bdf-cc479c27c684	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	0b349bf3-4672-4285-9a9a-8330f11f8c22	24	H	2025-10-05 13:46:17.552094+00	194	23	1.5	93abda42-cf85-4c5f-bd90-81210369b2dc	bd2542f6-3f2d-47ea-8406-df6dc65bf364	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	b78e5b52-7747-43a0-9bd4-020c7223b8e3	3	L	2025-10-05 13:46:24.149567+00	189	13	1.5	93abda42-cf85-4c5f-bd90-81210369b2dc	146a076c-ca6d-48b6-9c6e-4f531add83f3	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	86f55afb-4e15-4949-a2bc-ff38a995263f	9	L	2025-10-05 13:46:34.658302+00	203	9	1.5	93abda42-cf85-4c5f-bd90-81210369b2dc	c7598513-f7e6-403d-a2c2-70d5525d12f5	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	ebba52ce-db32-4ea8-909d-eaf8c90105be	14	M	2025-10-05 13:46:38.016452+00	204	14	7	93abda42-cf85-4c5f-bd90-81210369b2dc	eaab490e-7434-44de-adf1-12260b6b367b	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	6a64a55f-f8da-41e8-a1ce-50a485f53127	20	M	2025-10-05 13:46:42.619445+00	190	20	1.5	93abda42-cf85-4c5f-bd90-81210369b2dc	16530374-393e-46fa-9156-4fba7d3224bc	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	bde2234a-6b87-4b5e-85dd-37c092bc3047	30	M	2025-10-05 13:46:54.273392+00	205	29	3.5	93abda42-cf85-4c5f-bd90-81210369b2dc	935d2d82-0a1d-4b4a-9a13-7b2d0622a202	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	58b00d24-143e-48a2-a202-07a1b3975fc3	31	M	2025-10-05 13:47:07.003604+00	195	1	8.5	93abda42-cf85-4c5f-bd90-81210369b2dc	4230a819-424d-453c-86a2-52769e55296e	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	c9bc16f7-9a25-429d-98f3-5c7a3ebc8414	32	H	2025-10-05 13:47:11.28624+00	198	18	2.5	93abda42-cf85-4c5f-bd90-81210369b2dc	19cec44e-6522-465b-a866-3448fc7243e6	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	2669b044-2985-4243-a9ab-9b725dccee62	11	H	2025-10-05 13:47:17.056705+00	197	11	10.5	93abda42-cf85-4c5f-bd90-81210369b2dc	e6f5af34-b0e0-4152-a61a-0651fdc77198	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	8d1ac3c2-a669-4274-9d81-20e1f51b9bae	22	H	2025-10-05 13:47:25.523818+00	199	4	8.5	93abda42-cf85-4c5f-bd90-81210369b2dc	e6a5583b-0436-43f1-9349-9be39004964a	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	d2ac537e-3d10-4662-b6f5-836d8255ffab	15	M	2025-10-05 13:47:29.126615+00	200	16	3	93abda42-cf85-4c5f-bd90-81210369b2dc	a41d5174-76ba-48e5-b6a0-984f0cbdd33e	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	380e817d-fcde-418f-9eb1-a97bb993e03e	10	M	2025-10-05 15:09:36.982242+00	192	26	4.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	76926571-1261-4c24-8d6b-49de2c514bf5	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	0b349bf3-4672-4285-9a9a-8330f11f8c22	23	M	2025-10-05 15:09:43.281754+00	194	23	1.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	0569c874-b687-41b3-a9a9-90c7a8f33f57	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	86f55afb-4e15-4949-a2bc-ff38a995263f	25	M	2025-10-05 15:09:55.415574+00	203	9	1.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	1885521d-818e-4db5-aa93-7d6d6c1ae88c	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	ebba52ce-db32-4ea8-909d-eaf8c90105be	14	M	2025-10-05 15:10:10.915433+00	204	14	7	d8db1ea2-76a7-4cb1-8025-167bef10c724	cfd8371d-76b4-4f3f-8786-e500a201edf7	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	6a64a55f-f8da-41e8-a1ce-50a485f53127	20	H	2025-10-05 15:10:23.753321+00	190	20	1.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	47b0987e-a4dd-4cdb-86ea-af589fd63432	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	bde2234a-6b87-4b5e-85dd-37c092bc3047	29	M	2025-10-05 15:10:48.913469+00	205	29	3.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	d2920b6c-0177-4eb0-86b5-c8516e5cd6d4	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	58b00d24-143e-48a2-a202-07a1b3975fc3	31	M	2025-10-05 15:10:52.862975+00	195	1	8.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	055bdf8c-b9ec-4779-a04e-a947578eb938	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	c9bc16f7-9a25-429d-98f3-5c7a3ebc8414	32	M	2025-10-05 15:10:56.222102+00	198	18	2.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	a9fed85f-8091-4b9c-a4b5-ffc1a76fa418	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	2669b044-2985-4243-a9ab-9b725dccee62	11	M	2025-10-05 15:11:00.951061+00	197	11	10.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	ae1578f7-db93-4e05-a7bf-6de3aba4eb10	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	8d1ac3c2-a669-4274-9d81-20e1f51b9bae	22	L	2025-10-05 15:11:03.721946+00	199	4	8.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	d6decd4b-923b-4262-b818-c4c077010ed8	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	d2ac537e-3d10-4662-b6f5-836d8255ffab	16	H	2025-10-05 15:11:07.242957+00	200	16	3	d8db1ea2-76a7-4cb1-8025-167bef10c724	a592166a-4cb3-4b64-8484-8ace3a193f9b	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	8d1ac3c2-a669-4274-9d81-20e1f51b9bae	22	L	2025-10-05 23:38:48.219686+00	207	4	7.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	96ec87c7-2add-480b-b706-421fee765db3	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	d2ac537e-3d10-4662-b6f5-836d8255ffab	15	L	2025-10-05 23:38:56.698493+00	208	16	3.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	387a37a8-4fe7-453b-a8b7-01c280aaafe4	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	9f96ae20-7274-4d44-8194-71356e732dca	24	L	2025-10-09 23:00:03.01941+00	210	26	7.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	1e84127f-416a-4557-99e4-0171a8f86cd5	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	9f96ae20-7274-4d44-8194-71356e732dca	26	M	2025-10-09 23:14:16.736416+00	210	26	7.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	ae12ac5d-8cd1-4177-b32b-8658483a3b63	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	9f96ae20-7274-4d44-8194-71356e732dca	26	L	2025-10-09 23:15:46.150675+00	210	26	7.5	b75858d9-3f6f-46b7-be49-6884b28493f6	b2640b2d-23c4-4ca7-8b97-82eb30ae05cc	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	9f96ae20-7274-4d44-8194-71356e732dca	26	H	2025-10-09 23:16:00.411959+00	210	26	7.5	93abda42-cf85-4c5f-bd90-81210369b2dc	6fb5619b-dde6-4d03-bb09-299fbfcd2b63	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	9f96ae20-7274-4d44-8194-71356e732dca	24	M	2025-10-09 23:50:00.232876+00	210	26	7.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	5865aebf-9876-4ebb-8a64-b32330f79804	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	b30ae39f-ba57-4fc8-a725-8923136dca9c	10	M	2025-10-11 20:48:39.68777+00	211	10	7	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	7776135e-cead-4947-a2e6-d1b9773e01c6	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	b30ae39f-ba57-4fc8-a725-8923136dca9c	25	L	2025-10-12 03:25:24.654504+00	211	10	7	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	7653db35-5ed0-4319-9db9-18d4347235c3	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	b30ae39f-ba57-4fc8-a725-8923136dca9c	25	L	2025-10-12 04:53:25.581493+00	211	10	7	d8db1ea2-76a7-4cb1-8025-167bef10c724	e12453c0-d503-46db-ab0d-9d4d271985e1	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	85594600-e73f-49ee-a6bd-d52165c66b91	23	H	2025-10-12 04:53:38.765081+00	219	22	3.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	55f3def7-f743-4920-84ca-e74675327605	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	9c472cce-9d22-412c-aa47-a9a40c7bbc23	29	M	2025-10-12 04:53:45.870571+00	232	29	1.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	8ad0118c-9594-45de-bf0f-3c841e1b063a	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	2165e08b-e5aa-4f76-adf9-ab393a4baa89	9	H	2025-10-12 04:53:53.309448+00	229	9	3	d8db1ea2-76a7-4cb1-8025-167bef10c724	fbd6526a-03ca-4ca1-82b6-23ac7d7c13fd	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	6cce17a8-edfb-4c7f-b706-3ae198691439	1	M	2025-10-12 04:53:58.562961+00	231	14	7	d8db1ea2-76a7-4cb1-8025-167bef10c724	f201ba11-68cb-4f34-ae46-4793fe5b9dd4	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	89626ca3-e73a-4c09-b1e3-76715d62524f	8	A	2025-10-12 04:54:03.01136+00	215	27	5.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	6b284f51-e803-41bb-86e6-f09d66682eb0	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	b670f639-9ca2-4bc3-b9c5-d7f37ddc49c0	20	M	2025-10-12 04:54:12.262187+00	217	18	4.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	506ced46-525e-42c3-ac68-cc37f17df7dd	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	7cb87419-fddd-4928-a943-391bd5227e2e	19	M	2025-10-12 04:54:16.074108+00	233	19	7	d8db1ea2-76a7-4cb1-8025-167bef10c724	9ff8acb4-3a4d-40a3-bf66-aa16898f7632	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	1c857c6e-f8b9-433f-949d-1d26a99838c9	31	M	2025-10-12 04:54:18.848352+00	230	17	4.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	d23abcfb-9863-4bfe-a4a0-ada187834521	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	6e5d4e91-b8ad-41df-9950-6d5fe79173b6	28	M	2025-10-12 04:54:21.94155+00	234	30	3.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	1ba1da55-e748-446c-b9d2-d1aaac6a3e8e	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	e5b67945-f649-42a4-a3e8-2b8f21b8a88f	7	M	2025-10-12 04:54:29.093184+00	220	12	14.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	6bdb62e6-3873-444f-ad2d-739f938a1a7f	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	4c912b18-1027-4560-9cb6-3b20c73ac4d1	11	H	2025-10-12 04:54:33.434268+00	227	16	2.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	aa49ca75-6908-48ac-8ba7-57c995f37522	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	cab2be71-af69-4508-ac1d-06399b390190	4	M	2025-10-12 04:54:37.415628+00	228	4	4.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	4e072639-f65d-4b91-8ddb-9c2f45fec122	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	06cc8eea-773e-43ae-b42f-4b8d732163f2	32	M	2025-10-12 04:54:43.003121+00	224	32	4.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	69f1874d-4675-40b9-9367-cf3424c17173	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	9c472cce-9d22-412c-aa47-a9a40c7bbc23	15	L	2025-10-12 12:12:15.071396+00	232	29	1.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	66cf6e8a-ed75-477b-a459-0acbdb14d578	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	85594600-e73f-49ee-a6bd-d52165c66b91	23	M	2025-10-12 12:12:19.684919+00	219	22	3.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	ee72ba4d-0c77-4090-8193-51af9faa107a	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	b670f639-9ca2-4bc3-b9c5-d7f37ddc49c0	18	H	2025-10-12 12:12:29.029744+00	236	18	3.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	80c56310-5b98-406a-8faf-046dc1a9e7af	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	89626ca3-e73a-4c09-b1e3-76715d62524f	27	H	2025-10-12 12:12:49.83479+00	215	27	5.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	d62283d1-a35d-4e59-ae96-5bd7651060d5	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	2165e08b-e5aa-4f76-adf9-ab393a4baa89	9	H	2025-10-12 12:12:56.623778+00	229	9	3	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	5e2aed32-7145-4b6d-99c9-dcd3529ff1c8	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	7cb87419-fddd-4928-a943-391bd5227e2e	3	L	2025-10-12 12:13:18.139962+00	233	19	7	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	534f267c-99c7-4ddd-9390-b18c300c7e5c	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	1c857c6e-f8b9-433f-949d-1d26a99838c9	31	L	2025-10-12 12:14:18.323213+00	230	17	4.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	4d9bfd8f-82aa-4e91-9cc8-8061e35c301c	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	e5b67945-f649-42a4-a3e8-2b8f21b8a88f	12	M	2025-10-12 12:14:32.915982+00	220	12	14.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	4434e48e-90d1-4aa6-a3ea-35fe9f793e99	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	6e5d4e91-b8ad-41df-9950-6d5fe79173b6	30	M	2025-10-12 12:14:51.601783+00	234	30	3.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	6e58ccd0-704b-4358-bd22-2c4c5b1185bd	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	cab2be71-af69-4508-ac1d-06399b390190	4	L	2025-10-12 12:15:17.926929+00	228	4	4.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	3dd5ccfb-09b3-4fe8-98a3-5ca44ac7c36d	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	b30ae39f-ba57-4fc8-a725-8923136dca9c	25	H	2025-10-12 13:11:33.693989+00	211	10	7	61183ed6-88ce-418b-8bdf-f16c57a350f7	dad032f8-9428-46b6-8bc4-84e71d6e8c24	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	9c472cce-9d22-412c-aa47-a9a40c7bbc23	15	H	2025-10-12 13:11:37.981127+00	232	29	1.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	8ad83cd0-5b03-4788-9737-025dee54e5d8	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	85594600-e73f-49ee-a6bd-d52165c66b91	22	M	2025-10-12 13:11:48.396867+00	219	22	3.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	ed9cee07-3872-4acc-ae52-1112429d3d07	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	b670f639-9ca2-4bc3-b9c5-d7f37ddc49c0	18	H	2025-10-12 13:11:56.005502+00	236	18	3.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	207da4ec-0e84-4fb1-8f3a-8f9625488243	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	89626ca3-e73a-4c09-b1e3-76715d62524f	8	M	2025-10-12 13:12:02.381593+00	215	27	5.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	f1593c78-2922-43b9-a265-0fdf9bd5bddb	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	2165e08b-e5aa-4f76-adf9-ab393a4baa89	9	M	2025-10-12 13:12:05.800768+00	229	9	3	61183ed6-88ce-418b-8bdf-f16c57a350f7	51be6a7e-7de4-492e-8c4e-79f72856d5e9	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	7cb87419-fddd-4928-a943-391bd5227e2e	3	H	2025-10-12 13:12:12.827512+00	233	19	7	61183ed6-88ce-418b-8bdf-f16c57a350f7	516f5e37-cbae-48ec-9c55-5e146b5c2bd5	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	6cce17a8-edfb-4c7f-b706-3ae198691439	1	M	2025-10-12 13:12:24.596809+00	235	14	9.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	029668b7-bf1e-4a5a-b18e-083aa17baece	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	1c857c6e-f8b9-433f-949d-1d26a99838c9	31	M	2025-10-12 13:12:28.413669+00	230	17	4.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	8ae8d556-131b-46c5-9db6-8f5e64d4b32b	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	e5b67945-f649-42a4-a3e8-2b8f21b8a88f	7	M	2025-10-12 13:12:34.603204+00	220	12	14.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	cf4a6987-f588-44f7-b617-9b4ae58c2b57	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	6e5d4e91-b8ad-41df-9950-6d5fe79173b6	30	M	2025-10-12 13:12:41.554838+00	234	30	3.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	82a1ba15-6b23-48ac-9122-d47acca74009	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	4c912b18-1027-4560-9cb6-3b20c73ac4d1	11	H	2025-10-12 13:12:45.296983+00	227	16	2.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	dcb6a17b-da0c-454d-80f7-49467d31576f	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	cab2be71-af69-4508-ac1d-06399b390190	4	H	2025-10-12 13:12:49.531327+00	228	4	4.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	3972612a-7c34-458e-812a-b9359650d8d6	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	06cc8eea-773e-43ae-b42f-4b8d732163f2	32	M	2025-10-12 13:12:54.668447+00	224	32	4.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	11c61489-c5a1-4678-9f4b-ffffcad2eceb	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	9c472cce-9d22-412c-aa47-a9a40c7bbc23	15	M	2025-10-12 16:26:07.139587+00	232	29	1.5	b75858d9-3f6f-46b7-be49-6884b28493f6	d6cd7633-dc53-45b3-90c7-30c60cb79689	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	85594600-e73f-49ee-a6bd-d52165c66b91	22	M	2025-10-12 16:26:17.095574+00	219	22	3.5	b75858d9-3f6f-46b7-be49-6884b28493f6	4e32135f-8aa7-4798-beb7-b2de23d78818	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	b670f639-9ca2-4bc3-b9c5-d7f37ddc49c0	20	L	2025-10-12 16:26:25.755835+00	236	18	3.5	b75858d9-3f6f-46b7-be49-6884b28493f6	d343b456-94b2-4dbd-a390-2b4e7a9c00a8	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	89626ca3-e73a-4c09-b1e3-76715d62524f	8	L	2025-10-12 16:27:08.361227+00	215	27	5.5	b75858d9-3f6f-46b7-be49-6884b28493f6	b11e0f49-dfbb-4c7a-b3c4-f842c98c0561	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	2165e08b-e5aa-4f76-adf9-ab393a4baa89	9	M	2025-10-12 16:27:18.130265+00	229	9	3	b75858d9-3f6f-46b7-be49-6884b28493f6	22c8c427-aaa5-4a1b-8205-522597594f96	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	6cce17a8-edfb-4c7f-b706-3ae198691439	1	L	2025-10-12 16:27:40.13103+00	235	14	9.5	b75858d9-3f6f-46b7-be49-6884b28493f6	69aae4c9-fefc-4447-8d61-dd67234579a0	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	1c857c6e-f8b9-433f-949d-1d26a99838c9	31	L	2025-10-12 16:27:54.13604+00	230	17	4.5	b75858d9-3f6f-46b7-be49-6884b28493f6	cd1d2f61-cd6a-4c84-90c6-1f383d3323b0	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	e5b67945-f649-42a4-a3e8-2b8f21b8a88f	7	M	2025-10-12 16:28:01.875571+00	220	12	14.5	b75858d9-3f6f-46b7-be49-6884b28493f6	4d7a5fd5-9b41-48d8-8114-41b836aa3e7b	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	6e5d4e91-b8ad-41df-9950-6d5fe79173b6	30	M	2025-10-12 16:28:14.811365+00	234	30	3.5	b75858d9-3f6f-46b7-be49-6884b28493f6	7f93acc2-661b-4d44-bcff-6e3117bd222b	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	4c912b18-1027-4560-9cb6-3b20c73ac4d1	11	H	2025-10-12 16:28:20.017269+00	227	16	2.5	b75858d9-3f6f-46b7-be49-6884b28493f6	7156e2b9-8cae-47ba-9359-d4e1cd3cd955	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	cab2be71-af69-4508-ac1d-06399b390190	4	M	2025-10-12 16:28:31.034368+00	228	4	4.5	b75858d9-3f6f-46b7-be49-6884b28493f6	4cbe28d7-4f56-4d7f-a6fb-49b247322f02	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	06cc8eea-773e-43ae-b42f-4b8d732163f2	32	M	2025-10-12 16:28:39.516373+00	224	32	4.5	b75858d9-3f6f-46b7-be49-6884b28493f6	8353a0b1-c455-4715-ad18-13cec60e516b	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	6cce17a8-edfb-4c7f-b706-3ae198691439	14	H	2025-10-12 16:29:42.874324+00	235	14	9.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	107ebfd4-dedd-45c0-a1cc-054803dafa43	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	7cb87419-fddd-4928-a943-391bd5227e2e	19	M	2025-10-12 16:32:37.423233+00	233	19	7	b75858d9-3f6f-46b7-be49-6884b28493f6	31f3478e-a2e7-4cdd-850f-d1a38427150f	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	9c472cce-9d22-412c-aa47-a9a40c7bbc23	29	M	2025-10-12 16:33:55.427285+00	232	29	1.5	93abda42-cf85-4c5f-bd90-81210369b2dc	c954564d-546e-49a7-b4c6-835d416f4e4d	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	85594600-e73f-49ee-a6bd-d52165c66b91	22	M	2025-10-12 16:34:01.128725+00	219	22	3.5	93abda42-cf85-4c5f-bd90-81210369b2dc	ed042b67-3b2b-4ac4-a66e-dba30ea6f360	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	b670f639-9ca2-4bc3-b9c5-d7f37ddc49c0	18	M	2025-10-12 16:34:07.36586+00	236	18	3.5	93abda42-cf85-4c5f-bd90-81210369b2dc	13c193df-efe9-4ceb-8b01-fed758f0d0f5	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	89626ca3-e73a-4c09-b1e3-76715d62524f	27	H	2025-10-12 16:34:13.161392+00	215	27	5.5	93abda42-cf85-4c5f-bd90-81210369b2dc	5df7becc-59cf-4cda-9e7f-d87e1d8141bd	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	2165e08b-e5aa-4f76-adf9-ab393a4baa89	5	H	2025-10-12 16:34:27.563752+00	229	9	3	93abda42-cf85-4c5f-bd90-81210369b2dc	e2f4bfc7-c488-4a8b-8f86-4cc761521ec2	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	7cb87419-fddd-4928-a943-391bd5227e2e	19	M	2025-10-12 16:34:33.270856+00	233	19	7	93abda42-cf85-4c5f-bd90-81210369b2dc	2749647c-ed6d-49db-a63e-2f14230db363	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	6cce17a8-edfb-4c7f-b706-3ae198691439	1	M	2025-10-12 16:34:42.924686+00	235	14	9.5	93abda42-cf85-4c5f-bd90-81210369b2dc	6886c135-cae1-4d19-9877-6e74c26508e2	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	1c857c6e-f8b9-433f-949d-1d26a99838c9	31	M	2025-10-12 16:34:50.307124+00	230	17	4.5	93abda42-cf85-4c5f-bd90-81210369b2dc	19925d82-3954-4588-8f5d-31d8acdee2cb	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	e5b67945-f649-42a4-a3e8-2b8f21b8a88f	7	M	2025-10-12 16:35:00.251362+00	220	12	14.5	93abda42-cf85-4c5f-bd90-81210369b2dc	ad108ecf-bc35-4c2e-8244-b3995df67392	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	6e5d4e91-b8ad-41df-9950-6d5fe79173b6	30	L	2025-10-12 16:35:13.352799+00	234	30	3.5	93abda42-cf85-4c5f-bd90-81210369b2dc	14df8a83-ccbf-4059-8727-7df742ed3695	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	4c912b18-1027-4560-9cb6-3b20c73ac4d1	11	A	2025-10-12 16:35:21.853477+00	227	16	2.5	93abda42-cf85-4c5f-bd90-81210369b2dc	9e111c48-4eb4-409f-a144-6d8593fb0e6d	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	cab2be71-af69-4508-ac1d-06399b390190	4	L	2025-10-12 16:35:28.230379+00	228	4	4.5	93abda42-cf85-4c5f-bd90-81210369b2dc	319b7a0f-bc67-499b-8a65-32f8f960e517	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	06cc8eea-773e-43ae-b42f-4b8d732163f2	32	H	2025-10-12 16:35:31.315631+00	224	32	4.5	93abda42-cf85-4c5f-bd90-81210369b2dc	d1a51a4b-ac59-4ee7-9b22-117838d0aff8	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	9c472cce-9d22-412c-aa47-a9a40c7bbc23	29	L	2025-10-12 16:47:16.309454+00	232	29	1.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	48ebe02d-a6f1-4590-93c1-42df9b6ae311	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	85594600-e73f-49ee-a6bd-d52165c66b91	22	M	2025-10-12 16:47:43.065517+00	219	22	3.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	60cb9352-6e15-41d1-a829-40977134e616	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	b670f639-9ca2-4bc3-b9c5-d7f37ddc49c0	18	L	2025-10-12 16:47:49.823766+00	236	18	3.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	e34cef0b-56ab-4f96-9091-b23bd94be502	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	89626ca3-e73a-4c09-b1e3-76715d62524f	27	L	2025-10-12 16:47:53.566535+00	215	27	5.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	6ca151d1-0feb-4c6e-ae80-8c2292e57d66	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	2165e08b-e5aa-4f76-adf9-ab393a4baa89	5	L	2025-10-12 16:48:46.897611+00	229	9	3	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	b790d365-7ed4-49ca-aaaa-f37fb9b8cdcf	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	7cb87419-fddd-4928-a943-391bd5227e2e	3	L	2025-10-12 16:48:51.473242+00	233	19	7	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	61817bef-640a-4a02-aa5e-ed8a9cd9d8b7	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	6cce17a8-edfb-4c7f-b706-3ae198691439	14	L	2025-10-12 16:49:01.416251+00	235	14	9.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	e411917a-dc91-46db-8ce2-c450034a3a37	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	1c857c6e-f8b9-433f-949d-1d26a99838c9	17	L	2025-10-12 16:49:04.605915+00	230	17	4.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	173e53e3-c663-4b99-ad6c-93eae4e04c7e	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	e5b67945-f649-42a4-a3e8-2b8f21b8a88f	7	L	2025-10-12 16:49:14.231278+00	220	12	14.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	d4ec81ac-c8c7-43f4-9adb-d366293c7d38	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	6e5d4e91-b8ad-41df-9950-6d5fe79173b6	28	L	2025-10-12 16:49:19.927402+00	234	30	3.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	d805a4e7-c0b1-4e51-9bea-0062fb911642	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	4c912b18-1027-4560-9cb6-3b20c73ac4d1	11	M	2025-10-12 16:50:01.265213+00	227	16	2.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	0a06205f-bd19-436f-92a1-d0b804387844	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	cab2be71-af69-4508-ac1d-06399b390190	4	L	2025-10-12 16:50:18.208355+00	228	4	4.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	a9d80eb1-2f44-47cb-8661-43496a8da05d	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	06cc8eea-773e-43ae-b42f-4b8d732163f2	32	L	2025-10-12 16:50:21.457695+00	224	32	4.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	c71155e1-5522-4451-b488-46b77e59d116	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	4c912b18-1027-4560-9cb6-3b20c73ac4d1	11	H	2025-10-12 23:44:39.500515+00	227	16	2.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	93f6a05d-a325-4a61-858f-441955ba065f	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	06cc8eea-773e-43ae-b42f-4b8d732163f2	32	M	2025-10-13 20:36:06.004581+00	238	32	5.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	d82ca08a-9e9a-49f3-85c0-e6da72dd4d98	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	b31c97c4-c4f1-4e44-8152-1e84c0d4b5d9	7	M	2025-10-15 18:33:10.613024+00	239	27	5.5	93abda42-cf85-4c5f-bd90-81210369b2dc	8614012a-5445-4f59-a1fd-031e43157aac	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	b31c97c4-c4f1-4e44-8152-1e84c0d4b5d9	7	M	2025-10-16 20:31:39.960987+00	239	27	5.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	b1d0a548-6b67-42d3-a308-2b77997efde1	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	b31c97c4-c4f1-4e44-8152-1e84c0d4b5d9	7	L	2025-10-16 20:51:43.314033+00	239	27	5.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	545adb13-c060-444d-9570-dcfbdf21e412	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	b31c97c4-c4f1-4e44-8152-1e84c0d4b5d9	7	L	2025-10-16 22:23:08.512884+00	239	27	5.5	b75858d9-3f6f-46b7-be49-6884b28493f6	513f0350-261e-4e64-b743-00381432f9a1	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	b31c97c4-c4f1-4e44-8152-1e84c0d4b5d9	7	L	2025-10-16 23:36:34.040877+00	239	27	5.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	8875b5db-ba53-4a20-aa5d-b9d8315265fe	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	d6041bda-3122-4abd-98cd-440d718d5848	21	M	2025-10-19 00:17:25.994383+00	245	26	2.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	a3fc1f28-42c2-478e-94b1-47549120e861	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	9ff54761-9d51-46d8-82c3-ecfde5287333	8	L	2025-10-19 00:18:30.271256+00	255	8	2.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	6564d5dc-56b7-4ed1-b162-72a179320a1c	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	ce91cd15-e3fa-4dfe-8f38-52188d702923	16	L	2025-10-19 00:19:00.093745+00	257	16	12.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	c3f58e77-172d-4c5b-a70e-f6e2718de818	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	f47d6300-b4dd-4d9a-ab0b-e9196b98207d	1	L	2025-10-19 00:20:41.230335+00	259	12	7	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	22d65ca4-9ee6-427b-8e3b-1ef7d44510ca	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	e5bd2954-cf2a-4f63-9fa2-50576c33b631	28	L	2025-10-19 00:21:14.918286+00	256	28	1.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	4fda0d78-8a86-4ac1-8b1e-ad0fc13c36dd	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	a2115ef5-9262-4cb0-872f-8d9c26fad40d	30	L	2025-10-19 00:21:19.389572+00	252	11	5.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	a47090cf-7713-4754-9f7d-5b9bdc36cfaa	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	a10d2e03-a21f-4d06-8752-a46f00fe648b	19	M	2025-10-19 00:22:58.927544+00	240	19	3	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	22a0c914-8a7c-45eb-b0ba-abeaa0da4426	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	d021ef41-a018-46b2-a041-0e0ce8d684b8	5	H	2025-10-19 00:23:48.705385+00	242	5	1.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	6ad24730-654c-4ca9-9bce-388de9e7d15e	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	be4e70f7-a563-4858-971f-7007001a227c	29	L	2025-10-19 00:26:06.311588+00	261	29	3	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	199fd4b6-d118-4c27-ae5c-7f6df7c28571	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	5f1076db-c38a-4250-8f63-b901fcd83cce	10	M	2025-10-19 00:29:19.104879+00	247	10	7	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	6085ad29-bc61-464a-90a1-a281d08c6daa	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	a10d2e03-a21f-4d06-8752-a46f00fe648b	19	L	2025-10-19 12:02:22.85521+00	240	19	3	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	9102045e-9851-4172-b0c5-8fdb4ca5c6e6	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	d6041bda-3122-4abd-98cd-440d718d5848	21	L	2025-10-19 12:02:34.608148+00	245	26	2.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	b771d85a-0b95-4942-8a0f-f61cc679ba19	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	b779443d-d9af-49d2-8259-6d8ed08ca2cb	23	L	2025-10-19 12:02:42.831038+00	254	6	4.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	0c0f3ac0-ff06-4953-90cd-0373bfacd5ca	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	d021ef41-a018-46b2-a041-0e0ce8d684b8	25	L	2025-10-19 12:02:48.017147+00	242	5	1.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	951c502f-e4c5-4005-b562-e903ffe60645	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	9ff54761-9d51-46d8-82c3-ecfde5287333	20	L	2025-10-19 12:02:59.086634+00	255	8	2.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	7fc3ef14-b7a2-4b07-8436-1a147157b5e9	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	ce91cd15-e3fa-4dfe-8f38-52188d702923	16	L	2025-10-19 12:03:02.861025+00	257	16	12.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	f2ce672f-9d9e-4f0c-9d95-f155809acc26	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	a3b2b894-f152-49e4-9a39-2accf094cd2c	22	L	2025-10-19 12:03:06.267159+00	258	22	6.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	0b0297a4-3bb8-4ae6-8d26-57a9a0bc9c34	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	5f1076db-c38a-4250-8f63-b901fcd83cce	24	L	2025-10-19 12:03:26.751653+00	247	10	7	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	86ef18be-bd26-43c2-9e9d-cd83d54853a6	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	b5de4725-8056-4e20-8a2e-712260bf3e53	14	L	2025-10-19 12:03:31.71512+00	248	18	1.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	7f3944e3-9bb6-45b3-b264-5d0075c206c6	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	8a1a95b1-e629-4e81-bbce-bcdea7b945bb	9	L	2025-10-19 12:03:34.948431+00	260	9	1.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	bdbb5673-ba6a-4dc4-980a-82caf87f3968	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	f47d6300-b4dd-4d9a-ab0b-e9196b98207d	1	L	2025-10-19 12:03:40.714719+00	259	12	7	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	3e7a1d09-1b09-423b-9dd8-7f3ce39e99b6	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	e5bd2954-cf2a-4f63-9fa2-50576c33b631	28	L	2025-10-19 12:03:47.742201+00	256	28	1.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	9db13192-b4e9-4d75-957b-f9d10035a698	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	a2115ef5-9262-4cb0-872f-8d9c26fad40d	11	L	2025-10-19 12:04:10.596974+00	252	11	5.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	e583cc9c-ea7c-479e-a2d2-c36e1a94721d	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	be4e70f7-a563-4858-971f-7007001a227c	13	L	2025-10-19 12:04:20.288201+00	261	29	3	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	075dcfe1-02e8-4f70-8e5e-062b42a3bbc9	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	a10d2e03-a21f-4d06-8752-a46f00fe648b	15	M	2025-10-19 12:13:48.609382+00	240	19	3	93abda42-cf85-4c5f-bd90-81210369b2dc	1776f335-f681-482a-ba1f-e1f390594883	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	d6041bda-3122-4abd-98cd-440d718d5848	21	M	2025-10-19 12:13:53.237538+00	245	26	2.5	93abda42-cf85-4c5f-bd90-81210369b2dc	785d7382-a766-4de5-af1c-63a8c703dfe3	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	b779443d-d9af-49d2-8259-6d8ed08ca2cb	6	M	2025-10-19 12:14:01.635857+00	254	6	4.5	93abda42-cf85-4c5f-bd90-81210369b2dc	2dbe9df1-ff70-4740-8985-3e2b15de6757	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	d021ef41-a018-46b2-a041-0e0ce8d684b8	5	M	2025-10-19 12:14:05.781498+00	242	5	1.5	93abda42-cf85-4c5f-bd90-81210369b2dc	b5ba72e5-d45a-454a-93cb-28677321fa59	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	9ff54761-9d51-46d8-82c3-ecfde5287333	8	M	2025-10-19 12:14:11.656399+00	255	8	2.5	93abda42-cf85-4c5f-bd90-81210369b2dc	b0716bd1-6e29-409c-b5cd-47649ab4e89f	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	ce91cd15-e3fa-4dfe-8f38-52188d702923	16	M	2025-10-19 12:14:22.077611+00	257	16	12.5	93abda42-cf85-4c5f-bd90-81210369b2dc	e38141a6-c95f-436a-8568-b3aa645e074b	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	a3b2b894-f152-49e4-9a39-2accf094cd2c	22	M	2025-10-19 12:14:36.249821+00	258	22	6.5	93abda42-cf85-4c5f-bd90-81210369b2dc	787b5f5b-9ebe-4166-9fa7-20e8125a3635	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	5f1076db-c38a-4250-8f63-b901fcd83cce	24	M	2025-10-19 12:15:04.240574+00	247	10	7	93abda42-cf85-4c5f-bd90-81210369b2dc	7b1b725b-98d3-476f-af36-23e46bc4458b	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	b5de4725-8056-4e20-8a2e-712260bf3e53	14	M	2025-10-19 12:15:08.884901+00	248	18	1.5	93abda42-cf85-4c5f-bd90-81210369b2dc	8ca5c774-11ad-4dfc-8d31-8d1738132bd9	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	8a1a95b1-e629-4e81-bbce-bcdea7b945bb	32	H	2025-10-19 12:15:11.064481+00	260	9	1.5	93abda42-cf85-4c5f-bd90-81210369b2dc	49f114bc-ae72-4282-9c57-e951f4e7a4b4	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	f47d6300-b4dd-4d9a-ab0b-e9196b98207d	12	M	2025-10-19 12:15:19.683864+00	259	12	7	93abda42-cf85-4c5f-bd90-81210369b2dc	f25a76dd-2e64-47e5-ab97-22ea337cc2eb	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	e5bd2954-cf2a-4f63-9fa2-50576c33b631	28	M	2025-10-19 12:15:33.699884+00	256	28	1.5	93abda42-cf85-4c5f-bd90-81210369b2dc	53dd9d4d-6fd9-41fc-bec0-abfa9d86aa98	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	a2115ef5-9262-4cb0-872f-8d9c26fad40d	11	M	2025-10-19 12:15:40.396712+00	252	11	5.5	93abda42-cf85-4c5f-bd90-81210369b2dc	4d65a33a-bfd4-40a2-b16c-95bd4cf8a48f	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	be4e70f7-a563-4858-971f-7007001a227c	29	M	2025-10-19 12:15:49.733115+00	261	29	3	93abda42-cf85-4c5f-bd90-81210369b2dc	330c54fb-2e1f-4651-88f6-5dbe3a543032	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	d6041bda-3122-4abd-98cd-440d718d5848	21	H	2025-10-19 14:44:59.580356+00	245	26	2.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	de591b00-c74d-4d59-92f9-6c4b47a619f9	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	b779443d-d9af-49d2-8259-6d8ed08ca2cb	23	H	2025-10-19 14:45:03.885157+00	254	6	4.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	73a900ed-a3fe-47f2-b2a7-6ddaa2ededcc	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	d021ef41-a018-46b2-a041-0e0ce8d684b8	5	M	2025-10-19 14:45:08.43178+00	242	5	1.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	3200b226-fc54-4af0-a103-266cb8d2cc10	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	ce91cd15-e3fa-4dfe-8f38-52188d702923	17	A	2025-10-19 14:45:16.426924+00	257	16	12.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	dde4f1a8-a193-43a3-98f0-b15635c2f458	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	9ff54761-9d51-46d8-82c3-ecfde5287333	8	M	2025-10-19 14:45:21.695132+00	255	8	2.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	37e4bcea-41ea-463c-9ec2-4b7a5057b2c2	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	a3b2b894-f152-49e4-9a39-2accf094cd2c	22	L	2025-10-19 14:45:31.980793+00	258	22	6.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	b36c8902-446e-4d61-813d-c3d6babeae38	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	5f1076db-c38a-4250-8f63-b901fcd83cce	24	M	2025-10-19 14:45:34.676681+00	247	10	7	d8db1ea2-76a7-4cb1-8025-167bef10c724	74f03ff7-bb5f-4e42-9f1f-2e7ef206d3c3	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	b5de4725-8056-4e20-8a2e-712260bf3e53	14	M	2025-10-19 14:45:39.173988+00	248	18	1.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	5eb1c972-1aec-466f-866c-b0c08d7626e7	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	8a1a95b1-e629-4e81-bbce-bcdea7b945bb	32	H	2025-10-19 14:45:42.249339+00	260	9	1.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	a2913305-ffb6-4a9e-81ca-1bb669cd468f	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	f47d6300-b4dd-4d9a-ab0b-e9196b98207d	12	M	2025-10-19 14:45:48.601172+00	259	12	7	d8db1ea2-76a7-4cb1-8025-167bef10c724	686bde3a-51ad-4ed9-8622-44bae98b230a	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	e5bd2954-cf2a-4f63-9fa2-50576c33b631	2	M	2025-10-19 14:45:50.892441+00	256	28	1.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	67dbc7a3-43f9-4291-87f5-688c724b71a1	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	a2115ef5-9262-4cb0-872f-8d9c26fad40d	30	M	2025-10-19 14:45:54.184216+00	252	11	5.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	7cbf685c-2c51-430b-bd97-29a7a518a78d	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	be4e70f7-a563-4858-971f-7007001a227c	13	H	2025-10-19 14:45:57.349719+00	261	29	3	d8db1ea2-76a7-4cb1-8025-167bef10c724	d4de86c9-76b0-4701-ab4e-077fa21d9e43	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	b779443d-d9af-49d2-8259-6d8ed08ca2cb	23	L	2025-10-19 15:19:28.058941+00	254	6	4.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	c29a1b58-9b7a-4b55-bd12-526c434b11bb	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	b779443d-d9af-49d2-8259-6d8ed08ca2cb	6	M	2025-10-19 15:32:03.112429+00	254	6	4.5	b75858d9-3f6f-46b7-be49-6884b28493f6	a4662c75-beb2-4ccc-a9ec-3dd0859f1c68	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	9ff54761-9d51-46d8-82c3-ecfde5287333	20	M	2025-10-19 15:32:20.495894+00	255	8	2.5	b75858d9-3f6f-46b7-be49-6884b28493f6	642a6fc6-de30-458d-babe-cf6902dcce76	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	ce91cd15-e3fa-4dfe-8f38-52188d702923	17	M	2025-10-19 15:32:41.021667+00	257	16	12.5	b75858d9-3f6f-46b7-be49-6884b28493f6	055f26cd-fa22-4641-ac06-8b7d72e69e4c	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	a3b2b894-f152-49e4-9a39-2accf094cd2c	22	L	2025-10-19 15:32:32.472839+00	258	22	6.5	b75858d9-3f6f-46b7-be49-6884b28493f6	65a998ae-c546-4990-82f8-143276bc672f	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	d021ef41-a018-46b2-a041-0e0ce8d684b8	5	M	2025-10-19 15:32:52.556436+00	263	25	1.5	b75858d9-3f6f-46b7-be49-6884b28493f6	8bd4d8f2-2b5a-4968-9fa7-6a3e6e2bd8c5	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	d6041bda-3122-4abd-98cd-440d718d5848	26	H	2025-10-19 15:33:02.812057+00	245	26	2.5	b75858d9-3f6f-46b7-be49-6884b28493f6	05814a6e-5e01-45ec-a30a-3329a355fcf7	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	5f1076db-c38a-4250-8f63-b901fcd83cce	10	L	2025-10-19 15:33:23.583793+00	264	10	8.5	b75858d9-3f6f-46b7-be49-6884b28493f6	4083473e-6b70-46b2-a931-f1a2d96b0340	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	b5de4725-8056-4e20-8a2e-712260bf3e53	14	L	2025-10-19 15:33:33.847671+00	265	18	2.5	b75858d9-3f6f-46b7-be49-6884b28493f6	c970fe2d-cbbd-44eb-abb6-18ea86623be0	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	f47d6300-b4dd-4d9a-ab0b-e9196b98207d	12	M	2025-10-19 15:33:42.996889+00	259	12	7	b75858d9-3f6f-46b7-be49-6884b28493f6	d9e3317f-b60b-4e9b-b149-0c2ea03f9fe1	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	8a1a95b1-e629-4e81-bbce-bcdea7b945bb	9	M	2025-10-19 15:33:59.025744+00	260	9	1.5	b75858d9-3f6f-46b7-be49-6884b28493f6	ab725ec8-daf4-484e-b1bc-95fd1a27a05c	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	a2115ef5-9262-4cb0-872f-8d9c26fad40d	11	M	2025-10-19 15:34:14.286551+00	252	11	5.5	b75858d9-3f6f-46b7-be49-6884b28493f6	398ad52f-9199-4cde-a90b-9e3d7993b051	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	e5bd2954-cf2a-4f63-9fa2-50576c33b631	28	M	2025-10-19 15:34:20.309866+00	266	2	1.5	b75858d9-3f6f-46b7-be49-6884b28493f6	52bcdb72-896a-4db0-8575-765c2f948dbc	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	be4e70f7-a563-4858-971f-7007001a227c	29	H	2025-10-19 15:34:32.90627+00	261	29	3	b75858d9-3f6f-46b7-be49-6884b28493f6	5032596e-14e3-4d85-a355-3f1f74ac6342	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	a3b2b894-f152-49e4-9a39-2accf094cd2c	31	L	2025-10-19 16:03:57.887019+00	258	22	6.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	d177e26e-d6bb-4cc9-9664-83f2919acc1e	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	b779443d-d9af-49d2-8259-6d8ed08ca2cb	6	M	2025-10-19 16:26:16.834106+00	254	6	4.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	1d5fd9dd-4c12-4fbd-8eb3-5a799ccf56c5	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	9ff54761-9d51-46d8-82c3-ecfde5287333	8	M	2025-10-19 16:26:20.289958+00	255	8	2.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	3f02aa04-f377-4d45-a025-c84cf094b33a	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	a3b2b894-f152-49e4-9a39-2accf094cd2c	22	H	2025-10-19 16:26:26.163146+00	258	22	6.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	0074d516-cf15-4775-8a20-c87c8cd6b156	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	ce91cd15-e3fa-4dfe-8f38-52188d702923	16	M	2025-10-19 16:26:34.084149+00	257	16	12.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	3f2b702c-5803-425b-a94a-c305bf2a7658	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	d021ef41-a018-46b2-a041-0e0ce8d684b8	25	M	2025-10-19 16:26:41.326537+00	263	25	1.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	27a0b9b6-1c2b-4fbb-bfe2-d26d49bd16da	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	d6041bda-3122-4abd-98cd-440d718d5848	26	L	2025-10-19 16:26:50.336047+00	245	26	2.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	56235264-6fd8-40a7-ab7f-ca8a84f9a207	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	5f1076db-c38a-4250-8f63-b901fcd83cce	24	M	2025-10-19 16:26:54.791141+00	264	10	8.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	dac30573-b04f-4add-ae28-dd011f80327e	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	b5de4725-8056-4e20-8a2e-712260bf3e53	18	H	2025-10-19 16:27:00.780498+00	265	18	2.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	49cc46c8-23f1-4a37-b840-412e7e98145e	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	f47d6300-b4dd-4d9a-ab0b-e9196b98207d	12	H	2025-10-19 16:27:05.777785+00	259	12	7	61183ed6-88ce-418b-8bdf-f16c57a350f7	87e141dd-aabc-41aa-afb0-cccef244b53b	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	8a1a95b1-e629-4e81-bbce-bcdea7b945bb	32	M	2025-10-19 16:27:09.080233+00	260	9	1.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	020da9a4-0a20-4231-9def-ee213e3a5a63	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	e5bd2954-cf2a-4f63-9fa2-50576c33b631	2	H	2025-10-19 16:27:16.092958+00	266	2	1.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	bfe918f8-fac7-4514-8c76-c084990a4893	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	a2115ef5-9262-4cb0-872f-8d9c26fad40d	30	M	2025-10-19 16:27:25.042859+00	252	11	5.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	23634c58-1a5a-43ca-bec2-87c15d22e358	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	be4e70f7-a563-4858-971f-7007001a227c	29	M	2025-10-19 16:27:30.572701+00	261	29	3	61183ed6-88ce-418b-8bdf-f16c57a350f7	8b4c1015-a3e8-47ed-ab28-690babd6d893	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	b5de4725-8056-4e20-8a2e-712260bf3e53	18	L	2025-10-19 17:24:04.259248+00	265	18	2.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	e45e35e7-1e21-4d3d-a4e5-f80753cb3f31	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	8a1a95b1-e629-4e81-bbce-bcdea7b945bb	32	L	2025-10-19 20:22:10.688364+00	260	9	1.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	5fb529d2-3077-4630-be49-b4a93df12f69	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	25dd832e-7722-464a-b421-822312d3c78f	18	L	2025-10-23 21:03:18.621662+00	287	18	3	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	3c4cd083-dfd8-4657-b19a-6ee4b4bd53df	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	25dd832e-7722-464a-b421-822312d3c78f	18	L	2025-10-23 23:45:34.390815+00	287	18	3	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	55329999-87ce-4370-9eed-24cb5e47a21c	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	a0bc9b29-3caf-4f8c-b95e-0bfea2440159	7	M	2025-10-26 03:25:52.426324+00	271	7	6.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	56afd574-bf30-4389-9e41-4582b97e7561	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	c4d0ce83-8c64-4335-a1c6-dbaef3dc437d	22	L	2025-10-26 03:26:05.065684+00	272	22	7	61183ed6-88ce-418b-8bdf-f16c57a350f7	63de56a0-11b4-47e9-ac98-9f3f5efd0c01	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	03dd600b-e67e-4366-aa83-4f8064d5e637	4	M	2025-10-26 03:26:10.192426+00	270	4	7.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	8dbaf6a1-8cf1-43c5-bca3-e1b0e09d5903	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	046f08a3-ef04-4ded-8b18-b2515807cab2	2	H	2025-10-26 03:26:17.515172+00	290	2	7	61183ed6-88ce-418b-8bdf-f16c57a350f7	4c1c0fa1-963d-41c1-b7fb-38657b76995f	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	5671a21f-0b89-492d-853d-59ae0cb71a52	24	L	2025-10-26 03:26:23.520768+00	284	26	7.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	0d06361f-fa4d-4d0e-86c7-f0a9bf464086	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	acd96b50-45a0-4a07-a642-9b81bfc8d0c1	6	M	2025-10-26 03:26:37.80764+00	291	3	1.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	65143582-73d0-4c90-be85-c640fefcc425	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	4a4eae9c-49f2-499d-98d0-74ed05ec8de5	14	M	2025-10-26 03:27:05.891382+00	277	14	14.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	255e478a-cef2-4aa4-88d9-9e134c084982	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	76a24644-043c-480c-8da7-ca22493a0a1e	9	M	2025-10-26 03:27:21.78713+00	282	10	3.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	78dec6f0-5b84-47e2-9a62-76c93613879e	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	92b36759-ce64-498d-ba8b-a7f12943e57c	12	L	2025-10-26 03:27:43.12735+00	285	12	3	61183ed6-88ce-418b-8bdf-f16c57a350f7	91514398-d6b5-468a-979f-a66aa11a761c	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	efaf70eb-ea6d-4e22-8266-344f60da958b	16	M	2025-10-26 03:27:53.982727+00	286	16	11.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	d1db23ae-a211-486b-8db2-fc9892df33bd	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	54bbb810-a9f6-429d-8566-74105f370675	28	M	2025-10-26 03:28:27.236516+00	289	13	2.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	68b25163-7c59-4200-9259-c60576b99277	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	d40a4cd2-199d-4eb4-8f53-56280a7c2cea	30	A	2025-10-26 03:28:31.606617+00	292	30	3.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	f6944559-f19a-43bc-bc9a-df1ec47907e0	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	a0bc9b29-3caf-4f8c-b95e-0bfea2440159	25	L	2025-10-26 12:11:13.00934+00	271	7	6.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	a065bc32-5efe-4715-a5af-cf88b9fa77c3	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	c4d0ce83-8c64-4335-a1c6-dbaef3dc437d	22	L	2025-10-26 12:11:36.262235+00	272	22	7	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	752c1162-f6b1-41be-a6ee-b30539ab6baa	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	03dd600b-e67e-4366-aa83-4f8064d5e637	4	L	2025-10-26 12:11:42.2572+00	270	4	7.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	f80a8c71-2988-43f7-a45b-62951054fc02	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	046f08a3-ef04-4ded-8b18-b2515807cab2	2	L	2025-10-26 12:11:50.250476+00	290	2	7	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	20c48664-f609-4d28-bf68-ae2fa696e65b	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	5671a21f-0b89-492d-853d-59ae0cb71a52	26	L	2025-10-26 12:14:27.900322+00	284	26	7.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	b334e0e6-5a6c-4dc7-85ba-a5a6e10cafad	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	acd96b50-45a0-4a07-a642-9b81bfc8d0c1	3	L	2025-10-26 12:14:50.715965+00	291	3	1.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	effb4eef-4c29-4f0b-b9b4-fa7e51c4c29c	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	54bbb810-a9f6-429d-8566-74105f370675	28	L	2025-10-26 12:50:36.637004+00	289	13	2.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	fa54fcf5-c1ae-4b4a-83f8-45953bb43562	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	d40a4cd2-199d-4eb4-8f53-56280a7c2cea	30	L	2025-10-26 12:50:43.215241+00	292	30	3.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	b1c17b1d-a713-44e4-87fb-85f93e34ffba	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	4a4eae9c-49f2-499d-98d0-74ed05ec8de5	14	M	2025-10-26 12:50:53.225577+00	277	14	14.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	8c1c97d5-9d65-4480-9c15-5ec9d8345538	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	76a24644-043c-480c-8da7-ca22493a0a1e	9	L	2025-10-26 12:51:03.470147+00	282	10	3.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	09c6a46e-b9b3-42cd-88a3-c08a6b567827	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	efaf70eb-ea6d-4e22-8266-344f60da958b	32	L	2025-10-26 12:51:19.394548+00	286	16	11.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	94cc3278-e6a7-40a4-9bc3-77509dc8bf45	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	c4d0ce83-8c64-4335-a1c6-dbaef3dc437d	22	L	2025-10-26 15:11:36.773223+00	272	22	7	b75858d9-3f6f-46b7-be49-6884b28493f6	74fb72ce-03ed-49cd-9e25-a21d3ff236cf	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	03dd600b-e67e-4366-aa83-4f8064d5e637	4	L	2025-10-26 15:12:02.171356+00	270	4	7.5	b75858d9-3f6f-46b7-be49-6884b28493f6	abfeb2b9-084b-4a0e-ad4d-b4d02dbefc68	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	046f08a3-ef04-4ded-8b18-b2515807cab2	2	M	2025-10-26 15:12:11.958455+00	290	2	7	b75858d9-3f6f-46b7-be49-6884b28493f6	8b26cbca-70c3-4222-a126-f4d535879ac5	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	5671a21f-0b89-492d-853d-59ae0cb71a52	24	M	2025-10-26 15:12:21.223544+00	284	26	7.5	b75858d9-3f6f-46b7-be49-6884b28493f6	8b55f2e2-bdb4-48b1-81a3-2989ffdf0906	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	acd96b50-45a0-4a07-a642-9b81bfc8d0c1	6	M	2025-10-26 15:12:39.113331+00	291	3	1.5	b75858d9-3f6f-46b7-be49-6884b28493f6	58100891-3f2e-4aff-8361-6f75001553a5	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	d40a4cd2-199d-4eb4-8f53-56280a7c2cea	30	M	2025-10-26 15:14:43.314041+00	292	30	3.5	b75858d9-3f6f-46b7-be49-6884b28493f6	56466eb3-825d-43e1-a35f-85e44311aefe	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	54bbb810-a9f6-429d-8566-74105f370675	28	M	2025-10-26 15:14:53.146092+00	289	13	2.5	b75858d9-3f6f-46b7-be49-6884b28493f6	75bdea1b-45d3-45e4-8a9e-ffaee6c03d8c	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	4a4eae9c-49f2-499d-98d0-74ed05ec8de5	31	L	2025-10-26 15:15:02.962357+00	277	14	14.5	b75858d9-3f6f-46b7-be49-6884b28493f6	e599c093-af49-44cc-aadb-a84bf9a61c33	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	76a24644-043c-480c-8da7-ca22493a0a1e	10	H	2025-10-26 15:15:17.461713+00	282	10	3.5	b75858d9-3f6f-46b7-be49-6884b28493f6	f7e8752a-0c8a-403e-856b-9d12705468c6	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	92b36759-ce64-498d-ba8b-a7f12943e57c	27	M	2025-10-26 15:15:33.636565+00	285	12	3	b75858d9-3f6f-46b7-be49-6884b28493f6	561134cf-a140-4c6c-a646-50a40643c897	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	efaf70eb-ea6d-4e22-8266-344f60da958b	16	M	2025-10-26 15:15:41.838249+00	286	16	11.5	b75858d9-3f6f-46b7-be49-6884b28493f6	59f6fc68-cc5b-4d4a-b973-cde6a063903e	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	a0bc9b29-3caf-4f8c-b95e-0bfea2440159	25	M	2025-10-26 15:16:04.06187+00	271	7	6.5	b75858d9-3f6f-46b7-be49-6884b28493f6	4e08a25f-1236-4ca0-96a7-d1ac2f36519b	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	a0bc9b29-3caf-4f8c-b95e-0bfea2440159	7	M	2025-10-26 15:49:09.81332+00	271	7	6.5	93abda42-cf85-4c5f-bd90-81210369b2dc	51f4aa3c-d7b4-466f-9171-91c857718579	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	c4d0ce83-8c64-4335-a1c6-dbaef3dc437d	8	M	2025-10-26 15:49:16.63241+00	272	22	7	93abda42-cf85-4c5f-bd90-81210369b2dc	ae5c2526-6669-4250-844c-c9f4b05dae37	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	03dd600b-e67e-4366-aa83-4f8064d5e637	5	L	2025-10-26 15:49:21.484045+00	270	4	7.5	93abda42-cf85-4c5f-bd90-81210369b2dc	41571e1d-ca22-488b-ba6b-324a56cef646	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	046f08a3-ef04-4ded-8b18-b2515807cab2	2	M	2025-10-26 15:49:31.704648+00	290	2	7	93abda42-cf85-4c5f-bd90-81210369b2dc	c747d592-ad8b-48f7-9062-d8182b0d2589	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	5671a21f-0b89-492d-853d-59ae0cb71a52	24	L	2025-10-26 15:49:38.414262+00	284	26	7.5	93abda42-cf85-4c5f-bd90-81210369b2dc	44d54cd6-819e-4fc6-9c84-b65b0674efde	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	acd96b50-45a0-4a07-a642-9b81bfc8d0c1	6	M	2025-10-26 15:49:49.484499+00	291	3	1.5	93abda42-cf85-4c5f-bd90-81210369b2dc	2f088996-e57d-48a9-a581-6b37486d1b4f	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	d40a4cd2-199d-4eb4-8f53-56280a7c2cea	30	M	2025-10-26 15:50:09.345423+00	292	30	3.5	93abda42-cf85-4c5f-bd90-81210369b2dc	4a869257-ed4f-4bc2-aeb4-753ae547d509	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	4a4eae9c-49f2-499d-98d0-74ed05ec8de5	14	M	2025-10-26 15:50:12.350153+00	277	14	14.5	93abda42-cf85-4c5f-bd90-81210369b2dc	89599703-e851-42f9-9589-aa631a656918	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	76a24644-043c-480c-8da7-ca22493a0a1e	10	M	2025-10-26 15:50:16.567453+00	282	10	3.5	93abda42-cf85-4c5f-bd90-81210369b2dc	5cfa7088-984e-488a-8174-1fc79dedbf57	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	92b36759-ce64-498d-ba8b-a7f12943e57c	27	M	2025-10-26 15:50:22.771239+00	285	12	3	93abda42-cf85-4c5f-bd90-81210369b2dc	4d382b15-6c32-4200-811b-829ee4f44dbb	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	efaf70eb-ea6d-4e22-8266-344f60da958b	32	M	2025-10-26 15:50:29.450055+00	286	16	11.5	93abda42-cf85-4c5f-bd90-81210369b2dc	39d09081-8881-4365-8d57-b9b3e6eb6d7b	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	a0bc9b29-3caf-4f8c-b95e-0bfea2440159	7	L	2025-10-26 15:58:47.585263+00	271	7	6.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	6342475d-da6c-4bc9-b9bc-5becef771866	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	c4d0ce83-8c64-4335-a1c6-dbaef3dc437d	8	L	2025-10-26 15:59:14.164549+00	272	22	7	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	cbe89db9-6964-4912-892b-f258488311d6	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	03dd600b-e67e-4366-aa83-4f8064d5e637	5	L	2025-10-26 15:59:31.488823+00	270	4	7.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	68d5c451-08cb-4240-9718-bc6d6876dba5	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	046f08a3-ef04-4ded-8b18-b2515807cab2	2	L	2025-10-26 15:59:45.847433+00	290	2	7	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	871fa24d-428b-4f58-bd31-62f04bbb6dbd	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	5671a21f-0b89-492d-853d-59ae0cb71a52	24	L	2025-10-26 16:00:00.646855+00	284	26	7.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	1e02710b-d3f0-410e-af7f-c9e735e4c3f0	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	acd96b50-45a0-4a07-a642-9b81bfc8d0c1	6	L	2025-10-26 16:00:05.559681+00	291	3	1.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	4bc3b3fa-1b4f-4141-878f-c66c256043f3	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	54bbb810-a9f6-429d-8566-74105f370675	28	L	2025-10-26 16:00:15.693678+00	289	13	2.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	b2be3bec-c464-4a02-9bb2-9cbeaffb3524	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	d40a4cd2-199d-4eb4-8f53-56280a7c2cea	30	L	2025-10-26 16:00:18.723297+00	292	30	3.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	01306f1c-f243-4b7b-b338-9678432df08e	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	4a4eae9c-49f2-499d-98d0-74ed05ec8de5	14	L	2025-10-26 16:00:26.683129+00	277	14	14.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	c6b4b373-e443-4e16-8cd7-6a72d806339e	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	76a24644-043c-480c-8da7-ca22493a0a1e	9	L	2025-10-26 16:00:31.185994+00	282	10	3.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	26e25658-2859-4331-bd30-cb9511317fdc	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	92b36759-ce64-498d-ba8b-a7f12943e57c	27	L	2025-10-26 16:00:34.852025+00	285	12	3	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	25109c8e-7811-4dc1-a253-ce2de9825b03	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	efaf70eb-ea6d-4e22-8266-344f60da958b	32	L	2025-10-26 16:00:46.724867+00	286	16	11.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	7fd609c9-f056-4b1f-8618-11323f289158	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	a0bc9b29-3caf-4f8c-b95e-0bfea2440159	25	M	2025-10-26 16:43:05.193044+00	271	7	6.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	cedbd18b-0b16-439e-8755-f016a6ba3c80	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	c4d0ce83-8c64-4335-a1c6-dbaef3dc437d	8	H	2025-10-26 16:43:19.412935+00	272	22	7	d8db1ea2-76a7-4cb1-8025-167bef10c724	32debbb1-2eb8-42e5-9a13-4cfe3c771148	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	03dd600b-e67e-4366-aa83-4f8064d5e637	5	M	2025-10-26 16:43:24.496959+00	270	4	7.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	26da3183-75e7-4875-800f-869657784c6b	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	046f08a3-ef04-4ded-8b18-b2515807cab2	2	H	2025-10-26 16:43:33.064628+00	290	2	7	d8db1ea2-76a7-4cb1-8025-167bef10c724	43e50017-2334-4fd3-918d-b85f2b1ac98b	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	5671a21f-0b89-492d-853d-59ae0cb71a52	24	M	2025-10-26 16:43:37.263393+00	284	26	7.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	c42099a2-c47e-448e-a20e-399ed30e3a0a	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	acd96b50-45a0-4a07-a642-9b81bfc8d0c1	6	H	2025-10-26 16:43:42.5043+00	291	3	1.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	060c6b65-75af-4746-aa08-308d4df285d5	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	54bbb810-a9f6-429d-8566-74105f370675	28	H	2025-10-26 16:43:48.950395+00	289	13	2.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	0ed1e97c-e01a-48db-b103-2f9837fa5848	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	d40a4cd2-199d-4eb4-8f53-56280a7c2cea	30	M	2025-10-26 16:43:52.137866+00	292	30	3.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	964454ca-5781-449f-9263-f4cffa30b480	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	4a4eae9c-49f2-499d-98d0-74ed05ec8de5	31	M	2025-10-26 16:43:56.095189+00	277	14	14.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	0be30f53-ce99-4023-a316-29c20c045b3e	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	76a24644-043c-480c-8da7-ca22493a0a1e	9	H	2025-10-26 16:44:03.821748+00	282	10	3.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	1aa74417-5023-43ca-a6f8-834dbefeb2bd	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	92b36759-ce64-498d-ba8b-a7f12943e57c	12	M	2025-10-26 16:44:09.311718+00	285	12	3	d8db1ea2-76a7-4cb1-8025-167bef10c724	ae9b8a8a-a084-4a6e-b4f2-2fb39a986bc3	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	efaf70eb-ea6d-4e22-8266-344f60da958b	32	M	2025-10-26 16:44:13.958865+00	286	16	11.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	570542e5-5c4c-4c76-b325-517bec51dc46	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	92b36759-ce64-498d-ba8b-a7f12943e57c	27	L	2025-10-26 23:35:39.12861+00	285	12	3	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	0e2e0839-dfd2-4a84-921f-292064efed9c	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	f17681b2-38c7-4e9c-828b-72a18f4d0197	20	L	2025-10-29 23:31:19.7119+00	295	3	7.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	7f9ba32f-a839-4e43-bf4f-c7103e491b6e	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	f17681b2-38c7-4e9c-828b-72a18f4d0197	3	A	2025-10-30 14:48:26.550485+00	295	3	7.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	8420923a-733e-4d1c-a5d9-7035f6b44063	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	ec97ca0a-b28f-47fc-ad2e-3ce8360cc08e	11	M	2025-11-02 14:41:19.208425+00	300	11	8.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	da73ea82-04e2-4f2a-a512-445b6b979edd	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	7892dd22-384d-420b-8ac9-b38f80357891	5	L	2025-11-02 14:41:27.144186+00	311	12	13.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	f42243bc-2c6f-4838-903f-7518ada781fe	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	aec4a3ad-d44d-41e6-9406-ed365058f749	22	M	2025-11-02 14:41:42.764313+00	315	22	4.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	9a861672-0232-445e-9f80-db2846e4c195	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	85783c17-265e-45dc-8071-cefa65a6a341	27	L	2025-11-02 14:41:51.513751+00	318	14	3.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	8607dbcb-f0a1-42f0-9f7c-826e83848051	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	95b479b5-7350-46eb-8d94-6b207de641c3	18	M	2025-11-02 14:42:02.925324+00	309	18	9.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	f4fd363b-0e81-4910-ae0e-b5717e398ae7	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	1a3df7be-f3f0-47b3-a753-354988a838ed	6	M	2025-11-02 14:42:12.248059+00	298	6	2.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	ce4f2b00-d3cb-4c87-bd0f-2335c2456f23	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	112270ae-a6ed-426b-adac-56a0afff3476	13	M	2025-11-02 14:42:19.033505+00	299	13	1.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	79024a83-d955-4cf0-834f-61fcbe766d99	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	f3676ad2-38c0-4af9-b8ae-f57be8657020	24	M	2025-11-02 14:42:27.734157+00	303	28	2.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	157685b9-2e81-4192-b298-bc2a5bdd3799	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	7892dd22-384d-420b-8ac9-b38f80357891	5	H	2025-11-02 14:42:33.09129+00	311	12	13.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	0b510aeb-e7bc-40f9-97e2-8e949d9c83dc	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	aec4a3ad-d44d-41e6-9406-ed365058f749	2	M	2025-11-02 14:42:39.676703+00	315	22	4.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	a1c470a4-7437-4971-911f-9fcbb41e7278	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	e2a776f8-11a6-4a08-9c21-ee1a62e72176	23	L	2025-11-02 14:42:41.091982+00	310	19	14.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	059101d5-38ea-444d-9d42-ab9a913c95af	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	85783c17-265e-45dc-8071-cefa65a6a341	14	H	2025-11-02 14:42:43.054355+00	318	14	3.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	b33e2dd1-78f6-4c10-8245-b8050eb33c47	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	95b479b5-7350-46eb-8d94-6b207de641c3	31	M	2025-11-02 14:42:47.23527+00	309	18	9.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	b33d65e1-aa82-4a1e-b432-072692b264ca	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	1a3df7be-f3f0-47b3-a753-354988a838ed	7	H	2025-11-02 14:42:50.87046+00	298	6	2.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	1236eea3-68bf-437b-9a34-b23b07c2e7ec	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	9bd25183-b8a2-4e89-a87a-7cbe662d3f98	15	H	2025-11-02 14:42:55.556028+00	316	15	2.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	4c9b7c42-892d-4a5b-90e6-888ad9b3a26d	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	67db401c-4a5d-49ad-83b6-a80fbd9e9061	4	H	2025-11-02 14:43:03.295933+00	306	16	1.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	1a9d880a-03c9-403f-b4f5-6884bed3cfde	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	112270ae-a6ed-426b-adac-56a0afff3476	13	H	2025-11-02 14:43:04.912416+00	299	13	1.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	0db7676f-6c91-406e-b278-fccd899688f1	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	f3676ad2-38c0-4af9-b8ae-f57be8657020	28	M	2025-11-02 14:43:15.923285+00	303	28	2.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	584c45ce-901e-4426-8d86-583ff694cb2d	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	e2a776f8-11a6-4a08-9c21-ee1a62e72176	23	M	2025-11-02 14:43:20.637206+00	310	19	14.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	0f505675-9102-4c47-938b-f5370b936e57	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	d1c9abe6-1923-41d8-b06b-cae30c9bd58f	32	M	2025-11-02 14:43:25.405658+00	312	29	3	61183ed6-88ce-418b-8bdf-f16c57a350f7	f1ab4113-2ce5-4e06-858f-b64c7922e609	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	9bd25183-b8a2-4e89-a87a-7cbe662d3f98	15	M	2025-11-02 14:43:26.861978+00	316	15	2.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	401734ec-72bd-4c75-a13c-9aa894d852ea	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	67db401c-4a5d-49ad-83b6-a80fbd9e9061	4	M	2025-11-02 14:43:29.857805+00	306	16	1.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	3c1d7018-1234-4b10-9eb8-f622f5c8cb53	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	e488eb19-d62f-430e-9d7a-4e676413412e	9	H	2025-11-02 14:43:29.920727+00	319	9	3	61183ed6-88ce-418b-8bdf-f16c57a350f7	79a5c348-69f9-4a2d-bf26-2d75cfcd4f75	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	d1c9abe6-1923-41d8-b06b-cae30c9bd58f	29	M	2025-11-02 14:43:37.349622+00	312	29	3	d8db1ea2-76a7-4cb1-8025-167bef10c724	1d77a3c3-dc81-4548-a980-00f56f7978bc	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	e488eb19-d62f-430e-9d7a-4e676413412e	9	H	2025-11-02 14:43:41.007035+00	319	9	3	d8db1ea2-76a7-4cb1-8025-167bef10c724	c7ca0935-de99-4c66-9822-4a5960cc7877	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	ec97ca0a-b28f-47fc-ad2e-3ce8360cc08e	11	H	2025-11-02 14:43:46.068929+00	300	11	8.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	862e239b-f68f-4e4e-8556-2eddc66f359c	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	ec97ca0a-b28f-47fc-ad2e-3ce8360cc08e	21	L	2025-11-02 15:55:23.577452+00	300	11	8.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	751297cb-c0f8-4cf0-8c75-2530c8ef0b87	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	7892dd22-384d-420b-8ac9-b38f80357891	12	M	2025-11-02 15:55:32.592242+00	311	12	13.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	af86ed9f-9e0e-4c6d-a041-45f7113af0ab	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	aec4a3ad-d44d-41e6-9406-ed365058f749	2	L	2025-11-02 15:55:44.384952+00	315	22	4.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	177aef12-add7-4346-a100-2cc426d830b5	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	85783c17-265e-45dc-8071-cefa65a6a341	14	H	2025-11-02 15:55:48.623907+00	318	14	3.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	a7f805bb-1d37-43d8-89a6-5b86fe24e5e3	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	ec97ca0a-b28f-47fc-ad2e-3ce8360cc08e	11	M	2025-11-02 16:05:09.771668+00	300	11	8.5	b75858d9-3f6f-46b7-be49-6884b28493f6	009ba32e-4ec4-4824-a4b0-2d6b6cd4674a	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	7892dd22-384d-420b-8ac9-b38f80357891	5	L	2025-11-02 16:05:20.356799+00	311	12	13.5	b75858d9-3f6f-46b7-be49-6884b28493f6	d1a2748a-fdd5-488b-9009-e3689c2b6a6b	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	aec4a3ad-d44d-41e6-9406-ed365058f749	22	H	2025-11-02 16:05:28.823556+00	315	22	4.5	b75858d9-3f6f-46b7-be49-6884b28493f6	5c391fce-c53f-4dff-aa85-05081e382a99	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	85783c17-265e-45dc-8071-cefa65a6a341	14	L	2025-11-02 16:05:40.146459+00	318	14	3.5	b75858d9-3f6f-46b7-be49-6884b28493f6	bd2a6d63-acca-49af-91d7-3bb31bb4ff05	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	95b479b5-7350-46eb-8d94-6b207de641c3	31	L	2025-11-02 16:05:47.693826+00	309	18	9.5	b75858d9-3f6f-46b7-be49-6884b28493f6	952eb15d-d3ee-4a9f-9300-9688d9f65dea	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	1a3df7be-f3f0-47b3-a753-354988a838ed	7	L	2025-11-02 16:06:03.285516+00	298	6	2.5	b75858d9-3f6f-46b7-be49-6884b28493f6	cdfbb98f-f2ca-4c49-8d55-3074535fd9fe	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	112270ae-a6ed-426b-adac-56a0afff3476	10	M	2025-11-02 16:06:09.108355+00	299	13	1.5	b75858d9-3f6f-46b7-be49-6884b28493f6	720e33e7-69e8-4870-9889-e004a24f6300	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	f3676ad2-38c0-4af9-b8ae-f57be8657020	24	L	2025-11-02 16:06:20.027227+00	303	28	2.5	b75858d9-3f6f-46b7-be49-6884b28493f6	6099b56c-ba0d-4647-8501-cafe26c690d5	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	e2a776f8-11a6-4a08-9c21-ee1a62e72176	23	L	2025-11-02 16:06:28.499099+00	310	19	14.5	b75858d9-3f6f-46b7-be49-6884b28493f6	9ecd9be1-b686-4f2e-888f-269b7e5281c0	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	9bd25183-b8a2-4e89-a87a-7cbe662d3f98	15	M	2025-11-02 16:06:40.684736+00	316	15	2.5	b75858d9-3f6f-46b7-be49-6884b28493f6	09c81d8d-702a-46bf-be6b-3c7397d7cddc	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	67db401c-4a5d-49ad-83b6-a80fbd9e9061	4	M	2025-11-02 16:06:49.764078+00	306	16	1.5	b75858d9-3f6f-46b7-be49-6884b28493f6	915aedf0-4cc7-404d-8bf9-a25533f93993	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	d1c9abe6-1923-41d8-b06b-cae30c9bd58f	29	M	2025-11-02 16:06:58.39767+00	312	29	3	b75858d9-3f6f-46b7-be49-6884b28493f6	d309c32e-4620-490a-a619-d683f3219bea	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	e488eb19-d62f-430e-9d7a-4e676413412e	9	H	2025-11-02 16:07:06.104959+00	319	9	3	b75858d9-3f6f-46b7-be49-6884b28493f6	072d739c-529b-4e42-a341-5d2fcf7b4edc	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	ec97ca0a-b28f-47fc-ad2e-3ce8360cc08e	11	M	2025-11-02 16:14:36.375708+00	300	11	8.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	7cc70eeb-d819-4290-a444-0a4fc7e4cb7e	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	7892dd22-384d-420b-8ac9-b38f80357891	12	L	2025-11-02 16:14:40.647843+00	311	12	13.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	183db228-a320-4103-8b9c-7e8f59db0052	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	aec4a3ad-d44d-41e6-9406-ed365058f749	22	L	2025-11-02 16:14:45.101658+00	315	22	4.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	a57453ac-d2a4-48ac-a36e-e296f4f10c8c	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	85783c17-265e-45dc-8071-cefa65a6a341	14	M	2025-11-02 16:14:53.109767+00	318	14	3.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	c15f69dc-8fd2-4da5-99b4-2b641f979909	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	95b479b5-7350-46eb-8d94-6b207de641c3	18	L	2025-11-02 16:14:59.999456+00	309	18	9.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	30f6bcea-31ad-489d-96c8-c6234439323c	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	1a3df7be-f3f0-47b3-a753-354988a838ed	6	L	2025-11-02 16:15:09.461669+00	298	6	2.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	70adeea4-c908-4707-81e0-64b78cc3eb60	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	112270ae-a6ed-426b-adac-56a0afff3476	13	M	2025-11-02 16:15:14.696148+00	299	13	1.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	a50e2845-7cfe-48c8-8122-7cad7b9eeb6c	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	f3676ad2-38c0-4af9-b8ae-f57be8657020	28	M	2025-11-02 16:15:21.902882+00	303	28	2.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	bf509aa0-caac-4ee2-87c8-94b72c486529	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	e2a776f8-11a6-4a08-9c21-ee1a62e72176	19	L	2025-11-02 16:15:30.602518+00	310	19	14.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	04df57a1-2184-4802-827c-5e2a1b5e4ca5	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	9bd25183-b8a2-4e89-a87a-7cbe662d3f98	17	L	2025-11-02 16:15:37.900042+00	316	15	2.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	0c530e68-8855-46d1-8b4b-f83e1b9836b0	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	67db401c-4a5d-49ad-83b6-a80fbd9e9061	4	M	2025-11-02 16:15:41.415674+00	306	16	1.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	0c0f2347-4107-4f95-bcf7-a20e4839c739	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	d1c9abe6-1923-41d8-b06b-cae30c9bd58f	32	M	2025-11-02 16:15:49.879496+00	312	29	3	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	3e02a1ce-3e8e-4347-9aca-10af51fbcf96	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	e488eb19-d62f-430e-9d7a-4e676413412e	1	L	2025-11-02 16:16:07.440623+00	319	9	3	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	bc258491-805e-4539-9820-dc828b2ecc0d	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	95b479b5-7350-46eb-8d94-6b207de641c3	31	L	2025-11-02 16:18:29.075957+00	309	18	9.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	bffd5365-d623-4d2d-ab2a-4272df94917a	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	1a3df7be-f3f0-47b3-a753-354988a838ed	6	L	2025-11-02 16:18:34.818597+00	298	6	2.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	920564ac-532b-45f8-8916-3d1283045c20	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	112270ae-a6ed-426b-adac-56a0afff3476	10	M	2025-11-02 16:18:39.648079+00	299	13	1.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	2e8828d2-3125-431d-a214-dbaf8437bcb6	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	f3676ad2-38c0-4af9-b8ae-f57be8657020	28	L	2025-11-02 16:18:48.617308+00	303	28	2.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	628e88d6-d8d6-48c4-944e-8eced5a74eb0	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	e2a776f8-11a6-4a08-9c21-ee1a62e72176	23	L	2025-11-02 16:18:56.102112+00	310	19	14.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	8f542b9a-362b-472e-96c7-e4e5d4d7deeb	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	9bd25183-b8a2-4e89-a87a-7cbe662d3f98	15	M	2025-11-02 16:19:01.395407+00	316	15	2.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	6add0bbb-d1f5-4834-8fde-f336fdfabb36	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	67db401c-4a5d-49ad-83b6-a80fbd9e9061	16	M	2025-11-02 16:19:10.279271+00	306	16	1.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	c8ed94fd-6816-4e3d-bd52-7b8ccacfd799	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	d1c9abe6-1923-41d8-b06b-cae30c9bd58f	29	L	2025-11-02 16:19:18.403691+00	312	29	3	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	4310a49e-4efa-4e7c-a50f-308fa05fa382	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	e488eb19-d62f-430e-9d7a-4e676413412e	1	L	2025-11-02 16:19:36.405325+00	319	9	3	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	4c0cde15-2c47-483b-968f-4a17a7c50748	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	ec97ca0a-b28f-47fc-ad2e-3ce8360cc08e	11	M	2025-11-02 16:21:36.803722+00	300	11	8.5	93abda42-cf85-4c5f-bd90-81210369b2dc	1f895681-b928-4f4a-87e5-d1ec831f6a27	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	7892dd22-384d-420b-8ac9-b38f80357891	5	L	2025-11-02 16:21:46.445333+00	311	12	13.5	93abda42-cf85-4c5f-bd90-81210369b2dc	6e45cbab-8505-4b91-9faa-e90e327f2ba0	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	aec4a3ad-d44d-41e6-9406-ed365058f749	22	L	2025-11-02 16:21:51.413086+00	315	22	4.5	93abda42-cf85-4c5f-bd90-81210369b2dc	5eeb935c-9539-4c84-80dd-10bf1c817ea8	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	85783c17-265e-45dc-8071-cefa65a6a341	14	M	2025-11-02 16:21:54.576736+00	318	14	3.5	93abda42-cf85-4c5f-bd90-81210369b2dc	dea2fe64-1e45-4a7a-aa2a-35ed6c5e07b2	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	95b479b5-7350-46eb-8d94-6b207de641c3	18	L	2025-11-02 16:22:13.118589+00	309	18	9.5	93abda42-cf85-4c5f-bd90-81210369b2dc	880345af-02d1-4ed9-987b-4b0465bb4fb3	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	1a3df7be-f3f0-47b3-a753-354988a838ed	7	L	2025-11-02 16:22:18.312213+00	298	6	2.5	93abda42-cf85-4c5f-bd90-81210369b2dc	27e162cb-756f-408f-b787-fc1f2b45226c	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	112270ae-a6ed-426b-adac-56a0afff3476	10	M	2025-11-02 16:22:26.377547+00	299	13	1.5	93abda42-cf85-4c5f-bd90-81210369b2dc	c3179af3-a1c7-43b8-9c79-a3ae7fe64c5e	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	f3676ad2-38c0-4af9-b8ae-f57be8657020	28	M	2025-11-02 16:22:30.6527+00	303	28	2.5	93abda42-cf85-4c5f-bd90-81210369b2dc	613f3d67-8c36-4f63-a9ec-830524a8b32d	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	e2a776f8-11a6-4a08-9c21-ee1a62e72176	19	L	2025-11-02 16:22:41.227315+00	310	19	14.5	93abda42-cf85-4c5f-bd90-81210369b2dc	d7bab2f3-d034-4aae-a98d-9f87b3e9d766	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	9bd25183-b8a2-4e89-a87a-7cbe662d3f98	15	H	2025-11-02 16:22:46.915339+00	316	15	2.5	93abda42-cf85-4c5f-bd90-81210369b2dc	7e585aee-577a-4e40-b12c-c795161ca9f7	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	67db401c-4a5d-49ad-83b6-a80fbd9e9061	4	M	2025-11-02 16:22:50.851046+00	306	16	1.5	93abda42-cf85-4c5f-bd90-81210369b2dc	0bec661c-04d3-4cc3-b02a-9b58b7f92576	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	d1c9abe6-1923-41d8-b06b-cae30c9bd58f	32	L	2025-11-02 16:22:54.317249+00	312	29	3	93abda42-cf85-4c5f-bd90-81210369b2dc	c102200f-5402-4985-863d-e1f65317c749	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	e488eb19-d62f-430e-9d7a-4e676413412e	9	M	2025-11-02 16:23:02.494165+00	319	9	3	93abda42-cf85-4c5f-bd90-81210369b2dc	9c2a1c69-ded3-43b9-add4-e72a4cd08054	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	8697092d-e82a-45e2-b869-fd31ece83fe2	17	L	2025-11-04 23:36:48.442321+00	320	10	9.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	c12c8808-cb95-474c-b73b-b74e1ef13dad	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	d064ce63-ab19-4c93-a5ce-2edbf9fc77f7	14	L	2025-11-04 23:37:04.014657+00	334	14	6.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	f289bbcc-f58f-4a52-88bb-2a80567feeb5	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	8697092d-e82a-45e2-b869-fd31ece83fe2	17	L	2025-11-06 23:30:22.998947+00	336	10	8.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	38601edd-be60-4651-9774-79199cac3fd7	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	8697092d-e82a-45e2-b869-fd31ece83fe2	17	L	2025-11-07 00:11:18.622891+00	336	10	8.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	2f861289-2602-4383-a5f5-ab1d752c9d2d	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	d064ce63-ab19-4c93-a5ce-2edbf9fc77f7	2	M	2025-11-09 13:38:08.924306+00	334	14	6.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	9b100a54-3897-4e93-bf0a-247d14530678	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	d40c4e28-2593-4343-8a62-7ef114e0eecf	13	L	2025-11-09 13:38:19.636197+00	339	15	1.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	acd4936b-7b70-4fbc-ba43-10c0af7f3ee5	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	4ea577b3-c84b-4f40-acb5-e02431fe5b41	24	L	2025-11-09 13:38:33.887509+00	337	6	4.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	2c4f3b48-8c43-4676-a453-2de561e7bf4f	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	ba2b69b7-f9ba-467e-99da-26b8de97ade4	5	H	2025-11-09 13:38:44.336062+00	324	5	5.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	60039b47-ec79-4a00-aa52-4a412c8ac76e	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	73898b0c-165c-4160-8e2f-04fc60d929db	8	M	2025-11-09 13:40:05.462922+00	335	8	2.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	ca6cfdd5-feab-4529-97e5-f6bb0ef34baf	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	b134cf70-c00d-45e0-95e1-8b400db16f9d	30	M	2025-11-09 13:40:18.031937+00	328	30	2.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	8b7a3b94-f9c5-4282-ae9f-426413b63b5b	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	c326aa68-4af8-4b34-bf37-d8dbd1752bdc	3	A	2025-11-09 13:41:03.516504+00	322	3	4.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	d0a73a8c-98ac-46d2-a047-958ba7b35021	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	4efa1b98-b52f-4eda-a313-d3260e091fae	4	H	2025-11-09 13:41:10.186196+00	323	4	9.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	8fa0472c-5fc9-4c94-b982-c8b252f0e1a2	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	d064ce63-ab19-4c93-a5ce-2edbf9fc77f7	14	L	2025-11-09 13:51:44.613361+00	334	14	6.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	75868542-6a05-494e-a387-27133395f6bb	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	d40c4e28-2593-4343-8a62-7ef114e0eecf	15	L	2025-11-09 15:40:58.176773+00	339	15	1.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	b592a5e0-7bb3-49f5-80a1-b25e3191af1a	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	4ea577b3-c84b-4f40-acb5-e02431fe5b41	6	L	2025-11-09 15:41:10.527367+00	337	6	4.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	fde1721c-3c52-44b3-b7c2-f46970d34163	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	ba2b69b7-f9ba-467e-99da-26b8de97ade4	5	L	2025-11-09 15:41:17.790437+00	324	5	5.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	d92fb6f3-debc-4fc8-8586-adb77b565cda	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	73898b0c-165c-4160-8e2f-04fc60d929db	8	M	2025-11-09 15:41:33.31798+00	335	8	2.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	eb68c1f6-6143-46a0-ba4e-40711598eaef	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	b134cf70-c00d-45e0-95e1-8b400db16f9d	30	L	2025-11-09 15:41:49.41643+00	328	30	2.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	1134e595-4969-46c4-a2c8-0b58a785a469	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	4efa1b98-b52f-4eda-a313-d3260e091fae	20	L	2025-11-09 15:41:54.219801+00	323	4	9.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	b3b22450-dbcc-474b-b9b8-5100bdb664b1	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	c326aa68-4af8-4b34-bf37-d8dbd1752bdc	3	L	2025-11-09 15:42:03.12536+00	322	3	4.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	33b1531b-4b2b-475c-91e6-c4855ae956e9	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	50e71e9f-3dd0-40fc-91e5-9b3ba56ecee6	1	L	2025-11-09 15:42:07.851516+00	343	29	7	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	08ff239e-33b9-4a69-b2a5-943cca80b258	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	a46ddd80-9686-4da2-868e-09f4b91eb3d9	28	L	2025-11-09 15:53:47.410288+00	344	19	5.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	bba96147-687a-4e25-8fbc-b94897ca0205	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	13f2fd71-3d1c-42e5-9f5c-99bb8f212547	27	L	2025-11-09 15:54:00.893507+00	340	18	2.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	dcd9699d-8fdf-436f-bed4-54af148c2429	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	e38cc65d-0609-4b3a-a380-637396570080	26	M	2025-11-09 15:54:07.208306+00	342	12	1.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	d61b2f38-eba7-406c-b6a7-e9dc68f29c4a	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	d40c4e28-2593-4343-8a62-7ef114e0eecf	13	M	2025-11-09 16:00:15.887705+00	339	15	1.5	b75858d9-3f6f-46b7-be49-6884b28493f6	d7566a7d-49a9-4c43-8f2f-ff443c6edff6	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	4ea577b3-c84b-4f40-acb5-e02431fe5b41	24	L	2025-11-09 16:00:29.027364+00	337	6	4.5	b75858d9-3f6f-46b7-be49-6884b28493f6	dcd2e09d-7830-4a58-93d0-ca4f356fe6e8	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	ba2b69b7-f9ba-467e-99da-26b8de97ade4	5	M	2025-11-09 16:00:38.793832+00	324	5	5.5	b75858d9-3f6f-46b7-be49-6884b28493f6	1bce7233-5df6-400f-b851-29fa8247d57c	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	73898b0c-165c-4160-8e2f-04fc60d929db	8	M	2025-11-09 16:00:54.85242+00	335	8	2.5	b75858d9-3f6f-46b7-be49-6884b28493f6	e5895534-6ea8-4ccc-b8a5-eed05cab6a04	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	4efa1b98-b52f-4eda-a313-d3260e091fae	4	L	2025-11-09 16:02:11.725038+00	323	4	9.5	b75858d9-3f6f-46b7-be49-6884b28493f6	5ef53423-6fb7-46b1-a6f3-285a00e9e4a6	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	c326aa68-4af8-4b34-bf37-d8dbd1752bdc	21	M	2025-11-09 16:02:19.214325+00	322	3	4.5	b75858d9-3f6f-46b7-be49-6884b28493f6	360bb1e0-95e0-4155-a512-3822de3ca84e	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	50e71e9f-3dd0-40fc-91e5-9b3ba56ecee6	29	M	2025-11-09 16:02:27.393499+00	343	29	7	b75858d9-3f6f-46b7-be49-6884b28493f6	fa3a6aca-93a8-456a-a659-7ac95b0152dd	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	a46ddd80-9686-4da2-868e-09f4b91eb3d9	28	L	2025-11-09 16:02:37.510705+00	344	19	5.5	b75858d9-3f6f-46b7-be49-6884b28493f6	e2bbd3d0-34bd-46fa-9bd0-0cdb72f48f0a	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	cbc66c57-d654-486c-ae72-4ef57f0a3fe7	11	M	2025-11-09 16:02:42.75891+00	341	11	7.5	b75858d9-3f6f-46b7-be49-6884b28493f6	bb26008e-d04a-4b0a-86b5-0bbcab9f6146	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	13f2fd71-3d1c-42e5-9f5c-99bb8f212547	18	H	2025-11-09 16:02:50.196089+00	340	18	2.5	b75858d9-3f6f-46b7-be49-6884b28493f6	f060637b-cfc7-4c13-a256-58e2f2f00f4a	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	e38cc65d-0609-4b3a-a380-637396570080	26	L	2025-11-09 16:03:01.607316+00	342	12	1.5	b75858d9-3f6f-46b7-be49-6884b28493f6	5c0a2728-847a-4cd3-8672-ef3da48944f7	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	d40c4e28-2593-4343-8a62-7ef114e0eecf	13	H	2025-11-09 17:19:58.425709+00	339	15	1.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	50dc2877-a82e-4560-90d1-7773f3564e91	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	4ea577b3-c84b-4f40-acb5-e02431fe5b41	6	M	2025-11-09 17:20:04.902729+00	337	6	4.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	22850b00-ea83-4eac-9d67-c896220b14f2	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	ba2b69b7-f9ba-467e-99da-26b8de97ade4	5	H	2025-11-09 17:20:09.247411+00	324	5	5.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	5e83b3d6-abd3-4f27-b4c1-d2aab272d6d0	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	73898b0c-165c-4160-8e2f-04fc60d929db	8	A	2025-11-09 17:20:13.216486+00	335	8	2.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	a3740ee4-7444-46cc-9abe-6867de76f72b	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	b134cf70-c00d-45e0-95e1-8b400db16f9d	30	M	2025-11-09 17:20:17.327199+00	328	30	2.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	6be30d08-9b15-4d92-a6ef-4377a82b24c3	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	4efa1b98-b52f-4eda-a313-d3260e091fae	4	H	2025-11-09 17:20:21.121264+00	323	4	9.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	df00becc-5ecd-4fcd-b892-77143efff36b	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	c326aa68-4af8-4b34-bf37-d8dbd1752bdc	21	M	2025-11-09 17:20:25.784346+00	322	3	4.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	1161ba43-1c2b-47d5-b184-a4eea6c04414	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	50e71e9f-3dd0-40fc-91e5-9b3ba56ecee6	29	H	2025-11-09 17:20:28.446333+00	343	29	7	d8db1ea2-76a7-4cb1-8025-167bef10c724	c70b40c9-20b1-4930-86e3-6b6d08b266e3	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	a46ddd80-9686-4da2-868e-09f4b91eb3d9	28	H	2025-11-09 17:20:32.704371+00	344	19	5.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	6a291e80-767b-4929-9288-52f5390bf702	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	cbc66c57-d654-486c-ae72-4ef57f0a3fe7	11	M	2025-11-09 17:20:37.631758+00	341	11	7.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	81cb19c8-fa6b-4ab1-9224-5d37dc7495d0	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	13f2fd71-3d1c-42e5-9f5c-99bb8f212547	18	M	2025-11-09 17:20:42.053861+00	340	18	2.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	3503ab60-f1a6-4e4f-913e-f66b648468d6	\N
d8db1ea2-76a7-4cb1-8025-167bef10c724	e38cc65d-0609-4b3a-a380-637396570080	26	H	2025-11-09 17:20:45.312659+00	342	12	1.5	d8db1ea2-76a7-4cb1-8025-167bef10c724	2f4d0513-b253-4a01-a809-8bf44086e231	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	d40c4e28-2593-4343-8a62-7ef114e0eecf	15	M	2025-11-09 17:24:56.448576+00	339	15	1.5	93abda42-cf85-4c5f-bd90-81210369b2dc	b6d53cfe-883e-4307-995b-6fd6de5b52c8	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	4ea577b3-c84b-4f40-acb5-e02431fe5b41	24	M	2025-11-09 17:25:04.530026+00	337	6	4.5	93abda42-cf85-4c5f-bd90-81210369b2dc	4d6c21c7-db5a-4e1b-b80b-b2d2030d23af	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	ba2b69b7-f9ba-467e-99da-26b8de97ade4	5	M	2025-11-09 17:25:09.172536+00	324	5	5.5	93abda42-cf85-4c5f-bd90-81210369b2dc	909b9e7f-f9a7-410f-9fa9-49da9a3dd939	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	73898b0c-165c-4160-8e2f-04fc60d929db	8	L	2025-11-09 17:25:13.708539+00	335	8	2.5	93abda42-cf85-4c5f-bd90-81210369b2dc	a06c63c1-ab5c-4bd7-af39-2b11c42c2d05	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	b134cf70-c00d-45e0-95e1-8b400db16f9d	22	M	2025-11-09 17:25:28.549048+00	328	30	2.5	93abda42-cf85-4c5f-bd90-81210369b2dc	e9f25077-29ce-44a4-af61-5e018cf43ec8	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	4efa1b98-b52f-4eda-a313-d3260e091fae	4	H	2025-11-09 17:25:43.624815+00	323	4	9.5	93abda42-cf85-4c5f-bd90-81210369b2dc	c5c3a53c-77d5-446b-85be-8d233e2e8411	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	c326aa68-4af8-4b34-bf37-d8dbd1752bdc	21	M	2025-11-09 17:25:49.742351+00	322	3	4.5	93abda42-cf85-4c5f-bd90-81210369b2dc	5e5d99b0-c30a-4bea-8942-af714e844877	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	50e71e9f-3dd0-40fc-91e5-9b3ba56ecee6	29	M	2025-11-09 17:25:58.602275+00	343	29	7	93abda42-cf85-4c5f-bd90-81210369b2dc	c65de972-4ae0-47ee-9789-9a44c8873e84	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	a46ddd80-9686-4da2-868e-09f4b91eb3d9	19	M	2025-11-09 17:26:03.257774+00	344	19	5.5	93abda42-cf85-4c5f-bd90-81210369b2dc	26367792-505a-4f95-9898-3f4e0167d219	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	cbc66c57-d654-486c-ae72-4ef57f0a3fe7	11	H	2025-11-09 17:26:07.545783+00	341	11	7.5	93abda42-cf85-4c5f-bd90-81210369b2dc	aacc1f97-2bb0-4563-8650-f2dcb7b6a49c	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	13f2fd71-3d1c-42e5-9f5c-99bb8f212547	18	M	2025-11-09 17:26:09.991932+00	340	18	2.5	93abda42-cf85-4c5f-bd90-81210369b2dc	9bdc113b-3d0c-4220-8e49-17daff3198d9	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	e38cc65d-0609-4b3a-a380-637396570080	26	H	2025-11-09 17:26:18.609501+00	342	12	1.5	93abda42-cf85-4c5f-bd90-81210369b2dc	4656e80c-e196-40b7-afe3-969d50d9246a	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	d40c4e28-2593-4343-8a62-7ef114e0eecf	15	L	2025-11-09 17:49:55.253167+00	339	15	1.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	29afe631-8e75-4a5f-8338-134a3b37d2eb	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	4ea577b3-c84b-4f40-acb5-e02431fe5b41	6	L	2025-11-09 17:50:13.248577+00	337	6	4.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	912d295a-f7bb-4f5c-857f-1faed6a2341e	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	ba2b69b7-f9ba-467e-99da-26b8de97ade4	5	L	2025-11-09 17:50:24.807359+00	324	5	5.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	04742026-581d-4f11-849d-9b49390b3379	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	73898b0c-165c-4160-8e2f-04fc60d929db	25	L	2025-11-09 17:50:29.131687+00	335	8	2.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	03e648d0-fb52-4702-a48b-fbcbea53c0b0	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	b134cf70-c00d-45e0-95e1-8b400db16f9d	30	L	2025-11-09 17:50:31.878025+00	328	30	2.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	4e316698-9091-4e63-926c-43b28a3a618e	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	4efa1b98-b52f-4eda-a313-d3260e091fae	4	L	2025-11-09 17:50:39.087543+00	323	4	9.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	3d84058b-394c-4f5c-9e5c-5d2f0d33dd32	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	c326aa68-4af8-4b34-bf37-d8dbd1752bdc	3	L	2025-11-09 17:50:41.311665+00	322	3	4.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	e34484a2-f512-471c-936e-44b00a347c82	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	50e71e9f-3dd0-40fc-91e5-9b3ba56ecee6	1	L	2025-11-09 17:50:49.964697+00	343	29	7	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	8ea54e6b-c0d5-48fb-a489-e7391e76a716	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	a46ddd80-9686-4da2-868e-09f4b91eb3d9	19	L	2025-11-09 17:50:54.074774+00	344	19	5.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	d67ec608-0709-431d-9414-94a9c8bf1d01	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	cbc66c57-d654-486c-ae72-4ef57f0a3fe7	11	L	2025-11-09 17:50:58.828494+00	341	11	7.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	5cdd9df2-a19c-4e5b-81d1-f4214baed98f	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	13f2fd71-3d1c-42e5-9f5c-99bb8f212547	18	L	2025-11-09 17:51:01.338099+00	340	18	2.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	dd90a429-0d18-4571-946c-045140e8e58b	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	e38cc65d-0609-4b3a-a380-637396570080	26	L	2025-11-09 17:51:04.542809+00	342	12	1.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	d06a4d65-15a2-4297-9ac5-233820b3c37d	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	cbc66c57-d654-486c-ae72-4ef57f0a3fe7	11	M	2025-11-09 19:22:49.663721+00	341	11	7.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	7ae73b64-9ccc-42fb-8f20-68ee1b83802a	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	a46ddd80-9686-4da2-868e-09f4b91eb3d9	28	H	2025-11-09 21:24:38.61269+00	344	19	5.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	0ab139a2-12a5-4c4d-b17b-6e608347325d	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	cbc66c57-d654-486c-ae72-4ef57f0a3fe7	11	H	2025-11-09 21:24:44.159037+00	341	11	7.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	32e096a9-752c-4b55-bb82-22919109f5bd	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	13f2fd71-3d1c-42e5-9f5c-99bb8f212547	27	M	2025-11-09 21:25:02.245273+00	340	18	2.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	57693f87-26f5-497f-b7dd-c2a4a6f075a5	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	e38cc65d-0609-4b3a-a380-637396570080	26	H	2025-11-09 21:25:06.668211+00	342	12	1.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	419b5980-d9c5-484e-a739-b6530741bdb8	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	5dae185c-5c31-487f-a883-6381c6e0a1c8	22	M	2025-11-13 15:06:37.618989+00	364	22	12.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	cce00746-1647-42ba-b423-5ca69164fe9c	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	5dae185c-5c31-487f-a883-6381c6e0a1c8	22	L	2025-11-13 17:08:04.865229+00	364	22	12.5	93abda42-cf85-4c5f-bd90-81210369b2dc	7ee5f0be-a48e-4b27-b513-d556caa889d7	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	5dae185c-5c31-487f-a883-6381c6e0a1c8	25	L	2025-11-13 23:46:37.76709+00	364	22	12.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	14938621-4c08-4368-b6b2-5c2ac8256c5e	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	5dae185c-5c31-487f-a883-6381c6e0a1c8	22	L	2025-11-14 00:49:46.164572+00	364	22	12.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	9c935011-2598-4a60-90fb-2951694324ed	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	41c027c6-fa5c-4a26-a7b6-3207cce3ebe6	32	M	2025-11-16 01:03:30.030884+00	350	20	2.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	3e85ea39-7caa-452c-b3c7-94b9ee911e9e	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	f49a3914-1a2b-4bbd-bd90-58f3d43f2ca1	13	H	2025-11-16 01:03:35.833812+00	372	13	5.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	9ac5ebf4-300a-4dc7-a42f-ee56eebb71c2	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	95407649-75c0-440d-8115-1a5442582203	18	H	2025-11-16 01:03:44.201375+00	367	18	3	61183ed6-88ce-418b-8bdf-f16c57a350f7	52e621bf-99f1-46d9-b01b-2d163e58d10d	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	2ce2ef92-1078-461b-abda-6d1911a0a056	7	M	2025-11-16 01:04:03.324634+00	354	27	5.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	222d7c5e-9859-4fe4-81db-c475379a67ea	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	acabce6e-fe7c-425b-9253-b814cd6566b4	6	M	2025-11-16 01:04:09.168454+00	371	21	2.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	d2cac6ef-2f8a-466f-87de-b267e28f3e0d	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	4a71fd05-215f-4ff9-a9a5-3ca7f0bb5938	5	M	2025-11-16 01:04:14.403358+00	351	2	3.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	1910d12f-f7b3-4fb5-b0bf-63dd9cf8efed	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	3cc444f7-1d14-4ca8-8871-dbfb2b3607b0	24	M	2025-11-16 01:04:21.063941+00	365	12	7	61183ed6-88ce-418b-8bdf-f16c57a350f7	7d57c7e9-2902-4386-b894-981e44945098	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	3c5359bd-125e-4aec-ad9d-a5c4b0d3e30c	30	M	2025-11-16 01:04:27.535772+00	352	4	5.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	d977d002-9f02-485e-9899-a2ecfbaed5a2	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	01ced56f-5413-4445-b791-af1bc821d0cc	28	M	2025-11-16 01:04:42.887979+00	358	28	3	61183ed6-88ce-418b-8bdf-f16c57a350f7	48f38de7-1bb6-4df7-bd68-ec9e34547ba1	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	358d48e8-bed8-4dc9-a3a2-a45116df0833	19	M	2025-11-16 01:04:49.381338+00	368	19	3	61183ed6-88ce-418b-8bdf-f16c57a350f7	e4254f90-2245-4fe2-8d5d-a8d6d0b3589a	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	f58f0065-696f-4d1a-9e79-ee46d002c79a	3	A	2025-11-16 01:04:53.955578+00	369	3	7.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	01726dd5-4c0c-4351-88aa-20d8b6dba013	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	c95835d4-c6eb-495c-9a7b-8549c0bb86e4	16	M	2025-11-16 01:04:57.732395+00	361	16	3.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	90ed739d-6d1d-48b2-95b9-0c39f87b61d5	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	af39c4f7-7bbc-445f-9596-0ee71f84d732	11	M	2025-11-16 01:05:08.739611+00	370	26	2.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	449ee392-c831-463d-8d8f-2df6c6f86206	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	7c66af18-7fe5-403b-8a74-fc66d3e13e5f	9	L	2025-11-16 01:05:13.073628+00	363	9	3.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	53550f45-b364-407b-a669-ed09e6ee97c5	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	41c027c6-fa5c-4a26-a7b6-3207cce3ebe6	20	H	2025-11-16 13:13:19.909518+00	350	20	2.5	93abda42-cf85-4c5f-bd90-81210369b2dc	59cb3ac3-5790-4449-b58f-9df333bf1a40	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	f49a3914-1a2b-4bbd-bd90-58f3d43f2ca1	13	M	2025-11-16 13:13:28.848219+00	372	13	5.5	93abda42-cf85-4c5f-bd90-81210369b2dc	26ee881a-5e53-4664-b063-17142b705b06	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	95407649-75c0-440d-8115-1a5442582203	15	L	2025-11-16 13:13:51.731593+00	367	18	3	93abda42-cf85-4c5f-bd90-81210369b2dc	5889baa5-72d0-4f16-a713-48df7a5a2e6b	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	2ce2ef92-1078-461b-abda-6d1911a0a056	27	M	2025-11-16 13:13:56.878007+00	354	27	5.5	93abda42-cf85-4c5f-bd90-81210369b2dc	333fbb47-c1b4-41ad-b2e5-ea0b93bb775f	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	acabce6e-fe7c-425b-9253-b814cd6566b4	21	M	2025-11-16 13:14:06.814718+00	371	21	2.5	93abda42-cf85-4c5f-bd90-81210369b2dc	cf1f1bb1-9650-4884-bf8c-8712dee5660f	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	4a71fd05-215f-4ff9-a9a5-3ca7f0bb5938	5	L	2025-11-16 13:14:16.821003+00	351	2	3.5	93abda42-cf85-4c5f-bd90-81210369b2dc	8986ddf9-3322-4c39-bf3a-09817e8b7789	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	3cc444f7-1d14-4ca8-8871-dbfb2b3607b0	12	M	2025-11-16 13:14:28.802716+00	365	12	7	93abda42-cf85-4c5f-bd90-81210369b2dc	e5ad535e-de2f-4949-9542-2aa2ea14c4a1	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	3c5359bd-125e-4aec-ad9d-a5c4b0d3e30c	30	M	2025-11-16 13:14:48.360575+00	352	4	5.5	93abda42-cf85-4c5f-bd90-81210369b2dc	8be9b718-8c86-43a7-988a-f61f1e3dc862	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	01ced56f-5413-4445-b791-af1bc821d0cc	28	M	2025-11-16 13:14:52.633631+00	358	28	3	93abda42-cf85-4c5f-bd90-81210369b2dc	f4bb7866-7927-4225-b526-d9f3a72fe7af	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	358d48e8-bed8-4dc9-a3a2-a45116df0833	29	L	2025-11-16 13:14:59.174539+00	368	19	3	93abda42-cf85-4c5f-bd90-81210369b2dc	b8fc9a99-1ade-4539-9386-222c6d54acf7	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	f58f0065-696f-4d1a-9e79-ee46d002c79a	3	M	2025-11-16 13:15:22.998671+00	369	3	7.5	93abda42-cf85-4c5f-bd90-81210369b2dc	d93b883a-ba66-4e77-82ad-ba5bc0252f4c	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	c95835d4-c6eb-495c-9a7b-8549c0bb86e4	10	M	2025-11-16 13:15:27.645583+00	361	16	3.5	93abda42-cf85-4c5f-bd90-81210369b2dc	40adcb62-565a-4b23-adf3-302abc247ccc	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	af39c4f7-7bbc-445f-9596-0ee71f84d732	11	H	2025-11-16 13:15:33.036236+00	370	26	2.5	93abda42-cf85-4c5f-bd90-81210369b2dc	0b93bbfb-b002-47ab-a504-4031e814f496	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	7c66af18-7fe5-403b-8a74-fc66d3e13e5f	9	M	2025-11-16 13:15:42.261626+00	363	9	3.5	93abda42-cf85-4c5f-bd90-81210369b2dc	5201acf2-5950-41d7-8672-7c7e138e7221	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	41c027c6-fa5c-4a26-a7b6-3207cce3ebe6	32	L	2025-11-16 13:31:29.565468+00	350	20	2.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	b1003183-9c57-42c5-8983-5c2cb8b8245f	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	41c027c6-fa5c-4a26-a7b6-3207cce3ebe6	32	L	2025-11-16 14:11:04.280057+00	350	20	2.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	e3b77625-c5cc-48db-98fb-7f2547a2dfbe	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	95407649-75c0-440d-8115-1a5442582203	18	L	2025-11-16 14:37:38.487265+00	367	18	3	b75858d9-3f6f-46b7-be49-6884b28493f6	11e941b3-59f9-481d-a922-ca00d8a0c40f	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	2ce2ef92-1078-461b-abda-6d1911a0a056	27	M	2025-11-16 14:37:49.586156+00	354	27	5.5	b75858d9-3f6f-46b7-be49-6884b28493f6	4bcd0389-105a-461a-a430-5d7076b07687	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	acabce6e-fe7c-425b-9253-b814cd6566b4	21	M	2025-11-16 14:38:36.447054+00	371	21	2.5	b75858d9-3f6f-46b7-be49-6884b28493f6	ab9bb983-4037-46fa-be0f-476e6d164c6b	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	4a71fd05-215f-4ff9-a9a5-3ca7f0bb5938	2	M	2025-11-16 14:42:47.383286+00	351	2	3.5	b75858d9-3f6f-46b7-be49-6884b28493f6	2cde8e77-69e0-4602-93b3-ed8e02b54ecf	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	3cc444f7-1d14-4ca8-8871-dbfb2b3607b0	24	L	2025-11-16 14:43:07.115692+00	365	12	7	b75858d9-3f6f-46b7-be49-6884b28493f6	4e600a71-a5ec-4bfc-aca5-73d6d8346aa9	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	3c5359bd-125e-4aec-ad9d-a5c4b0d3e30c	30	M	2025-11-16 14:43:22.55396+00	352	4	5.5	b75858d9-3f6f-46b7-be49-6884b28493f6	20cf21a1-6fae-4fb7-8af4-1428256610c1	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	01ced56f-5413-4445-b791-af1bc821d0cc	28	L	2025-11-16 14:43:39.587737+00	358	28	3	b75858d9-3f6f-46b7-be49-6884b28493f6	90bed927-05ea-488e-b731-58b140f51b01	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	358d48e8-bed8-4dc9-a3a2-a45116df0833	19	M	2025-11-16 14:43:52.202656+00	368	19	3	b75858d9-3f6f-46b7-be49-6884b28493f6	f2d35db0-3d12-4ca9-b092-017298727b3a	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	f58f0065-696f-4d1a-9e79-ee46d002c79a	3	M	2025-11-16 14:44:05.123008+00	369	3	7.5	b75858d9-3f6f-46b7-be49-6884b28493f6	d765ca73-4369-4010-b668-0b85eeadd30e	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	c95835d4-c6eb-495c-9a7b-8549c0bb86e4	10	L	2025-11-16 14:44:16.347547+00	361	16	3.5	b75858d9-3f6f-46b7-be49-6884b28493f6	c97d726f-45ad-4de8-bd72-6149852652af	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	af39c4f7-7bbc-445f-9596-0ee71f84d732	11	M	2025-11-16 14:44:24.998031+00	370	26	2.5	b75858d9-3f6f-46b7-be49-6884b28493f6	0e3df0f2-efdd-4290-aacd-1222714eb36d	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	7c66af18-7fe5-403b-8a74-fc66d3e13e5f	9	L	2025-11-16 14:44:35.100522+00	363	9	3.5	b75858d9-3f6f-46b7-be49-6884b28493f6	77b3ae68-6409-46fc-9438-d277c4addfcb	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	f49a3914-1a2b-4bbd-bd90-58f3d43f2ca1	13	L	2025-11-16 16:16:25.016509+00	372	13	5.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	8e80ca19-e102-4b9e-8898-57ef777d8b9d	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	95407649-75c0-440d-8115-1a5442582203	18	L	2025-11-16 16:16:30.243343+00	367	18	3	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	73255d16-f26b-4103-af79-bafadc120de7	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	2ce2ef92-1078-461b-abda-6d1911a0a056	7	L	2025-11-16 16:16:38.122618+00	354	27	5.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	49d5c310-8e4b-477c-baa3-7ebe319634b0	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	acabce6e-fe7c-425b-9253-b814cd6566b4	21	M	2025-11-16 16:16:45.670165+00	371	21	2.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	f6904e24-f96d-4d71-ab93-57cad95700ef	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	4a71fd05-215f-4ff9-a9a5-3ca7f0bb5938	5	M	2025-11-16 16:17:10.073282+00	351	2	3.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	01d46c87-a070-437f-b504-98b91acf4f58	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	3cc444f7-1d14-4ca8-8871-dbfb2b3607b0	12	H	2025-11-16 16:17:16.305946+00	365	12	7	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	25d031d5-4f35-4d23-b104-1c3fa020a2f1	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	3c5359bd-125e-4aec-ad9d-a5c4b0d3e30c	30	L	2025-11-16 16:18:00.207646+00	352	4	5.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	8de7ec53-2e64-46ae-ac50-1c38598cd555	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	01ced56f-5413-4445-b791-af1bc821d0cc	28	L	2025-11-16 16:22:55.013734+00	358	28	3	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	6de40207-956b-4ccc-939d-554caa44796b	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	f58f0065-696f-4d1a-9e79-ee46d002c79a	8	L	2025-11-16 16:25:15.764391+00	369	3	7.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	10f6e77e-a321-48b6-a4e6-699c015820ac	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	358d48e8-bed8-4dc9-a3a2-a45116df0833	29	M	2025-11-16 16:32:02.90816+00	368	19	3	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	7e493a96-7b02-43f9-aa8a-dae54786c2d9	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	c95835d4-c6eb-495c-9a7b-8549c0bb86e4	16	H	2025-11-16 16:33:37.718114+00	361	16	3.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	ce743392-4c84-4420-ba46-4af16f306ede	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	7c66af18-7fe5-403b-8a74-fc66d3e13e5f	17	L	2025-11-16 16:34:38.181208+00	363	9	3.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	5d7fdeba-1ad9-4b72-be3e-e5da98c6b5a2	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	af39c4f7-7bbc-445f-9596-0ee71f84d732	26	M	2025-11-16 16:34:42.038944+00	370	26	2.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	85f0aaa5-ea27-4385-8180-89e3c9216c11	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	01ced56f-5413-4445-b791-af1bc821d0cc	28	L	2025-11-16 20:32:15.030241+00	358	28	3	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	b04acd7f-9a33-4165-8b72-a3e84a110999	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	358d48e8-bed8-4dc9-a3a2-a45116df0833	29	L	2025-11-16 20:32:18.589535+00	368	19	3	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	4ada72cd-a784-470a-8c00-777cad99a694	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	f58f0065-696f-4d1a-9e79-ee46d002c79a	3	L	2025-11-16 20:32:23.724719+00	369	3	7.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	ff6af580-c277-4f2b-81d1-a0cf014eaf66	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	c95835d4-c6eb-495c-9a7b-8549c0bb86e4	10	L	2025-11-16 20:32:26.548823+00	361	16	3.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	d578e6ea-9a84-467a-9845-ed5bba9332a6	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	af39c4f7-7bbc-445f-9596-0ee71f84d732	26	L	2025-11-16 20:32:30.457761+00	370	26	2.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	25bf0af9-de19-4068-94de-39008ec31117	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	7c66af18-7fe5-403b-8a74-fc66d3e13e5f	17	L	2025-11-16 20:32:35.113371+00	363	9	3.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	d82178da-4ce3-4601-91d9-0fef09fc2c69	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	6f0ab50a-2db9-4735-b55e-04baec9fc2d3	4	A	2025-11-19 18:53:16.94082+00	378	4	5.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	d9eb0fe2-cff9-4999-b043-2f586ca61555	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	6f0ab50a-2db9-4735-b55e-04baec9fc2d3	4	L	2025-11-20 15:19:39.274425+00	378	4	5.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	dff48f74-1c42-446c-bc04-1d22f72e707a	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	6f0ab50a-2db9-4735-b55e-04baec9fc2d3	4	L	2025-11-20 23:21:12.336009+00	378	4	5.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	4a33917a-8f3e-4b1a-9bba-a880541b23ef	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	6d12b6ae-fe56-49e5-80d2-4b51d40770ae	29	M	2025-11-22 01:48:01.704093+00	385	29	13.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	f1d76a04-9014-4c9e-a6f5-5967e4fdabc9	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	d2bdacae-dd5f-4dd4-8535-a65ff9e42774	22	M	2025-11-22 01:48:07.023413+00	393	22	5.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	10f38cc7-f8a5-41ba-a812-9ab081c53bfb	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	e266dc82-da06-45ad-b515-1658832012d5	12	M	2025-11-22 01:48:31.052327+00	383	12	6.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	0d4239f4-360c-4bf7-a573-ca9768cf6909	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	e4f9bc56-5420-4c15-8992-4feb8126e69a	6	H	2025-11-22 01:48:40.933477+00	380	6	2.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	3cb410c9-b13c-41a5-b872-0b70ccc756da	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	79b2ed90-8c59-4bc9-92f0-2489d70c2da7	3	H	2025-11-22 01:48:43.791653+00	379	3	13.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	78a95636-0cca-417b-a661-cf3ed66cfbc8	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	1a9a4ec2-e36e-445c-a230-904155133ad1	14	M	2025-11-22 01:48:46.087848+00	384	16	3.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	3e720d61-301d-41c4-8dbc-cf534413540e	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	431b3ac4-42da-42a1-9a49-3b791f370ab2	8	M	2025-11-22 01:48:50.678575+00	387	17	3.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	4b55b5a4-ee75-4a09-a418-f4ff12aa7fdf	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	bc2dbf36-4786-48e6-9721-e16c5c2eb3e2	15	H	2025-11-22 01:48:54.980291+00	386	15	2.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	1b703864-7541-4994-9f85-5f6e1cd78b2c	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	31e33109-b008-489b-a37a-e13202ed0927	9	M	2025-11-22 01:49:06.658633+00	389	26	3.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	60447ece-4fa3-44e1-93f7-3e3a493eef33	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	834c89e5-0e51-4aca-9d66-d414bafa77e1	2	L	2025-11-22 01:49:14.524264+00	388	23	1.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	96c04a05-48ca-4279-948c-cebfddc7a631	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	ecacbc7b-cc64-4ed6-8ab6-10c433fb3ce9	19	M	2025-11-22 01:49:22.115638+00	390	19	6.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	479eac31-2f69-48c7-8aca-3adc57ed27d7	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	7bdfc892-5cad-43d2-b235-02afede1ecbd	5	H	2025-11-22 01:49:26.599976+00	391	28	7	61183ed6-88ce-418b-8bdf-f16c57a350f7	8d9cf54f-ce35-4175-8c8b-6812b7295543	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	d2bdacae-dd5f-4dd4-8535-a65ff9e42774	22	M	2025-11-23 00:09:20.108479+00	394	22	7.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	31f19545-3676-4d1a-8882-7812a9dccd65	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	79b2ed90-8c59-4bc9-92f0-2489d70c2da7	25	L	2025-11-23 00:09:28.083418+00	379	3	13.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	050e63ce-1649-4016-a642-aa747dafa861	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	e266dc82-da06-45ad-b515-1658832012d5	21	L	2025-11-23 00:09:31.43834+00	383	12	6.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	268fa995-90f9-4bfc-bafc-4cd6e39aca51	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	45cc932e-b1d3-4204-aa65-372f0e48111a	24	L	2025-11-23 00:09:40.161297+00	395	11	12.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	0383a38a-7a24-4e05-a054-eccb725fd66d	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	1a9a4ec2-e36e-445c-a230-904155133ad1	14	L	2025-11-23 00:09:55.554882+00	384	16	3.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	50f95bf4-8a5d-4850-a039-bf32903d39e5	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	6d12b6ae-fe56-49e5-80d2-4b51d40770ae	29	M	2025-11-23 00:10:06.425136+00	396	29	12.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	c44e1894-d8de-4334-90ea-74a0e70557e2	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	431b3ac4-42da-42a1-9a49-3b791f370ab2	8	L	2025-11-23 00:10:22.056894+00	387	17	3.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	3638eace-b266-4179-9659-d55d22106576	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	bc2dbf36-4786-48e6-9721-e16c5c2eb3e2	15	L	2025-11-23 00:10:46.615922+00	386	15	2.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	9586fd2c-d73c-4f36-b6c9-3059f21bcb06	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	31e33109-b008-489b-a37a-e13202ed0927	9	A	2025-11-23 00:10:55.119722+00	397	26	3	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	594dedb9-617e-40c9-8375-e4ec632f87a2	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	834c89e5-0e51-4aca-9d66-d414bafa77e1	2	L	2025-11-23 00:11:09.89056+00	388	23	1.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	35a21135-69e5-4940-9112-e68dbf0bd9d6	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	ecacbc7b-cc64-4ed6-8ab6-10c433fb3ce9	19	L	2025-11-23 00:11:18.425703+00	398	19	7	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	993d3319-2808-4f15-af93-a4f4b8d24e79	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	d2bdacae-dd5f-4dd4-8535-a65ff9e42774	7	L	2025-11-23 16:28:01.314755+00	394	22	7.5	b75858d9-3f6f-46b7-be49-6884b28493f6	4b3ef7dc-5dbb-45d5-9c0c-687c4ad4a99f	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	45cc932e-b1d3-4204-aa65-372f0e48111a	11	L	2025-11-23 16:28:19.132008+00	395	11	12.5	b75858d9-3f6f-46b7-be49-6884b28493f6	cf1848e0-9f4c-4120-a81a-037c587a6636	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	79b2ed90-8c59-4bc9-92f0-2489d70c2da7	25	M	2025-11-23 16:28:26.894804+00	379	3	13.5	b75858d9-3f6f-46b7-be49-6884b28493f6	27d88ddf-52d6-4d52-bb54-fbcdf23bc952	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	e266dc82-da06-45ad-b515-1658832012d5	21	L	2025-11-23 16:28:37.642676+00	383	12	6.5	b75858d9-3f6f-46b7-be49-6884b28493f6	2ca89f81-aca0-44b8-8395-75e0d7ba89f5	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	e4f9bc56-5420-4c15-8992-4feb8126e69a	27	M	2025-11-23 16:28:55.70796+00	380	6	2.5	b75858d9-3f6f-46b7-be49-6884b28493f6	58fff39c-bcfa-4af8-9c81-6eb9c9423dc0	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	1a9a4ec2-e36e-445c-a230-904155133ad1	16	M	2025-11-23 16:29:01.56328+00	384	16	3.5	b75858d9-3f6f-46b7-be49-6884b28493f6	640a6a15-a713-4b99-aa37-881fa2ed3546	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	6d12b6ae-fe56-49e5-80d2-4b51d40770ae	31	M	2025-11-23 16:29:29.197986+00	396	29	12.5	b75858d9-3f6f-46b7-be49-6884b28493f6	c4c98870-58db-4e4a-b57a-225cf9ce2476	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	431b3ac4-42da-42a1-9a49-3b791f370ab2	8	M	2025-11-23 16:29:39.830038+00	387	17	3.5	b75858d9-3f6f-46b7-be49-6884b28493f6	8aeeeaed-799b-42c8-8a46-a3110dce13db	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	bc2dbf36-4786-48e6-9721-e16c5c2eb3e2	15	M	2025-11-23 16:29:48.233099+00	386	15	2.5	b75858d9-3f6f-46b7-be49-6884b28493f6	27a351f4-d20a-4437-9711-d054a7787ca6	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	31e33109-b008-489b-a37a-e13202ed0927	26	H	2025-11-23 16:30:00.869932+00	397	26	3	b75858d9-3f6f-46b7-be49-6884b28493f6	ea97f128-36c7-42a8-aadc-b52495aa2557	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	834c89e5-0e51-4aca-9d66-d414bafa77e1	2	H	2025-11-23 16:30:13.75975+00	388	23	1.5	b75858d9-3f6f-46b7-be49-6884b28493f6	2bf0e474-03f1-4358-9caf-50f51a07d26f	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	ecacbc7b-cc64-4ed6-8ab6-10c433fb3ce9	30	M	2025-11-23 16:30:24.647571+00	398	19	7	b75858d9-3f6f-46b7-be49-6884b28493f6	c5c2ac6b-58de-45fa-b0c3-49739fd28a5c	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	7bdfc892-5cad-43d2-b235-02afede1ecbd	28	M	2025-11-23 16:30:36.403625+00	399	28	7.5	b75858d9-3f6f-46b7-be49-6884b28493f6	18c7b574-e1f3-4dea-b3ef-1d510c01f55d	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	45cc932e-b1d3-4204-aa65-372f0e48111a	11	M	2025-11-23 16:41:48.127272+00	395	11	12.5	93abda42-cf85-4c5f-bd90-81210369b2dc	266a4d1c-c621-4f18-ae04-bd3e033a0bc5	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	d2bdacae-dd5f-4dd4-8535-a65ff9e42774	7	L	2025-11-23 16:41:59.775494+00	394	22	7.5	93abda42-cf85-4c5f-bd90-81210369b2dc	00f5d533-3071-48ce-ab96-fc300dcd6f73	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	79b2ed90-8c59-4bc9-92f0-2489d70c2da7	3	M	2025-11-23 16:42:03.882444+00	379	3	13.5	93abda42-cf85-4c5f-bd90-81210369b2dc	21ae284d-7d15-469e-ac30-0af0ce937889	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	e266dc82-da06-45ad-b515-1658832012d5	21	L	2025-11-23 16:42:10.270319+00	383	12	6.5	93abda42-cf85-4c5f-bd90-81210369b2dc	74101b86-d8ca-47d6-99e3-e894d5b734e5	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	e4f9bc56-5420-4c15-8992-4feb8126e69a	27	M	2025-11-23 16:42:15.926892+00	380	6	2.5	93abda42-cf85-4c5f-bd90-81210369b2dc	59a8716d-55e9-46f4-ae2e-089f43da8939	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	1a9a4ec2-e36e-445c-a230-904155133ad1	14	M	2025-11-23 16:42:26.527786+00	384	16	3.5	93abda42-cf85-4c5f-bd90-81210369b2dc	e441b982-c57e-45df-aafd-7684113ad44b	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	6d12b6ae-fe56-49e5-80d2-4b51d40770ae	29	L	2025-11-23 16:42:30.825667+00	396	29	12.5	93abda42-cf85-4c5f-bd90-81210369b2dc	f9bfc018-442f-4397-8dbc-1fdb01ef97bf	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	431b3ac4-42da-42a1-9a49-3b791f370ab2	8	L	2025-11-23 16:42:40.049876+00	387	17	3.5	93abda42-cf85-4c5f-bd90-81210369b2dc	343a2064-ca39-4be5-8b10-2691514cd7fc	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	bc2dbf36-4786-48e6-9721-e16c5c2eb3e2	15	H	2025-11-23 16:42:47.168737+00	386	15	2.5	93abda42-cf85-4c5f-bd90-81210369b2dc	c659da4e-ffdf-4571-a713-01c3dba6178e	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	7bdfc892-5cad-43d2-b235-02afede1ecbd	5	L	2025-11-23 16:43:19.208496+00	399	28	7.5	93abda42-cf85-4c5f-bd90-81210369b2dc	91e24ef6-ff7b-4e99-8af0-9b0f5ea78743	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	31e33109-b008-489b-a37a-e13202ed0927	9	L	2025-11-23 16:42:54.677697+00	397	26	3	93abda42-cf85-4c5f-bd90-81210369b2dc	0962c6f1-e0cb-4244-8028-5f68e2526c34	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	834c89e5-0e51-4aca-9d66-d414bafa77e1	2	L	2025-11-23 16:43:04.412336+00	388	23	1.5	93abda42-cf85-4c5f-bd90-81210369b2dc	2e5edff9-0283-48a9-95db-467dbe62403e	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	ecacbc7b-cc64-4ed6-8ab6-10c433fb3ce9	30	M	2025-11-23 16:43:10.483017+00	398	19	7	93abda42-cf85-4c5f-bd90-81210369b2dc	3588c736-b985-4c88-bb3f-b0b0decf16ab	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	45cc932e-b1d3-4204-aa65-372f0e48111a	24	L	2025-11-23 17:12:03.625384+00	395	11	12.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	6480f8ce-06e0-4b9d-bd27-944509c88d94	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	e4f9bc56-5420-4c15-8992-4feb8126e69a	6	L	2025-11-23 17:13:29.130776+00	380	6	2.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	10796c99-9d95-4e8b-9efc-ac84b036a57b	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	d2bdacae-dd5f-4dd4-8535-a65ff9e42774	7	L	2025-11-23 17:45:26.294898+00	394	22	7.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	f3952fd8-f86e-48be-954a-b80dfff01721	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	45cc932e-b1d3-4204-aa65-372f0e48111a	24	L	2025-11-23 17:45:37.330224+00	395	11	12.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	91e64a21-dbec-46c6-a788-9e1b59e3e0cb	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	79b2ed90-8c59-4bc9-92f0-2489d70c2da7	25	L	2025-11-23 17:45:42.972392+00	379	3	13.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	f7f6bc2b-7067-466c-bb80-760156108577	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	e266dc82-da06-45ad-b515-1658832012d5	21	L	2025-11-23 17:45:48.688165+00	383	12	6.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	7135fd2c-a6fb-406c-addb-fff7d76b01ab	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	e4f9bc56-5420-4c15-8992-4feb8126e69a	27	L	2025-11-23 17:46:26.233061+00	380	6	2.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	0707c0e9-0325-416d-bc8f-986c4cc7e237	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	1a9a4ec2-e36e-445c-a230-904155133ad1	14	L	2025-11-23 17:46:36.558087+00	384	16	3.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	db4f83a8-b042-4c55-b758-435d5d287a17	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	6d12b6ae-fe56-49e5-80d2-4b51d40770ae	29	L	2025-11-23 17:46:43.688967+00	396	29	12.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	fcb76812-1267-4805-9ff7-189fb864b588	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	431b3ac4-42da-42a1-9a49-3b791f370ab2	17	L	2025-11-23 17:46:46.597328+00	387	17	3.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	b952b0af-d569-4ed0-80d8-63d88294d0f2	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	bc2dbf36-4786-48e6-9721-e16c5c2eb3e2	15	L	2025-11-23 17:46:51.026877+00	386	15	2.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	5f896ef2-db1a-492d-990e-9e8dfff81cd7	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	31e33109-b008-489b-a37a-e13202ed0927	26	L	2025-11-23 17:46:54.867472+00	397	26	3	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	2d164cb5-facd-4de7-82ea-fa1a0e992f03	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	834c89e5-0e51-4aca-9d66-d414bafa77e1	23	L	2025-11-23 17:46:58.585683+00	388	23	1.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	791868e8-eea4-4e55-957e-d1deb16e5ddf	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	ecacbc7b-cc64-4ed6-8ab6-10c433fb3ce9	30	L	2025-11-23 17:47:51.385117+00	398	19	7	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	8e83b918-b351-4f3e-a7d1-38d04890b0fe	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	7bdfc892-5cad-43d2-b235-02afede1ecbd	5	L	2025-11-23 17:47:56.575025+00	399	28	7.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	fca49706-0308-463d-9119-5f9052ded256	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	7bdfc892-5cad-43d2-b235-02afede1ecbd	5	M	2025-11-24 00:43:34.663564+00	399	28	7.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	e56db1e0-d6d6-4f7e-9c0b-06b9d0b4769d	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	2ee03b3d-e61b-4633-b5ed-f234f3c51cd6	10	M	2025-11-27 00:58:51.569105+00	420	10	5.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	79038b10-2d3f-42ab-afc4-2a5c1a550de6	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	c4d15223-1220-412c-a372-c5d0b415fee2	7	L	2025-11-27 01:16:39.287744+00	402	3	7	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	502c0e30-2e8c-4782-98d7-ffba6f0305d1	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	5cf03998-5733-4976-bd8d-f70cd50718fb	12	M	2025-11-27 01:16:45.383417+00	400	11	2.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	d94a1beb-6227-4b8c-9a67-5767f0b11725	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	b556dadc-16a2-4062-9e07-c4801a270aea	16	M	2025-11-27 01:16:56.33861+00	417	16	3.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	7384d179-ae79-4feb-8667-4b090f0b6ba9	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	5cf03998-5733-4976-bd8d-f70cd50718fb	11	M	2025-11-27 13:44:17.432823+00	400	11	2.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	1af8962c-0958-494f-9e22-ac47b8455053	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	b556dadc-16a2-4062-9e07-c4801a270aea	9	H	2025-11-27 13:44:21.469859+00	417	16	3.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	d55c42ca-0e3c-40c5-8d7b-90c6f66f7349	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	c4d15223-1220-412c-a372-c5d0b415fee2	7	M	2025-11-27 13:44:25.150361+00	402	3	7	61183ed6-88ce-418b-8bdf-f16c57a350f7	6356de01-b776-4d82-b7a1-6a1f8a8aae6d	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	cc3cd25a-c004-40fa-a591-d8bbbb2ea929	6	M	2025-11-27 13:44:31.494608+00	403	26	7	61183ed6-88ce-418b-8bdf-f16c57a350f7	abe58279-14fa-460a-a65c-9d69de8aee47	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	5cf03998-5733-4976-bd8d-f70cd50718fb	11	L	2025-11-27 17:29:33.072495+00	421	11	3	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	ca7d5447-e66c-4124-9328-853b2efc94eb	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	b556dadc-16a2-4062-9e07-c4801a270aea	16	L	2025-11-27 17:29:41.637021+00	417	16	3.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	bc84de4e-e2bd-4a5d-8b9b-5ec62505cb61	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	c4d15223-1220-412c-a372-c5d0b415fee2	7	L	2025-11-27 17:29:45.826891+00	402	3	7	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	e0f47d00-edcd-45c0-b9c0-e63ea52d8937	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	cc3cd25a-c004-40fa-a591-d8bbbb2ea929	26	L	2025-11-27 17:29:51.136684+00	403	26	7	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	60350293-9c78-45a6-a729-90a300631b15	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	5cf03998-5733-4976-bd8d-f70cd50718fb	11	M	2025-11-27 17:31:46.050146+00	421	11	3	93abda42-cf85-4c5f-bd90-81210369b2dc	623a14e0-0346-4e1d-97e6-3b921e4edf74	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	b556dadc-16a2-4062-9e07-c4801a270aea	9	M	2025-11-27 17:31:49.18504+00	417	16	3.5	93abda42-cf85-4c5f-bd90-81210369b2dc	b39f3bf7-48e2-4a8b-9b95-02bec90b33a8	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	c4d15223-1220-412c-a372-c5d0b415fee2	3	M	2025-11-27 17:31:52.886574+00	402	3	7	93abda42-cf85-4c5f-bd90-81210369b2dc	4f33681d-7c72-4318-a18d-cced91e332ac	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	5cf03998-5733-4976-bd8d-f70cd50718fb	11	H	2025-11-27 17:57:35.885006+00	421	11	3	b75858d9-3f6f-46b7-be49-6884b28493f6	0288bdf8-347d-4a8e-9fb9-dbd42b6ee2ae	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	b556dadc-16a2-4062-9e07-c4801a270aea	9	M	2025-11-27 17:57:42.901712+00	417	16	3.5	b75858d9-3f6f-46b7-be49-6884b28493f6	bd4f410d-b24a-48ac-9734-3f21bfb5b26e	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	c4d15223-1220-412c-a372-c5d0b415fee2	3	L	2025-11-27 17:57:48.739472+00	402	3	7	b75858d9-3f6f-46b7-be49-6884b28493f6	c0e0e607-8082-467e-aad1-e2cb3a84a358	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	cc3cd25a-c004-40fa-a591-d8bbbb2ea929	26	M	2025-11-28 19:42:44.547841+00	403	26	7	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	df4e689e-e5f7-4e2c-b87b-e95c58df604a	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	cc3cd25a-c004-40fa-a591-d8bbbb2ea929	26	L	2025-11-28 19:44:52.200967+00	403	26	7	b75858d9-3f6f-46b7-be49-6884b28493f6	2fe8b154-386c-419b-865b-818bfa7f517a	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	cc3cd25a-c004-40fa-a591-d8bbbb2ea929	6	M	2025-11-28 19:51:01.742777+00	403	26	7	93abda42-cf85-4c5f-bd90-81210369b2dc	657dd7f2-4a7c-477b-a033-7cd6655431fa	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	18174242-6c62-47ff-967f-d60afcc3b0ae	14	L	2025-11-30 14:08:56.897003+00	430	14	3	61183ed6-88ce-418b-8bdf-f16c57a350f7	e3b70265-aa52-4da3-ae53-25fdb02e74c1	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	47f0286f-2598-4319-911a-3592d0ca6f07	5	M	2025-11-30 14:09:02.91981+00	406	19	10.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	4b4565d0-de4f-4742-ba95-575e6945de70	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	3bf722b0-695a-428a-a9fc-f77cd0901e52	15	M	2025-11-30 14:09:13.358418+00	431	15	5.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	84ecc3e9-68a4-41f2-8f84-3cf29c233f61	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	b57ee556-4263-43bf-924d-b59dbfa152f3	30	M	2025-11-30 14:09:18.46717+00	427	30	3.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	1a6167c5-5751-4b06-bef2-6d903de6b652	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	8680b02f-3c5c-405a-8de9-37384b0667d4	8	L	2025-11-30 14:09:32.761141+00	429	28	5.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	3e7a3938-2c40-46ea-8636-a469746f046e	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	5d229b96-7da4-4fcb-a0d5-0bdcae77558e	23	M	2025-11-30 14:09:47.603951+00	410	20	5.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	d4fbb051-1c25-4286-b9da-8ced594c16a6	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	bb418583-3bf5-46ba-beb3-f4257a017cb7	2	M	2025-11-30 14:09:59.312699+00	428	2	3	61183ed6-88ce-418b-8bdf-f16c57a350f7	e804583c-df5c-4615-8edf-5a74f8232ae0	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	bf3f67e5-389a-4bd0-a40e-36cd2780ea22	29	L	2025-11-30 14:10:04.056924+00	419	29	11.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	55d42c43-4efb-43e9-bccb-bf41ecbaf805	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	e2e4275d-7bcf-4d9e-b8cc-b35a5703de8c	4	H	2025-11-30 14:10:12.10481+00	426	4	3	61183ed6-88ce-418b-8bdf-f16c57a350f7	aec76838-7d00-4eed-9dc1-46c1b3560a79	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	3d891558-07e3-4160-b83c-5b4a7d5f63df	18	H	2025-11-30 14:10:21.340462+00	413	18	9.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	692e140e-d0d9-4da3-9626-ed58a4fa24b6	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	bd93f9ba-f462-4a2b-9d3c-8e7795cda802	22	M	2025-11-30 14:10:39.085398+00	415	22	7.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	cef8c613-8901-457f-9773-3ccac752f069	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	18174242-6c62-47ff-967f-d60afcc3b0ae	14	M	2025-11-30 15:49:38.470094+00	430	14	3	b75858d9-3f6f-46b7-be49-6884b28493f6	ebec99a6-f7dc-475a-8f8f-3fccde55311a	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	47f0286f-2598-4319-911a-3592d0ca6f07	5	L	2025-11-30 15:49:47.160534+00	406	19	10.5	b75858d9-3f6f-46b7-be49-6884b28493f6	fde5a297-3b53-49a9-91a3-6e7744d11937	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	3bf722b0-695a-428a-a9fc-f77cd0901e52	15	M	2025-11-30 15:49:55.307619+00	431	15	5.5	b75858d9-3f6f-46b7-be49-6884b28493f6	bfc98aba-f416-4728-b607-4b443edb71e7	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	b57ee556-4263-43bf-924d-b59dbfa152f3	30	M	2025-11-30 15:50:00.836354+00	427	30	3.5	b75858d9-3f6f-46b7-be49-6884b28493f6	1498add2-7d09-49ed-a600-0d10bd26fd50	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	8680b02f-3c5c-405a-8de9-37384b0667d4	8	L	2025-11-30 15:50:07.292491+00	429	28	5.5	b75858d9-3f6f-46b7-be49-6884b28493f6	34f3fef8-4000-4fcc-82be-f7fc32c2cb38	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	5d229b96-7da4-4fcb-a0d5-0bdcae77558e	23	L	2025-11-30 15:50:21.314803+00	410	20	5.5	b75858d9-3f6f-46b7-be49-6884b28493f6	66f40ab2-1c3e-4ff1-b987-569287822583	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	bb418583-3bf5-46ba-beb3-f4257a017cb7	2	L	2025-11-30 15:50:35.686006+00	428	2	3	b75858d9-3f6f-46b7-be49-6884b28493f6	b8111793-57b6-4a99-a817-c599fad4e0d8	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	bf3f67e5-389a-4bd0-a40e-36cd2780ea22	29	L	2025-11-30 15:50:41.908955+00	419	29	11.5	b75858d9-3f6f-46b7-be49-6884b28493f6	9028320e-956f-4eda-8fb9-c3d359c28861	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	e2e4275d-7bcf-4d9e-b8cc-b35a5703de8c	4	M	2025-11-30 15:50:48.357381+00	426	4	3	b75858d9-3f6f-46b7-be49-6884b28493f6	a1ecc05e-f268-4a3e-bb38-a56ae0af7ed6	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	3d891558-07e3-4160-b83c-5b4a7d5f63df	18	M	2025-11-30 15:50:55.42669+00	413	18	9.5	b75858d9-3f6f-46b7-be49-6884b28493f6	2054d254-1897-4274-bfe3-799f580e7057	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	2ee03b3d-e61b-4633-b5ed-f234f3c51cd6	10	H	2025-11-30 15:51:02.584424+00	432	10	6.5	b75858d9-3f6f-46b7-be49-6884b28493f6	49d365d1-b8b1-452a-822e-9ce590f5c5fd	\N
b75858d9-3f6f-46b7-be49-6884b28493f6	bd93f9ba-f462-4a2b-9d3c-8e7795cda802	22	M	2025-11-30 15:51:11.540637+00	415	22	7.5	b75858d9-3f6f-46b7-be49-6884b28493f6	4b7e5948-d259-4159-b092-3588ffa4c0bb	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	18174242-6c62-47ff-967f-d60afcc3b0ae	14	M	2025-11-30 16:29:33.394365+00	430	14	3	93abda42-cf85-4c5f-bd90-81210369b2dc	0ad0fed8-8f4a-48e3-84b2-fb74eced6cb8	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	47f0286f-2598-4319-911a-3592d0ca6f07	5	L	2025-11-30 16:29:40.663734+00	406	19	10.5	93abda42-cf85-4c5f-bd90-81210369b2dc	edcc7397-9a8e-4fbf-9565-5788015509be	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	3bf722b0-695a-428a-a9fc-f77cd0901e52	15	M	2025-11-30 16:29:43.978055+00	431	15	5.5	93abda42-cf85-4c5f-bd90-81210369b2dc	61145420-3330-435a-8606-3c86a379933d	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	b57ee556-4263-43bf-924d-b59dbfa152f3	30	L	2025-11-30 16:29:49.480468+00	427	30	3.5	93abda42-cf85-4c5f-bd90-81210369b2dc	30a7c44d-bdad-4384-8e93-bceb136945a1	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	5d229b96-7da4-4fcb-a0d5-0bdcae77558e	20	M	2025-11-30 16:30:00.964559+00	410	20	5.5	93abda42-cf85-4c5f-bd90-81210369b2dc	4c131719-bbee-4121-a291-0b0fa72b6544	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	bb418583-3bf5-46ba-beb3-f4257a017cb7	2	M	2025-11-30 16:30:06.140685+00	428	2	3	93abda42-cf85-4c5f-bd90-81210369b2dc	c8689b5a-b4c6-49c0-b964-ffe507e02f4a	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	bf3f67e5-389a-4bd0-a40e-36cd2780ea22	21	M	2025-11-30 16:30:11.996387+00	419	29	11.5	93abda42-cf85-4c5f-bd90-81210369b2dc	e4f03a08-9939-4079-a203-f8ceda376027	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	3d891558-07e3-4160-b83c-5b4a7d5f63df	18	H	2025-11-30 16:30:20.93839+00	413	18	9.5	93abda42-cf85-4c5f-bd90-81210369b2dc	897ec650-9fee-40be-b82d-b8770b5723de	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	2ee03b3d-e61b-4633-b5ed-f234f3c51cd6	10	H	2025-11-30 16:30:26.533633+00	432	10	6.5	93abda42-cf85-4c5f-bd90-81210369b2dc	5e028ff4-2902-40e5-acfc-d5ec47cc65b2	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	bd93f9ba-f462-4a2b-9d3c-8e7795cda802	24	M	2025-11-30 16:30:30.467212+00	415	22	7.5	93abda42-cf85-4c5f-bd90-81210369b2dc	cad8b04b-c450-4eaf-b9e1-2696ed92a2ee	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	8680b02f-3c5c-405a-8de9-37384b0667d4	8	L	2025-11-30 16:29:55.768043+00	429	28	5.5	93abda42-cf85-4c5f-bd90-81210369b2dc	05224add-8469-4e0e-9356-c4447ea41163	\N
93abda42-cf85-4c5f-bd90-81210369b2dc	e2e4275d-7bcf-4d9e-b8cc-b35a5703de8c	4	M	2025-11-30 16:30:15.303448+00	426	4	3	93abda42-cf85-4c5f-bd90-81210369b2dc	e62aecb9-202c-4370-b585-171501c782c8	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	8680b02f-3c5c-405a-8de9-37384b0667d4	28	H	2025-11-30 17:32:33.714163+00	429	28	5.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	5a4a62f6-0f24-44ff-b568-0757f7dffdf1	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	5d229b96-7da4-4fcb-a0d5-0bdcae77558e	20	L	2025-11-30 17:32:41.045409+00	410	20	5.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	711c3983-41b1-4bd4-afd2-de97fb23cdb7	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	18174242-6c62-47ff-967f-d60afcc3b0ae	13	M	2025-11-30 17:32:51.2017+00	430	14	3	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	dd711d6e-ebcc-46de-9bf4-283d482b9ab9	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	47f0286f-2598-4319-911a-3592d0ca6f07	19	H	2025-11-30 17:32:55.090335+00	433	19	9.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	21cc4956-5a3b-4d1e-b7a9-64b3f81d9833	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	b57ee556-4263-43bf-924d-b59dbfa152f3	1	M	2025-11-30 17:32:57.804822+00	434	30	4.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	9918f793-1158-4521-b8d0-7efd0f49907e	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	bf3f67e5-389a-4bd0-a40e-36cd2780ea22	29	H	2025-11-30 17:33:01.399549+00	419	29	11.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	59ca6829-5243-4677-89fe-3308ee418cd0	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	e2e4275d-7bcf-4d9e-b8cc-b35a5703de8c	4	H	2025-11-30 17:33:26.227674+00	426	4	3	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	346a517e-a168-4a6d-9ae0-7e536442a163	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	3d891558-07e3-4160-b83c-5b4a7d5f63df	18	M	2025-11-30 17:33:28.610062+00	413	18	9.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	0f8d4533-4b8a-45b1-b35d-ec0080910cba	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	bd93f9ba-f462-4a2b-9d3c-8e7795cda802	24	M	2025-11-30 17:33:44.111699+00	415	22	7.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	2df51e27-404a-4875-9cb2-c514777bf453	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	bb418583-3bf5-46ba-beb3-f4257a017cb7	2	L	2025-11-30 17:34:07.400636+00	428	2	3	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	e34125dd-3291-477e-b3d4-870bf3fa454d	\N
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	3bf722b0-695a-428a-a9fc-f77cd0901e52	31	L	2025-11-30 17:34:47.568393+00	431	15	5.5	2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	ae5f64be-4cb0-4418-9c58-3c3f00c4bbb6	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	8680b02f-3c5c-405a-8de9-37384b0667d4	28	L	2025-11-30 17:49:26.678319+00	429	28	5.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	d2e4ad3d-40b0-4895-91d3-150bd9982ade	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	3bf722b0-695a-428a-a9fc-f77cd0901e52	15	L	2025-11-30 17:49:30.485755+00	431	15	5.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	dd559a75-415c-427b-a6a5-71512b04b95b	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	5d229b96-7da4-4fcb-a0d5-0bdcae77558e	20	M	2025-11-30 17:49:36.133872+00	410	20	5.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	c343da3b-66d7-4dcf-ac49-2da3bdccaa04	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	bb418583-3bf5-46ba-beb3-f4257a017cb7	25	L	2025-11-30 17:49:55.689336+00	428	2	3	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	4175acd1-0a97-470f-a769-669346defb7a	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	18174242-6c62-47ff-967f-d60afcc3b0ae	14	M	2025-11-30 17:50:06.4968+00	430	14	3	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	93303afd-cefd-4aff-9111-a9befda9a4a3	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	47f0286f-2598-4319-911a-3592d0ca6f07	19	M	2025-11-30 17:50:10.141258+00	433	19	9.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	14f14641-28be-494d-9b6e-b4d6000522d1	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	b57ee556-4263-43bf-924d-b59dbfa152f3	30	L	2025-11-30 17:53:37.738481+00	434	30	4.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	40afa85f-77b8-47c9-8e8f-3ef36d943b65	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	bf3f67e5-389a-4bd0-a40e-36cd2780ea22	21	L	2025-11-30 17:54:10.150895+00	419	29	11.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	c3f2670f-8ea0-4701-bd76-6da06e2a7884	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	3d891558-07e3-4160-b83c-5b4a7d5f63df	18	L	2025-11-30 17:54:19.037221+00	413	18	9.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	dec74a15-236a-43ce-ba60-ac8c416dcc7b	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	e2e4275d-7bcf-4d9e-b8cc-b35a5703de8c	4	L	2025-11-30 17:54:22.880652+00	426	4	3	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	71c48d23-35a7-42b8-acb4-ebb6d645e414	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	2ee03b3d-e61b-4633-b5ed-f234f3c51cd6	10	L	2025-11-30 17:54:33.736665+00	435	10	5.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	9732ac1d-9fe9-4f25-8ebd-da5f8f280448	\N
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	bd93f9ba-f462-4a2b-9d3c-8e7795cda802	24	M	2025-11-30 17:54:42.983567+00	415	22	7.5	8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	79149dc0-7d45-474b-8fde-b45db26c5ee7	\N
61183ed6-88ce-418b-8bdf-f16c57a350f7	2ee03b3d-e61b-4633-b5ed-f234f3c51cd6	10	A	2025-12-01 01:10:18.315764+00	435	10	5.5	61183ed6-88ce-418b-8bdf-f16c57a350f7	bf32abd8-eacc-47df-9197-2f518fb2f63e	\N
\.
COPY public.results (game_id, winning_team_id, cover_result, graded_at) FROM stdin;
\.
COPY public.seasons (id, league, year) FROM stdin;
1	NFL	2025
\.
COPY public.settings (id, odds_api_monthly_cap, odds_api_calls_used_current_month, reset_on, missed_pick_penalty) FROM stdin;
t	1000	0	\N	-1
\.
COPY public.teams (id, league, external_key, name, short_name) FROM stdin;
1	NFL	ARI	Arizona Cardinals	ARI
2	NFL	ATL	Atlanta Falcons	ATL
3	NFL	BAL	Baltimore Ravens	BAL
4	NFL	BUF	Buffalo Bills	BUF
5	NFL	CAR	Carolina Panthers	CAR
6	NFL	CHI	Chicago Bears	CHI
7	NFL	CIN	Cincinnati Bengals	CIN
8	NFL	CLE	Cleveland Browns	CLE
9	NFL	DAL	Dallas Cowboys	DAL
10	NFL	DEN	Denver Broncos	DEN
11	NFL	DET	Detroit Lions	DET
12	NFL	GB	Green Bay Packers	GB
13	NFL	HOU	Houston Texans	HOU
14	NFL	IND	Indianapolis Colts	IND
15	NFL	JAX	Jacksonville Jaguars	JAX
16	NFL	KC	Kansas City Chiefs	KC
17	NFL	LV	Las Vegas Raiders	LV
18	NFL	LAC	Los Angeles Chargers	LAC
19	NFL	LAR	Los Angeles Rams	LAR
20	NFL	MIA	Miami Dolphins	MIA
21	NFL	MIN	Minnesota Vikings	MIN
22	NFL	NE	New England Patriots	NE
23	NFL	NO	New Orleans Saints	NO
24	NFL	NYG	New York Giants	NYG
25	NFL	NYJ	New York Jets	NYJ
26	NFL	PHI	Philadelphia Eagles	PHI
27	NFL	PIT	Pittsburgh Steelers	PIT
28	NFL	SF	San Francisco 49ers	SF
29	NFL	SEA	Seattle Seahawks	SEA
30	NFL	TB	Tampa Bay Buccaneers	TB
31	NFL	TEN	Tennessee Titans	TEN
32	NFL	WAS	Washington Commanders	WAS
\.
COPY public.totals (user_id, week_id, points_delta, season_total_cached) FROM stdin;
\.
COPY public.users (id, display_name, role, created_at) FROM stdin;
2eb04dd8-fe15-4d42-a4ca-b12d9b5edb42	doughill1000	admin	2025-09-04 20:50:11.004199+00
8a0efc82-a142-4dd0-9ea8-d0ae0bf372c1	hmandeles	player	2025-09-04 23:57:13.333087+00
b75858d9-3f6f-46b7-be49-6884b28493f6	mchestnu	player	2025-09-04 23:57:27.245671+00
d8db1ea2-76a7-4cb1-8025-167bef10c724	brettporter112	player	2025-09-04 23:58:02.467788+00
93abda42-cf85-4c5f-bd90-81210369b2dc	colins.dempsey	player	2025-09-04 23:58:16.858087+00
61183ed6-88ce-418b-8bdf-f16c57a350f7	frank.pickel100	player	2025-09-04 23:58:27.059749+00
de892c1b-349d-4050-af72-e1c9c3099395	Doug	admin	2025-09-25 02:10:03.093107+00
fe9c2ab9-08e4-448f-a306-ecc2b0f9855e	test	player	2025-10-23 19:25:23.65203+00
\.
COPY public.weeks (id, season_id, week_number, start_ts, end_ts) FROM stdin;
1	1	-2	2025-08-12 00:00:00+00	2025-08-19 00:00:00+00
2	1	6	2025-10-07 00:00:00+00	2025-10-14 00:00:00+00
3	1	8	2025-10-21 00:00:00+00	2025-10-28 00:00:00+00
4	1	3	2025-09-16 00:00:00+00	2025-09-23 00:00:00+00
5	1	14	2025-12-02 00:00:00+00	2025-12-09 00:00:00+00
6	1	9	2025-10-28 00:00:00+00	2025-11-04 00:00:00+00
7	1	7	2025-10-14 00:00:00+00	2025-10-21 00:00:00+00
8	1	16	2025-12-16 00:00:00+00	2025-12-23 00:00:00+00
9	1	4	2025-09-23 00:00:00+00	2025-09-30 00:00:00+00
10	1	1	2025-09-02 00:00:00+00	2025-09-09 00:00:00+00
11	1	11	2025-11-11 00:00:00+00	2025-11-18 00:00:00+00
12	1	-3	2025-08-19 00:00:00+00	2025-08-26 00:00:00+00
13	1	17	2025-12-23 00:00:00+00	2025-12-30 00:00:00+00
14	1	18	2025-12-30 00:00:00+00	2026-01-06 00:00:00+00
15	1	12	2025-11-18 00:00:00+00	2025-11-25 00:00:00+00
16	1	10	2025-11-04 00:00:00+00	2025-11-11 00:00:00+00
17	1	2	2025-09-09 00:00:00+00	2025-09-16 00:00:00+00
18	1	15	2025-12-09 00:00:00+00	2025-12-16 00:00:00+00
19	1	-1	2025-08-05 00:00:00+00	2025-08-12 00:00:00+00
20	1	13	2025-11-25 00:00:00+00	2025-12-02 00:00:00+00
21	1	5	2025-09-30 00:00:00+00	2025-10-07 00:00:00+00
\.

SELECT pg_catalog.setval('public.audit_log_id_seq', 132, true);
SELECT pg_catalog.setval('public.game_lines_id_seq', 454, true);
SELECT pg_catalog.setval('public.seasons_id_seq', 1, true);
SELECT pg_catalog.setval('public.teams_id_seq', 32, true);
SELECT pg_catalog.setval('public.weeks_id_seq', 21, true);

SET session_replication_role = DEFAULT;
