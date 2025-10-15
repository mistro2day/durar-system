--
-- PostgreSQL database dump
--

\restrict GEOvARN26BG2GrRwjNJBKBWgnRgh933yeTZ0fcP2hMLUeAaKsrdhmOiF9F8tAVd

-- Dumped from database version 18.0
-- Dumped by pg_dump version 18.0

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: Property; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public."Property" (id, name, type, address, "createdAt") VALUES (1, 'فندق درر للخدمات العقارية', 'HOTEL', 'الباحة - طريق الملك عبدالعزيز', '2025-10-14 03:42:21.869');
INSERT INTO public."Property" (id, name, type, address, "createdAt") VALUES (2, 'عمارة الجدوى', 'BUILDING', 'الجدوى - الباحة', '2025-10-14 03:42:21.877');
INSERT INTO public."Property" (id, name, type, address, "createdAt") VALUES (3, 'عمارة السلامة', 'BUILDING', 'السلامة - الباحة', '2025-10-14 03:42:21.879');
INSERT INTO public."Property" (id, name, type, address, "createdAt") VALUES (4, 'المحلات التجارية - السوق', 'COMMERCIAL', 'وسط الباحة - السوق الرئيسي', '2025-10-14 03:42:21.881');


--
-- Data for Name: Tenant; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public."Tenant" (id, name, phone, email, "createdAt") VALUES (1, 'محمد حيدر', '0000000000', NULL, '2025-10-14 03:47:59.876');
INSERT INTO public."Tenant" (id, name, phone, email, "createdAt") VALUES (2, 'عمر بن احمد بافرط', '546665859', NULL, '2025-10-15 02:06:57.009');
INSERT INTO public."Tenant" (id, name, phone, email, "createdAt") VALUES (3, 'عبدالعزيز العديلي', '500009117', NULL, '2025-10-15 02:06:57.039');
INSERT INTO public."Tenant" (id, name, phone, email, "createdAt") VALUES (4, 'عادل بن عطية العصلاني', '568880711', NULL, '2025-10-15 02:06:57.046');
INSERT INTO public."Tenant" (id, name, phone, email, "createdAt") VALUES (5, 'انس هيثم محمد شعبان', '539785768', NULL, '2025-10-15 02:06:57.052');
INSERT INTO public."Tenant" (id, name, phone, email, "createdAt") VALUES (6, 'محمد حسام شوقي', '591860862', NULL, '2025-10-15 02:06:57.058');
INSERT INTO public."Tenant" (id, name, phone, email, "createdAt") VALUES (7, 'سالم حسن محمد الفهمي الزهراني', '549845455', NULL, '2025-10-15 02:06:57.067');
INSERT INTO public."Tenant" (id, name, phone, email, "createdAt") VALUES (8, 'مساعد محمد عبدالله المشوح', '554001787', NULL, '2025-10-15 02:06:57.072');
INSERT INTO public."Tenant" (id, name, phone, email, "createdAt") VALUES (9, 'سلطان حميدي فواز الروقي العتيبي', '558580888', NULL, '2025-10-15 02:06:57.078');
INSERT INTO public."Tenant" (id, name, phone, email, "createdAt") VALUES (10, 'امين احمد محمد حسنين', '568870371', NULL, '2025-10-15 02:06:57.084');
INSERT INTO public."Tenant" (id, name, phone, email, "createdAt") VALUES (11, 'هيثم ساتي - صديق الدكتور', '505558055', NULL, '2025-10-15 02:06:57.09');
INSERT INTO public."Tenant" (id, name, phone, email, "createdAt") VALUES (12, 'اشرف ايوب مدني', '504616033', NULL, '2025-10-15 02:06:57.095');
INSERT INTO public."Tenant" (id, name, phone, email, "createdAt") VALUES (13, 'karyna horobets', '504447851', NULL, '2025-10-15 02:06:57.101');
INSERT INTO public."Tenant" (id, name, phone, email, "createdAt") VALUES (14, 'مسؤولية سعيد', '—', NULL, '2025-10-15 02:06:57.106');


