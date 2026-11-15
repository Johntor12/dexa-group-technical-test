ALTER TABLE `Attendance` ADD COLUMN `source` ENUM('DIRECT','CORRECTION') NOT NULL DEFAULT 'DIRECT', ADD COLUMN `correctionRequestId` CHAR(36) NULL;

CREATE TABLE `CorrectionReviewGrant` (
  `id` CHAR(36) NOT NULL,
  `userId` CHAR(36) NOT NULL,
  `department` ENUM('SALES','MARKETING','PRODUCTION','FINANCE','HR','IT','R_AND_D','LOGISTIC','ADMINISTRATION_AND_SECRETARY','DESIGN_DEPARTMENT') NOT NULL,
  `permission` VARCHAR(64) NOT NULL DEFAULT 'ATTENDANCE_CORRECTION_REVIEW',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`), UNIQUE INDEX `CorrectionReviewGrant_userId_department_permission_key` (`userId`,`department`,`permission`),
  CONSTRAINT `CorrectionReviewGrant_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `CorrectionEligibleDay` (
  `id` CHAR(36) NOT NULL, `employeeId` CHAR(36) NOT NULL, `workDate` CHAR(10) NOT NULL,
  `note` VARCHAR(255) NULL, `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`), UNIQUE INDEX `CorrectionEligibleDay_employeeId_workDate_key` (`employeeId`,`workDate`),
  CONSTRAINT `CorrectionEligibleDay_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `AttendanceCorrectionRequest` (
  `id` CHAR(36) NOT NULL, `employeeId` CHAR(36) NOT NULL, `workDate` CHAR(10) NOT NULL,
  `requestType` VARCHAR(32) NOT NULL DEFAULT 'MISSED_ATTENDANCE', `reason` TEXT NOT NULL,
  `status` ENUM('PENDING','APPROVED','REJECTED','CANCELLED') NOT NULL DEFAULT 'PENDING',
  `requestedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `reviewedAt` DATETIME(3) NULL,
  `reviewedByUserId` CHAR(36) NULL, `reviewNote` TEXT NULL, `version` INTEGER NOT NULL DEFAULT 0,
  `idempotencyKey` VARCHAR(100) NOT NULL, `pendingKey` VARCHAR(64) NULL, `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`), UNIQUE INDEX `AttendanceCorrectionRequest_employeeId_idempotencyKey_key` (`employeeId`,`idempotencyKey`), UNIQUE INDEX `AttendanceCorrectionRequest_pendingKey_key` (`pendingKey`),
  INDEX `AttendanceCorrectionRequest_employeeId_workDate_status_idx` (`employeeId`,`workDate`,`status`),
  INDEX `AttendanceCorrectionRequest_status_requestedAt_idx` (`status`,`requestedAt`),
  CONSTRAINT `AttendanceCorrectionRequest_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `AttendanceCorrectionRequest_reviewedByUserId_fkey` FOREIGN KEY (`reviewedByUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `AttendanceCorrectionEvidence` (
  `id` CHAR(36) NOT NULL, `correctionId` CHAR(36) NOT NULL, `storageKey` CHAR(36) NOT NULL,
  `mimeType` VARCHAR(50) NOT NULL, `size` INTEGER NOT NULL, `sha256` CHAR(64) NOT NULL,
  `uploadedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`), UNIQUE INDEX `AttendanceCorrectionEvidence_storageKey_key` (`storageKey`),
  CONSTRAINT `AttendanceCorrectionEvidence_correctionId_fkey` FOREIGN KEY (`correctionId`) REFERENCES `AttendanceCorrectionRequest`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Attendance` ADD UNIQUE INDEX `Attendance_correctionRequestId_key` (`correctionRequestId`),
  ADD CONSTRAINT `Attendance_correctionRequestId_fkey` FOREIGN KEY (`correctionRequestId`) REFERENCES `AttendanceCorrectionRequest`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
