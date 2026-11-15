-- CreateTable
CREATE TABLE `User` (
    `id` CHAR(36) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `role` ENUM('EMPLOYEE', 'HRD') NOT NULL DEFAULT 'EMPLOYEE',
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Session` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `revoked` BOOLEAN NOT NULL DEFAULT false,

    INDEX `Session_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Department` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(100) NOT NULL,

    UNIQUE INDEX `Department_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Employee` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `employeeNumber` VARCHAR(50) NOT NULL,
    `fullName` VARCHAR(150) NOT NULL,
    `departmentId` CHAR(36) NOT NULL,
    `position` VARCHAR(100) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Employee_userId_key`(`userId`),
    UNIQUE INDEX `Employee_employeeNumber_key`(`employeeNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Attendance` (
    `id` CHAR(36) NOT NULL,
    `employeeId` CHAR(36) NOT NULL,
    `employeeName` VARCHAR(150) NOT NULL,
    `employeeNumber` VARCHAR(50) NOT NULL,
    `departmentId` CHAR(36) NOT NULL,
    `departmentName` VARCHAR(100) NOT NULL,
    `submittedAt` DATETIME(3) NOT NULL,
    `workDate` CHAR(10) NOT NULL,

    INDEX `Attendance_workDate_departmentId_idx`(`workDate`, `departmentId`),
    UNIQUE INDEX `Attendance_employeeId_workDate_key`(`employeeId`, `workDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Evidence` (
    `id` CHAR(36) NOT NULL,
    `attendanceId` CHAR(36) NOT NULL,
    `storageKey` CHAR(36) NOT NULL,
    `mimeType` VARCHAR(50) NOT NULL,
    `size` INTEGER NOT NULL,
    `sha256` CHAR(64) NOT NULL,

    UNIQUE INDEX `Evidence_attendanceId_key`(`attendanceId`),
    UNIQUE INDEX `Evidence_storageKey_key`(`storageKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Idempotency` (
    `id` CHAR(36) NOT NULL,
    `employeeId` CHAR(36) NOT NULL,
    `key` VARCHAR(100) NOT NULL,
    `fingerprint` CHAR(64) NOT NULL,
    `attendanceId` CHAR(36) NOT NULL,

    UNIQUE INDEX `Idempotency_attendanceId_key`(`attendanceId`),
    UNIQUE INDEX `Idempotency_employeeId_key_key`(`employeeId`, `key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditEvent` (
    `id` CHAR(36) NOT NULL,
    `actorId` CHAR(36) NOT NULL,
    `employeeId` CHAR(36) NOT NULL,
    `action` VARCHAR(40) NOT NULL,
    `changes` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Session` ADD CONSTRAINT `Session_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Employee` ADD CONSTRAINT `Employee_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Employee` ADD CONSTRAINT `Employee_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `Department`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Attendance` ADD CONSTRAINT `Attendance_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Evidence` ADD CONSTRAINT `Evidence_attendanceId_fkey` FOREIGN KEY (`attendanceId`) REFERENCES `Attendance`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Idempotency` ADD CONSTRAINT `Idempotency_attendanceId_fkey` FOREIGN KEY (`attendanceId`) REFERENCES `Attendance`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