--
-- Data for Name: Unit; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public."Unit" (id, number, type, status, "propertyId", "createdAt", area, baths, floor, rooms) VALUES (161, '101', 'MONTHLY', 'AVAILABLE', 1, '2025-10-15 02:10:01.464', NULL, 1, 1, 1);
INSERT INTO public."Unit" (id, number, type, status, "propertyId", "createdAt", area, baths, floor, rooms) VALUES (162, '102', 'MONTHLY', 'AVAILABLE', 1, '2025-10-15 02:10:01.468', NULL, 1, 1, 1);
INSERT INTO public."Unit" (id, number, type, status, "propertyId", "createdAt", area, baths, floor, rooms) VALUES (163, '103', 'MONTHLY', 'AVAILABLE', 1, '2025-10-15 02:10:01.47', NULL, 1, 1, 1);
INSERT INTO public."Unit" (id, number, type, status, "propertyId", "createdAt", area, baths, floor, rooms) VALUES (164, '104', 'MONTHLY', 'AVAILABLE', 1, '2025-10-15 02:10:01.473', NULL, 1, 1, 1);
INSERT INTO public."Unit" (id, number, type, status, "propertyId", "createdAt", area, baths, floor, rooms) VALUES (165, '105', 'MONTHLY', 'AVAILABLE', 1, '2025-10-15 02:10:01.475', NULL, 1, 1, 1);
INSERT INTO public."Unit" (id, number, type, status, "propertyId", "createdAt", area, baths, floor, rooms) VALUES (166, '106', 'MONTHLY', 'AVAILABLE', 1, '2025-10-15 02:10:01.477', NULL, 1, 1, 1);
INSERT INTO public."Unit" (id, number, type, status, "propertyId", "createdAt", area, baths, floor, rooms) VALUES (167, '107', 'DAILY', 'AVAILABLE', 1, '2025-10-15 02:10:01.479', NULL, 1, 1, 1);
INSERT INTO public."Unit" (id, number, type, status, "propertyId", "createdAt", area, baths, floor, rooms) VALUES (168, '108', 'MONTHLY', 'AVAILABLE', 1, '2025-10-15 02:10:01.481', NULL, 1, 1, 1);
INSERT INTO public."Unit" (id, number, type, status, "propertyId", "createdAt", area, baths, floor, rooms) VALUES (172, '204', 'MONTHLY', 'AVAILABLE', 1, '2025-10-15 02:10:01.488', NULL, 1, 2, 1);
INSERT INTO public."Unit" (id, number, type, status, "propertyId", "createdAt", area, baths, floor, rooms) VALUES (173, '205', 'MONTHLY', 'AVAILABLE', 1, '2025-10-15 02:10:01.49', NULL, 1, 2, 1);
INSERT INTO public."Unit" (id, number, type, status, "propertyId", "createdAt", area, baths, floor, rooms) VALUES (174, '206', 'MONTHLY', 'AVAILABLE', 1, '2025-10-15 02:10:01.492', NULL, 1, 2, 1);
INSERT INTO public."Unit" (id, number, type, status, "propertyId", "createdAt", area, baths, floor, rooms) VALUES (175, '207', 'MONTHLY', 'AVAILABLE', 1, '2025-10-15 02:10:01.493', NULL, 1, 2, 1);
INSERT INTO public."Unit" (id, number, type, status, "propertyId", "createdAt", area, baths, floor, rooms) VALUES (176, '208', 'MONTHLY', 'AVAILABLE', 1, '2025-10-15 02:10:01.495', NULL, 1, 2, 1);
INSERT INTO public."Unit" (id, number, type, status, "propertyId", "createdAt", area, baths, floor, rooms) VALUES (177, '301', 'MONTHLY', 'AVAILABLE', 1, '2025-10-15 02:10:01.497', NULL, 1, 3, 1);
INSERT INTO public."Unit" (id, number, type, status, "propertyId", "createdAt", area, baths, floor, rooms) VALUES (178, '302', 'MONTHLY', 'AVAILABLE', 1, '2025-10-15 02:10:01.499', NULL, 1, 3, 1);
INSERT INTO public."Unit" (id, number, type, status, "propertyId", "createdAt", area, baths, floor, rooms) VALUES (180, '304', 'DAILY', 'AVAILABLE', 1, '2025-10-15 02:10:01.502', NULL, 1, 3, 1);
INSERT INTO public."Unit" (id, number, type, status, "propertyId", "createdAt", area, baths, floor, rooms) VALUES (184, '308', 'MONTHLY', 'AVAILABLE', 1, '2025-10-15 02:10:01.509', NULL, 1, 3, 1);
INSERT INTO public."Unit" (id, number, type, status, "propertyId", "createdAt", area, baths, floor, rooms) VALUES (185, '401', 'MONTHLY', 'AVAILABLE', 1, '2025-10-15 02:10:01.51', NULL, 1, 4, 1);
INSERT INTO public."Unit" (id, number, type, status, "propertyId", "createdAt", area, baths, floor, rooms) VALUES (187, '403', 'MONTHLY', 'AVAILABLE', 1, '2025-10-15 02:10:01.514', NULL, 1, 4, 1);
INSERT INTO public."Unit" (id, number, type, status, "propertyId", "createdAt", area, baths, floor, rooms) VALUES (189, '405', 'MONTHLY', 'AVAILABLE', 1, '2025-10-15 02:10:01.516', NULL, 1, 4, 1);
INSERT INTO public."Unit" (id, number, type, status, "propertyId", "createdAt", area, baths, floor, rooms) VALUES (190, '406', 'MONTHLY', 'AVAILABLE', 1, '2025-10-15 02:10:01.518', NULL, 1, 4, 1);
INSERT INTO public."Unit" (id, number, type, status, "propertyId", "createdAt", area, baths, floor, rooms) VALUES (191, '407', 'MONTHLY', 'AVAILABLE', 1, '2025-10-15 02:10:01.521', NULL, 1, 4, 1);
INSERT INTO public."Unit" (id, number, type, status, "propertyId", "createdAt", area, baths, floor, rooms) VALUES (192, '408', 'MONTHLY', 'AVAILABLE', 1, '2025-10-15 02:10:01.523', NULL, 1, 4, 1);
INSERT INTO public."Unit" (id, number, type, status, "propertyId", "createdAt", area, baths, floor, rooms) VALUES (195, '503', 'MONTHLY', 'AVAILABLE', 1, '2025-10-15 02:10:01.527', NULL, 1, 5, 1);
INSERT INTO public."Unit" (id, number, type, status, "propertyId", "createdAt", area, baths, floor, rooms) VALUES (196, '504', 'MONTHLY', 'AVAILABLE', 1, '2025-10-15 02:10:01.529', NULL, 1, 5, 1);
INSERT INTO public."Unit" (id, number, type, status, "propertyId", "createdAt", area, baths, floor, rooms) VALUES (197, '505', 'MONTHLY', 'AVAILABLE', 1, '2025-10-15 02:10:01.531', NULL, 1, 5, 1);
INSERT INTO public."Unit" (id, number, type, status, "propertyId", "createdAt", area, baths, floor, rooms) VALUES (199, '507', 'MONTHLY', 'AVAILABLE', 1, '2025-10-15 02:10:01.533', NULL, 1, 5, 1);
INSERT INTO public."Unit" (id, number, type, status, "propertyId", "createdAt", area, baths, floor, rooms) VALUES (200, '508', 'MONTHLY', 'AVAILABLE', 1, '2025-10-15 02:10:01.536', NULL, 1, 5, 1);
INSERT INTO public."Unit" (id, number, type, status, "propertyId", "createdAt", area, baths, floor, rooms) VALUES (201, '601', 'MONTHLY', 'AVAILABLE', 1, '2025-10-15 02:10:01.537', NULL, 2, 6, 1);
INSERT INTO public."Unit" (id, number, type, status, "propertyId", "createdAt", area, baths, floor, rooms) VALUES (43, 'Office-1', 'YEARLY', 'AVAILABLE', 2, '2025-10-14 03:42:21.918', NULL, 1, 0, 1);
INSERT INTO public."Unit" (id, number, type, status, "propertyId", "createdAt", area, baths, floor, rooms) VALUES (44, 'Office-2', 'YEARLY', 'AVAILABLE', 2, '2025-10-14 03:42:21.919', NULL, 1, 0, 1);
INSERT INTO public."Unit" (id, number, type, status, "propertyId", "createdAt", area, baths, floor, rooms) VALUES (45, 'Office-3', 'YEARLY', 'AVAILABLE', 2, '2025-10-14 03:42:21.919', NULL, 1, 0, 1);
INSERT INTO public."Unit" (id, number, type, status, "propertyId", "createdAt", area, baths, floor, rooms) VALUES (46, 'Office-4', 'YEARLY', 'AVAILABLE', 2, '2025-10-14 03:42:21.92', NULL, 1, 0, 1);
INSERT INTO public."Unit" (id, number, type, status, "propertyId", "createdAt", area, baths, floor, rooms) VALUES (47, 'Office-5', 'YEARLY', 'AVAILABLE', 2, '2025-10-14 03:42:21.921', NULL, 1, 0, 1);
INSERT INTO public."Unit" (id, number, type, status, "propertyId", "createdAt", area, baths, floor, rooms) VALUES (48, 'Office-6', 'YEARLY', 'AVAILABLE', 2, '2025-10-14 03:42:21.921', NULL, 1, 0, 1);
INSERT INTO public."Unit" (id, number, type, status, "propertyId", "createdAt", area, baths, floor, rooms) VALUES (49, 'Office-7', 'YEARLY', 'AVAILABLE', 2, '2025-10-14 03:42:21.922', NULL, 1, 0, 1);
INSERT INTO public."Unit" (id, number, type, status, "propertyId", "createdAt", area, baths, floor, rooms) VALUES (50, 'Office-8', 'YEARLY', 'AVAILABLE', 2, '2025-10-14 03:42:21.922', NULL, 1, 0, 1);
INSERT INTO public."Unit" (id, number, type, status, "propertyId", "createdAt", area, baths, floor, rooms) VALUES (51, 'Office-9', 'YEARLY', 'AVAILABLE', 2, '2025-10-14 03:42:21.923', NULL, 1, 0, 1);
INSERT INTO public."Unit" (id, number, type, status, "propertyId", "createdAt", area, baths, floor, rooms) VALUES (52, 'Office-10', 'YEARLY', 'AVAILABLE', 2, '2025-10-14 03:42:21.924', NULL, 1, 0, 1);
INSERT INTO public."Unit" (id, number, type, status, "propertyId", "createdAt", area, baths, floor, rooms) VALUES (53, 'Office-11', 'YEARLY', 'AVAILABLE', 2, '2025-10-14 03:42:21.925', NULL, 1, 0, 1);
INSERT INTO public."Unit" (id, number, type, status, "propertyId", "createdAt", area, baths, floor, rooms) VALUES (54, 'Office-12', 'YEARLY', 'AVAILABLE', 2, '2025-10-14 03:42:21.926', NULL, 1, 0, 1);
INSERT INTO public."Unit" (id, number, type, status, "propertyId", "createdAt", area, baths, floor, rooms) VALUES (55, 'Office-13', 'YEARLY', 'AVAILABLE', 2, '2025-10-14 03:42:21.927', NULL, 1, 0, 1);
INSERT INTO public."Unit" (id, number, type, status, "propertyId", "createdAt", area, baths, floor, rooms) VALUES (56, 'Office-14', 'YEARLY', 'AVAILABLE', 2, '2025-10-14 03:42:21.928', NULL, 1, 0, 1);
INSERT INTO public."Unit" (id, number, type, status, "propertyId", "createdAt", area, baths, floor, rooms) VALUES (57, 'Office-15', 'YEARLY', 'AVAILABLE', 2, '2025-10-14 03:42:21.928', NULL, 1, 0, 1);
INSERT INTO public."Unit" (id, number, type, status, "propertyId", "createdAt", area, baths, floor, rooms) VALUES (58, 'Office-16', 'YEARLY', 'AVAILABLE', 2, '2025-10-14 03:42:21.929', NULL, 1, 0, 1);
INSERT INTO public."Unit" (id, number, type, status, "propertyId", "createdAt", area, baths, floor, rooms) VALUES (59, 'Office-17', 'YEARLY', 'AVAILABLE', 2, '2025-10-14 03:42:21.93', NULL, 1, 0, 1);
INSERT INTO public."Unit" (id, number, type, status, "propertyId", "createdAt", area, baths, floor, rooms) VALUES (60, 'Office-18', 'YEARLY', 'AVAILABLE', 2, '2025-10-14 03:42:21.931', NULL, 1, 0, 1);
INSERT INTO public."Unit" (id, number, type, status, "propertyId", "createdAt", area, baths, floor, rooms) VALUES (61, 'Office-19', 'YEARLY', 'AVAILABLE', 2, '2025-10-14 03:42:21.932', NULL, 1, 0, 1);
INSERT INTO public."Unit" (id, number, type, status, "propertyId", "createdAt", area, baths, floor, rooms) VALUES (62, 'Office-20', 'YEARLY', 'AVAILABLE', 2, '2025-10-14 03:42:21.934', NULL, 1, 0, 1);
INSERT INTO public."Unit" (id, number, type, status, "propertyId", "createdAt", area, baths, floor, rooms) VALUES (63, 'Office-21', 'YEARLY', 'AVAILABLE', 2, '2025-10-14 03:42:21.935', NULL, 1, 0, 1);
INSERT INTO public."Unit" (id, number, type, status, "propertyId", "createdAt", area, baths, floor, rooms) VALUES (64, 'Office-22', 'YEARLY', 'AVAILABLE', 2, '2025-10-14 03:42:21.936', NULL, 1, 0, 1);
INSERT INTO public."Unit" (id, number, type, status, "propertyId", "createdAt", area, baths, floor, rooms) VALUES (65, 'Office-23', 'YEARLY', 'AVAILABLE', 2, '2025-10-14 03:42:21.936', NULL, 1, 0, 1);
INSERT INTO public."Unit" (id, number, type, status, "propertyId", "createdAt", area, baths, floor, rooms) VALUES (66, 'Office-24', 'YEARLY', 'AVAILABLE', 2, '2025-10-14 03:42:21.937', NULL, 1, 0, 1);
INSERT INTO public."Unit" (id, number, type, status, "propertyId", "createdAt", area, baths, floor, rooms) VALUES (68, 'S-1', 'YEARLY', 'AVAILABLE', 3, '2025-10-14 03:42:21.939', NULL, 1, 0, 1);
INSERT INTO public."Unit" (id, number, type, status, "propertyId", "createdAt", area, baths, floor, rooms) VALUES (69, 'S-2', 'YEARLY', 'AVAILABLE', 3, '2025-10-14 03:42:21.94', NULL, 1, 0, 1);
INSERT INTO public."Unit" (id, number, type, status, "propertyId", "createdAt", area, baths, floor, rooms) VALUES (70, 'S-3', 'YEARLY', 'AVAILABLE', 3, '2025-10-14 03:42:21.941', NULL, 1, 0, 1);
INSERT INTO public."Unit" (id, number, type, status, "propertyId", "createdAt", area, baths, floor, rooms) VALUES (71, 'S-4', 'YEARLY', 'AVAILABLE', 3, '2025-10-14 03:42:21.941', NULL, 1, 0, 1);
INSERT INTO public."Unit" (id, number, type, status, "propertyId", "createdAt", area, baths, floor, rooms) VALUES (72, 'S-5', 'YEARLY', 'AVAILABLE', 3, '2025-10-14 03:42:21.942', NULL, 1, 0, 1);
INSERT INTO public."Unit" (id, number, type, status, "propertyId", "createdAt", area, baths, floor, rooms) VALUES (73, 'S-6', 'YEARLY', 'AVAILABLE', 3, '2025-10-14 03:42:21.943', NULL, 1, 0, 1);
INSERT INTO public."Unit" (id, number, type, status, "propertyId", "createdAt", area, baths, floor, rooms) VALUES (74, 'S-7', 'YEARLY', 'AVAILABLE', 3, '2025-10-14 03:42:21.943', NULL, 1, 0, 1);
INSERT INTO public."Unit" (id, number, type, status, "propertyId", "createdAt", area, baths, floor, rooms) VALUES (75, 'Shop-1', 'YEARLY', 'AVAILABLE', 4, '2025-10-14 03:42:21.944', NULL, 1, 0, 1);
INSERT INTO public."Unit" (id, number, type, status, "propertyId", "createdAt", area, baths, floor, rooms) VALUES (76, 'Shop-2', 'YEARLY', 'AVAILABLE', 4, '2025-10-14 03:42:21.945', NULL, 1, 0, 1);
INSERT INTO public."Unit" (id, number, type, status, "propertyId", "createdAt", area, baths, floor, rooms) VALUES (77, 'Shop-3', 'YEARLY', 'AVAILABLE', 4, '2025-10-14 03:42:21.946', NULL, 1, 0, 1);
INSERT INTO public."Unit" (id, number, type, status, "propertyId", "createdAt", area, baths, floor, rooms) VALUES (78, 'Shop-4', 'YEARLY', 'AVAILABLE', 4, '2025-10-14 03:42:21.947', NULL, 1, 0, 1);
INSERT INTO public."Unit" (id, number, type, status, "propertyId", "createdAt", area, baths, floor, rooms) VALUES (79, 'Shop-5', 'YEARLY', 'AVAILABLE', 4, '2025-10-14 03:42:21.948', NULL, 1, 0, 1);
INSERT INTO public."Unit" (id, number, type, status, "propertyId", "createdAt", area, baths, floor, rooms) VALUES (80, 'Shop-6', 'YEARLY', 'AVAILABLE', 4, '2025-10-14 03:42:21.949', NULL, 1, 0, 1);
INSERT INTO public."Unit" (id, number, type, status, "propertyId", "createdAt", area, baths, floor, rooms) VALUES (81, 'Shop-7', 'YEARLY', 'AVAILABLE', 4, '2025-10-14 03:42:21.95', NULL, 1, 0, 1);
INSERT INTO public."Unit" (id, number, type, status, "propertyId", "createdAt", area, baths, floor, rooms) VALUES (82, 'Shop-8', 'YEARLY', 'AVAILABLE', 4, '2025-10-14 03:42:21.95', NULL, 1, 0, 1);
INSERT INTO public."Unit" (id, number, type, status, "propertyId", "createdAt", area, baths, floor, rooms) VALUES (83, 'Shop-9', 'YEARLY', 'AVAILABLE', 4, '2025-10-14 03:42:21.951', NULL, 1, 0, 1);
INSERT INTO public."Unit" (id, number, type, status, "propertyId", "createdAt", area, baths, floor, rooms) VALUES (84, 'Shop-10', 'YEARLY', 'AVAILABLE', 4, '2025-10-14 03:42:21.952', NULL, 1, 0, 1);
INSERT INTO public."Unit" (id, number, type, status, "propertyId", "createdAt", area, baths, floor, rooms) VALUES (169, '201', 'MONTHLY', 'OCCUPIED', 1, '2025-10-15 02:10:01.483', NULL, 1, 2, 1);
INSERT INTO public."Unit" (id, number, type, status, "propertyId", "createdAt", area, baths, floor, rooms) VALUES (170, '202', 'MONTHLY', 'OCCUPIED', 1, '2025-10-15 02:10:01.485', NULL, 1, 2, 1);
INSERT INTO public."Unit" (id, number, type, status, "propertyId", "createdAt", area, baths, floor, rooms) VALUES (171, '203', 'MONTHLY', 'OCCUPIED', 1, '2025-10-15 02:10:01.487', NULL, 1, 2, 1);
INSERT INTO public."Unit" (id, number, type, status, "propertyId", "createdAt", area, baths, floor, rooms) VALUES (179, '303', 'MONTHLY', 'OCCUPIED', 1, '2025-10-15 02:10:01.5', NULL, 1, 3, 1);
INSERT INTO public."Unit" (id, number, type, status, "propertyId", "createdAt", area, baths, floor, rooms) VALUES (181, '305', 'MONTHLY', 'OCCUPIED', 1, '2025-10-15 02:10:01.504', NULL, 1, 3, 1);
INSERT INTO public."Unit" (id, number, type, status, "propertyId", "createdAt", area, baths, floor, rooms) VALUES (182, '306', 'MONTHLY', 'OCCUPIED', 1, '2025-10-15 02:10:01.506', NULL, 1, 3, 1);
INSERT INTO public."Unit" (id, number, type, status, "propertyId", "createdAt", area, baths, floor, rooms) VALUES (183, '307', 'MONTHLY', 'OCCUPIED', 1, '2025-10-15 02:10:01.507', NULL, 1, 3, 1);
INSERT INTO public."Unit" (id, number, type, status, "propertyId", "createdAt", area, baths, floor, rooms) VALUES (186, '402', 'MONTHLY', 'OCCUPIED', 1, '2025-10-15 02:10:01.512', NULL, 1, 4, 1);
INSERT INTO public."Unit" (id, number, type, status, "propertyId", "createdAt", area, baths, floor, rooms) VALUES (188, '404', 'MONTHLY', 'OCCUPIED', 1, '2025-10-15 02:10:01.515', NULL, 1, 4, 1);
INSERT INTO public."Unit" (id, number, type, status, "propertyId", "createdAt", area, baths, floor, rooms) VALUES (193, '501', 'MONTHLY', 'OCCUPIED', 1, '2025-10-15 02:10:01.524', NULL, 1, 5, 1);
INSERT INTO public."Unit" (id, number, type, status, "propertyId", "createdAt", area, baths, floor, rooms) VALUES (194, '502', 'MONTHLY', 'OCCUPIED', 1, '2025-10-15 02:10:01.526', NULL, 1, 5, 1);
INSERT INTO public."Unit" (id, number, type, status, "propertyId", "createdAt", area, baths, floor, rooms) VALUES (198, '506', 'MONTHLY', 'OCCUPIED', 1, '2025-10-15 02:10:01.532', NULL, 1, 5, 1);
INSERT INTO public."Unit" (id, number, type, status, "propertyId", "createdAt", area, baths, floor, rooms) VALUES (67, 'Office-25', 'YEARLY', 'MAINTENANCE', 2, '2025-10-14 03:42:21.938', NULL, 1, 0, 1);
INSERT INTO public."Unit" (id, number, type, status, "propertyId", "createdAt", area, baths, floor, rooms) VALUES (202, '602', 'MONTHLY', 'OCCUPIED', 1, '2025-10-15 02:10:01.539', NULL, 2, 6, 1);


