-- Inisialisasi Database TAURUS IT Support System
-- MariaDB / MySQL compatible

CREATE DATABASE IF NOT EXISTS `taurus` 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

USE `taurus`;

-- 1. Tabel Users
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(80) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `name` VARCHAR(100) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_users_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Tabel Tickets
CREATE TABLE IF NOT EXISTS `tickets` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `subject` VARCHAR(255) NOT NULL,
  `category` VARCHAR(100) NULL DEFAULT 'General',
  `detail` TEXT NOT NULL,
  `priority` ENUM('Low', 'Medium', 'High', 'Critical') NOT NULL DEFAULT 'Medium',
  `attachment` VARCHAR(255) NULL,
  `sla` DATETIME NULL,
  `status` ENUM('Open', 'InProgress', 'Resolved', 'Closed') NOT NULL DEFAULT 'Open',
  `reporter_id` INT NOT NULL,
  `assignee_id` INT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_tickets_status` (`status`),
  INDEX `idx_tickets_priority` (`priority`),
  INDEX `idx_tickets_reporter` (`reporter_id`),
  INDEX `idx_tickets_assignee` (`assignee_id`),
  CONSTRAINT `fk_tickets_reporter` FOREIGN KEY (`reporter_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_tickets_assignee` FOREIGN KEY (`assignee_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Tabel Ticket Comments
CREATE TABLE IF NOT EXISTS `ticket_comments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `ticket_id` INT NOT NULL,
  `author_id` INT NOT NULL,
  `comment` TEXT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_comments_ticket` (`ticket_id`),
  INDEX `idx_comments_author` (`author_id`),
  CONSTRAINT `fk_comments_ticket` FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_comments_author` FOREIGN KEY (`author_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Tabel Jobs (Log Pekerjaan IT Support)
CREATE TABLE IF NOT EXISTS `jobs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `ticket_id` INT NULL,
  `problem_category` VARCHAR(100) NULL,
  `problem_detail` TEXT NULL,
  `action_taken` TEXT NULL,
  `status` ENUM('Pending', 'Completed') NOT NULL DEFAULT 'Pending',
  `work_date` DATE NOT NULL,
  `work_day` VARCHAR(15) NOT NULL,
  `start_time` TIME NOT NULL,
  `end_time` TIME NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_jobs_user` (`user_id`),
  INDEX `idx_jobs_ticket` (`ticket_id`),
  INDEX `idx_jobs_status` (`status`),
  INDEX `idx_jobs_work_date` (`work_date`),
  CONSTRAINT `fk_jobs_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_jobs_ticket` FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Default User: admin / admin123 (bcrypt hash: $2a$10$gNq.C6R8y8QhH7F6p1Dk1u9DqBq1wW5bZ4rY8b3K0Y4fR9Z6J1W12 -> dihasilkan oleh seeder)
INSERT IGNORE INTO `users` (`id`, `username`, `password_hash`, `name`) 
VALUES (1, 'admin', '$2a$10$e9o3zP/mZlV25aD6Vd/VbeoRfg2t73gq7uJ4w13v3jBsyVbJc/T/i', 'Administrator IT Support');
