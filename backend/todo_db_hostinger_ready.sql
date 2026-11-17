-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: todo_db
-- ------------------------------------------------------
-- Server version	10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `companies`
--

DROP TABLE IF EXISTS `companies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `companies` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `title` varchar(255) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `logo_path` varchar(255) DEFAULT NULL,
  `status` enum('active','suspended','pending','rejected') DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `email_domain` varchar(255) DEFAULT NULL,
  `primary_color` varchar(30) DEFAULT '#0f766e',
  `secondary_color` varchar(30) DEFAULT '#ffffff',
  `domain` varchar(255) DEFAULT NULL,
  `plan_id` varchar(50) NOT NULL DEFAULT 'trial',
  `subscription_status` enum('active','trialing','past_due','canceled','expired') DEFAULT 'active',
  `trial_ends_at` datetime DEFAULT NULL,
  `current_period_end` datetime DEFAULT NULL,
  `stripe_customer_id` varchar(255) DEFAULT NULL,
  `stripe_subscription_id` varchar(255) DEFAULT NULL,
  `auto_debit_enabled` tinyint(1) NOT NULL DEFAULT 1,
  `trial_used` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `domain` (`domain`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `companies`
--

LOCK TABLES `companies` WRITE;
/*!40000 ALTER TABLE `companies` DISABLE KEYS */;
INSERT INTO `companies` VALUES (0,'System Default','Default System Workspace','System fallback template',NULL,'active','2026-11-12 05:55:27','2026-11-12 05:55:27',NULL,'#0f766e','#ffffff',NULL,'trial','active',NULL,NULL,NULL,NULL,1,0),(1,'Tangent',NULL,NULL,NULL,'active','2026-11-12 06:20:14','2026-11-12 06:47:57','@tangent.com','#e64cd1','#ffffff','tangent.localhost','trial','active','2026-11-24 11:20:14',NULL,NULL,NULL,1,0),(2,'Al-Jannat',NULL,NULL,NULL,'active','2026-11-12 08:14:09','2026-11-12 08:14:34','@aljannat.com','#ff4775','#ffffff','aljannat.localhost','trial','active','2026-11-24 13:14:09',NULL,NULL,NULL,1,0);
/*!40000 ALTER TABLE `companies` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `company_billing_history`
--

DROP TABLE IF EXISTS `company_billing_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `company_billing_history` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `company_id` int(11) NOT NULL,
  `invoice_number` varchar(100) NOT NULL,
  `plan_id` varchar(50) NOT NULL,
  `plan_name` varchar(100) NOT NULL,
  `amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `currency` varchar(10) NOT NULL DEFAULT 'USD',
  `status` varchar(50) NOT NULL DEFAULT 'paid',
  `billing_date` datetime NOT NULL,
  `period_start` datetime DEFAULT NULL,
  `period_end` datetime DEFAULT NULL,
  `payment_method` varchar(100) DEFAULT 'Card ending in 4242',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_billing_company` (`company_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `company_billing_history`
--

LOCK TABLES `company_billing_history` WRITE;
/*!40000 ALTER TABLE `company_billing_history` DISABLE KEYS */;
/*!40000 ALTER TABLE `company_billing_history` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `company_payment_cards`
--

DROP TABLE IF EXISTS `company_payment_cards`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `company_payment_cards` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `company_id` int(11) NOT NULL,
  `cardholder_name` varchar(255) NOT NULL,
  `brand` varchar(50) NOT NULL DEFAULT 'Visa',
  `stripe_payment_method_id` varchar(255) DEFAULT NULL,
  `last4` varchar(10) NOT NULL,
  `exp_month` int(11) NOT NULL,
  `exp_year` int(11) NOT NULL,
  `is_default` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_cards_company` (`company_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `company_payment_cards`
--

LOCK TABLES `company_payment_cards` WRITE;
/*!40000 ALTER TABLE `company_payment_cards` DISABLE KEYS */;
/*!40000 ALTER TABLE `company_payment_cards` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `custom_field_definitions`
--

DROP TABLE IF EXISTS `custom_field_definitions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `custom_field_definitions` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` int(11) NOT NULL,
  `entity_type` enum('project','task') NOT NULL,
  `field_key` varchar(64) NOT NULL,
  `field_name` varchar(128) NOT NULL,
  `field_type` enum('text','number','date','dropdown','checkbox','textarea') NOT NULL DEFAULT 'text',
  `options` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`options`)),
  `placeholder` varchar(255) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `is_required` tinyint(1) NOT NULL DEFAULT 0,
  `order_index` int(11) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_company_entity_key` (`company_id`,`entity_type`,`field_key`),
  KEY `idx_company_entity` (`company_id`,`entity_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `custom_field_definitions`
--

LOCK TABLES `custom_field_definitions` WRITE;
/*!40000 ALTER TABLE `custom_field_definitions` DISABLE KEYS */;
/*!40000 ALTER TABLE `custom_field_definitions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notifications`
--

DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `notifications` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` int(11) DEFAULT NULL,
  `recipient_user_id` bigint(20) unsigned NOT NULL,
  `actor_user_id` bigint(20) unsigned DEFAULT NULL,
  `type` varchar(50) NOT NULL DEFAULT 'mention',
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `task_id` bigint(20) unsigned DEFAULT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_notifications_recipient` (`recipient_user_id`,`is_read`),
  KEY `idx_notifications_company` (`company_id`),
  KEY `fk_notifications_actor` (`actor_user_id`),
  KEY `fk_notifications_task` (`task_id`),
  CONSTRAINT `fk_notifications_actor` FOREIGN KEY (`actor_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_notifications_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_notifications_recipient` FOREIGN KEY (`recipient_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_notifications_task` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notifications`
--

LOCK TABLES `notifications` WRITE;
/*!40000 ALTER TABLE `notifications` DISABLE KEYS */;
INSERT INTO `notifications` VALUES (1,1,4,3,'status_change','Zain changed status of \"Design responsive mobile task board layout\"','Status updated from \"Done\" to \"To Do\"',7,0,'2026-11-16 12:51:54'),(2,1,4,3,'status_change','Zain changed status of \"Design responsive mobile task board layout\"','Status updated from \"To Do\" to \"In Progress\"',7,0,'2026-11-16 12:51:55'),(3,1,4,3,'status_change','Zain changed status of \"Design responsive mobile task board layout\"','Status updated from \"In Progress\" to \"To Do\"',7,0,'2026-11-16 12:51:56'),(4,1,4,3,'status_change','Zain changed status of \"Design responsive mobile task board layout\"','Status updated from \"To Do\" to \"Done\"',7,0,'2026-11-16 12:51:58'),(5,1,4,3,'status_change','Zain changed status of \"Design responsive mobile task board layout\"','Status updated from \"Done\" to \"In Progress\"',7,0,'2026-11-16 12:51:59'),(6,1,4,3,'status_change','Zain changed status of \"Design responsive mobile task board layout\"','Status updated from \"In Progress\" to \"To Do\"',7,0,'2026-11-16 12:52:02');
/*!40000 ALTER TABLE `notifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `permissions`
--

DROP TABLE IF EXISTS `permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `permissions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` varchar(255) NOT NULL DEFAULT '',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_permissions_name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `permissions`
--

LOCK TABLES `permissions` WRITE;
/*!40000 ALTER TABLE `permissions` DISABLE KEYS */;
INSERT INTO `permissions` VALUES (1,'users.manage','Create and manage roles, permissions, and user access'),(2,'tasks.read','View tasks'),(3,'tasks.create','Create tasks'),(4,'tasks.update','Edit and complete tasks'),(5,'tasks.delete','Delete tasks'),(6,'statuses.manage','Configure, add, reorder, and manage task status pipeline');
/*!40000 ALTER TABLE `permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `projects`
--

DROP TABLE IF EXISTS `projects`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `projects` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `image_path` varchar(500) DEFAULT NULL,
  `default_assignee_id` bigint(20) unsigned DEFAULT NULL,
  `form_template_id` int(10) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `custom_fields` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`custom_fields`)),
  `company_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `index_projects_user_id` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `projects`
--

LOCK TABLES `projects` WRITE;
/*!40000 ALTER TABLE `projects` DISABLE KEYS */;
INSERT INTO `projects` VALUES (1,2,'Tangent Cloud Platform','Core multi-tenant SaaS infrastructure, API gateway, SSO authentication, and automated deployment pipelines for enterprise clients.','/uploads/projects/tangent-cloud-platform/icon.jpg',2,NULL,'2026-11-12 11:33:41',NULL,1),(2,3,'Mobile App v2.0 (iOS & Android)','Cross-platform mobile application redesign featuring offline sync, push notifications, biometric login, and real-time task updates.','/uploads/projects/mobile-app-v2/icon.jpg',3,3,'2026-11-12 11:33:42','{\"date\":\"2026-11-12\",\"time\":\"12:34\"}',1),(3,2,'Customer Billing & Stripe Portal','Self-service subscription management, automated invoicing, usage metering, webhook reconciliation, and payment method recovery.','/uploads/projects/customer-billing-stripe/icon.jpg',4,NULL,'2026-11-12 11:33:42',NULL,1),(4,3,'Analytics & Executive Dashboard','Real-time KPI reporting suite with sprint velocity charts, team workload heatmaps, CSV/PDF exports, and scheduled email digests.','/uploads/projects/analytics-executive-dashboard/icon.jpg',3,NULL,'2026-11-12 11:33:42',NULL,1),(5,4,'Design System & UI Kit','Unified component library, WCAG AA accessibility audit, dark mode tokens, Figma-to-Angular documentation, and micro-interaction specs.','/uploads/projects/design-system-ui-kit/icon.jpg',4,NULL,'2026-11-12 11:33:42',NULL,1),(6,2,'Security & SOC 2 Compliance','Role-based access hardening, audit logging, dependency vulnerability scanning, penetration testing remediation, and backup drills.','/uploads/projects/security-soc2-compliance/icon.jpg',2,NULL,'2026-11-12 11:33:42',NULL,1),(7,5,'Al-Jannat E-Commerce Storefront','Customer-facing online store with category browsing, variant selection, cart checkout, promo codes, and real-time order tracking.','/uploads/projects/aljannat-ecommerce-storefront/icon.jpg',6,NULL,'2026-11-12 13:19:34',NULL,2),(8,5,'Inventory & Warehouse Operations','Centralized stock control across main warehouse and retail branches, including barcode receiving, supplier POs, and low-stock alerts.','/uploads/projects/aljannat-inventory-warehouse/icon.jpg',7,NULL,'2026-11-12 13:19:34',NULL,2),(9,6,'Customer Support & CRM Desk','Unified customer service workspace for order inquiries, return/exchange tickets, SLA tracking, and WhatsApp/email response templates.','/uploads/projects/aljannat-customer-crm-desk/icon.jpg',6,NULL,'2026-11-12 13:19:34',NULL,2),(10,7,'Delivery & Fleet Dispatch Portal','Last-mile dispatch dashboard for assigning city couriers, batching delivery routes, capturing e-signatures, and tracking COD cash collection.','/uploads/projects/aljannat-delivery-fleet-portal/icon.jpg',7,NULL,'2026-11-12 13:19:34',NULL,2),(11,5,'Finance, POS & Daily Settlement','Branch point-of-sale closeout, bank deposit matching, supplier invoice approvals, and automated monthly revenue & tax reporting.','/uploads/projects/aljannat-finance-pos-settlement/icon.jpg',5,NULL,'2026-11-12 13:19:34',NULL,2);
/*!40000 ALTER TABLE `projects` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `role_permissions`
--

DROP TABLE IF EXISTS `role_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `role_permissions` (
  `role_id` bigint(20) unsigned NOT NULL,
  `permission_id` bigint(20) unsigned NOT NULL,
  PRIMARY KEY (`role_id`,`permission_id`),
  KEY `fk_role_permissions_permission` (`permission_id`),
  CONSTRAINT `fk_role_permissions_permission` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_role_permissions_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `role_permissions`
--

LOCK TABLES `role_permissions` WRITE;
/*!40000 ALTER TABLE `role_permissions` DISABLE KEYS */;
INSERT INTO `role_permissions` VALUES (1,1),(1,2),(1,3),(1,4),(1,5),(1,6),(2,2),(2,3),(2,4),(2,5),(3,2),(3,3),(3,4),(3,5),(4,2);
/*!40000 ALTER TABLE `role_permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `roles` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` varchar(255) NOT NULL DEFAULT '',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `company_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_company_role_name` (`company_id`,`name`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES (1,'admin','Full system access','2026-11-12 10:55:20',NULL),(2,'editor','Can manage tasks','2026-11-12 10:55:20',NULL),(3,'user','Task access controlled by permissions','2026-11-12 10:55:20',NULL),(4,'viewer','Read-only task access','2026-11-12 10:55:20',NULL),(5,'super_admin','Super Admin - System-wide Multi-Company Owner','2026-11-12 10:55:21',NULL);
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `schema_migrations`
--

DROP TABLE IF EXISTS `schema_migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `schema_migrations` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `applied_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_schema_migration_name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=54 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `schema_migrations`
--

LOCK TABLES `schema_migrations` WRITE;
/*!40000 ALTER TABLE `schema_migrations` DISABLE KEYS */;
INSERT INTO `schema_migrations` VALUES (1,'create_tasks.sql','2026-11-12 10:55:16'),(2,'create_users.sql','2026-11-12 10:55:16'),(3,'update_user_roles.sql','2026-11-12 10:55:16'),(4,'update_users_permissions.sql','2026-11-12 10:55:16'),(5,'zzz_00_projects_and_task_project_fk.sql','2026-11-12 10:55:18'),(6,'zzz_billing_history.sql','2026-11-12 10:55:18'),(7,'zzz_chat_note_tables.sql','2026-11-12 10:55:18'),(8,'zzz_custom_fields.sql','2026-11-12 10:55:19'),(9,'zzz_projects_default_assignee_id.sql','2026-11-12 10:55:19'),(10,'zzz_rbac_01_roles.sql','2026-11-12 10:55:19'),(11,'zzz_rbac_02_permissions.sql','2026-11-12 10:55:19'),(12,'zzz_rbac_03_role_permissions.sql','2026-11-12 10:55:19'),(13,'zzz_rbac_04_user_role_id.sql','2026-11-12 10:55:19'),(14,'zzz_rbac_05_user_role_fk.sql','2026-11-12 10:55:20'),(15,'zzz_rbac_06_seed_roles.sql','2026-11-12 10:55:20'),(16,'zzz_rbac_07_seed_permissions.sql','2026-11-12 10:55:20'),(17,'zzz_rbac_07b_permission_statuses_manage.sql','2026-11-12 10:55:21'),(18,'zzz_rbac_08_admin_permissions.sql','2026-11-12 10:55:21'),(19,'zzz_rbac_09_editor_permissions.sql','2026-11-12 10:55:21'),(20,'zzz_rbac_10_user_permissions.sql','2026-11-12 10:55:21'),(21,'zzz_rbac_11_viewer_permissions.sql','2026-11-12 10:55:21'),(22,'zzz_rbac_12_assign_existing_users.sql','2026-11-12 10:55:21'),(23,'zzz_rbac_13_remove_can_create_tasks.sql','2026-11-12 10:55:21'),(24,'zzz_rbac_14_remove_legacy_role.sql','2026-11-12 10:55:21'),(25,'zzz_rbac_15_add_profile_image_path.sql','2026-11-12 10:55:21'),(26,'zzz_super_admin_01_multi_tenant.sql','2026-11-12 10:55:21'),(27,'zzz_super_admin_01b_notifications.sql','2026-11-12 10:55:23'),(28,'zzz_super_admin_02_default_company.sql','2026-11-12 10:55:23'),(29,'zzz_super_admin_03_company_email_domain.sql','2026-11-12 10:55:23'),(30,'zzz_super_admin_04_company_theme_colors.sql','2026-11-12 10:55:23'),(31,'zzz_super_admin_05_company_roles.sql','2026-11-12 10:55:23'),(32,'zzz_super_admin_06_company_domain.sql','2026-11-12 10:55:24'),(33,'zzz_super_admin_07_company_pending_status.sql','2026-11-12 10:55:24'),(34,'zzz_super_admin_08_per_company_user_email.sql','2026-11-12 10:55:24'),(35,'zzz_super_admin_09_user_password_tokens.sql','2026-11-12 10:55:25'),(36,'zzz_super_admin_10_subscriptions.sql','2026-11-12 10:55:25'),(37,'zzz_task_assignee_ids.sql','2026-11-12 10:55:25'),(38,'zzz_task_attachments.sql','2026-11-12 10:55:25'),(39,'zzz_task_attachments_default.sql','2026-11-12 10:55:25'),(40,'zzz_task_estimated_minutes.sql','2026-11-12 10:55:25'),(41,'zzz_task_notes_table.sql','2026-11-12 10:55:26'),(42,'zzz_task_spent_minutes.sql','2026-11-12 10:55:26'),(43,'zzz_task_status_dynamic_varchar.sql','2026-11-12 10:55:26'),(44,'zzz_task_statuses.sql','2026-11-12 10:55:26'),(45,'zzz_task_statuses_02_single_row_json.sql','2026-11-12 10:55:27'),(46,'zzz_task_statuses_03_templates.sql','2026-11-12 10:55:27'),(47,'zzz_task_statuses_04_templates_clean.sql','2026-11-12 10:55:27'),(48,'zzz_task_statuses_05_normalized.sql','2026-11-12 10:55:29'),(49,'zzz_task_statuses_06_task_status_id.sql','2026-11-12 10:55:29'),(50,'zzz_task_statuses_07_remove_slug.sql','2026-11-12 10:55:29'),(51,'zzz_timesheets.sql','2026-11-12 10:55:30'),(52,'zzz_task_form_templates_and_project_fk.sql','2026-11-12 11:51:41'),(53,'zzz_super_admin_11_payment_cards_and_auto_debit.sql','2026-11-17 11:13:27');
/*!40000 ALTER TABLE `schema_migrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `task_form_templates`
--

DROP TABLE IF EXISTS `task_form_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `task_form_templates` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` int(11) NOT NULL,
  `name` varchar(128) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `is_default` tinyint(1) NOT NULL DEFAULT 0,
  `target_entity` varchar(32) NOT NULL DEFAULT 'task',
  `fields_config` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`fields_config`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_company` (`company_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `task_form_templates`
--

LOCK TABLES `task_form_templates` WRITE;
/*!40000 ALTER TABLE `task_form_templates` DISABLE KEYS */;
INSERT INTO `task_form_templates` VALUES (1,0,'Standard Task Form','Built-in default task creation form with full standard fields.',1,'task','{\"standardFields\":{\"description\":{\"enabled\":true,\"required\":false},\"project\":{\"enabled\":true,\"required\":true},\"status\":{\"enabled\":true,\"required\":false},\"priority\":{\"enabled\":true,\"required\":false},\"assignees\":{\"enabled\":true,\"required\":false},\"dueDate\":{\"enabled\":true,\"required\":false},\"dueTime\":{\"enabled\":true,\"required\":false},\"estimatedTime\":{\"enabled\":true,\"required\":false},\"category\":{\"enabled\":true,\"required\":false},\"tags\":{\"enabled\":true,\"required\":false},\"attachments\":{\"enabled\":true,\"required\":false}},\"customFields\":[]}','2026-11-12 05:55:43','2026-11-12 05:55:43',NULL),(2,1,'Branches',NULL,0,'task','{\"sectionTitle\":\"Branch\",\"standardFields\":{\"description\":{\"enabled\":true,\"required\":false},\"project\":{\"enabled\":true,\"required\":true},\"status\":{\"enabled\":true,\"required\":false},\"priority\":{\"enabled\":true,\"required\":false},\"assignees\":{\"enabled\":true,\"required\":false},\"dueDate\":{\"enabled\":true,\"required\":false},\"dueTime\":{\"enabled\":true,\"required\":false},\"estimatedTime\":{\"enabled\":true,\"required\":false},\"category\":{\"enabled\":true,\"required\":false},\"tags\":{\"enabled\":true,\"required\":false},\"attachments\":{\"enabled\":true,\"required\":false}},\"customFields\":[{\"fieldKey\":\"frontend_branch\",\"fieldName\":\"Frontend Branch\",\"fieldType\":\"text\",\"columnWidth\":\"half\",\"bsCol\":\"col-md-6\",\"fieldSize\":\"default\",\"options\":[],\"isRequired\":false,\"orderIndex\":0},{\"fieldKey\":\"backend_branch\",\"fieldName\":\"Backend Branch\",\"fieldType\":\"text\",\"columnWidth\":\"half\",\"bsCol\":\"col-md-6\",\"fieldSize\":\"default\",\"options\":[],\"isRequired\":false,\"orderIndex\":1}]}','2026-11-12 06:59:46','2026-11-12 07:43:18',NULL),(3,1,'Dead line',NULL,0,'task','{\"sectionTitle\":\"Dead line\",\"standardFields\":{\"description\":{\"enabled\":true,\"required\":false},\"project\":{\"enabled\":true,\"required\":true},\"status\":{\"enabled\":true,\"required\":false},\"priority\":{\"enabled\":true,\"required\":false},\"assignees\":{\"enabled\":true,\"required\":false},\"dueDate\":{\"enabled\":true,\"required\":false},\"dueTime\":{\"enabled\":true,\"required\":false},\"estimatedTime\":{\"enabled\":true,\"required\":false},\"category\":{\"enabled\":true,\"required\":false},\"tags\":{\"enabled\":true,\"required\":false},\"attachments\":{\"enabled\":true,\"required\":false}},\"customFields\":[{\"fieldKey\":\"date\",\"fieldName\":\"Date\",\"fieldType\":\"date\",\"columnWidth\":\"half\",\"bsCol\":\"col-md-6\",\"fieldSize\":\"default\",\"options\":[],\"isRequired\":false,\"orderIndex\":0},{\"fieldKey\":\"time\",\"fieldName\":\"Time\",\"fieldType\":\"time\",\"columnWidth\":\"half\",\"bsCol\":\"col-md-6\",\"fieldSize\":\"default\",\"options\":[],\"isRequired\":false,\"orderIndex\":1}]}','2026-11-12 07:00:48','2026-11-12 07:43:02',NULL);
/*!40000 ALTER TABLE `task_form_templates` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `task_notes`
--

DROP TABLE IF EXISTS `task_notes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `task_notes` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `task_id` bigint(20) unsigned NOT NULL,
  `user_id` bigint(20) unsigned NOT NULL,
  `content` text NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_task_notes_task_id` (`task_id`),
  KEY `idx_task_notes_user_id` (`user_id`),
  CONSTRAINT `fk_task_notes_task` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_task_notes_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `task_notes`
--

LOCK TABLES `task_notes` WRITE;
/*!40000 ALTER TABLE `task_notes` DISABLE KEYS */;
/*!40000 ALTER TABLE `task_notes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `task_statuses`
--

DROP TABLE IF EXISTS `task_statuses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `task_statuses` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `company_id` int(11) NOT NULL DEFAULT 0,
  `name` varchar(100) NOT NULL,
  `color` varchar(30) DEFAULT '#2563eb',
  `sort_order` int(11) NOT NULL DEFAULT 1,
  `is_initial` tinyint(1) NOT NULL DEFAULT 0,
  `is_completed` tinyint(1) NOT NULL DEFAULT 0,
  `is_default` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_task_statuses_company` (`company_id`),
  KEY `idx_task_statuses_order` (`company_id`,`sort_order`),
  CONSTRAINT `fk_task_statuses_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `task_statuses`
--

LOCK TABLES `task_statuses` WRITE;
/*!40000 ALTER TABLE `task_statuses` DISABLE KEYS */;
INSERT INTO `task_statuses` VALUES (1,0,'To Do','#dc2626',1,1,0,1,'2026-11-12 05:55:29','2026-11-12 05:55:29'),(2,0,'In Progress','#2563eb',2,0,0,1,'2026-11-12 05:55:29','2026-11-12 05:55:29'),(3,0,'Done','#16a34a',3,0,1,1,'2026-11-12 05:55:29','2026-11-12 05:55:29'),(4,1,'To Do','#dc2626',1,1,0,1,'2026-11-12 06:20:15','2026-11-12 06:20:15'),(5,1,'In Progress','#2563eb',2,0,0,1,'2026-11-12 06:20:15','2026-11-12 06:20:15'),(6,1,'Done','#16a34a',3,0,1,1,'2026-11-12 06:20:15','2026-11-12 06:20:15'),(7,2,'To Do','#dc2626',1,1,0,1,'2026-11-12 08:14:10','2026-11-12 08:14:10'),(8,2,'In Progress','#2563eb',2,0,0,1,'2026-11-12 08:14:10','2026-11-12 08:14:10'),(9,2,'Done','#16a34a',3,0,1,1,'2026-11-12 08:14:10','2026-11-12 08:14:10');
/*!40000 ALTER TABLE `task_statuses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tasks`
--

DROP TABLE IF EXISTS `tasks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tasks` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned DEFAULT NULL,
  `project_id` bigint(20) unsigned DEFAULT NULL,
  `form_template_id` int(10) unsigned DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `completed` tinyint(1) NOT NULL DEFAULT 0,
  `status` varchar(50) NOT NULL DEFAULT 'pending',
  `priority` enum('low','medium','high') NOT NULL DEFAULT 'medium',
  `due_date` date DEFAULT NULL,
  `due_time` time DEFAULT NULL,
  `estimated_minutes` int(10) unsigned DEFAULT NULL COMMENT 'Expected effort to complete',
  `spent_minutes` int(10) unsigned DEFAULT 0 COMMENT 'Actual time spent on task',
  `category` varchar(100) NOT NULL DEFAULT 'Personal',
  `tags` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`tags`)),
  `attachments` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`attachments`)),
  `created_at` datetime NOT NULL,
  `custom_fields` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`custom_fields`)),
  `company_id` int(11) DEFAULT NULL,
  `assignee_ids` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`assignee_ids`)),
  `status_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `index_tasks_user_id` (`user_id`),
  KEY `fk_tasks_project` (`project_id`),
  KEY `idx_tasks_status_id` (`status_id`),
  CONSTRAINT `fk_tasks_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_tasks_status_id` FOREIGN KEY (`status_id`) REFERENCES `task_statuses` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=53 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tasks`
--

LOCK TABLES `tasks` WRITE;
/*!40000 ALTER TABLE `tasks` DISABLE KEYS */;
INSERT INTO `tasks` VALUES (1,2,1,NULL,'Configure multi-tenant subdomain routing & SSL','Set up wildcard *.tangent.localhost and production TLS termination with tenant isolation headers.',1,'Done','high','2026-11-08','17:00:00',240,225,'Infrastructure','[\"devops\",\"ssl\",\"multi-tenant\"]','[]','2026-11-12 11:33:41',NULL,1,'[2,3]',6),(2,2,1,NULL,'Implement JWT refresh token rotation','Add short-lived access tokens with HTTP-only refresh token rotation and revocation list in Redis/MySQL.',0,'In Progress','high','2026-11-14','15:00:00',180,110,'Backend','[\"auth\",\"security\",\"jwt\"]','[]','2026-11-12 11:33:41',NULL,1,'[3]',5),(3,2,1,NULL,'Build automated database backup cron job','Schedule nightly mysqldump snapshots with 14-day retention and S3 encrypted upload.',0,'In Progress','medium','2026-11-16','18:00:00',120,45,'DevOps','[\"database\",\"backup\",\"automation\"]','[]','2026-11-12 11:33:41',NULL,1,'[2]',5),(4,3,1,NULL,'Add rate limiting middleware to public API','Protect login, signup, and password-reset endpoints against brute-force bursts per IP and tenant.',0,'To Do','high','2026-11-18','12:00:00',90,0,'Security','[\"api\",\"rate-limit\",\"middleware\"]','[]','2026-11-12 11:33:41',NULL,1,'[3,4]',4),(5,2,1,NULL,'Set up health-check & uptime alerting endpoint','Expose /api/health returning DB latency, memory usage, and worker status for monitoring.',1,'Done','low','2026-11-10','16:00:00',60,55,'Monitoring','[\"health\",\"monitoring\",\"api\"]','[]','2026-11-12 11:33:41',NULL,1,'[4]',6),(6,3,1,NULL,'Optimize company workspace query indexes','Add composite indexes on company_id and status_id across tasks and projects tables.',0,'To Do','medium','2026-11-21','14:00:00',150,0,'Database','[\"mysql\",\"performance\",\"indexing\"]','[]','2026-11-12 11:33:41',NULL,1,'[2,3]',4),(7,3,2,2,'Design responsive mobile task board layout','Create touch-friendly swipeable status columns and quick-add bottom sheet for iOS and Android.',0,'To Do','high','2026-11-07','17:00:00',180,170,'UI/UX','[\"mobile\",\"figma\",\"design\"]','[]','2026-11-12 11:33:42','{\"frontend_branch\":\"TODO\",\"backend_branch\":\"backend\"}',1,'[4]',4),(8,3,2,NULL,'Integrate Firebase Cloud Messaging push alerts','Send real-time push notifications when a user is assigned a task or mentioned in task notes.',0,'In Progress','high','2026-11-15','16:00:00',240,130,'Mobile','[\"push\",\"fcm\",\"notifications\"]','[]','2026-11-12 11:33:42',NULL,1,'[3]',5),(9,3,2,NULL,'Implement offline task cache with background sync','Persist recent tasks in local SQLite/IndexedDB and replay mutations once connectivity returns.',0,'To Do','medium','2026-11-22','18:00:00',300,0,'Mobile','[\"offline\",\"sync\",\"storage\"]','[]','2026-11-12 11:33:42',NULL,1,'[3,2]',4),(10,4,2,NULL,'Add Face ID & Fingerprint biometric unlock','Support device biometric prompt before unlocking saved workspace session.',0,'In Progress','medium','2026-11-17','15:00:00',150,60,'Security','[\"biometrics\",\"ios\",\"android\"]','[]','2026-11-12 11:33:42',NULL,1,'[4]',5),(11,2,2,NULL,'Fix attachment preview modal on small viewports','Ensure PDF and image attachments scale cleanly without horizontal overflow on 375px screens.',1,'Done','low','2026-11-11','13:00:00',75,65,'Bugfix','[\"responsive\",\"attachments\",\"css\"]','[]','2026-11-12 11:33:42',NULL,1,'[4,3]',6),(12,3,2,NULL,'Prepare TestFlight & Play Store internal beta build','Bump version to 2.0.0-beta.1, generate release notes, and distribute to QA testers.',0,'To Do','medium','2026-11-26','17:00:00',120,0,'Release','[\"release\",\"beta\",\"qa\"]','[]','2026-11-12 11:33:42',NULL,1,'[2]',4),(13,2,3,NULL,'Wire Stripe Checkout for Pro & Enterprise plans','Connect plan selection cards to Stripe Checkout sessions with company_id metadata.',1,'Done','high','2026-11-06','17:00:00',240,210,'Billing','[\"stripe\",\"checkout\",\"plans\"]','[]','2026-11-12 11:33:42',NULL,1,'[2,4]',6),(14,4,3,NULL,'Handle invoice.payment_failed webhook retries','Mark subscription past_due, log billing history, and email company admin with retry link.',0,'In Progress','high','2026-11-13','16:00:00',180,95,'Backend','[\"webhooks\",\"stripe\",\"dunning\"]','[]','2026-11-12 11:33:42',NULL,1,'[4]',5),(15,4,3,NULL,'Build downloadable PDF invoice generator','Render itemized tax, plan period, and company billing address on downloadable receipts.',0,'To Do','medium','2026-11-19','15:00:00',150,0,'Frontend','[\"pdf\",\"invoices\",\"billing\"]','[]','2026-11-12 11:33:42',NULL,1,'[3]',4),(16,2,3,NULL,'Enforce seat & project quota limits per tier','Validate active user count and project count against subscribed plan limits before creation.',1,'Done','high','2026-11-09','18:00:00',120,115,'Authorization','[\"limits\",\"saas\",\"subscriptions\"]','[]','2026-11-12 11:33:42',NULL,1,'[2]',6),(17,4,3,NULL,'Add saved payment card management UI','Allow admins to add, set default, or remove Visa/Mastercard payment methods safely.',0,'In Progress','medium','2026-11-16','14:00:00',180,70,'Frontend','[\"cards\",\"ui\",\"payments\"]','[]','2026-11-12 11:33:42',NULL,1,'[4,3]',5),(18,3,4,NULL,'Build sprint velocity & completion trend chart','Aggregate completed vs created tasks over the last 30 days using clean interactive charts.',1,'Done','medium','2026-11-09','17:00:00',180,165,'Analytics','[\"charts\",\"kpi\",\"velocity\"]','[]','2026-11-12 11:33:42',NULL,1,'[3]',6),(19,3,4,NULL,'Create team workload & timesheet summary widget','Display logged vs estimated minutes per team member across active projects.',0,'In Progress','high','2026-11-15','16:00:00',150,80,'Reporting','[\"timesheets\",\"workload\",\"team\"]','[]','2026-11-12 11:33:42',NULL,1,'[3,4]',5),(20,4,4,NULL,'Implement CSV & Excel export for project tasks','Allow filtering by status, assignee, and date range before exporting clean UTF-8 CSV.',0,'To Do','medium','2026-11-20','15:00:00',90,0,'Backend','[\"csv\",\"export\",\"reports\"]','[]','2026-11-12 11:33:42',NULL,1,'[4]',4),(21,2,4,NULL,'Add overdue task breakdown by priority','Highlight high-priority overdue tasks at the top of the executive overview card.',0,'In Progress','high','2026-11-14','12:00:00',120,50,'Analytics','[\"overdue\",\"priority\",\"dashboard\"]','[]','2026-11-12 11:33:42',NULL,1,'[2]',5),(22,2,4,NULL,'Schedule weekly Monday morning digest email','Send automated workspace summary email to company admins every Monday at 08:30.',0,'To Do','low','2026-11-24','10:00:00',150,0,'Automation','[\"email\",\"digest\",\"cron\"]','[]','2026-11-12 11:33:42',NULL,1,'[2,3]',4),(23,4,5,NULL,'Standardize primary & semantic CSS color tokens','Define --brand-primary, surface, border, and status badge tokens supporting company theming.',1,'Done','high','2026-11-05','17:00:00',120,115,'Design System','[\"tokens\",\"css\",\"theming\"]','[]','2026-11-12 11:33:42',NULL,1,'[4]',6),(24,4,5,NULL,'Run WCAG AA contrast audit on status badges','Verify foreground/background contrast ratios >= 4.5:1 across To Do, In Progress, and Done pills.',0,'In Progress','medium','2026-11-15','15:00:00',90,40,'Accessibility','[\"a11y\",\"wcag\",\"contrast\"]','[]','2026-11-12 11:33:42',NULL,1,'[4,2]',5),(25,3,5,NULL,'Refactor modal & drawer keyboard focus trap','Ensure Escape closes active modals and Tab cycles cleanly within dialog boundaries.',0,'To Do','medium','2026-11-19','16:00:00',120,0,'Frontend','[\"modals\",\"keyboard\",\"a11y\"]','[]','2026-11-12 11:33:42',NULL,1,'[3]',4),(26,4,5,NULL,'Create unified empty-state illustration cards','Design clean empty states for Projects, Tasks, Notifications, and Search results.',1,'Done','low','2026-11-10','14:00:00',90,85,'UI/UX','[\"empty-state\",\"ui\",\"components\"]','[]','2026-11-12 11:33:42',NULL,1,'[4]',6),(27,4,5,NULL,'Document reusable form field & validation states','Align dynamic form builder inputs, error hints, and toggle switches with design specs.',0,'In Progress','medium','2026-11-17','18:00:00',150,60,'Documentation','[\"forms\",\"validation\",\"docs\"]','[]','2026-11-12 11:33:42',NULL,1,'[3,4]',5),(28,2,6,NULL,'Audit RBAC permission checks on all API routes','Verify every project, task, user, and role endpoint enforces company_id and role permissions.',1,'Done','high','2026-11-07','17:00:00',180,175,'Security','[\"rbac\",\"audit\",\"api\"]','[]','2026-11-12 11:33:42',NULL,1,'[2]',6),(29,2,6,NULL,'Run npm audit & patch high-severity packages','Update backend and Angular dependencies to resolve known CVEs without breaking builds.',0,'In Progress','high','2026-11-14','16:00:00',120,60,'Maintenance','[\"npm\",\"cve\",\"dependencies\"]','[]','2026-11-12 11:33:42',NULL,1,'[3]',5),(30,2,6,NULL,'Implement immutable admin action audit log','Record user role changes, project deletions, and permission updates with actor & timestamp.',0,'To Do','high','2026-11-23','17:00:00',240,0,'Compliance','[\"soc2\",\"audit-log\",\"backend\"]','[]','2026-11-12 11:33:42',NULL,1,'[2,4]',4),(31,3,6,NULL,'Configure strict CORS & Content-Security-Policy','Restrict allowed origins to active tenant subdomains and tighten CSP script/img directives.',1,'Done','medium','2026-11-11','15:00:00',90,80,'Security','[\"cors\",\"csp\",\"headers\"]','[]','2026-11-12 11:33:42',NULL,1,'[3]',6),(32,2,6,NULL,'Execute quarterly database restore drill','Restore latest backup into staging MySQL instance and verify row integrity & foreign keys.',0,'To Do','medium','2026-11-27','11:00:00',120,0,'Operations','[\"disaster-recovery\",\"mysql\",\"drill\"]','[]','2026-11-12 11:33:42',NULL,1,'[2,3,4]',4),(33,5,7,NULL,'Build responsive product catalog & attribute filters','Implement category, price range, size, and stock-availability filters with URL query sync and fast pagination.',1,'Done','high','2026-11-08','17:00:00',240,215,'Frontend','[\"storefront\",\"catalog\",\"filters\"]',NULL,'2026-11-12 13:19:34',NULL,2,'[6]',9),(34,6,7,NULL,'Integrate cash-on-delivery & card checkout flow','Support COD verification, card payment intents, shipping fee calculation, and itemized order confirmation emails.',0,'In Progress','high','2026-11-14','16:00:00',300,160,'Checkout','[\"payments\",\"checkout\",\"cod\"]',NULL,'2026-11-12 13:19:34',NULL,2,'[6,7]',8),(35,5,7,NULL,'Add promo code & seasonal discount engine','Validate percentage/fixed coupons, minimum cart totals, expiry dates, and per-customer redemption limits.',0,'In Progress','medium','2026-11-16','14:00:00',150,60,'Backend','[\"promotions\",\"pricing\",\"api\"]',NULL,'2026-11-12 13:19:34',NULL,2,'[7]',8),(36,7,7,NULL,'Create customer order-tracking timeline page','Display live status milestones (Confirmed, Packed, Dispatched, Delivered) using order number and phone lookup.',0,'To Do','medium','2026-11-19','18:00:00',120,0,'UI/UX','[\"orders\",\"tracking\",\"customer\"]',NULL,'2026-11-12 13:19:34',NULL,2,'[6]',7),(37,5,8,NULL,'Set up SKU barcode scanning for inbound stock','Enable USB/camera barcode scanning on the receiving screen to verify supplier quantities against purchase orders.',1,'Done','high','2026-11-09','15:00:00',180,175,'Warehouse','[\"barcode\",\"inventory\",\"receiving\"]',NULL,'2026-11-12 13:19:34',NULL,2,'[7]',9),(38,7,8,NULL,'Automate low-stock threshold alerts for buyers','Trigger daily email and dashboard alerts whenever fast-moving SKUs drop below their 7-day reorder point.',0,'In Progress','high','2026-11-15','12:00:00',120,70,'Automation','[\"alerts\",\"stock\",\"reorder\"]',NULL,'2026-11-12 13:19:34',NULL,2,'[6,7]',8),(39,5,8,NULL,'Build inter-branch stock transfer approval flow','Allow branch managers to request stock transfers with dispatch notes, transit status, and discrepancy logging.',0,'To Do','medium','2026-11-18','17:00:00',210,0,'Operations','[\"transfers\",\"branches\",\"workflow\"]',NULL,'2026-11-12 13:19:34',NULL,2,'[7]',7),(40,6,8,NULL,'Export monthly stock valuation & shrinkage CSV','Generate weighted-average cost valuation and damaged/expired write-off summaries for audit review.',0,'To Do','low','2026-11-21','16:00:00',90,0,'Reporting','[\"audit\",\"export\",\"valuation\"]',NULL,'2026-11-12 13:19:34',NULL,2,'[5,7]',7),(41,6,9,NULL,'Configure return & exchange ticket workflow','Add structured return reasons, photo upload verification, pickup scheduling, and store-credit issuance.',1,'Done','high','2026-11-10','18:00:00',180,190,'Support','[\"returns\",\"tickets\",\"crm\"]',NULL,'2026-11-12 13:19:34',NULL,2,'[6]',9),(42,5,9,NULL,'Add canned response templates for common queries','Create reusable Arabic/English reply snippets for delivery ETA, size exchange, and payment confirmation.',1,'Done','low','2026-11-11','13:00:00',60,50,'Content','[\"templates\",\"support\",\"replies\"]',NULL,'2026-11-12 13:19:34',NULL,2,'[7]',9),(43,6,9,NULL,'Implement 4-hour first-response SLA countdown','Highlight aging tickets in amber/red and notify team leads before SLA breach during peak hours.',0,'In Progress','high','2026-11-14','17:00:00',150,85,'Backend','[\"sla\",\"alerts\",\"queue\"]',NULL,'2026-11-12 13:19:34',NULL,2,'[6,7]',8),(44,7,9,NULL,'Link customer profile sidebar with past orders','Show lifetime spend, recent order statuses, and saved addresses directly inside each support ticket.',0,'To Do','medium','2026-11-17','15:00:00',120,0,'Frontend','[\"crm\",\"orders\",\"profile\"]',NULL,'2026-11-12 13:19:34',NULL,2,'[6]',7),(45,7,10,NULL,'Build morning courier route batching board','Group ready-to-ship orders by city zone and allow drag-and-drop assignment to available delivery riders.',1,'Done','high','2026-11-10','11:00:00',240,230,'Logistics','[\"dispatch\",\"routes\",\"couriers\"]',NULL,'2026-11-12 13:19:34',NULL,2,'[7]',9),(46,5,10,NULL,'Add mobile proof-of-delivery photo & OTP capture','Require rider photo or 4-digit customer OTP confirmation before marking high-value parcels as delivered.',0,'In Progress','high','2026-11-15','16:30:00',180,95,'Mobile','[\"pod\",\"otp\",\"delivery\"]',NULL,'2026-11-12 13:19:34',NULL,2,'[6,7]',8),(47,7,10,NULL,'Track rider COD cash-in-hand reconciliation','Calculate total cash collected per rider shift and flag pending handovers at end-of-day check-in.',0,'To Do','medium','2026-11-18','18:00:00',150,0,'Finance','[\"cod\",\"riders\",\"settlement\"]',NULL,'2026-11-12 13:19:34',NULL,2,'[7]',7),(48,6,10,NULL,'Send automated SMS/WhatsApp out-for-delivery alerts','Notify customers with rider contact and estimated arrival window as soon as a manifest leaves the hub.',0,'To Do','low','2026-11-20','14:00:00',90,0,'Notifications','[\"sms\",\"whatsapp\",\"eta\"]',NULL,'2026-11-12 13:19:34',NULL,2,'[6]',7),(49,5,11,NULL,'Design end-of-day POS cash drawer closeout form','Record opening float, cash/card/wallet totals, and variance notes for each retail cashier shift.',1,'Done','high','2026-11-09','19:00:00',150,140,'POS','[\"pos\",\"cashier\",\"closeout\"]',NULL,'2026-11-12 13:19:34',NULL,2,'[5,6]',9),(50,5,11,NULL,'Reconcile card terminal batches with bank statements','Import daily merchant settlement CSVs and auto-match transaction IDs against POS sales.',0,'In Progress','high','2026-11-14','17:00:00',210,105,'Accounting','[\"reconciliation\",\"bank\",\"settlement\"]',NULL,'2026-11-12 13:19:35',NULL,2,'[5,7]',8),(51,6,11,NULL,'Build supplier invoice approval & payment queue','Match vendor bills against received warehouse POs and schedule weekly bank transfers.',0,'To Do','medium','2026-11-18','15:00:00',180,0,'Payables','[\"vendors\",\"invoices\",\"approvals\"]',NULL,'2026-11-12 13:19:35',NULL,2,'[6]',7),(52,7,11,NULL,'Generate monthly VAT & sales summary PDF','Compile branch-wise taxable sales, refunds, and net margin into a clean downloadable PDF statement.',0,'To Do','medium','2026-11-22','16:00:00',120,0,'Reporting','[\"tax\",\"pdf\",\"monthly\"]',NULL,'2026-11-12 13:19:35',NULL,2,'[5,7]',7);
/*!40000 ALTER TABLE `tasks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `timesheets`
--

DROP TABLE IF EXISTS `timesheets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `timesheets` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `task` varchar(255) DEFAULT NULL,
  `project` varchar(255) DEFAULT NULL,
  `time` varchar(100) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_timesheets_user` (`user_id`),
  CONSTRAINT `fk_timesheets_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `timesheets`
--

LOCK TABLES `timesheets` WRITE;
/*!40000 ALTER TABLE `timesheets` DISABLE KEYS */;
INSERT INTO `timesheets` VALUES (1,4,'Design responsive mobile task board layout','Create touch-friendly swipeable status columns and quick-add bottom sheet for iOS and Android.','UI/UX','Mobile App v2.0 (iOS & Android)','2h 50m','2026-11-12 12:55:06','2026-11-12 12:55:06');
/*!40000 ALTER TABLE `timesheets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `users` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `username` varchar(100) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `profile_image_path` varchar(500) DEFAULT NULL,
  `role_id` bigint(20) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `company_id` int(11) DEFAULT NULL,
  `password_reset_token` varchar(255) DEFAULT NULL,
  `password_reset_expires` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_users_company_email` (`company_id`,`email`),
  KEY `fk_users_role` (`role_id`),
  CONSTRAINT `fk_users_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'Super Admin','superadmin@gmail.com','$2b$12$ywpO0/cLiYnHftVm2KgYL.Ad2HTrTp4Lpcq/coFZYLqSm2JP7tD62',NULL,5,'2026-11-12 10:55:21','2026-11-17 13:01:36',NULL,NULL,NULL),(2,'admin','admin@tangent.com','$2b$12$UJGgylNhBgZUHx/0pkV3HuEM.2Ht1Zlo6JVM58g5RoW95mT4Qll/y','/uploads/profiles/1794464590744-593819094.png',1,'2026-11-12 11:20:15','2026-11-12 11:23:10',1,NULL,NULL),(3,'Zain','zain@tangent.com','$2b$12$4as5c9A.YqF4g7mYI1Rhx.kBOcZxRjx7SQf9pVdtk1mC0oSZAZU2y','/uploads/profiles/1794464577698-122232489.jpeg',3,'2026-11-12 11:22:40','2026-11-12 11:22:57',1,NULL,NULL),(4,'Abdullah','abdullah@tangent.com','$2b$12$OcyUrITLZ5TqukKiEUa.L.SUVJKK0zbxs8LFEIUYS8nHDwG0ULldK','/uploads/profiles/1794464894366-743616965.png',3,'2026-11-12 11:28:15','2026-11-12 11:28:15',1,NULL,NULL),(5,'admin','admin@aljannat.com','$2b$12$Dv5wUoECXvOcHvbxNN3X0.F4bbzclwzZjAuaMC29QY2157cvlLOYG',NULL,1,'2026-11-12 13:14:10','2026-11-12 13:14:10',2,NULL,NULL),(6,'Zain Gondal','zain.gondal@aljannat.com','$2b$12$ilLggBefYo8440tCLADNg.4iwgtOxejjfPuYUC9AVMKOV8RMIp5by','/uploads/profiles/1794471348069-642727519.png',3,'2026-11-12 13:15:29','2026-11-12 13:15:48',2,NULL,NULL),(7,'Abdullah Gondal','abdullah.gondal@aljannat.com','$2b$12$skYUdrk5m6RML/e8gIAcwevecdciH6oTCIfyWT0OslsxPRuVbt.3i','/uploads/profiles/1794471405024-47216122.png',3,'2026-11-12 13:16:20','2026-11-12 13:16:45',2,NULL,NULL);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-11-17 13:39:24