--
-- Data for Name: Contract; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public."Contract" (id, "tenantId", "unitId", "startDate", "endDate", "rentAmount", status, "autoInvoice", "createdAt", amount, "rentalType", "tenantName", deposit) VALUES (17, 2, 169, '2025-11-20 21:00:00', '2026-05-19 21:00:00', 3500, 'ACTIVE', true, '2025-10-15 02:10:01.545', 3500, 'MONTHLY', 'عمر بن احمد بافرط', 1000);
INSERT INTO public."Contract" (id, "tenantId", "unitId", "startDate", "endDate", "rentAmount", status, "autoInvoice", "createdAt", amount, "rentalType", "tenantName", deposit) VALUES (18, 3, 170, '2025-10-15 21:00:00', '2025-11-14 21:00:00', 2800, 'ACTIVE', true, '2025-10-15 02:10:01.552', 2800, 'MONTHLY', 'عبدالعزيز العديلي', 1000);
INSERT INTO public."Contract" (id, "tenantId", "unitId", "startDate", "endDate", "rentAmount", status, "autoInvoice", "createdAt", amount, "rentalType", "tenantName", deposit) VALUES (19, 4, 171, '2025-09-09 21:00:00', '2025-10-08 21:00:00', 2600, 'ACTIVE', true, '2025-10-15 02:10:01.556', 2600, 'MONTHLY', 'عادل بن عطية العصلاني', 0);
INSERT INTO public."Contract" (id, "tenantId", "unitId", "startDate", "endDate", "rentAmount", status, "autoInvoice", "createdAt", amount, "rentalType", "tenantName", deposit) VALUES (20, 5, 179, '2025-09-06 21:00:00', '2025-10-05 21:00:00', 2800, 'ACTIVE', true, '2025-10-15 02:10:01.561', 2800, 'MONTHLY', 'انس هيثم محمد شعبان', 0);
INSERT INTO public."Contract" (id, "tenantId", "unitId", "startDate", "endDate", "rentAmount", status, "autoInvoice", "createdAt", amount, "rentalType", "tenantName", deposit) VALUES (21, 6, 181, '2025-09-30 21:00:00', '2025-10-30 21:00:00', 5000, 'ACTIVE', true, '2025-10-15 02:10:01.566', 5000, 'MONTHLY', 'محمد حسام شوقي', 1000);
INSERT INTO public."Contract" (id, "tenantId", "unitId", "startDate", "endDate", "rentAmount", status, "autoInvoice", "createdAt", amount, "rentalType", "tenantName", deposit) VALUES (22, 7, 182, '2025-09-19 21:00:00', '2025-10-18 21:00:00', 2800, 'ACTIVE', true, '2025-10-15 02:10:01.571', 2800, 'MONTHLY', 'سالم حسن محمد الفهمي الزهراني', 500);
INSERT INTO public."Contract" (id, "tenantId", "unitId", "startDate", "endDate", "rentAmount", status, "autoInvoice", "createdAt", amount, "rentalType", "tenantName", deposit) VALUES (23, 8, 183, '2025-08-31 21:00:00', '2025-10-30 21:00:00', 2800, 'ACTIVE', true, '2025-10-15 02:10:01.575', 2800, 'MONTHLY', 'مساعد محمد عبدالله المشوح', 500);
INSERT INTO public."Contract" (id, "tenantId", "unitId", "startDate", "endDate", "rentAmount", status, "autoInvoice", "createdAt", amount, "rentalType", "tenantName", deposit) VALUES (24, 9, 186, '2025-09-13 21:00:00', '2025-10-12 21:00:00', 2800, 'ACTIVE', true, '2025-10-15 02:10:01.58', 2800, 'MONTHLY', 'سلطان حميدي فواز الروقي العتيبي', 500);
INSERT INTO public."Contract" (id, "tenantId", "unitId", "startDate", "endDate", "rentAmount", status, "autoInvoice", "createdAt", amount, "rentalType", "tenantName", deposit) VALUES (25, 10, 188, '2025-09-17 21:00:00', '2025-10-16 21:00:00', 3000, 'ACTIVE', true, '2025-10-15 02:10:01.584', 3000, 'MONTHLY', 'امين احمد محمد حسنين', 500);
INSERT INTO public."Contract" (id, "tenantId", "unitId", "startDate", "endDate", "rentAmount", status, "autoInvoice", "createdAt", amount, "rentalType", "tenantName", deposit) VALUES (26, 11, 193, '2025-09-08 21:00:00', '2025-10-07 21:00:00', 3000, 'ACTIVE', true, '2025-10-15 02:10:01.588', 3000, 'MONTHLY', 'هيثم ساتي - صديق الدكتور', 0);
INSERT INTO public."Contract" (id, "tenantId", "unitId", "startDate", "endDate", "rentAmount", status, "autoInvoice", "createdAt", amount, "rentalType", "tenantName", deposit) VALUES (27, 12, 194, '2025-09-25 21:00:00', '2025-10-24 21:00:00', 2800, 'ACTIVE', true, '2025-10-15 02:10:01.592', 2800, 'MONTHLY', 'اشرف ايوب مدني', 0);
INSERT INTO public."Contract" (id, "tenantId", "unitId", "startDate", "endDate", "rentAmount", status, "autoInvoice", "createdAt", amount, "rentalType", "tenantName", deposit) VALUES (28, 13, 198, '2025-06-03 21:00:00', '2025-11-02 21:00:00', 3000, 'ACTIVE', true, '2025-10-15 02:10:01.597', 3000, 'MONTHLY', 'karyna horobets', 500);
INSERT INTO public."Contract" (id, "tenantId", "unitId", "startDate", "endDate", "rentAmount", status, "autoInvoice", "createdAt", amount, "rentalType", "tenantName", deposit) VALUES (29, 14, 202, '2025-10-03 21:00:00', '2025-10-06 21:00:00', 6000, 'ACTIVE', true, '2025-10-15 02:10:01.602', 6000, 'DAILY', 'مسؤولية سعيد', 0);


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public."User" (id, name, email, password, role, "createdAt") VALUES (1, 'مدير درر', 'admin@durar.local', '$2a$10$rJ55zx0ad6EUpTmsINgFjOm.eI0ZRxRXRS9FpVMr/ckDyMa/.KtuK', 'ADMIN', '2025-10-14 17:56:08.748');
INSERT INTO public."User" (id, name, email, password, role, "createdAt") VALUES (6, 'محمد علي', 'emp@durar.local', '$2a$10$fN.QHAVbhdf2nOmA2/hUF.bzmgppLvWVnekLNITIUm/KikbhHzC0S', 'USER', '2025-10-14 22:44:25.135');


