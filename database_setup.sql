-- ========================================================
-- TENDER MANAGEMENT SYSTEM - MySQL DATABASE SCHEMA
-- ========================================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+03:00"; 

-- --------------------------------------------------------
-- Table: users
-- --------------------------------------------------------
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `full_name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `role` enum('admin','manager','editor','viewer') NOT NULL DEFAULT 'viewer',
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `last_login` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Admin: admin / admin123  ($2y$10$ is standard bcrypt)
-- Using PHP password_hash('admin123', PASSWORD_DEFAULT)
INSERT INTO `users` (`username`, `password_hash`, `full_name`, `email`, `role`, `status`) VALUES
('admin', '$2y$10$vO.jO5GvG9yK8W2Qc6Y/Pevf8BwvH8h/aT2iM9x2j4e/2XGfFvqJ2', 'مدير النظام (Admin)', 'admin@arabmdgroup.com', 'admin', 'active');

-- --------------------------------------------------------
-- Table: settings
-- --------------------------------------------------------
CREATE TABLE `settings` (
  `setting_key` varchar(50) NOT NULL,
  `setting_value` text DEFAULT NULL,
  PRIMARY KEY (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `settings` (`setting_key`, `setting_value`) VALUES
('company_name', 'مجموعة عرب MD الطبية'),
('company_name_en', 'Arab MD Group'),
('vat_rate', '15'),
('logo_url', 'https://arabmdgroup.com/assets/img/logo.png'),
('logo_custom', NULL);

-- --------------------------------------------------------
-- Table: tenders
-- --------------------------------------------------------
CREATE TABLE `tenders` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `reference` varchar(100) NOT NULL,
  `tender_number` varchar(100) DEFAULT NULL,
  `bcd` datetime DEFAULT NULL,
  `duration` varchar(100) DEFAULT NULL,
  `procedure_type` varchar(100) DEFAULT NULL,
  `category` enum('Supply','Contracting','Marine','Other') NOT NULL DEFAULT 'Other',
  `status` enum('draft','submitted','not_submitted','under_review','won','lost','ongoing') NOT NULL DEFAULT 'draft',
  `submission_date` date DEFAULT NULL,
  `submitted_price` decimal(15,2) DEFAULT NULL,
  `cost` decimal(15,2) DEFAULT NULL,
  `profit` decimal(15,2) DEFAULT NULL,
  `vat` decimal(15,2) DEFAULT NULL,
  `remarks` text DEFAULT NULL,
  `eitmad_link` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sample Demo Tenders
INSERT INTO `tenders` (`id`, `title`, `reference`, `tender_number`, `bcd`, `duration`, `procedure_type`, `category`, `status`, `submitted_price`, `cost`, `profit`, `vat`) VALUES
(1, 'توريد أجهزة ومعدات طبية (مشروع ديمو)', 'MOH-2026-001', '202600001', '2026-07-25 12:00:00', '180 يوم', 'منافسة مفتوحة', 'Supply', 'submitted', 1250000.00, 950000.00, 300000.00, 187500.00),
(2, 'عقد صيانة ونظافة (مشروع ديمو)', 'MOH-2026-015', '202600123', '2026-08-10 10:00:00', '365 يوم', 'منافسة محدودة', 'Contracting', 'ongoing', 3000000.00, 2400000.00, 600000.00, 450000.00);

-- --------------------------------------------------------
-- Table: tender_costs (BOQ)
-- --------------------------------------------------------
CREATE TABLE `tender_costs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tender_id` int(11) NOT NULL,
  `item_name` text NOT NULL,
  `qty` decimal(10,2) NOT NULL DEFAULT 1.00,
  `unit_price` decimal(15,2) NOT NULL DEFAULT 0.00,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  FOREIGN KEY (`tender_id`) REFERENCES `tenders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `tender_costs` (`tender_id`, `item_name`, `qty`, `unit_price`, `notes`) VALUES
(1, 'جهاز أشعة سينية متقدم', 2.00, 300000.00, 'يشمل التركيب والتدريب'),
(1, 'سرير طبي إلكتروني للعناية', 10.00, 35000.00, 'ضمان 5 سنوات');

-- --------------------------------------------------------
-- Table: tender_files
-- --------------------------------------------------------
CREATE TABLE `tender_files` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tender_id` int(11) NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `file_path` varchar(255) NOT NULL,
  `file_type` varchar(50) DEFAULT NULL,
  `file_size` int(11) DEFAULT NULL,
  `uploaded_by` int(11) DEFAULT NULL,
  `uploaded_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  FOREIGN KEY (`tender_id`) REFERENCES `tenders` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: activity_logs
-- --------------------------------------------------------
CREATE TABLE `activity_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `description` text NOT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

COMMIT;
