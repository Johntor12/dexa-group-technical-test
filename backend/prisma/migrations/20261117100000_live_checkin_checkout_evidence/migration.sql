-- Extend the current attendance evidence row into a typed collection.
-- Existing rows are retained and become CHECKIN_WORK_PROOF records.
ALTER TABLE `Attendance`
    ADD COLUMN `checkOutIdempotencyKey` VARCHAR(100) NULL,
    ADD COLUMN `checkOutFingerprint` CHAR(64) NULL;

CREATE UNIQUE INDEX `Attendance_checkOutIdempotencyKey_key`
    ON `Attendance`(`checkOutIdempotencyKey`);

ALTER TABLE `Evidence`
    DROP FOREIGN KEY `Evidence_attendanceId_fkey`,
    DROP INDEX `Evidence_attendanceId_key`,
    ADD COLUMN `kind` ENUM(
        'CHECKIN_WORK_PROOF',
        'CHECKIN_SELFIE',
        'CHECKOUT_WORK_PROOF',
        'CHECKOUT_SELFIE'
    ) NOT NULL DEFAULT 'CHECKIN_WORK_PROOF',
    ADD COLUMN `workProofType` ENUM('SCREEN', 'WORKSPACE') NULL,
    ADD COLUMN `recordedAt` DATETIME(3) NULL;

UPDATE `Evidence` AS e
JOIN `Attendance` AS a ON a.`id` = e.`attendanceId`
SET e.`recordedAt` = a.`submittedAt`;

ALTER TABLE `Evidence`
    MODIFY COLUMN `recordedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD UNIQUE INDEX `Evidence_attendanceId_kind_key`(`attendanceId`, `kind`);

ALTER TABLE `Evidence`
    ADD CONSTRAINT `Evidence_attendanceId_fkey`
    FOREIGN KEY (`attendanceId`) REFERENCES `Attendance`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;