--
-- Data for Name: ActivityLog; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public."ActivityLog" (id, action, description, "contractId", "userId", "createdAt") VALUES (1, 'End Contract', 'تم إنهاء العقد رقم 2 واسترداد التأمين للعميل محمد حيدر', NULL, NULL, '2025-10-14 14:17:28.412');


--
-- Data for Name: Booking; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: Invoice; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public."Invoice" (id, "tenantId", "bookingId", "contractId", amount, "dueDate", status, "createdAt") VALUES (1, 1, NULL, NULL, 2500, '2025-10-01 00:00:00', 'PENDING', '2025-10-14 03:50:59.434');
INSERT INTO public."Invoice" (id, "tenantId", "bookingId", "contractId", amount, "dueDate", status, "createdAt") VALUES (20, 2, NULL, 17, 3500, '2025-09-23 21:00:00', 'PAID', '2025-10-15 02:10:01.547');
INSERT INTO public."Invoice" (id, "tenantId", "bookingId", "contractId", amount, "dueDate", status, "createdAt") VALUES (21, 3, NULL, 18, 2800, '2025-09-30 21:00:00', 'PAID', '2025-10-15 02:10:01.553');
INSERT INTO public."Invoice" (id, "tenantId", "bookingId", "contractId", amount, "dueDate", status, "createdAt") VALUES (22, 4, NULL, 19, 2600, '2025-09-09 21:00:00', 'PAID', '2025-10-15 02:10:01.557');
INSERT INTO public."Invoice" (id, "tenantId", "bookingId", "contractId", amount, "dueDate", status, "createdAt") VALUES (23, 5, NULL, 20, 2800, '2025-09-08 21:00:00', 'PAID', '2025-10-15 02:10:01.563');
INSERT INTO public."Invoice" (id, "tenantId", "bookingId", "contractId", amount, "dueDate", status, "createdAt") VALUES (24, 6, NULL, 21, 5000, '2025-09-30 21:00:00', 'PAID', '2025-10-15 02:10:01.567');
INSERT INTO public."Invoice" (id, "tenantId", "bookingId", "contractId", amount, "dueDate", status, "createdAt") VALUES (25, 7, NULL, 22, 2800, '2025-09-15 21:00:00', 'PAID', '2025-10-15 02:10:01.572');
INSERT INTO public."Invoice" (id, "tenantId", "bookingId", "contractId", amount, "dueDate", status, "createdAt") VALUES (26, 8, NULL, 23, 2800, '2025-08-31 21:00:00', 'PAID', '2025-10-15 02:10:01.576');
INSERT INTO public."Invoice" (id, "tenantId", "bookingId", "contractId", amount, "dueDate", status, "createdAt") VALUES (27, 9, NULL, 24, 2800, '2025-09-04 21:00:00', 'PAID', '2025-10-15 02:10:01.581');
INSERT INTO public."Invoice" (id, "tenantId", "bookingId", "contractId", amount, "dueDate", status, "createdAt") VALUES (28, 10, NULL, 25, 3000, '2025-09-18 21:00:00', 'PAID', '2025-10-15 02:10:01.585');
INSERT INTO public."Invoice" (id, "tenantId", "bookingId", "contractId", amount, "dueDate", status, "createdAt") VALUES (29, 11, NULL, 26, 3000, '2025-09-08 21:00:00', 'PAID', '2025-10-15 02:10:01.589');
INSERT INTO public."Invoice" (id, "tenantId", "bookingId", "contractId", amount, "dueDate", status, "createdAt") VALUES (30, 12, NULL, 27, 2800, '2025-09-25 21:00:00', 'PAID', '2025-10-15 02:10:01.593');
INSERT INTO public."Invoice" (id, "tenantId", "bookingId", "contractId", amount, "dueDate", status, "createdAt") VALUES (31, 13, NULL, 28, 3000, '2025-06-03 21:00:00', 'PAID', '2025-10-15 02:10:01.598');
INSERT INTO public."Invoice" (id, "tenantId", "bookingId", "contractId", amount, "dueDate", status, "createdAt") VALUES (32, 14, NULL, 29, 6000, '2025-10-03 21:00:00', 'PENDING', '2025-10-15 02:10:01.603');


--
-- Data for Name: MaintenanceTicket; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: MaintenanceAction; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: PasswordReset; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public."PasswordReset" (id, "userId", token, "expiresAt", used, "createdAt") VALUES (1, 1, 'f6fe1e3ed914f55be265fa391d737ba10631ede477a31529', '2025-10-14 23:44:30.282', false, '2025-10-14 22:44:30.284');


--
-- Data for Name: Payment; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: Setting; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public."Setting" (id, key, value, "updatedAt", "createdAt") VALUES (1, 'permissions', '{"permissions": {"ADMIN": "*", "STAFF": ["dashboard.view", "contracts.view", "invoices.view", "units.view", "maintenance.view", "contracts.edit", "contracts.end", "settings.view"], "MANAGER": ["dashboard.view", "contracts.view", "contracts.edit", "contracts.end", "invoices.view", "invoices.edit", "units.view", "units.edit", "maintenance.view", "maintenance.edit", "users.view", "settings.view"]}}', '2025-10-14 22:48:09.411', '2025-10-14 22:45:39.397');


--
-- Data for Name: Shop; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public."Shop" (id, name, location, phone, "ownerId", "createdAt") VALUES (2, 'محل العصائر الطازجة', 'الطابق الأرضي - الزاوية اليمنى', '0555555555', NULL, '2025-10-14 12:59:56.026');


--
-- Name: ActivityLog_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."ActivityLog_id_seq"', 1, true);


--
-- Name: Booking_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Booking_id_seq"', 1, false);


--
-- Name: Contract_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Contract_id_seq"', 29, true);


--
-- Name: Invoice_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Invoice_id_seq"', 32, true);


--
-- Name: MaintenanceAction_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."MaintenanceAction_id_seq"', 1, false);


--
-- Name: MaintenanceTicket_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."MaintenanceTicket_id_seq"', 3, true);


--
-- Name: PasswordReset_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."PasswordReset_id_seq"', 1, true);


--
-- Name: Payment_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Payment_id_seq"', 1, false);


--
-- Name: Property_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Property_id_seq"', 4, true);


--
-- Name: Setting_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Setting_id_seq"', 7, true);


--
-- Name: Shop_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Shop_id_seq"', 2, true);


--
-- Name: Tenant_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Tenant_id_seq"', 14, true);


--
-- Name: Unit_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Unit_id_seq"', 202, true);


--
-- Name: User_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."User_id_seq"', 6, true);


--
-- PostgreSQL database dump complete
--

\unrestrict GEOvARN26BG2GrRwjNJBKBWgnRgh933yeTZ0fcP2hMLUeAaKsrdhmOiF9F8tAVd

